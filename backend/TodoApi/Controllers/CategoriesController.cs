using Microsoft.AspNetCore.Mvc;
using TodoApi.Data;
using TodoApi.Models;
using Microsoft.EntityFrameworkCore;
using TodoApi.Services;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CategoriesController(AppDbContext context)
    {
        _context = context;
    }

    private string? CurrentUserId => HttpContext.Items["UserId"] as string;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Category>>> GetAll()
    {
        if (CurrentUserId == null) return Unauthorized();

        var categories = await _context.Categories
            .Where(c => c.UserId == CurrentUserId && !c.IsArchived)
            .AsNoTracking()
            .ToListAsync();
        return Ok(categories);
    }

    public record CreateCategoryRequest(string Name, decimal Budget = 0);

    [HttpPost]
    public async Task<ActionResult<Category>> Create(CreateCategoryRequest request)
    {
        if (CurrentUserId == null) return Unauthorized();

        if (request.Budget < 0)
        {
            return BadRequest("Budget cannot be negative.");
        }

        var category = Category.Create(request.Name, CurrentUserId, request.Budget);
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = category.Id }, category);
    }

    public record UpdateCategoryRequest(string Name, decimal? Budget = null);

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateCategoryRequest request)
    {
        if (CurrentUserId == null) return Unauthorized();

        var category = await _context.Categories.FindAsync(id);
        if (category == null || category.UserId != CurrentUserId || category.IsArchived) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Name cannot be empty.");
        }
        if (request.Budget < 0)
        {
            return BadRequest("Budget cannot be negative.");
        }

        category.Rename(request.Name);

        if (request.Budget.HasValue && request.Budget.Value != category.Budget)
        {
            category.UpdateBudget(request.Budget.Value);
        }
        await _context.SaveChangesAsync();
        return Ok(category);
    }

    // year/month are the client's current month. That month's items and
    // expenses in this category are deleted; earlier months' stay, and the
    // category is archived rather than removed so they keep a valid CategoryId.
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] int year, [FromQuery] int month)
    {
        if (CurrentUserId == null) return Unauthorized();
        if (!BudgetMonths.IsPlausibleCurrentMonth(year, month)) return BadRequest("Invalid current month.");

        var category = await _context.Categories.FindAsync(id);
        if (category == null || category.UserId != CurrentUserId || category.IsArchived) return NotFound();

        var currentMonthItems = await _context.Todos
            .Where(t => t.CategoryId == id && t.BudgetYear == year && t.BudgetMonth == month)
            .ToListAsync();
        _context.Todos.RemoveRange(currentMonthItems);

        var currentMonthExpenses = await _context.Expenses
            .Where(e => e.CategoryId == id && e.BudgetYear == year && e.BudgetMonth == month)
            .ToListAsync();
        _context.Expenses.RemoveRange(currentMonthExpenses);

        var hasPastItems =
            await _context.Todos.AnyAsync(t => t.CategoryId == id && !(t.BudgetYear == year && t.BudgetMonth == month))
            || await _context.Expenses.AnyAsync(e => e.CategoryId == id && !(e.BudgetYear == year && e.BudgetMonth == month));

        // Never used in an earlier month: nothing to preserve, so remove it for real.
        if (hasPastItems)
        {
            category.Archive();
        }
        else
        {
            _context.Categories.Remove(category);
        }

        // One SaveChanges = one transaction: the items and the category go together or not at all.
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
