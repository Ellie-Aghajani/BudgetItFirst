namespace TodoApi.Services;

// The default (Events:Provider = "none"). Production has no message broker,
// so publishing does nothing and the API behaves exactly as before.
public class NoOpEventPublisher : IEventPublisher
{
    public bool IsEnabled => false;

    public Task PublishAsync(ExpenseChangedEvent evt, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
