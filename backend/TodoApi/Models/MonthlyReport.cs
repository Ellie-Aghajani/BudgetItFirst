namespace TodoApi.Models;

// A frozen snapshot of one closed month, written once at rollover and never
// updated. Editing this month's income or budgets can't rewrite history.
public class MonthlyReport : AuditableEntity
{
    public int Id { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public int Year { get; private set; }
    public int Month { get; private set; }
    public decimal MonthlyIncome { get; private set; }
    public ICollection<MonthlyReportCategory> Categories { get; private set; } = new List<MonthlyReportCategory>();

    private MonthlyReport() { }

    // Categories are passed in up front so the report is complete the moment
    // it exists. There are no update methods on purpose.
    public static MonthlyReport Create(
        string userId,
        int year,
        int month,
        decimal monthlyIncome,
        IEnumerable<MonthlyReportCategory> categories)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (month < 1 || month > 12)
            throw new ArgumentException("Month must be between 1 and 12.", nameof(month));
        if (year < 2000 || year > 2100)
            throw new ArgumentException("Year is out of range.", nameof(year));
        if (monthlyIncome < 0)
            throw new ArgumentException("Monthly income cannot be negative.", nameof(monthlyIncome));

        return new MonthlyReport
        {
            UserId = userId,
            Year = year,
            Month = month,
            MonthlyIncome = monthlyIncome,
            Categories = categories.ToList()
        };
    }
}
