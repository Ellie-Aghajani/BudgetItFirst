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
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSingleton<IActivityLogger, TodoActivityLogger>();
builder.Services.AddScoped<RequestAuditor>();

var app = builder.Build();
app.UseCors("AllowFrontendDev");
app.UseMiddleware<FirebaseAuthMiddleware>();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
