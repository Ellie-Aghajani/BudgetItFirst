using Microsoft.EntityFrameworkCore;
using TodoApi.Models;

namespace TodoApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Todo> Todos => Set<Todo>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<BudgetSettings> BudgetSettings => Set<BudgetSettings>();
    public DbSet<MonthlyReport> MonthlyReports => Set<MonthlyReport>();
    public DbSet<Expense> Expenses => Set<Expense>();

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

        // Every list and spending query filters on these three columns.
        modelBuilder.Entity<Todo>()
            .HasIndex(t => new { t.UserId, t.BudgetYear, t.BudgetMonth });

        // One snapshot per user per month — a second close of the same month
        // (two windows open at rollover) is rejected by the database.
        modelBuilder.Entity<MonthlyReport>()
            .HasIndex(r => new { r.UserId, r.Year, r.Month })
            .IsUnique();

        modelBuilder.Entity<MonthlyReport>()
            .Property(r => r.MonthlyIncome)
            .HasPrecision(18, 2);

        modelBuilder.Entity<MonthlyReport>()
            .HasMany(r => r.Categories)
            .WithOne()
            .HasForeignKey(c => c.MonthlyReportId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MonthlyReportCategory>()
            .Property(c => c.Budget)
            .HasPrecision(18, 2);

        modelBuilder.Entity<MonthlyReportCategory>()
            .Property(c => c.Spent)
            .HasPrecision(18, 2);

        // Restrict, like Todo: deleting a category with spending must go
        // through CategoriesController.Delete, which archives it instead.
        modelBuilder.Entity<Expense>()
            .HasOne(e => e.Category)
            .WithMany(c => c.Expenses)
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Expense>()
            .Property(e => e.Amount)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Expense>()
            .Property(e => e.UserId)
            .HasMaxLength(450);

        modelBuilder.Entity<Expense>()
            .Property(e => e.Note)
            .HasMaxLength(200);

        modelBuilder.Entity<Expense>()
            .HasIndex(e => new { e.UserId, e.BudgetYear, e.BudgetMonth });
    }
}