using System.Text.Json;
using RabbitMQ.Client;

namespace TodoApi.Services;

// Registered as a Singleton: one TCP connection for the whole app, opened
// lazily on the first publish. Connecting at startup would crash the API
// whenever RabbitMQ is down, and the API must work without it.
public sealed class RabbitMqEventPublisher : IEventPublisher, IAsyncDisposable
{
    public const string RoutingKey = "expense.changed";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly RabbitMqOptions _options;
    private readonly ConnectionFactory _factory;
    private readonly ILogger<RabbitMqEventPublisher> _logger;

    // Requests run in parallel, but they share one connection and channel.
    // The lock makes sure only one request opens them, and one publishes
    // on the channel at a time.
    private readonly SemaphoreSlim _lock = new(1, 1);
    private IConnection? _connection;
    private IChannel? _channel;

    public RabbitMqEventPublisher(RabbitMqOptions options, ILogger<RabbitMqEventPublisher> logger)
    {
        _options = options;
        _logger = logger;
        var timeout = TimeSpan.FromMilliseconds(options.PublishTimeoutMs);
        _factory = new ConnectionFactory
        {
            Uri = new Uri(options.Uri),
            RequestedConnectionTimeout = timeout,
            HandshakeContinuationTimeout = timeout,
            // We reconnect ourselves on the next publish (see GetChannelAsync),
            // which is simpler to reason about than background recovery.
            AutomaticRecoveryEnabled = false
        };
    }

    public bool IsEnabled => true;

    public async Task PublishAsync(ExpenseChangedEvent evt, CancellationToken cancellationToken = default)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(_options.PublishTimeoutMs);

        try
        {
            await _lock.WaitAsync(timeout.Token);
            // The client library doesn't always honor the token (for example
            // during the connection handshake), so we stop waiting ourselves.
            // The work keeps running in the background and releases the lock
            // when it ends.
            await PublishUnderLockAsync(evt, timeout.Token).WaitAsync(timeout.Token);
        }
        catch (Exception ex)
        {
            LogFailure(evt, ex);
        }
    }

    // Must only be called while holding _lock; it releases it.
    private async Task PublishUnderLockAsync(ExpenseChangedEvent evt, CancellationToken cancellationToken)
    {
        try
        {
            var channel = await GetChannelAsync(cancellationToken);
            var properties = new BasicProperties
            {
                MessageId = evt.EventId.ToString(),
                Type = evt.EventType,
                ContentType = "application/json",
                Persistent = true
            };
            var body = JsonSerializer.SerializeToUtf8Bytes(evt, JsonOptions);

            // With publisher confirms on, this waits until the broker says it
            // has the message, so "no exception" really means "delivered".
            await channel.BasicPublishAsync(_options.Exchange, RoutingKey, mandatory: false,
                properties, body, cancellationToken);
        }
        catch
        {
            DropConnection();
            throw;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task<IChannel> GetChannelAsync(CancellationToken cancellationToken)
    {
        if (_channel is { IsOpen: true }) return _channel;

        DropConnection();
        _connection = await _factory.CreateConnectionAsync(cancellationToken);
        _channel = await _connection.CreateChannelAsync(
            new CreateChannelOptions(publisherConfirmationsEnabled: true, publisherConfirmationTrackingEnabled: true),
            cancellationToken);

        // Idempotent: declaring an exchange that already exists with the same
        // settings does nothing. The queue is the consumer's job.
        await _channel.ExchangeDeclareAsync(_options.Exchange, ExchangeType.Topic, durable: true,
            cancellationToken: cancellationToken);
        return _channel;
    }

    // Forget a broken connection so the next publish opens a new one. Closing
    // it can itself be slow, so it happens in the background, not in the request.
    private void DropConnection()
    {
        var channel = _channel;
        var connection = _connection;
        _channel = null;
        _connection = null;
        if (channel == null && connection == null) return;

        _ = Task.Run(async () =>
        {
            try
            {
                if (channel != null) await channel.DisposeAsync();
                if (connection != null) await connection.DisposeAsync();
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Error while closing a broken RabbitMQ connection.");
            }
        });
    }

    private void LogFailure(ExpenseChangedEvent evt, Exception ex) =>
        _logger.LogWarning(ex,
            "Could not publish {EventType} {EventId} (timeout {TimeoutMs} ms). The expense is saved; the notification is skipped.",
            evt.EventType, evt.EventId, _options.PublishTimeoutMs);

    public async ValueTask DisposeAsync()
    {
        if (_channel != null) await _channel.DisposeAsync();
        if (_connection != null) await _connection.DisposeAsync();
        _lock.Dispose();
    }
}
