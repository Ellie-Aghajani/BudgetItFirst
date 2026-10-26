using System.Globalization;
using System.Text.Json;
using TodoApi.Services;

namespace TodoApi.Tests;

public class ExpenseChangedEventTests
{
    private static ExpenseChangedEvent? Create(decimal budget = 600m, decimal spent = 512.4m) =>
        ExpenseChangedEvent.Create("user-1", 12, "Groceries", budget, spent, 2026, 10);

    [Fact]
    public void Create_FillsTheContractFields()
    {
        var evt = Create()!;

        Assert.NotEqual(Guid.Empty, evt.EventId);
        Assert.Equal("ExpenseChanged", evt.EventType);
        Assert.Equal(1, evt.SchemaVersion);
        Assert.Equal(DateTimeKind.Utc, evt.OccurredAt.Kind);
        Assert.Equal("user-1", evt.UserId);
        Assert.Equal(12, evt.CategoryId);
        Assert.Equal("Groceries", evt.CategoryName);
        Assert.Equal(2026, evt.BudgetYear);
        Assert.Equal(10, evt.BudgetMonth);
    }

    [Fact]
    public void Create_SendsMoneyAsTwoDecimalStrings()
    {
        var evt = Create(budget: 600m, spent: 512.4m)!;

        Assert.Equal("600.00", evt.CategoryBudget);
        Assert.Equal("512.40", evt.CategorySpentAfter);
    }

    [Fact]
    public void Create_UsesADotForDecimals_WhateverTheServerCulture()
    {
        var original = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("fr-FR");
            Assert.Equal("512.40", Create()!.CategorySpentAfter);
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public void Create_GivesEachEventANewId()
    {
        Assert.NotEqual(Create()!.EventId, Create()!.EventId);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Create_ReturnsNull_WhenTheCategoryHasNoBudget(decimal budget)
    {
        Assert.Null(Create(budget: budget));
    }

    [Fact]
    public void Create_Throws_WhenUserIdIsMissing()
    {
        Assert.Throws<ArgumentException>(() =>
            ExpenseChangedEvent.Create(" ", 12, "Groceries", 600m, 10m, 2026, 10));
    }

    // The Node service reads these exact camelCase names.
    [Fact]
    public void Serialize_UsesTheContractJsonNames()
    {
        var json = JsonSerializer.Serialize(Create(), new JsonSerializerOptions(JsonSerializerDefaults.Web));
        using var doc = JsonDocument.Parse(json);
        var names = doc.RootElement.EnumerateObject().Select(p => p.Name).ToHashSet();

        string[] expected =
        [
            "eventId", "eventType", "schemaVersion", "occurredAt", "userId", "categoryId",
            "categoryName", "categoryBudget", "categorySpentAfter", "budgetYear", "budgetMonth"
        ];
        Assert.True(names.SetEquals(expected), $"Got: {string.Join(", ", names)}");
        Assert.Equal(JsonValueKind.String, doc.RootElement.GetProperty("categoryBudget").ValueKind);
    }
}
