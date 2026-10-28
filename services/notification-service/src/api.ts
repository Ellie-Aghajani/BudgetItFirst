import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireAuth, type VerifyToken } from "./auth";
import type { Logger } from "./logger";
import { Notification } from "./models";

const listQuery = z.object({
  unread: z.enum(["true", "false"]).optional(),
  // Capped at 100 so one request can't ask for the whole collection.
  limit: z.coerce.number().int().min(1).default(20).transform((n) => Math.min(n, 100)),
});

// Same rule as the .NET API: the listed sites, plus http://localhost on any
// port (Vite in development, and the Electron app's built-in server).
export function isAllowedOrigin(origin: string, allowed: string[]): boolean {
  if (allowed.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && url.hostname === "localhost";
  } catch {
    return false;
  }
}

export function createApp(deps: {
  verify: VerifyToken;
  isReady: () => boolean;
  log: Logger;
  corsOrigins: string[];
  rateLimitPerMinute: number;
}) {
  const app = express();
  app.disable("x-powered-by");
  // Safe default HTTP headers (no MIME sniffing, no framing, HSTS, ...).
  app.use(helmet());
  // CORS only tells the browser which sites may read our responses. It is
  // not auth: curl ignores it, so every route still checks the token.
  // A request from another site gets no CORS headers, and the browser blocks it.
  app.use(cors({ origin: (origin, done) => done(null, !origin || isAllowedOrigin(origin, deps.corsOrigins)) }));
  app.use(express.json({ limit: "10kb" }));

  // Liveness: "is the process alive?". No dependency checks on purpose: if
  // MongoDB is down, restarting this pod would not fix anything.
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Readiness: "can it do its job right now?". Fails while MongoDB or
  // RabbitMQ is down, so Kubernetes stops sending traffic without restarting.
  app.get("/readyz", (_req, res) => {
    const ready = deps.isReady();
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not ready" });
  });

  const notifications = express.Router();
  notifications.use(requireAuth(deps.verify));
  // Counted per user (after auth), not per IP: behind Render's proxy every
  // request would otherwise look like it comes from the same few IPs.
  notifications.use(
    rateLimit({
      windowMs: 60_000,
      limit: deps.rateLimitPerMinute,
      keyGenerator: (_req, res) => res.locals.userId as string,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests" },
    }),
  );

  notifications.get("/", async (req, res) => {
    const query = listQuery.parse(req.query);
    const filter = {
      userId: res.locals.userId as string,
      dismissedAt: null,
      ...(query.unread === "true" && { readAt: null }),
      ...(query.unread === "false" && { readAt: { $ne: null } }),
    };
    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(query.limit);
    res.json({ items });
  });

  notifications.patch("/:id/read", async (req, res) => {
    const id = req.params.id as string;
    // Filter by _id AND userId: someone else's notification looks exactly
    // like a missing one (404, not 403), so we don't reveal that it exists.
    if (!isValidObjectId(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId: res.locals.userId as string, dismissedAt: null },
      // Idempotent: marking it read twice keeps the first readAt.
      [{ $set: { readAt: { $ifNull: ["$readAt", "$$NOW"] } } }],
      { returnDocument: "after", updatePipeline: true },
    );
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  });

  // Soft delete: hides it from the user's list. A real delete would free the
  // unique index, so the next expense in that category would create the same
  // alert again. Idempotent: deleting twice is still 204.
  notifications.delete("/:id", async (req, res) => {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const found = await Notification.findOneAndUpdate(
      { _id: id, userId: res.locals.userId as string },
      [{ $set: { dismissedAt: { $ifNull: ["$dismissedAt", "$$NOW"] } } }],
      { updatePipeline: true },
    );
    if (!found) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  });

  app.use("/notifications", notifications);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Express 5 sends errors from async handlers here.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", issues: err.issues.map((i) => ({ path: i.path, message: i.message })) });
      return;
    }
    if ((err as { type?: string }).type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }
    deps.log.error({ err }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
