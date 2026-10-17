import { fetchWithAuth } from "./fetchWithAuth";
import { getCurrentMonth, monthQuery } from "../utils/month";

export interface Category {
  id: number;
  name: string;
  budget: number;
}

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/Categories`;

export async function fetchCategories(): Promise<Category[]> {
  const response = await fetchWithAuth(BASE_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }
  return response.json();
}

export async function createCategory(name: string, budget = 0): Promise<Category> {
  const response = await fetchWithAuth(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, budget }),
  });
  if (!response.ok) {
    throw new Error("Failed to create category");
  }
  return response.json();
}

// Also deletes this month's items in the category. Earlier months keep
// theirs, and the server archives the category so their history stays intact.
export async function deleteCategory(id: number): Promise<void> {
  const response = await fetchWithAuth(
    `${BASE_URL}/${id}?${monthQuery(getCurrentMonth())}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    throw new Error("Failed to delete category");
  }
}

export async function renameCategory(id: number, name: string): Promise<Category> {
  const response = await fetchWithAuth(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error("Failed to rename category");
  }
  return response.json();
}
export async function updateCategoryBudget(
  id: number,
  name: string,
  budget: number,
): Promise<Category> {
  const response = await fetchWithAuth(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, budget }),
  });
  if (!response.ok) {
    throw new Error("Failed to update category budget");
  }
  return response.json();
}
