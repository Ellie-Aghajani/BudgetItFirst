import { fetchWithAuth } from "./fetchWithAuth";
import { getCurrentMonth, monthQuery } from "../utils/month";

export interface Todo {
  id: number;
  title: string;
  isComplete: boolean;
  categoryId: number;
  estimatedCost: number;
  createdAt: string;
  budgetYear: number;
  budgetMonth: number;
}

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/Todos`;

// The shopping list is always the current month's items.
export async function fetchTodos(): Promise<Todo[]> {
  const response = await fetchWithAuth(`${BASE_URL}?${monthQuery(getCurrentMonth())}`);
  if (!response.ok) {
    throw new Error("Failed to fetch todos");
  }
  return response.json();
}

export async function createTodo(
  title: string,
  categoryId: number,
  estimatedCost = 0,
): Promise<Todo> {
  const { year, month } = getCurrentMonth();
  const response = await fetchWithAuth(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      categoryId,
      estimatedCost,
      budgetYear: year,
      budgetMonth: month,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to create todo");
  }
  return response.json();
}

export async function toggleTodo(todo: Todo): Promise<Todo> {
  const response = await fetchWithAuth(`${BASE_URL}/${todo.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...todo, isComplete: !todo.isComplete }),
  });
  if (!response.ok) {
    throw new Error("Failed to update todo");
  }
  return response.json();
}

export async function deleteTodo(id: number): Promise<void> {
  const response = await fetchWithAuth(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete todo");
  }
}

export async function updateTodo(
  todo: Todo,
  changes: { title: string; estimatedCost: number },
): Promise<Todo> {
  const response = await fetchWithAuth(`${BASE_URL}/${todo.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...todo, ...changes }),
  });
  if (!response.ok) {
    throw new Error("Failed to update todo");
  }
  return response.json();
}

export async function deleteAllTodos(): Promise<void> {
  const response = await fetchWithAuth(`${BASE_URL}?${monthQuery(getCurrentMonth())}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete all todos");
  }
}
