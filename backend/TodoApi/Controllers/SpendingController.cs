using Microsoft.AspNetCore.Mvc;
using TodoApi.Services;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SpendingController : ControllerBase
{
    private readonly ISpendingService _spendingService;

    public SpendingController(ISpendingService spendingService)
    {
        _spendingService = spendingService;
    }

    private string? CurrentUserId => HttpContext.Items["UserId"] as string;

    [HttpGet]
    public async Task<ActionResult<SpendingSummary>> GetSummary([FromQuery] int year, [FromQuery] int month)
    {
        if (CurrentUserId == null) return Unauthorized();
        if (!BudgetMonths.IsValid(year, month)) return BadRequest("Invalid month.");

        var summary = await _spendingService.GetSummaryAsync(CurrentUserId, year, month);
        return Ok(summary);
    }
}
