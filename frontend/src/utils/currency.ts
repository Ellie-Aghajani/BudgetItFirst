const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

// Parses a cost typed into a form field. Empty means 0; anything that isn't
// a non-negative number returns null so the form can show it as invalid.
export function parseCost(input: string): number | null {
  if (input.trim() === "") return 0;
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

// JS numbers are binary floating point (199.99 + 0.01 isn't exactly 200),
// so money comparisons are done on values rounded to whole cents.
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
