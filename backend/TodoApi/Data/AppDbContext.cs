using Microsoft.EntityFrameworkCore;
using TodoApi.Models;

namespace TodoApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Todo> Todos => Set<Todo>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<BudgetSettings> BudgetSettings => Set<BudgetSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Todo>()
            .HasOne(t => t.Category)
            .WithMany(c => c.Todos)
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Todo>()
            .Property(t => t.EstimatedCost)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Category>()
            .Property(c => c.Budget)
            .HasPrecision(18, 2);

        modelBuilder.Entity<BudgetSettings>()
            .Property(b => b.MonthlyIncome)
            .HasPrecision(18, 2);

        // One settings row per user — enforced by the database, not the entity.
        modelBuilder.Entity<BudgetSettings>()
            .HasIndex(b => b.UserId)
            .IsUnique();
    }
}