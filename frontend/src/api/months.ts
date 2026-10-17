import { fetchWithAuth } from "./fetchWithAuth";
import type { Todo } from "./todos";
import { monthQuery, type BudgetMonth } from "../utils/month";

export interface BudgetMonthInfo extends BudgetMonth {
  isClosed: boolean;
}

export interface RolloverStatus {
  monthsToClose: BudgetMonthInfo[];
  uncheckedItems: Todo[];
}

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/Months`;

export async function fetchMonths(currentMonth: BudgetMonth): Promise<BudgetMonthInfo[]> {
  const response = await fetchWithAuth(`${BASE_URL}?${monthQuery(currentMonth)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch months");
  }
  return response.json();
}

export async function fetchRolloverStatus(currentMonth: BudgetMonth): Promise<RolloverStatus> {
  const response = await fetchWithAuth(`${BASE_URL}/rollover?${monthQuery(currentMonth)}`);
  if (!response.ok) {
    throw new Error("Failed to check for a new month");
  }
  return response.json();
}

export async function completeRollover(
  currentMonth: BudgetMonth,
  carryOverTodoIds: number[],
): Promise<void> {
  const response = await fetchWithAuth(`${BASE_URL}/rollover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...currentMonth, carryOverTodoIds }),
  });
  // 409 means another window already closed the month — nothing left to do.
  if (!response.ok && response.status !== 409) {
    throw new Error("Failed to start the new month");
  }
}
