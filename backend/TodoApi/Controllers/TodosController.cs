using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using TodoApi.Models;
using TodoApi.Repositories;
using TodoApi.Services;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TodosController : ControllerBase
{
    private readonly ITodoRepository _repository;
    private readonly IActivityLogger _logger;

    public TodosController(ITodoRepository repository, RequestAuditor auditor, IActivityLogger logger)
    {
        _repository = repository;
        _logger = logger;
    }

    // Reads the UserId the FirebaseAuthMiddleware placed on this request.
    // Returns null if the request wasn't authenticated.
    private string? CurrentUserId => HttpContext.Items["UserId"] as string;

    // With year/month, returns only that budget month's items (the shopping
    // list for the month). Without them, returns everything.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Todo>>> GetAll([FromQuery] int? year, [FromQuery] int? month)
    {
        if (CurrentUserId == null) return Unauthorized();

        var todos = await _repository.GetAllAsync();
        var userTodos = todos.Where(t => t.UserId == CurrentUserId);
        if (year.HasValue && month.HasValue)
        {
            userTodos = userTodos.Where(t => t.BudgetYear == year && t.BudgetMonth == month);
        }
        return Ok(userTodos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Todo>> GetById(int id)
    {
        if (CurrentUserId == null) return Unauthorized();

        var todo = await _repository.GetByIdAsync(id);
        if (todo == null || todo.UserId != CurrentUserId) return NotFound();
        return Ok(todo);
    }

    public record CreateTodoRequest(string Title, int CategoryId, int BudgetYear, int BudgetMonth, decimal EstimatedCost = 0);

    [HttpPost]
    public async Task<ActionResult<Todo>> Create(CreateTodoRequest request)
    {
        if (CurrentUserId == null) return Unauthorized();

        if (request.EstimatedCost < 0)
        {
            return BadRequest("Estimated cost cannot be negative.");
        }
        if (!BudgetMonths.IsPlausibleCurrentMonth(request.BudgetYear, request.BudgetMonth))
        {
            return BadRequest("Items can only be added to the current month.");
        }

        var todo = Todo.Create(
            request.Title,
            request.CategoryId,
            CurrentUserId,
            request.BudgetYear,
            request.BudgetMonth,
            request.EstimatedCost);
        try
        {
            await _repository.AddAsync(todo);
            await _repository.SaveChangesAsync();
            _logger.Record($"Created todo '{todo.Title}'");
        }
        catch (DbUpdateException)
        {
            return BadRequest($"Category with ID {request.CategoryId} does not exist.");
        }
        return CreatedAtAction(nameof(GetById), new { id = todo.Id }, todo);
    }

    public record UpdateTodoRequest(bool IsComplete, string? Title, decimal? EstimatedCost = null);

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateTodoRequest request)
    {
        if (CurrentUserId == null) return Unauthorized();

        var todo = await _repository.GetByIdAsync(id);
        if (todo == null || todo.UserId != CurrentUserId) return NotFound();

        if (request.EstimatedCost < 0)
        {
            return BadRequest("Estimated cost cannot be negative.");
        }

        if (request.IsComplete && !todo.IsComplete)
        {
            todo.MarkComplete();
        }
        else if (!request.IsComplete && todo.IsComplete)
        {
            todo.MarkIncomplete();
        }

        if (!string.IsNullOrWhiteSpace(request.Title) && request.Title != todo.Title)
        {
            todo.Rename(request.Title);
        }

        if (request.EstimatedCost.HasValue && request.EstimatedCost.Value != todo.EstimatedCost)
        {
            todo.UpdateEstimatedCost(request.EstimatedCost.Value);
        }

        await _repository.SaveChangesAsync();
        return Ok(todo);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (CurrentUserId == null) return Unauthorized();

        var todo = await _repository.GetByIdAsync(id);
        if (todo == null || todo.UserId != CurrentUserId) return NotFound();

        await _repository.DeleteAsync(id);
        await _repository.SaveChangesAsync();
        return NoContent();
    }

    // With year/month, clears only that month's list — past months' items
    // aren't visible in the UI, so "Delete All" shouldn't silently remove them.
    [HttpDelete]
    public async Task<IActionResult> DeleteAll([FromQuery] int? year, [FromQuery] int? month)
    {
        if (CurrentUserId == null) return Unauthorized();

        var todos = await _repository.GetAllAsync();
        var userTodos = todos.Where(t => t.UserId == CurrentUserId);
        if (year.HasValue && month.HasValue)
        {
            userTodos = userTodos.Where(t => t.BudgetYear == year && t.BudgetMonth == month);
        }
        foreach (var todo in userTodos)
        {
            await _repository.DeleteAsync(todo.Id);
        }
        await _repository.SaveChangesAsync();
        return NoContent();
    }
}