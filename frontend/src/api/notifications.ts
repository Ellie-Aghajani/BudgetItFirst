import { fetchWithAuth } from "./fetchWithAuth";

export interface BudgetNotification {
  id: string;
  categoryId: number;
  categoryName: string;
  threshold: 80 | 100;
  budgetYear: number;
  budgetMonth: number;
  message: string;
  readAt: string | null;
  createdAt: string;
}

// A separate service from the main API. When the variable is not set (for
// example before it's deployed), the bell is hidden and nothing is fetched.
const API_URL = import.meta.env.VITE_NOTIFICATIONS_API_URL as string | undefined;
export const isNotificationsEnabled = Boolean(API_URL);
const BASE_URL = `${API_URL}/notifications`;

export async function fetchNotifications(): Promise<BudgetNotification[]> {
  const response = await fetchWithAuth(`${BASE_URL}?limit=20`);
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  const body: { items: BudgetNotification[] } = await response.json();
  return body.items;
}

export async function markNotificationRead(id: string): Promise<void> {
  const response = await fetchWithAuth(`${BASE_URL}/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error("Failed to mark the notification as read");
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const response = await fetchWithAuth(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete the notification");
  }
}
