namespace TodoApi.Services;

public static class BudgetMonths
{
    public static bool IsValid(int year, int month) =>
        month >= 1 && month <= 12 && year >= 2000 && year <= 2100;

    // The client sends its own local month, which can't be trusted blindly —
    // otherwise a request claiming it's 2030 would close years of months early.
    // Time zones only ever put the client's local date within a day of UTC,
    // so its month is either the server's month or the one right next to it.
    public static bool IsPlausibleCurrentMonth(int year, int month)
    {
        if (!IsValid(year, month)) return false;
        var now = DateTime.UtcNow;
        var difference = (year * 12 + month) - (now.Year * 12 + now.Month);
        return Math.Abs(difference) <= 1;
    }
}
