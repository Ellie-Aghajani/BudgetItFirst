using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.Repositories;
using TodoApi.Services;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using TodoApi.Middleware;

var builder = WebApplication.CreateBuilder(args);


var firebaseCredentialsJson = Environment.GetEnvironmentVariable("FIREBASE_CREDENTIALS_JSON");

var credential = !string.IsNullOrEmpty(firebaseCredentialsJson)
    ? GoogleCredential.FromJson(firebaseCredentialsJson)
    : GoogleCredential.FromFile("firebase-service-account.json");

FirebaseApp.Create(new AppOptions
{
    Credential = credential,
    ProjectId = "todo-85812",
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontendDev", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;
            var uri = new Uri(origin);
            return uri.Host == "localhost"
                || uri.Host == "todo-fullstack-electron.vercel.app"
                || uri.Host == "budgetitfirst.com"
                || uri.Host == "www.budgetitfirst.com";
        })
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null
        )
    ));
builder.Services.AddScoped<ITodoRepository, TodoRepository>();
builder.Services.AddScoped<ISpendingService, SpendingService>();
builder.Services.AddScoped<IMonthService, MonthService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSingleton<IActivityLogger, TodoActivityLogger>();
builder.Services.AddScoped<RequestAuditor>();

// Events for the notification service. Off by default: production (Render)
// has no RabbitMQ, so it gets the no-op publisher and behaves as before.
// A typo in the config fails at startup instead of silently sending nothing.
var eventOptions = builder.Configuration.GetSection(EventOptions.SectionName).Get<EventOptions>() ?? new EventOptions();
switch (eventOptions.Provider.ToLowerInvariant())
{
    case "none":
        builder.Services.AddSingleton<IEventPublisher, NoOpEventPublisher>();
        break;
    case "rabbitmq":
        if (string.IsNullOrWhiteSpace(eventOptions.RabbitMq.Uri))
            throw new InvalidOperationException("Events:RabbitMq:Uri is required when Events:Provider is \"rabbitmq\".");
        builder.Services.AddSingleton(eventOptions.RabbitMq);
        builder.Services.AddSingleton<IEventPublisher, RabbitMqEventPublisher>();
        break;
    default:
        throw new InvalidOperationException($"Unknown Events:Provider \"{eventOptions.Provider}\". Use \"none\" or \"rabbitmq\".");
}

var app = builder.Build();
app.UseCors("AllowFrontendDev");
// "/" shows wwwroot/index.html: what this server is and how to use the app.
// Before the auth middleware, so a public page doesn't verify tokens.
// UseDefaultFiles only rewrites "/" to "/index.html"; UseStaticFiles serves it.
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseMiddleware<FirebaseAuthMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

// No auth, no user data: just "is the API up, and can it reach the database?"
// The frontend calls it as soon as the app opens, so a sleeping server and
// database start waking up while the user is still signing in.
app.MapGet("/api/health", async (AppDbContext db) =>
    await db.Database.CanConnectAsync() ? Results.Ok("ok") : Results.StatusCode(503));

app.Run();
