import { describe, expect, it } from "vitest";
import { buildNotifications, parseEvent } from "../src/consumer";

// Shaped like what the .NET API sends (7 fractional digits on the timestamp).
const validEvent = {
  eventId: "8f14e45f-ceea-4e7a-9d2b-1c5b6a7d8e9f",
  eventType: "ExpenseChanged",
  schemaVersion: 1,
  occurredAt: "2026-10-25T17:04:00.1234567Z",
  userId: "firebase-uid",
  categoryId: 12,
  categoryName: "Groceries",
  categoryBudget: "600.00",
  categorySpentAfter: "512.40",
  budgetYear: 2026,
  budgetMonth: 10,
};

const asBody = (value: unknown) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value));

describe("parseEvent", () => {
  it("accepts a valid event", () => {
    const result = parseEvent(asBody(validEvent));
    expect(result).toEqual({ ok: true, event: validEvent });
  });

  it("rejects a body that is not JSON", () => {
    expect(parseEvent(asBody("{not json"))).toMatchObject({ ok: false, reason: "body is not valid JSON" });
  });

  it.each([null, 42, "text", []])("rejects JSON that is not an object: %j", (value) => {
    expect(parseEvent(asBody(JSON.stringify(value))).ok).toBe(false);
  });

  it("rejects an unknown schemaVersion with a clear reason", () => {
    const result = parseEvent(asBody({ ...validEvent, schemaVersion: 2 }));
    expect(result).toMatchObject({ ok: false, reason: "unknown schemaVersion: 2" });
  });

  it("rejects a missing field", () => {
    const { userId: _removed, ...withoutUser } = validEvent;
    const result = parseEvent(asBody(withoutUser));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("userId");
  });

  it.each([
    ["money as a number", { categoryBudget: 600 }],
    ["money with 3 decimals", { categorySpentAfter: "1.234" }],
    ["month 13", { budgetMonth: 13 }],
    ["wrong event type", { eventType: "ExpenseDeleted" }],
    ["bad uuid", { eventId: "not-a-uuid" }],
  ])("rejects %s", (_name, override) => {
    expect(parseEvent(asBody({ ...validEvent, ...override })).ok).toBe(false);
  });
});

describe("buildNotifications", () => {
  const event = (spent: string) => {
    const result = parseEvent(asBody({ ...validEvent, categorySpentAfter: spent }));
    if (!result.ok) throw new Error(result.reason);
    return result.event;
  };

  it("creates nothing below 80%", () => {
    expect(buildNotifications(event("479.99"))).toEqual([]);
  });

  it("creates one at 80%", () => {
    const [only, ...rest] = buildNotifications(event("512.40"));
    expect(rest).toEqual([]);
    expect(only).toMatchObject({ userId: "firebase-uid", categoryId: 12, threshold: 80, budgetYear: 2026, budgetMonth: 10 });
    expect(only!.message).toContain("80%");
  });

  it("creates both when one change jumps past 100%", () => {
    expect(buildNotifications(event("720.00")).map((n) => n.threshold)).toEqual([80, 100]);
  });
});
