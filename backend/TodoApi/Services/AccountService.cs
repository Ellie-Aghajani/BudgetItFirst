using Microsoft.EntityFrameworkCore;
using TodoApi.Data;

namespace TodoApi.Services;

// Registered as Scoped in Program.cs because it depends on AppDbContext.
public class AccountService : IAccountService
{
    private readonly AppDbContext _context;

    public AccountService(AppDbContext context)
    {
        _context = context;
    }

    public async Task DeleteAllDataAsync(string userId)
    {
        // The DbContext retries on transient Azure SQL errors. A retry can't
        // replay half a transaction, so EF requires the whole unit to run
        // through the execution strategy: on a retry it starts over cleanly.
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            // Children before parents: expenses and todos point at categories
            // with Restrict, so categories can only go once they're gone.
            // Each line is one set-based DELETE ... WHERE UserId = @userId.
            await _context.Expenses.Where(e => e.UserId == userId).ExecuteDeleteAsync();
            await _context.Todos.Where(t => t.UserId == userId).ExecuteDeleteAsync();
            await _context.Categories.Where(c => c.UserId == userId).ExecuteDeleteAsync();
            // Report rows cascade-delete their category lines in the database.
            await _context.MonthlyReports.Where(r => r.UserId == userId).ExecuteDeleteAsync();
            await _context.BudgetSettings.Where(b => b.UserId == userId).ExecuteDeleteAsync();

            await transaction.CommitAsync();
        });
    }
}
