using TodoApi.Models;

namespace TodoApi.Repositories;

public interface ITodoRepository
{
    Task<List<Todo>> GetForUserAsync(string userId, int? budgetYear, int? budgetMonth);
    Task DeleteForUserAsync(string userId, int? budgetYear, int? budgetMonth);
    Task<Todo?> GetByIdAsync(int id);
    Task AddAsync(Todo todo);
    Task DeleteAsync(int id);
    Task SaveChangesAsync();
}