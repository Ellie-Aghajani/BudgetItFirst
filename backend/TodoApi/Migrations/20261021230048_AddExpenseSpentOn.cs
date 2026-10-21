using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TodoApi.Migrations
{
    /// <inheritdoc />
    public partial class AddExpenseSpentOn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "SpentOn",
                table: "Expenses",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            // Existing rows: the day they were logged, kept inside their
            // budget month (the entity requires SpentOn to be in it).
            migrationBuilder.Sql("""
                UPDATE Expenses
                SET SpentOn = CASE
                    WHEN YEAR(CreatedAt) = BudgetYear AND MONTH(CreatedAt) = BudgetMonth
                        THEN CAST(CreatedAt AS date)
                    ELSE DATEFROMPARTS(BudgetYear, BudgetMonth, 1)
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SpentOn",
                table: "Expenses");
        }
    }
}
