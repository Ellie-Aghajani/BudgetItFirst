using TodoApi.Models;

namespace TodoApi.Services;

public record BudgetMonthInfo(int Year, int Month, bool IsClosed);

public record RolloverStatus(
    IReadOnlyList<BudgetMonthInfo> MonthsToClose,
    IReadOnlyList<Todo> UncheckedItems);

public interface IMonthService
{
    // Every month from the user's first month up to the current one, newest first.
    Task<IReadOnlyList<BudgetMonthInfo>> GetMonthsAsync(string userId, int currentYear, int currentMonth);

    // Past months that haven't been closed yet, plus their unbought items
    // so the user can choose what to carry into the current month.
    Task<RolloverStatus> GetRolloverStatusAsync(string userId, int currentYear, int currentMonth);

    // Moves the chosen items into the current month, then snapshots every
    // past month that's still open. Safe to call when there's nothing to do.
    Task CompleteRolloverAsync(string userId, int currentYear, int currentMonth, IReadOnlyCollection<int> carryOverTodoIds);
}
