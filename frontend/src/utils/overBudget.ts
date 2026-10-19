import type { Expense } from "../api/expenses";
import type { CategorySpending } from "../api/spending";

export interface BudgetBreak {
  categoryName: string;
  budget: number;
  // How far over the category is now, not at the time of the expense.
  overBy: number;
}

// Finds, for each category that's over budget, the expense that took it over:
// walking oldest first, the last one where the running total went from within
// budget to over it. A negative adjustment can bring a category back under,
// so an earlier crossing only counts if the total never dropped back.
export function findBudgetBreakers(
  expenses: Expense[],
  categories: CategorySpending[],
): Map<number, BudgetBreak> {
  const breakers = new Map<number, BudgetBreak>();
  const oldestFirst = [...expenses].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const category of categories) {
    if (category.budget <= 0 || category.spent <= category.budget) continue;

    let runningTotal = 0;
    let breakerId: number | null = null;
    for (const expense of oldestFirst) {
      if (expense.categoryId !== category.categoryId) continue;
      const before = runningTotal;
      runningTotal += expense.amount;
      if (before <= category.budget && runningTotal > category.budget) breakerId = expense.id;
      else if (runningTotal <= category.budget) breakerId = null;
    }

    if (breakerId !== null) {
      breakers.set(breakerId, {
        categoryName: category.name,
        budget: category.budget,
        overBy: category.spent - category.budget,
      });
    }
  }
  return breakers;
}
