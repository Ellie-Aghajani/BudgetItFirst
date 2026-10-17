import { useState } from "react";
import type { CategorySpending } from "../api/spending";
import { useCurrentSpending } from "./useCurrentSpending";
import { roundToCents } from "../utils/currency";

export interface OverBudgetWarning {
  categoryName: string;
  budget: number;
  newEstimate: number;
  overBy: number;
}

export function getOverBudgetWarning(
  category: CategorySpending | undefined,
  costIncrease: number,
): OverBudgetWarning | null {
  // A budget of 0 means "not set yet", so there's nothing to warn about.
  if (!category || category.budget <= 0 || costIncrease <= 0) return null;

  // Compares the shopping list's estimate (not logged spending) to the
  // budget: "if I buy everything on my list, will it fit?"
  const newEstimate = roundToCents(category.estimated + costIncrease);
  if (newEstimate <= category.budget) return null;

  return {
    categoryName: category.name,
    budget: category.budget,
    newEstimate,
    overBy: roundToCents(newEstimate - category.budget),
  };
}

// Wraps a save so it shows the over-budget dialog first when needed.
// The warning never blocks: the user can always choose "Save anyway".
export function useOverBudgetWarning() {
  const { data: spending } = useCurrentSpending();
  const [pending, setPending] = useState<{
    warning: OverBudgetWarning;
    save: () => void;
  } | null>(null);

  function saveWithWarning(categoryId: number, costIncrease: number, save: () => void) {
    const category = spending?.categories.find((c) => c.categoryId === categoryId);
    const warning = getOverBudgetWarning(category, costIncrease);
    if (warning === null) {
      save();
      return;
    }
    setPending({ warning, save });
  }

  return {
    saveWithWarning,
    dialogProps: {
      warning: pending?.warning ?? null,
      onCancel: () => setPending(null),
      onConfirm: () => {
        pending?.save();
        setPending(null);
      },
    },
  };
}
