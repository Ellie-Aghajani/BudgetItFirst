namespace TodoApi.Services;

public record CategorySpending(
    int CategoryId,
    string Name,
    decimal Budget,
    decimal Spent,
    // Sum of the shopping list's estimated costs. Never part of Spent: it's
    // a plan, and real prices can differ. 0 for closed months.
    decimal Estimated,
    decimal Remaining,
    decimal? PercentUsed,
    bool IsOverBudget);

public record SpendingSummary(
    decimal MonthlyIncome,
    decimal TotalBudget,
    decimal TotalSpent,
    decimal RemainingIncome,
    decimal? PercentOfIncomeUsed,
    IReadOnlyList<CategorySpending> Categories);

public interface ISpendingService
{
    // A closed month comes from its frozen snapshot; an open month is
    // calculated live from its expenses (spent) and shopping list (estimated).
    Task<SpendingSummary> GetSummaryAsync(string userId, int year, int month);
}
