import { describe, expect, it } from "vitest";
import { reachedThresholds, toCents } from "../src/thresholds";

describe("reachedThresholds", () => {
  const budget = 60_000n; // 600.00

  it("returns nothing below 80%", () => {
    expect(reachedThresholds(budget, 47_999n)).toEqual([]);
  });

  it("includes 80 at exactly 80%", () => {
    expect(reachedThresholds(budget, 48_000n)).toEqual([80]);
  });

  it("returns only 80 between 80% and 100%", () => {
    expect(reachedThresholds(budget, 59_999n)).toEqual([80]);
  });

  it("includes 100 at exactly 100%", () => {
    expect(reachedThresholds(budget, 60_000n)).toEqual([80, 100]);
  });

  it("returns both when over budget (one event can cross both)", () => {
    expect(reachedThresholds(budget, 72_000n)).toEqual([80, 100]);
  });

  it("returns nothing for a zero or negative budget", () => {
    expect(reachedThresholds(0n, 100n)).toEqual([]);
    expect(reachedThresholds(-100n, 100n)).toEqual([]);
  });

  it("returns nothing for negative spending", () => {
    expect(reachedThresholds(budget, -500n)).toEqual([]);
  });

  it("stays exact with huge numbers (beyond Number.MAX_SAFE_INTEGER)", () => {
    const huge = 999_999_999_999_999_99n;
    expect(reachedThresholds(huge, huge - 1n)).toEqual([80]);
    expect(reachedThresholds(huge, huge)).toEqual([80, 100]);
  });

  it("needs integer math: 0.1 + 0.2 style rounding cannot flip the result", () => {
    // 80% of 0.30 is 0.24 exactly; with floats 0.3 * 0.8 = 0.24000000000000002.
    expect(reachedThresholds(toCents("0.30")!, toCents("0.24")!)).toEqual([80]);
  });
});

describe("toCents", () => {
  it.each([
    ["600", 60_000n],
    ["600.5", 60_050n],
    ["600.05", 60_005n],
    ["0.01", 1n],
    ["-3.50", -350n],
    ["999999999999999.99", 99_999_999_999_999_999n],
  ])("parses %s", (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "1,50", " 1.00", "1e5", "-", ".50", "1."])("rejects %j", (input) => {
    expect(toCents(input)).toBeNull();
  });
});
