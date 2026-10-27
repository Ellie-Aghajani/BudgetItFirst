import express, { type NextFunction, type Request, type Response } from "express";
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

export function createApp(deps: { verify: VerifyToken; isReady: () => boolean; log: Logger }) {
  const app = express();
  app.disable("x-powered-by");
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

  notifications.get("/", async (req, res) => {
    const query = listQuery.parse(req.query);
    const filter = {
      userId: res.locals.userId as string,
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
      { _id: id, userId: res.locals.userId as string },
      // Idempotent: marking it read twice keeps the first readAt.
      [{ $set: { readAt: { $ifNull: ["$readAt", "$$NOW"] } } }],
      { new: true, updatePipeline: true },
    );
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
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
