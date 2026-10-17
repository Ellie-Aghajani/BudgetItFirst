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

    private Expense() { }

    public static Expense Create(string userId, int categoryId, decimal amount, int budgetYear, int budgetMonth, string? note = null)
    {
        if (amount <= 0)
            throw new ArgumentException("Amount must be greater than zero.", nameof(amount));
        return Build(userId, categoryId, amount, budgetYear, budgetMonth, note, isAdjustment: false);
    }

    public static Expense CreateAdjustment(string userId, int categoryId, decimal difference, int budgetYear, int budgetMonth)
    {
        if (difference == 0)
            throw new ArgumentException("An adjustment must change the total.", nameof(difference));
        return Build(userId, categoryId, difference, budgetYear, budgetMonth, note: null, isAdjustment: true);
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

    private void EnsureNotAdjustment()
    {
        if (IsAdjustment)
            throw new InvalidOperationException("Adjustments can't be edited.");
    }

    private static Expense Build(string userId, int categoryId, decimal amount, int budgetYear, int budgetMonth, string? note, bool isAdjustment)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (budgetMonth < 1 || budgetMonth > 12)
            throw new ArgumentException("Budget month must be between 1 and 12.", nameof(budgetMonth));
        if (budgetYear < 2000 || budgetYear > 2100)
            throw new ArgumentException("Budget year is out of range.", nameof(budgetYear));

        return new Expense
        {
            UserId = userId,
            CategoryId = categoryId,
            Amount = amount,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            IsAdjustment = isAdjustment,
            BudgetYear = budgetYear,
            BudgetMonth = budgetMonth
        };
    }
}
