// Pure functions: no I/O, no clock, so they are easy to unit test.

export const THRESHOLDS = [80, 100] as const;
export type Threshold = (typeof THRESHOLDS)[number];

// Money arrives as strings like "512.40" or "-3.5" and becomes integer cents.
// BigInt, not Number: Number loses precision above 2^53 and floating point
// gets 0.1 + 0.2 wrong. Returns null if the string is not a money amount.
export function toCents(amount: string): bigint | null {
  const match = /^(-?)(\d{1,15})(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) return null;
  const [, sign, whole, fraction = ""] = match;
  const cents = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  return sign === "-" ? -cents : cents;
}

// Which thresholds the spending has reached. "Reached" means >=, so exactly
// 80% counts. spent >= budget * 80% is written as spent * 100 >= budget * 80,
// so everything stays in integers.
export function reachedThresholds(budgetCents: bigint, spentCents: bigint): Threshold[] {
  if (budgetCents <= 0n) return [];
  return THRESHOLDS.filter((t) => spentCents * 100n >= budgetCents * BigInt(t));
}
