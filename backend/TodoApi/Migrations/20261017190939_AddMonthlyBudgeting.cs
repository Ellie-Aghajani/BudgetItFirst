using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TodoApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMonthlyBudgeting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Todos",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<int>(
                name: "BudgetMonth",
                table: "Todos",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BudgetYear",
                table: "Todos",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Hand-written: existing items get the month they were created in
            // (UTC, the best we have for rows saved before this column existed).
            migrationBuilder.Sql(
                "UPDATE Todos SET BudgetYear = YEAR(CreatedAt), BudgetMonth = MONTH(CreatedAt);");

            migrationBuilder.CreateTable(
                name: "MonthlyReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    MonthlyIncome = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonthlyReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MonthlyReportCategory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MonthlyReportId = table.Column<int>(type: "int", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    CategoryName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Budget = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Spent = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonthlyReportCategory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MonthlyReportCategory_MonthlyReports_MonthlyReportId",
                        column: x => x.MonthlyReportId,
                        principalTable: "MonthlyReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Todos_UserId_BudgetYear_BudgetMonth",
                table: "Todos",
                columns: new[] { "UserId", "BudgetYear", "BudgetMonth" });

            migrationBuilder.CreateIndex(
                name: "IX_MonthlyReportCategory_MonthlyReportId",
                table: "MonthlyReportCategory",
                column: "MonthlyReportId");

            migrationBuilder.CreateIndex(
                name: "IX_MonthlyReports_UserId_Year_Month",
                table: "MonthlyReports",
                columns: new[] { "UserId", "Year", "Month" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MonthlyReportCategory");

            migrationBuilder.DropTable(
                name: "MonthlyReports");

            migrationBuilder.DropIndex(
                name: "IX_Todos_UserId_BudgetYear_BudgetMonth",
                table: "Todos");

            migrationBuilder.DropColumn(
                name: "BudgetMonth",
                table: "Todos");

            migrationBuilder.DropColumn(
                name: "BudgetYear",
                table: "Todos");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Todos",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
