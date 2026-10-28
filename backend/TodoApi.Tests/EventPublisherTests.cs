using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Microsoft.Extensions.Logging.Abstractions;
using TodoApi.Services;

namespace TodoApi.Tests;

public class EventPublisherTests
{
    private static ExpenseChangedEvent SampleEvent() =>
        ExpenseChangedEvent.Create("user-1", 12, "Groceries", 600m, 512.4m, 2026, 10)!;

    private static RabbitMqEventPublisher PublisherFor(int port, int timeoutMs = 500) =>
        new(new RabbitMqOptions { Uri = $"amqp://guest:guest@127.0.0.1:{port}/", PublishTimeoutMs = timeoutMs },
            NullLogger<RabbitMqEventPublisher>.Instance);

    // A port nothing listens on: connecting is refused straight away.
    private static int FreePort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    [Fact]
    public async Task NoOp_NeverThrows_AndIsDisabled()
    {
        var publisher = new NoOpEventPublisher();

        await publisher.PublishAsync(SampleEvent());
        Assert.False(publisher.IsEnabled);
    }

    [Fact]
    public async Task RabbitMq_DoesNotThrow_WhenTheBrokerIsDown()
    {
        await using var publisher = PublisherFor(FreePort());

        await publisher.PublishAsync(SampleEvent());
        // A second call takes the reconnect path and must not throw either.
        await publisher.PublishAsync(SampleEvent());
    }

    // A server that accepts the TCP connection but never answers, like a
    // broker that is stuck. Without the timeout the request would hang.
    [Fact]
    public async Task RabbitMq_GivesUpAfterTheTimeout_WhenTheBrokerHangs()
    {
        var silentServer = new TcpListener(IPAddress.Loopback, 0);
        silentServer.Start();
        try
        {
            var port = ((IPEndPoint)silentServer.LocalEndpoint).Port;
            await using var publisher = PublisherFor(port, timeoutMs: 500);

            var stopwatch = Stopwatch.StartNew();
            await publisher.PublishAsync(SampleEvent());

            Assert.True(stopwatch.Elapsed < TimeSpan.FromSeconds(3), $"Took {stopwatch.Elapsed}");
        }
        finally
        {
            silentServer.Stop();
        }
    }

    [Fact]
    public async Task RabbitMq_DoesNotThrow_WhenTheCallerCancels()
    {
        await using var publisher = PublisherFor(FreePort());
        using var cancelled = new CancellationTokenSource();
        cancelled.Cancel();

        await publisher.PublishAsync(SampleEvent(), cancelled.Token);
    }

    // CloudAMQP gives an amqps:// URI. The client must turn TLS on from the
    // scheme alone, since we only pass the Uri (no separate TLS settings).
    [Fact]
    public void AmqpsUri_TurnsOnTls()
    {
        var factory = new RabbitMQ.Client.ConnectionFactory { Uri = new Uri("amqps://user:pass@example.cloudamqp.com/vhost") };

        Assert.True(factory.Ssl.Enabled);
        Assert.Equal("example.cloudamqp.com", factory.Ssl.ServerName);
        Assert.Equal(5671, factory.Port);
        Assert.Equal("vhost", factory.VirtualHost);
    }

    [Fact]
    public void RabbitMq_DoesNotConnectInTheConstructor()
    {
        // Startup must not fail when RabbitMQ is unreachable.
        var publisher = PublisherFor(FreePort());
        Assert.True(publisher.IsEnabled);
    }
}
