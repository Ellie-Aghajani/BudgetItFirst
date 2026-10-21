using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Models;
using TodoApi.Services;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExpensesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ExpensesController(AppDbContext context)
    {
        _context = context;
    }

    private string? CurrentUserId => HttpContext.Items["UserId"] as string;

    // Newest first. Adjustments are included so the list adds up to Spent.
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Expense>>> GetAll([FromQuery] int year, [FromQuery] int month)
    {
        if (CurrentUserId == null) return Unauthorized();
        if (!BudgetMonths.IsValid(year, month)) return BadRequest("Invalid month.");

        var expenses = await _context.Expenses
            .Where(e => e.UserId == CurrentUserId && e.BudgetYear == year && e.BudgetMonth == month)
            .OrderByDescending(e => e.SpentOn)
            .ThenByDescending(e => e.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
        return Ok(expenses);
    }

    // SpentOn is optional: without it the expense is dated today (or the
    // nearest day of the budget month).
    public record CreateExpenseRequest(
        int CategoryId, decimal Amount, int BudgetYear, int BudgetMonth, string? Note = null, DateOnly? SpentOn = null);

    [HttpPost]
    public async Task<ActionResult<Expense>> Create(CreateExpenseRequest request)
    {
        if (CurrentUserId == null) return Unauthorized();
        if (!BudgetMonths.IsPlausibleCurrentMonth(request.BudgetYear, request.BudgetMonth))
            return BadRequest("Spending can only be added to the current month.");
        if (request.Amount <= 0) return BadRequest("Amount must be greater than zero.");
        if (request.Note?.Length > 200) return BadRequest("Note is too long.");
        var spentOn = request.SpentOn ?? BudgetMonths.DayWithin(request.BudgetYear, request.BudgetMonth);
        if (spentOn.Year != request.BudgetYear || spentOn.Month != request.BudgetMonth)
            return BadRequest("The date must be in the budget month.");
        if (!BudgetMonths.IsNotInFuture(spentOn)) return BadRequest("Spending can't be dated in the future.");
        if (!await IsActiveCategoryAsync(request.CategoryId)) return BadRequest("Category not found.");

        var expense = Expense.Create(CurrentUserId, request.CategoryId, request.Amount, spentOn, request.Note);
        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = expense.Id }, expense);
    }

    public record SetSpentRequest(int CategoryId, int BudgetYear, int BudgetMonth, decimal Spent);

    // Sets a category's spent total for the month, from the Budget page.
    // Instead of rewriting existing expenses, it records the difference as an
    // adjustment, so the total always equals the sum of the rows behind it.
    [HttpPut("spent")]
    public async Task<IActionResult> SetSpent(SetSpentRequest request)
    {
        if (CurrentUserId == null) return Unauthorized();
        if (!BudgetMonths.IsPlausibleCurrentMonth(request.BudgetYear, request.BudgetMonth))
            return BadRequest("Only the current month's spending can be changed.");
        if (request.Spent < 0) return BadRequest("Spent cannot be negative.");
        if (!await IsActiveCategoryAsync(request.CategoryId)) return BadRequest("Category not found.");

        var currentSpent = await _context.Expenses
            .Where(e => e.CategoryId == request.CategoryId
                && e.BudgetYear == request.BudgetYear
                && e.BudgetMonth == request.BudgetMonth)
            .SumAsync(e => (decimal?)e.Amount) ?? 0;

        var difference = request.Spent - currentSpent;
        if (difference != 0)
        {
            _context.Expenses.Add(Expense.CreateAdjustment(
                CurrentUserId, request.CategoryId, difference, request.BudgetYear, request.BudgetMonth));
            await _context.SaveChangesAsync();
        }
        return NoContent();
    }

    public record UpdateExpenseRequest(int CategoryId, decimal Amount, string? Note = null, DateOnly? SpentOn = null);

    [HttpPut("{id}")]
    public async Task<ActionResult<Expense>> Update(int id, UpdateExpenseRequest request)
    {
        if (CurrentUserId == null) return Unauthorized();

        var expense = await _context.Expenses.FindAsync(id);
        if (expense == null || expense.UserId != CurrentUserId) return NotFound();
        if (expense.IsAdjustment) return BadRequest("Adjustments can't be edited. Change Spent on the Budget page instead.");
        if (request.Amount <= 0) return BadRequest("Amount must be greater than zero.");
        if (request.Note?.Length > 200) return BadRequest("Note is too long.");
        if (request.CategoryId != expense.CategoryId && !await IsActiveCategoryAsync(request.CategoryId))
            return BadRequest("Category not found.");
        if (request.SpentOn is { } date && date != expense.SpentOn)
        {
            if (date.Year != expense.BudgetYear || date.Month != expense.BudgetMonth)
                return BadRequest("The date must stay in the same month.");
            if (!BudgetMonths.IsNotInFuture(date)) return BadRequest("Spending can't be dated in the future.");
        }

        // Only call what changed, so UpdatedAt means something.
        if (request.Amount != expense.Amount) expense.UpdateAmount(request.Amount);
        var newNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        if (newNote != expense.Note) expense.UpdateNote(newNote);
        if (request.CategoryId != expense.CategoryId) expense.MoveToCategory(request.CategoryId);
        if (request.SpentOn is { } newDate && newDate != expense.SpentOn) expense.MoveToDate(newDate);

        await _context.SaveChangesAsync();
        return Ok(expense);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (CurrentUserId == null) return Unauthorized();

        var expense = await _context.Expenses.FindAsync(id);
        if (expense == null || expense.UserId != CurrentUserId) return NotFound();

        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // Checks ownership too: without it, a user could log spending against
    // someone else's category id.
    private Task<bool> IsActiveCategoryAsync(int categoryId) =>
        _context.Categories.AnyAsync(c => c.Id == categoryId && c.UserId == CurrentUserId && !c.IsArchived);
}
