import { fetchWithAuth } from "./fetchWithAuth";
import { getCurrentMonth, monthQuery } from "../utils/month";

export interface Expense {
  id: number;
  categoryId: number;
  amount: number;
  note: string | null;
  // A correction made by editing Spent on the Budget page; can be negative.
  isAdjustment: boolean;
  budgetYear: number;
  budgetMonth: number;
  createdAt: string;
}

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/Expenses`;

// Current month only, newest first.
export async function fetchExpenses(): Promise<Expense[]> {
  const response = await fetchWithAuth(`${BASE_URL}?${monthQuery(getCurrentMonth())}`);
  if (!response.ok) {
    throw new Error("Failed to fetch spending");
  }
  return response.json();
}

export async function createExpense(categoryId: number, amount: number, note: string): Promise<Expense> {
  const { year, month } = getCurrentMonth();
  const response = await fetchWithAuth(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryId, amount, note, budgetYear: year, budgetMonth: month }),
  });
  if (!response.ok) {
    throw new Error("Failed to add spending");
  }
  return response.json();
}

export async function deleteExpense(id: number): Promise<void> {
  const response = await fetchWithAuth(`${BASE_URL}/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to delete spending");
  }
}

// Sets a category's spent total for the current month. The server records
// the difference as an adjustment instead of changing existing entries.
export async function setCategorySpent(categoryId: number, spent: number): Promise<void> {
  const { year, month } = getCurrentMonth();
  const response = await fetchWithAuth(`${BASE_URL}/spent`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryId, spent, budgetYear: year, budgetMonth: month }),
  });
  if (!response.ok) {
    throw new Error("Failed to update spent");
  }
}

export async function updateExpense(
  id: number,
  changes: { categoryId: number; amount: number; note: string },
): Promise<Expense> {
  const response = await fetchWithAuth(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!response.ok) {
    throw new Error("Failed to update spending");
  }
  return response.json();
}
