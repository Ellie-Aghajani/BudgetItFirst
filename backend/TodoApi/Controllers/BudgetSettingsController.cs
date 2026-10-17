using Microsoft.AspNetCore.Mvc;
using TodoApi.Data;
using TodoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BudgetSettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public BudgetSettingsController(AppDbContext context)
    {
        _context = context;
    }

    private string? CurrentUserId => HttpContext.Items["UserId"] as string;

    // A user with no saved settings gets an unsaved default (income 0),
    // so GET never writes to the database.
    [HttpGet]
    public async Task<ActionResult<BudgetSettings>> Get()
    {
        if (CurrentUserId == null) return Unauthorized();

        var settings = await _context.BudgetSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.UserId == CurrentUserId);
        return Ok(settings ?? BudgetSettings.Create(CurrentUserId));
    }

    public record UpdateBudgetSettingsRequest(decimal MonthlyIncome);

    // Upsert: creates the user's settings row on first save, updates it after that.
    [HttpPut]
    public async Task<ActionResult<BudgetSettings>> Update(UpdateBudgetSettingsRequest request)
    {
        if (CurrentUserId == null) return Unauthorized();

        if (request.MonthlyIncome < 0)
        {
            return BadRequest("Monthly income cannot be negative.");
        }

        var settings = await _context.BudgetSettings
            .FirstOrDefaultAsync(b => b.UserId == CurrentUserId);

        if (settings == null)
        {
            settings = BudgetSettings.Create(CurrentUserId, request.MonthlyIncome);
            _context.BudgetSettings.Add(settings);
        }
        else
        {
            settings.UpdateMonthlyIncome(request.MonthlyIncome);
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // The unique index on UserId rejected a second row — another
            // request created this user's settings at the same time.
            return Conflict("Budget settings were updated by another request. Please try again.");
        }

        return Ok(settings);
    }
}
