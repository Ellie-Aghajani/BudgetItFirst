// Calendar dates as "YYYY-MM-DD" strings, the format the API uses for
// SpentOn. Built from local date parts on purpose: toISOString() converts to
// UTC, which turns an evening in Vancouver into the next day.
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Local midnight of that day. new Date("2026-10-21") would be UTC midnight,
// the previous evening in North America.
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Weeks start on Sunday, like most North American calendars.
export function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}
