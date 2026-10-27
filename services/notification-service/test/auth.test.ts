import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireAuth } from "../src/auth";
import { loadConfig } from "../src/config";

const baseEnv = { MONGODB_URI: "mongodb://localhost:27017", RABBITMQ_URI: "amqp://localhost" };

describe("loadConfig", () => {
  it("refuses AUTH_MODE=dev in production", () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: "production", AUTH_MODE: "dev" })).toThrow(/AUTH_MODE=dev/);
  });

  it("allows AUTH_MODE=dev in development", () => {
    expect(loadConfig({ ...baseEnv, NODE_ENV: "development", AUTH_MODE: "dev" }).AUTH_MODE).toBe("dev");
  });

  it("defaults to real Firebase auth", () => {
    expect(loadConfig(baseEnv).AUTH_MODE).toBe("firebase");
  });

  it("accepts TLS connection strings (Atlas, CloudAMQP)", () => {
    const config = loadConfig({
      MONGODB_URI: "mongodb+srv://user:pass@cluster0.example.mongodb.net/?retryWrites=true",
      RABBITMQ_URI: "amqps://user:pass@example.cloudamqp.com/vhost",
    });
    expect(config.MONGODB_DB).toBe("notifications");
  });

  it("rejects a connection string with the wrong scheme", () => {
    expect(() => loadConfig({ ...baseEnv, RABBITMQ_URI: "https://example.com" })).toThrow(/RABBITMQ_URI/);
    expect(() => loadConfig({ ...baseEnv, MONGODB_URI: "localhost:27017" })).toThrow(/MONGODB_URI/);
  });

  it("listens on the PORT the platform gives (Render sets it)", () => {
    expect(loadConfig({ ...baseEnv, PORT: "10000" }).PORT).toBe(10000);
    expect(loadConfig(baseEnv).PORT).toBe(8080);
  });

  it("names the missing variable but never prints values", () => {
    expect(() => loadConfig({ RABBITMQ_URI: "amqp://user:secret@host" })).toThrow(/MONGODB_URI/);
    expect(() => loadConfig({ RABBITMQ_URI: "amqp://user:secret@host" })).not.toThrow(/secret/);
  });
});

describe("requireAuth", () => {
  const run = async (authorization: string | undefined, verify = vi.fn(async () => "user-1")) => {
    const req = { headers: { authorization } } as Request;
    const res = { locals: {} as Record<string, unknown>, status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    const next = vi.fn() as NextFunction;
    await requireAuth(verify)(req, res as unknown as Response, next);
    return { res, next, verify };
  };

  it("returns 401 without an Authorization header", async () => {
    const { res, next } = await run(undefined);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the token is invalid", async () => {
    const { res, next } = await run("Bearer bad", vi.fn(async () => Promise.reject(new Error("expired"))));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("sets userId from the verified token only", async () => {
    const { res, next, verify } = await run("Bearer good-token");
    expect(verify).toHaveBeenCalledWith("good-token");
    expect(res.locals.userId).toBe("user-1");
    expect(next).toHaveBeenCalled();
  });
});
