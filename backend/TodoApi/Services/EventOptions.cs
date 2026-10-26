namespace TodoApi.Services;

// Bound from the "Events" section. Real values come from environment
// variables (Events__Provider, Events__RabbitMq__Uri), never from git.
public class EventOptions
{
    public const string SectionName = "Events";

    // "none" (default) or "rabbitmq".
    public string Provider { get; set; } = "none";
    public RabbitMqOptions RabbitMq { get; set; } = new();
}

public class RabbitMqOptions
{
    // amqp://user:password@host:5672/ — contains the password, so env var only.
    public string Uri { get; set; } = string.Empty;
    public string Exchange { get; set; } = "budget.events";

    // A slow broker must not make the user's request hang.
    public int PublishTimeoutMs { get; set; } = 2000;
}
