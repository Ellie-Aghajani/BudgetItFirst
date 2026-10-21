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

    // Today if it's in that month; otherwise the nearest day of it.
    public static DateOnly DayWithin(int year, int month)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var first = new DateOnly(year, month, 1);
        var last = first.AddMonths(1).AddDays(-1);
        return today < first ? first : today > last ? last : today;
    }

    // Spending can't be dated in the future. One day of slack, because the
    // client's local date can be a day ahead of UTC.
    public static bool IsNotInFuture(DateOnly date) =>
        date <= DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);
}
