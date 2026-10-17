namespace TodoApi.Models;
public class Todo : AuditableEntity
{
    public int Id { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public bool IsComplete { get; private set; }
    public int CategoryId { get; private set; }
    public decimal EstimatedCost { get; private set; }
    public Category? Category { get; private set; }

    // Firebase UIDs are strings (typically 28 characters), not integers —
    // this identifies which authenticated user owns this todo.
    public string UserId { get; private set; } = string.Empty;

    // The budget month this item counts toward. Comes from the user's local
    // date when they add it, not the server's UTC clock, so an item added at
    // 8pm on Oct 31 in California still lands in October.
    public int BudgetYear { get; private set; }
    public int BudgetMonth { get; private set; }

    private Todo() { }

    public static Todo Create(string title, int categoryId, string userId, int budgetYear, int budgetMonth, decimal estimatedCost = 0)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title cannot be empty.", nameof(title));
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (estimatedCost < 0)
            throw new ArgumentException("Estimated cost cannot be negative.", nameof(estimatedCost));
        if (budgetMonth < 1 || budgetMonth > 12)
            throw new ArgumentException("Budget month must be between 1 and 12.", nameof(budgetMonth));
        if (budgetYear < 2000 || budgetYear > 2100)
            throw new ArgumentException("Budget year is out of range.", nameof(budgetYear));

        return new Todo
        {
            Title = title.Trim(),
            CategoryId = categoryId,
            UserId = userId,
            IsComplete = false,
            EstimatedCost = estimatedCost,
            BudgetYear = budgetYear,
            BudgetMonth = budgetMonth
        };
    }

    public void MarkComplete()
    {
        IsComplete = true;
        Touch();
    }

    public void MarkIncomplete()
    {
        IsComplete = false;
        Touch();
    }

    public void Rename(string newTitle)
    {
        if (string.IsNullOrWhiteSpace(newTitle))
            throw new ArgumentException("Title cannot be empty.", nameof(newTitle));
        Title = newTitle.Trim();
        Touch();
    }

    public void UpdateEstimatedCost(decimal newCost)
    {
        if (newCost < 0)
            throw new ArgumentException("Estimated cost cannot be negative.", nameof(newCost));
        EstimatedCost = newCost;
        Touch();
    }

    // Used at month rollover when the user carries an unbought item forward.
    public void MoveToMonth(int budgetYear, int budgetMonth)
    {
        if (budgetMonth < 1 || budgetMonth > 12)
            throw new ArgumentException("Budget month must be between 1 and 12.", nameof(budgetMonth));
        if (budgetYear < 2000 || budgetYear > 2100)
            throw new ArgumentException("Budget year is out of range.", nameof(budgetYear));
        BudgetYear = budgetYear;
        BudgetMonth = budgetMonth;
        Touch();
    }
}