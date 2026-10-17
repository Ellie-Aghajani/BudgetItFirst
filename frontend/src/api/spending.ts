import { fetchWithAuth } from "./fetchWithAuth";
import { monthQuery, type BudgetMonth } from "../utils/month";

export interface CategorySpending {
  categoryId: number;
  name: string;
  budget: number;
  // Logged expenses: what was actually paid.
  spent: number;
  // The shopping list's estimates. Never included in spent or remaining.
  estimated: number;
  remaining: number;
  percentUsed: number | null;
  isOverBudget: boolean;
}

export interface SpendingSummary {
  monthlyIncome: number;
  totalBudget: number;
  totalSpent: number;
  remainingIncome: number;
  percentOfIncomeUsed: number | null;
  categories: CategorySpending[];
}

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/Spending`;

// A closed month returns its frozen snapshot; the current month is live.
export async function fetchSpending(budgetMonth: BudgetMonth): Promise<SpendingSummary> {
  const response = await fetchWithAuth(`${BASE_URL}?${monthQuery(budgetMonth)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch spending summary");
  }
  return response.json();
}
