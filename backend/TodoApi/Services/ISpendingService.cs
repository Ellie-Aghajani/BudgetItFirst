namespace TodoApi.Services;

public record CategorySpending(
    int CategoryId,
    string Name,
    decimal Budget,
    decimal Spent,
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
    Task<SpendingSummary> GetSummaryAsync(string userId);
}
