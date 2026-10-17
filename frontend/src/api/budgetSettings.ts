import { fetchWithAuth } from "./fetchWithAuth";

export interface BudgetSettings {
  id: number;
  monthlyIncome: number;
  updatedAt: string | null;
}

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/BudgetSettings`;

export async function fetchBudgetSettings(): Promise<BudgetSettings> {
  const response = await fetchWithAuth(BASE_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch budget settings");
  }
  return response.json();
}

export async function updateMonthlyIncome(monthlyIncome: number): Promise<BudgetSettings> {
  const response = await fetchWithAuth(BASE_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ monthlyIncome }),
  });
  if (!response.ok) {
    if (response.status === 400) {
      throw new Error("Monthly income cannot be negative.");
    }
    throw new Error("Failed to save monthly income");
  }
  return response.json();
}
