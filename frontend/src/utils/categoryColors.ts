import { chartColors } from "../theme";

// Color follows the category, not its rank: categories are ordered by id, so
// each keeps its color as amounts change, and every chart agrees on it.
export function getCategoryColors(
  categoryIds: number[],
  mode: "light" | "dark",
): Map<number, string> {
  const palette = chartColors.series[mode];
  const sorted = [...categoryIds].sort((a, b) => a - b);
  return new Map(
    sorted.map((id, index) => [id, palette[index % palette.length]]),
  );
}

// For categories that don't exist yet (picked in the planner, not saved):
// the slots right after the saved ones, which is what they'll get once saved.
export function getColorAfter(
  position: number,
  mode: "light" | "dark",
): string {
  const palette = chartColors.series[mode];
  return palette[position % palette.length];
}

// The "left over" slice: a neutral slate, so it reads as empty space rather
// than as another category.
export const REMAINING_COLOR = { light: "#CBD5E1", dark: "#334155" } as const;
