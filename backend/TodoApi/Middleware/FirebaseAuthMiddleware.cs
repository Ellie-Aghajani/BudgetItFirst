using FirebaseAdmin.Auth;

namespace TodoApi.Middleware;

// Runs on every incoming request. Reads the Firebase ID token from the
// Authorization header, verifies it with Firebase, and — if valid —
// stores the authenticated user's UID on HttpContext.Items so
// controllers can read it without knowing anything about tokens.
public class FirebaseAuthMiddleware
{
    private readonly RequestDelegate _next;

    public FirebaseAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var authHeader = context.Request.Headers.Authorization.ToString();

        if (authHeader.StartsWith("Bearer "))
        {
            var idToken = authHeader["Bearer ".Length..];

            try
            {
                var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
                context.Items["UserId"] = decodedToken.Uid;
            }
            catch (FirebaseAuthException)
            {
                // Invalid or expired token: leave UserId unset. Controllers
                // that require auth will reject the request themselves.
            }
        }

        await _next(context);
    }
}