using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;

namespace TodoApi.Repositories;

public class TodoRepository : ITodoRepository
{
    private readonly AppDbContext _context;

    public TodoRepository(AppDbContext context)
    {
        _context = context;
    }

    // Filters in SQL (WHERE UserId = ... AND BudgetYear = ...), so it uses the
    // (UserId, BudgetYear, BudgetMonth) index and only this user's rows come
    // back, instead of loading every user's todos and filtering in memory.
    public async Task<List<Todo>> GetForUserAsync(string userId, int? budgetYear, int? budgetMonth)
    {
        return await ForUser(userId, budgetYear, budgetMonth).AsNoTracking().ToListAsync();
    }

    // One DELETE statement in the database. The old way loaded the rows, then
    // looked each one up again before removing it: one round trip per item.
    public async Task DeleteForUserAsync(string userId, int? budgetYear, int? budgetMonth)
    {
        await ForUser(userId, budgetYear, budgetMonth).ExecuteDeleteAsync();
    }

    private IQueryable<Todo> ForUser(string userId, int? budgetYear, int? budgetMonth)
    {
        var query = _context.Todos.Where(t => t.UserId == userId);
        if (budgetYear.HasValue && budgetMonth.HasValue)
        {
            query = query.Where(t => t.BudgetYear == budgetYear && t.BudgetMonth == budgetMonth);
        }
        return query;
    }

    public async Task<Todo?> GetByIdAsync(int id)
    {
        return await _context.Todos.FindAsync(id);
    }

    public async Task AddAsync(Todo todo)
    {
        await _context.Todos.AddAsync(todo);
    }

    public async Task DeleteAsync(int id)
    {
        var todo = await _context.Todos.FindAsync(id);
        if (todo != null)
        {
            _context.Todos.Remove(todo);
        }
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}