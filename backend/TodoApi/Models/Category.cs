namespace TodoApi.Models;

public class Category : AuditableEntity
{
    public int Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string UserId { get; private set; } = string.Empty;
    public decimal Budget { get; private set; }
    public ICollection<Todo> Todos { get; private set; } = new List<Todo>();

    private Category() { }

    public static Category Create(string name, string userId, decimal budget = 0)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Category name cannot be empty.", nameof(name));
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (budget < 0)
            throw new ArgumentException("Budget cannot be negative.", nameof(budget));

        return new Category { Name = name.Trim(), UserId = userId, Budget = budget };
    }

    public void Rename(string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new ArgumentException("Category name cannot be empty.");
        Name = newName.Trim();
        Touch();
    }

    public void UpdateBudget(decimal newBudget)
    {
        if (newBudget < 0)
            throw new ArgumentException("Budget cannot be negative.", nameof(newBudget));
        Budget = newBudget;
        Touch();
    }
}