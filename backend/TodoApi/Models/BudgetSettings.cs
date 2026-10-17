namespace TodoApi.Models;

public class BudgetSettings : AuditableEntity
{
    public int Id { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public decimal MonthlyIncome { get; private set; }

    private BudgetSettings() { }

    public static BudgetSettings Create(string userId, decimal monthlyIncome = 0)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (monthlyIncome < 0)
            throw new ArgumentException("Monthly income cannot be negative.", nameof(monthlyIncome));

        return new BudgetSettings { UserId = userId, MonthlyIncome = monthlyIncome };
    }

    public void UpdateMonthlyIncome(decimal newIncome)
    {
        if (newIncome < 0)
            throw new ArgumentException("Monthly income cannot be negative.", nameof(newIncome));
        MonthlyIncome = newIncome;
        Touch();
    }
}
