import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, isAllowedOrigin } from "../src/api";
import { createLogger } from "../src/logger";

// No MongoDB in unit tests: the list query returns an empty page, and
// findOneAndUpdate finds a document only for OWN_ID owned by user-a.
// vi.mock runs before the imports, so its variables must be vi.hoisted too.
const { OWN_ID, findOneAndUpdate } = vi.hoisted(() => {
  const OWN_ID = "6ae0c6e1db3eaefd0bfd17d3";
  const findOneAndUpdate = vi.fn(async (filter: { _id: string; userId: string }) =>
    filter._id === OWN_ID && filter.userId === "user-a" ? { id: OWN_ID } : null,
  );
  return { OWN_ID, findOneAndUpdate };
});
vi.mock("../src/models", () => ({
  Notification: { find: () => ({ sort: () => ({ limit: async () => [] }) }), findOneAndUpdate },
}));

const SITES = ["https://www.budgetitfirst.com", "https://budgetitfirst.com"];
let server: Server | undefined;

async function start(rateLimitPerMinute = 60) {
  const app = createApp({
    verify: async (token) => `user-${token}`,
    isReady: () => true,
    log: createLogger("fatal"),
    corsOrigins: SITES,
    rateLimitPerMinute,
  });
  server = app.listen(0);
  await new Promise((resolve) => server!.once("listening", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(() => {
  findOneAndUpdate.mockClear();
  server?.close();
  server = undefined;
});

describe("isAllowedOrigin", () => {
  it.each([
    ["https://www.budgetitfirst.com", true],
    ["https://budgetitfirst.com", true],
    ["http://localhost:5174", true], // Vite
    ["http://localhost:51234", true], // Electron's built-in server, random port
    ["http://budgetitfirst.com", false], // not https
    ["https://evil.com", false],
    ["https://budgetitfirst.com.evil.com", false],
    ["https://localhost.evil.com", false],
    ["null", false], // file:// pages and sandboxed iframes
  ])("%s -> %s", (origin, expected) => {
    expect(isAllowedOrigin(origin, SITES)).toBe(expected);
  });
});

describe("HTTP API", () => {
  it("answers a preflight from an allowed site", async () => {
    const base = await start();
    const res = await fetch(`${base}/notifications/abc/read`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://www.budgetitfirst.com",
        "Access-Control-Request-Method": "PATCH",
        "Access-Control-Request-Headers": "authorization",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://www.budgetitfirst.com");
    expect(res.headers.get("access-control-allow-methods")).toContain("PATCH");
  });

  it("gives no CORS header to another site, so the browser blocks it", async () => {
    const base = await start();
    const res = await fetch(`${base}/healthz`, { headers: { Origin: "https://evil.com" } });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("sets helmet's security headers", async () => {
    const base = await start();
    const res = await fetch(`${base}/healthz`);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("rate-limits per user, not per IP", async () => {
    const base = await start(2);
    const get = (token: string) => fetch(`${base}/notifications`, { headers: { Authorization: `Bearer ${token}` } });

    expect((await get("a")).status).toBe(200);
    expect((await get("a")).status).toBe(200);
    expect((await get("a")).status).toBe(429);
    // Same IP, different user: still allowed.
    expect((await get("b")).status).toBe(200);
  });

  it("checks the token before counting, so anonymous calls get 401", async () => {
    const base = await start(1);
    expect((await fetch(`${base}/notifications`)).status).toBe(401);
    expect((await fetch(`${base}/notifications`)).status).toBe(401);
  });

  describe("DELETE /notifications/:id", () => {
    const del = (base: string, id: string, token = "a") =>
      fetch(`${base}/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });

    it("soft-deletes the user's own notification: 204, and only sets dismissedAt", async () => {
      const base = await start();
      expect((await del(base, OWN_ID)).status).toBe(204);
      const [filter, update] = findOneAndUpdate.mock.calls[0] as unknown as [object, unknown];
      expect(filter).toEqual({ _id: OWN_ID, userId: "user-a" });
      expect(JSON.stringify(update)).toContain("dismissedAt");
    });

    it("returns 404 for another user's notification (does not reveal it exists)", async () => {
      const base = await start();
      expect((await del(base, OWN_ID, "b")).status).toBe(404);
    });

    it("returns 404 for a malformed id without touching the database", async () => {
      const base = await start();
      expect((await del(base, "not-an-id")).status).toBe(404);
      expect(findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("allows DELETE in a CORS preflight", async () => {
      const base = await start();
      const res = await fetch(`${base}/notifications/${OWN_ID}`, {
        method: "OPTIONS",
        headers: { Origin: "https://budgetitfirst.com", "Access-Control-Request-Method": "DELETE" },
      });
      expect(res.headers.get("access-control-allow-methods")).toContain("DELETE");
    });
  });
});
