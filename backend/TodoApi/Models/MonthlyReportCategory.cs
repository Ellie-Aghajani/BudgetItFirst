namespace TodoApi.Models;

public class MonthlyReportCategory : AuditableEntity
{
    public int Id { get; private set; }
    public int MonthlyReportId { get; private set; }

    // A plain copy, not a foreign key: the category can be renamed or deleted
    // later, and the snapshot has to keep what it was when the month closed.
    public int CategoryId { get; private set; }
    public string CategoryName { get; private set; } = string.Empty;
    public decimal Budget { get; private set; }
    public decimal Spent { get; private set; }

    private MonthlyReportCategory() { }

    public static MonthlyReportCategory Create(int categoryId, string categoryName, decimal budget, decimal spent)
    {
        if (string.IsNullOrWhiteSpace(categoryName))
            throw new ArgumentException("Category name cannot be empty.", nameof(categoryName));
        if (budget < 0)
            throw new ArgumentException("Budget cannot be negative.", nameof(budget));
        if (spent < 0)
            throw new ArgumentException("Spent cannot be negative.", nameof(spent));

        return new MonthlyReportCategory
        {
            CategoryId = categoryId,
            CategoryName = categoryName,
            Budget = budget,
            Spent = spent
        };
    }
}
