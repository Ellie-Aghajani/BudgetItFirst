using Microsoft.AspNetCore.Mvc;
using TodoApi.Data;
using TodoApi.Models;
using Microsoft.EntityFrameworkCore;

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
            .Where(c => c.UserId == CurrentUserId)
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
        if (category == null || category.UserId != CurrentUserId) return NotFound();

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

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (CurrentUserId == null) return Unauthorized();

        var category = await _context.Categories.FindAsync(id);
        if (category == null || category.UserId != CurrentUserId) return NotFound();

        try
        {
            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict("Cannot delete a category that still has todos assigned to it.");
        }

        return NoContent();
    }
}