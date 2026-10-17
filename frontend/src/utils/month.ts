export interface BudgetMonth {
  year: number;
  month: number; // 1–12, matching the API (JS Date months are 0–11)
}

// The user's *local* month. The server stores whatever month the client
// sends, so this is what decides which month an item belongs to.
export function getCurrentMonth(): BudgetMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function formatMonth({ year, month }: BudgetMonth): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function monthQuery({ year, month }: BudgetMonth): string {
  return `year=${year}&month=${month}`;
}
