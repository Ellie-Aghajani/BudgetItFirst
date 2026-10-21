import { fetchWithAuth } from "./fetchWithAuth";

const BASE_URL = `${import.meta.env.VITE_API_URL}/api/Account`;

// Deletes all of the user's budgeting data; the account stays.
export async function clearAllData(): Promise<void> {
  const response = await fetchWithAuth(`${BASE_URL}/data`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Couldn't clear your data. Please try again.");
  }
}

// Deletes the data and the account.
export async function deleteAccount(): Promise<void> {
  const response = await fetchWithAuth(BASE_URL, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Couldn't delete your account. Please try again.");
  }
}
