namespace TodoApi.Services;

// Sends events to other services. Best effort: implementations must never
// throw. The expense is already saved when this runs, so a failed publish
// only means a missed notification, not a failed request.
public interface IEventPublisher
{
    // False for the no-op publisher, so callers can skip the extra SQL
    // queries that build an event nobody will receive.
    bool IsEnabled { get; }

    Task PublishAsync(ExpenseChangedEvent evt, CancellationToken cancellationToken = default);
}
