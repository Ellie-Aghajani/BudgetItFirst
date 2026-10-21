using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Mvc;
using TodoApi.Services;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountController : ControllerBase
{
    // Deleting the account needs a sign-in from the last few minutes, so a
    // token stolen or left open on a shared computer can't do it.
    private static readonly TimeSpan RecentSignInWindow = TimeSpan.FromMinutes(5);

    private readonly IAccountService _accountService;

    public AccountController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    private string? CurrentUserId => HttpContext.Items["UserId"] as string;
    private DateTimeOffset? AuthTime => HttpContext.Items["AuthTime"] as DateTimeOffset?;

    // Clears the user's data but keeps the account, like starting over.
    [HttpDelete("data")]
    public async Task<IActionResult> DeleteData()
    {
        if (CurrentUserId == null) return Unauthorized();

        await _accountService.DeleteAllDataAsync(CurrentUserId);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAccount()
    {
        if (CurrentUserId == null) return Unauthorized();
        if (AuthTime == null || DateTimeOffset.UtcNow - AuthTime > RecentSignInWindow)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "Please confirm your sign-in and try again.");
        }

        // Data first: if deleting the Firebase user then fails, the user can
        // still sign in and retry. The other order could leave data behind
        // that nobody can reach or delete.
        await _accountService.DeleteAllDataAsync(CurrentUserId);
        await FirebaseAuth.DefaultInstance.DeleteUserAsync(CurrentUserId);
        return NoContent();
    }
}
