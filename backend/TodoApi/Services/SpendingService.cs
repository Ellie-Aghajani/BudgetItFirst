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

    public async Task<SpendingSummary> GetSummaryAsync(string userId)
    {
        // The SUM runs in SQL Server, so only one row per category comes back
        // instead of every todo. Every item counts toward "spent", checked off
        // or not — a planned purchase still uses up the budget.
        var rows = await _context.Categories
            .Where(c => c.UserId == userId)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Budget,
                Spent = c.Todos.Sum(t => (decimal?)t.EstimatedCost) ?? 0
            })
            .AsNoTracking()
            .ToListAsync();

        var monthlyIncome = await _context.BudgetSettings
            .Where(b => b.UserId == userId)
            .Select(b => b.MonthlyIncome)
            .FirstOrDefaultAsync();

        var categories = rows
            .Select(r => new CategorySpending(
                r.Id,
                r.Name,
                r.Budget,
                r.Spent,
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
