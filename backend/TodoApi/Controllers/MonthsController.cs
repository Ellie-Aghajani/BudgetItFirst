using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Services;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MonthsController : ControllerBase
{
    private readonly IMonthService _monthService;

    public MonthsController(IMonthService monthService)
    {
        _monthService = monthService;
    }

    private string? CurrentUserId => HttpContext.Items["UserId"] as string;

    // year/month are the client's *current* local month.
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BudgetMonthInfo>>> GetMonths([FromQuery] int year, [FromQuery] int month)
    {
        if (CurrentUserId == null) return Unauthorized();
        if (!BudgetMonths.IsPlausibleCurrentMonth(year, month)) return BadRequest("Invalid current month.");

        return Ok(await _monthService.GetMonthsAsync(CurrentUserId, year, month));
    }

    [HttpGet("rollover")]
    public async Task<ActionResult<RolloverStatus>> GetRolloverStatus([FromQuery] int year, [FromQuery] int month)
    {
        if (CurrentUserId == null) return Unauthorized();
        if (!BudgetMonths.IsPlausibleCurrentMonth(year, month)) return BadRequest("Invalid current month.");

        return Ok(await _monthService.GetRolloverStatusAsync(CurrentUserId, year, month));
    }

    public record CompleteRolloverRequest(int Year, int Month, List<int>? CarryOverTodoIds);

    [HttpPost("rollover")]
    public async Task<IActionResult> CompleteRollover(CompleteRolloverRequest request)
    {
        if (CurrentUserId == null) return Unauthorized();
        if (!BudgetMonths.IsPlausibleCurrentMonth(request.Year, request.Month))
        {
            return BadRequest("Invalid current month.");
        }

        try
        {
            await _monthService.CompleteRolloverAsync(
                CurrentUserId,
                request.Year,
                request.Month,
                request.CarryOverTodoIds ?? []);
        }
        catch (DbUpdateException)
        {
            // The unique index on (UserId, Year, Month) rejected a duplicate
            // snapshot — another window already closed this month.
            return Conflict("This month was already closed by another request.");
        }

        return NoContent();
    }
}
