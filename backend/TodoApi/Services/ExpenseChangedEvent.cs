using System.Globalization;

namespace TodoApi.Services;

// The message sent to the notification service when a category's spending
// changes. It carries facts only (budget and spent); the notification
// service decides what counts as "close to the budget".
//
// Money is sent as strings like "600.00": a JSON number becomes a
// floating-point number in JavaScript, where 0.1 + 0.2 != 0.3.
// Never add the user's email, name, or token here.
public record ExpenseChangedEvent
{
    public const string Type = "ExpenseChanged";
    public const int CurrentSchemaVersion = 1;

    public Guid EventId { get; private init; }
    public string EventType { get; private init; } = Type;
    public int SchemaVersion { get; private init; } = CurrentSchemaVersion;
    public DateTime OccurredAt { get; private init; }
    public string UserId { get; private init; } = string.Empty;
    public int CategoryId { get; private init; }
    public string CategoryName { get; private init; } = string.Empty;
    public string CategoryBudget { get; private init; } = string.Empty;
    public string CategorySpentAfter { get; private init; } = string.Empty;
    public int BudgetYear { get; private init; }
    public int BudgetMonth { get; private init; }

    private ExpenseChangedEvent() { }

    // Returns null when the category has no budget: a percentage of zero
    // means nothing, so there is nothing to send.
    public static ExpenseChangedEvent? Create(
        string userId, int categoryId, string categoryName, decimal categoryBudget,
        decimal categorySpentAfter, int budgetYear, int budgetMonth)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (categoryBudget <= 0) return null;

        return new ExpenseChangedEvent
        {
            // New per event. The consumer does not use it for idempotency,
            // because the same situation can produce two different events.
            EventId = Guid.NewGuid(),
            OccurredAt = DateTime.UtcNow,
            UserId = userId,
            CategoryId = categoryId,
            CategoryName = categoryName,
            CategoryBudget = FormatMoney(categoryBudget),
            CategorySpentAfter = FormatMoney(categorySpentAfter),
            BudgetYear = budgetYear,
            BudgetMonth = budgetMonth
        };
    }

    // InvariantCulture: a server set to French would otherwise write "600,00".
    private static string FormatMoney(decimal amount) =>
        amount.ToString("0.00", CultureInfo.InvariantCulture);
}
