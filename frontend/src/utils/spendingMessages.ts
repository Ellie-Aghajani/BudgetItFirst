import type { SpendingSummary } from "../api/spending";
import { formatCurrency } from "./currency";

export interface SavedMessage {
  text: string;
  severity: "success" | "warning";
}

// The confirmation after logging spending. Warns (doesn't block) when the
// payment puts its category over budget. Pass the totals from before the
// save: they don't include this payment yet.
export function buildSavedMessage(
  spending: SpendingSummary | undefined,
  categoryId: number,
  amount: number,
): SavedMessage {
  const category = spending?.categories.find(
    (c) => c.categoryId === categoryId,
  );
  const added = `${formatCurrency(amount)} added to ${category?.name ?? "spending"}.`;
  if (!category || category.budget <= 0)
    return { text: added, severity: "success" };

  const overBy = category.spent + amount - category.budget;
  if (overBy <= 0) return { text: added, severity: "success" };

  const wasAlreadyOver = category.spent > category.budget;
  return {
    severity: "warning",
    text: wasAlreadyOver
      ? `${added} ${category.name} is now ${formatCurrency(overBy)} over its ${formatCurrency(category.budget)} budget.`
      : `${added} This puts ${category.name} ${formatCurrency(overBy)} over its ${formatCurrency(category.budget)} budget.`,
  };
}
