using Microsoft.EntityFrameworkCore;
using TodoApi.Data;

namespace TodoApi.Services;

// Registered as Scoped in Program.cs because it depends on AppDbContext,
// which is itself Scoped (one instance per HTTP request).
public class SpendingService : ISpendingService
{
    private readonly AppDbContext _context;

    public SpendingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SpendingSummary> GetSummaryAsync(string userId, int year, int month)
    {
        var report = await _context.MonthlyReports
            .Include(r => r.Categories)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId && r.Year == year && r.Month == month);

        if (report != null)
        {
            return Summarize(
                report.MonthlyIncome,
                report.Categories.Select(c => (c.CategoryId, c.CategoryName, c.Budget, c.Spent, 0m)));
        }

        // The SUMs run in SQL Server, so only one row per category comes back
        // instead of every expense and item. Spent is what the user logged as
        // actually paid; the shopping list's estimates are reported separately.
        var rows = await _context.Categories
            .Where(c => c.UserId == userId && !c.IsArchived)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Budget,
                Spent = c.Expenses
                    .Where(e => e.BudgetYear == year && e.BudgetMonth == month)
                    .Sum(e => (decimal?)e.Amount) ?? 0,
                Estimated = c.Todos
                    .Where(t => t.BudgetYear == year && t.BudgetMonth == month)
                    .Sum(t => (decimal?)t.EstimatedCost) ?? 0
            })
            .AsNoTracking()
            .ToListAsync();

        var monthlyIncome = await _context.BudgetSettings
            .Where(b => b.UserId == userId)
            .Select(b => b.MonthlyIncome)
            .FirstOrDefaultAsync();

        return Summarize(monthlyIncome, rows.Select(r => (r.Id, r.Name, r.Budget, r.Spent, r.Estimated)));
    }

    private static SpendingSummary Summarize(
        decimal monthlyIncome,
        IEnumerable<(int Id, string Name, decimal Budget, decimal Spent, decimal Estimated)> rows)
    {
        var categories = rows
            .Select(r => new CategorySpending(
                r.Id,
                r.Name,
                r.Budget,
                r.Spent,
                r.Estimated,
                r.Budget - r.Spent,
                PercentOf(r.Spent, r.Budget),
                r.Spent > r.Budget))
            .ToList();

        var totalSpent = categories.Sum(c => c.Spent);

        return new SpendingSummary(
            monthlyIncome,
            categories.Sum(c => c.Budget),
            totalSpent,
            monthlyIncome - totalSpent,
            PercentOf(totalSpent, monthlyIncome),
            categories);
    }

    // null instead of dividing by zero when no budget or income has been set.
    private static decimal? PercentOf(decimal part, decimal whole)
    {
        if (whole == 0) return null;
        return Math.Round(part / whole * 100, 1);
    }
}
