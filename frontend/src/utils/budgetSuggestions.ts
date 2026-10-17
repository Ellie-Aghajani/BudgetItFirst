export type BudgetGroup = "Needs" | "Wants" | "Savings";

export interface PresetCategory {
  name: string;
  group: BudgetGroup;
  // Suggested % of income if every preset were picked. Each group's weights
  // add up to its 50/30/20 share (the split from Quicken's budgeting guide).
  // The split inside a group is our own estimate. Housing > Transportation >
  // Groceries follows Statistics Canada's spending order (shelter,
  // transportation, food). These are plain constants, so tune them freely.
  weight: number;
  isCore: boolean; // pre-checked for a new user
}

export const BUDGET_GROUPS: { group: BudgetGroup; guideline: number }[] = [
  { group: "Needs", guideline: 50 },
  { group: "Wants", guideline: 30 },
  { group: "Savings", guideline: 20 },
];

export const PRESET_CATEGORIES: PresetCategory[] = [
  // Needs: 50
  { name: "Housing", group: "Needs", weight: 25, isCore: true },
  { name: "Transportation", group: "Needs", weight: 8, isCore: true },
  { name: "Groceries", group: "Needs", weight: 7, isCore: true },
  { name: "Utilities", group: "Needs", weight: 4, isCore: true },
  { name: "Insurance", group: "Needs", weight: 2, isCore: true },
  { name: "Healthcare", group: "Needs", weight: 2, isCore: true },
  { name: "Childcare", group: "Needs", weight: 2, isCore: false },
  // Wants: 30
  { name: "Dining Out", group: "Wants", weight: 7, isCore: true },
  { name: "Entertainment", group: "Wants", weight: 5, isCore: true },
  { name: "Shopping", group: "Wants", weight: 5, isCore: true },
  { name: "Travel", group: "Wants", weight: 4, isCore: false },
  { name: "Subscriptions", group: "Wants", weight: 3, isCore: false },
  { name: "Personal Care", group: "Wants", weight: 3, isCore: false },
  { name: "Gifts", group: "Wants", weight: 3, isCore: false },
  // Savings: 20
  { name: "Emergency Fund", group: "Savings", weight: 8, isCore: true },
  { name: "Retirement", group: "Savings", weight: 8, isCore: true },
  { name: "Debt Payoff", group: "Savings", weight: 4, isCore: false },
];

// Rescales the selected presets' weights so they always add up to 100%:
// weight / totalSelectedWeight * 100. Returns category name -> percent.
export function getSuggestedPercents(selectedNames: Set<string>): Map<string, number> {
  const selected = PRESET_CATEGORIES.filter((p) => selectedNames.has(p.name));
  const totalWeight = selected.reduce((sum, p) => sum + p.weight, 0);

  const percents = new Map<string, number>();
  for (const preset of selected) {
    percents.set(preset.name, totalWeight === 0 ? 0 : (preset.weight / totalWeight) * 100);
  }
  return percents;
}
