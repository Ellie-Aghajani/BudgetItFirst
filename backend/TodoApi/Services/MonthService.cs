using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Services;

public class MonthService : IMonthService
{
    private readonly AppDbContext _context;
    private readonly ISpendingService _spendingService;

    public MonthService(AppDbContext context, ISpendingService spendingService)
    {
        _context = context;
        _spendingService = spendingService;
    }

    // Months as a single running number (year * 12 + month index) so
    // "the month before" and "every month in between" are simple arithmetic.
    private static int ToIndex(int year, int month) => year * 12 + (month - 1);
    private static (int Year, int Month) FromIndex(int index) => (index / 12, index % 12 + 1);

    public async Task<IReadOnlyList<BudgetMonthInfo>> GetMonthsAsync(string userId, int currentYear, int currentMonth)
    {
        var currentIndex = ToIndex(currentYear, currentMonth);
        var firstIndex = await GetFirstMonthIndexAsync(userId) ?? currentIndex;
        var closed = await GetClosedMonthIndexesAsync(userId);

        var months = new List<BudgetMonthInfo>();
        for (var index = currentIndex; index >= firstIndex; index--)
        {
            var (year, month) = FromIndex(index);
            months.Add(new BudgetMonthInfo(year, month, closed.Contains(index)));
        }
        return months;
    }

    public async Task<RolloverStatus> GetRolloverStatusAsync(string userId, int currentYear, int currentMonth)
    {
        var monthsToClose = await GetMonthsToCloseAsync(userId, currentYear, currentMonth);
        if (monthsToClose.Count == 0)
        {
            return new RolloverStatus(monthsToClose, []);
        }

        var uncheckedItems = await QueryUncheckedItems(userId, monthsToClose)
            .AsNoTracking()
            .ToListAsync();

        return new RolloverStatus(monthsToClose, uncheckedItems);
    }

    public async Task CompleteRolloverAsync(
        string userId,
        int currentYear,
        int currentMonth,
        IReadOnlyCollection<int> carryOverTodoIds)
    {
        // EnableRetryOnFailure (Program.cs) means a manual transaction has to run
        // inside the execution strategy, so a retry replays the whole unit of work.
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            var monthsToClose = await GetMonthsToCloseAsync(userId, currentYear, currentMonth);
            if (monthsToClose.Count == 0) return;

            // Only unbought items from months being closed can be carried over —
            // any other id in the request is ignored.
            var itemsToCarry = await QueryUncheckedItems(userId, monthsToClose)
                .Where(t => carryOverTodoIds.Contains(t.Id))
                .ToListAsync();
            foreach (var item in itemsToCarry)
            {
                item.MoveToMonth(currentYear, currentMonth);
            }
            // Saved before the snapshots are calculated, so carried items
            // count toward the new month instead of the closed one.
            await _context.SaveChangesAsync();

            foreach (var closing in monthsToClose)
            {
                var summary = await _spendingService.GetSummaryAsync(userId, closing.Year, closing.Month);
                var report = MonthlyReport.Create(
                    userId,
                    closing.Year,
                    closing.Month,
                    summary.MonthlyIncome,
                    summary.Categories.Select(c =>
                        MonthlyReportCategory.Create(c.CategoryId, c.Name, c.Budget, c.Spent)));
                _context.MonthlyReports.Add(report);
            }
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        });
    }

    private async Task<List<BudgetMonthInfo>> GetMonthsToCloseAsync(string userId, int currentYear, int currentMonth)
    {
        var currentIndex = ToIndex(currentYear, currentMonth);
        var firstIndex = await GetFirstMonthIndexAsync(userId);
        if (firstIndex == null) return [];

        var closed = await GetClosedMonthIndexesAsync(userId);

        var months = new List<BudgetMonthInfo>();
        for (var index = firstIndex.Value; index < currentIndex; index++)
        {
            if (closed.Contains(index)) continue;
            var (year, month) = FromIndex(index);
            months.Add(new BudgetMonthInfo(year, month, false));
        }
        return months;
    }

    private IQueryable<Todo> QueryUncheckedItems(string userId, List<BudgetMonthInfo> months)
    {
        var indexes = months.Select(m => ToIndex(m.Year, m.Month)).ToList();
        return _context.Todos
            .Where(t => t.UserId == userId && !t.IsComplete && !t.Category!.IsArchived)
            .Where(t => indexes.Contains(t.BudgetYear * 12 + t.BudgetMonth - 1));
    }

    // The user's first month is the earliest month they did anything:
    // added an item or expense, created a category, or saved their income.
    private async Task<int?> GetFirstMonthIndexAsync(string userId)
    {
        var firstItemIndex = await _context.Todos
            .Where(t => t.UserId == userId)
            .Select(t => (int?)(t.BudgetYear * 12 + t.BudgetMonth - 1))
            .MinAsync();

        var firstExpenseIndex = await _context.Expenses
            .Where(e => e.UserId == userId)
            .Select(e => (int?)(e.BudgetYear * 12 + e.BudgetMonth - 1))
            .MinAsync();

        var firstCategoryDate = await _context.Categories
            .Where(c => c.UserId == userId)
            .Select(c => (DateTime?)c.CreatedAt)
            .MinAsync();

        var settingsDate = await _context.BudgetSettings
            .Where(b => b.UserId == userId)
            .Select(b => (DateTime?)b.CreatedAt)
            .FirstOrDefaultAsync();

        var candidates = new List<int>();
        if (firstItemIndex != null) candidates.Add(firstItemIndex.Value);
        if (firstExpenseIndex != null) candidates.Add(firstExpenseIndex.Value);
        if (firstCategoryDate != null) candidates.Add(ToIndex(firstCategoryDate.Value.Year, firstCategoryDate.Value.Month));
        if (settingsDate != null) candidates.Add(ToIndex(settingsDate.Value.Year, settingsDate.Value.Month));

        return candidates.Count == 0 ? null : candidates.Min();
    }

    private async Task<HashSet<int>> GetClosedMonthIndexesAsync(string userId)
    {
        var closed = await _context.MonthlyReports
            .Where(r => r.UserId == userId)
            .Select(r => new { r.Year, r.Month })
            .ToListAsync();
        return closed.Select(r => ToIndex(r.Year, r.Month)).ToHashSet();
    }
}
