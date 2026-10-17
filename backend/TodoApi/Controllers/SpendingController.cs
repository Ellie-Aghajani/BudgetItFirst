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
    public async Task<ActionResult<SpendingSummary>> GetSummary()
    {
        if (CurrentUserId == null) return Unauthorized();

        var summary = await _spendingService.GetSummaryAsync(CurrentUserId);
        return Ok(summary);
    }
}
