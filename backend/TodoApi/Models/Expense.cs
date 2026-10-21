using TodoApi.Services;

namespace TodoApi.Models;

// Money actually spent, logged by the user. Shopping-list items only carry
// an estimate; "Spent" everywhere in the app is the sum of these.
public class Expense : AuditableEntity
{
    public int Id { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public int CategoryId { get; private set; }
    public Category? Category { get; private set; }
    public decimal Amount { get; private set; }
    public string? Note { get; private set; }

    // Set when the user corrects a category's spent total on the Budget page.
    // The difference is stored as its own row (it can be negative), so the
    // original entries are never rewritten.
    public bool IsAdjustment { get; private set; }

    public int BudgetYear { get; private set; }
    public int BudgetMonth { get; private set; }

    // The day the money was spent, chosen by the user (the calendar's "+").
    // Always inside BudgetYear/BudgetMonth. CreatedAt is when it was logged,
    // which can be days later.
    public DateOnly SpentOn { get; private set; }

    private Expense() { }

    public static Expense Create(string userId, int categoryId, decimal amount, DateOnly spentOn, string? note = null)
    {
        if (amount <= 0)
            throw new ArgumentException("Amount must be greater than zero.", nameof(amount));
        return Build(userId, categoryId, amount, spentOn, note, isAdjustment: false);
    }

    public static Expense CreateAdjustment(string userId, int categoryId, decimal difference, int budgetYear, int budgetMonth)
    {
        if (difference == 0)
            throw new ArgumentException("An adjustment must change the total.", nameof(difference));
        return Build(userId, categoryId, difference, BudgetMonths.DayWithin(budgetYear, budgetMonth), note: null, isAdjustment: true);
    }

    // Adjustments aren't edited directly: they're the difference between
    // totals, so the user changes them by editing Spent on the Budget page.
    public void UpdateAmount(decimal newAmount)
    {
        EnsureNotAdjustment();
        if (newAmount <= 0)
            throw new ArgumentException("Amount must be greater than zero.", nameof(newAmount));
        Amount = newAmount;
        Touch();
    }

    public void UpdateNote(string? newNote)
    {
        EnsureNotAdjustment();
        Note = string.IsNullOrWhiteSpace(newNote) ? null : newNote.Trim();
        Touch();
    }

    public void MoveToCategory(int newCategoryId)
    {
        EnsureNotAdjustment();
        CategoryId = newCategoryId;
        Touch();
    }

    // Moves the expense to another day of the same budget month. Moving it
    // to another month would change a month that may already be reported on.
    public void MoveToDate(DateOnly newDate)
    {
        EnsureNotAdjustment();
        if (newDate.Year != BudgetYear || newDate.Month != BudgetMonth)
            throw new ArgumentException("The date must stay in the same month.", nameof(newDate));
        SpentOn = newDate;
        Touch();
    }

    private void EnsureNotAdjustment()
    {
        if (IsAdjustment)
            throw new InvalidOperationException("Adjustments can't be edited.");
    }

    // The budget month comes from the date, so the two can never disagree.
    private static Expense Build(string userId, int categoryId, decimal amount, DateOnly spentOn, string? note, bool isAdjustment)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (spentOn.Year < 2000 || spentOn.Year > 2100)
            throw new ArgumentException("Date is out of range.", nameof(spentOn));

        return new Expense
        {
            UserId = userId,
            CategoryId = categoryId,
            Amount = amount,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            IsAdjustment = isAdjustment,
            BudgetYear = spentOn.Year,
            BudgetMonth = spentOn.Month,
            SpentOn = spentOn
        };
    }
}
