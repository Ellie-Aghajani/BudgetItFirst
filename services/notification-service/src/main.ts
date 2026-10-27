import mongoose from "mongoose";
import { createApp } from "./api";
import { createVerifier } from "./auth";
import { loadConfig } from "./config";
import { ExpenseChangedConsumer } from "./consumer";
import { createLogger } from "./logger";
import { Notification, saveNotifications } from "./models";

const SHUTDOWN_TIMEOUT_MS = 10_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const config = loadConfig();
  const log = createLogger(config.LOG_LEVEL);

  // Fail fast instead of queueing queries in memory while MongoDB is down.
  // The consumer then nacks and retries the message.
  mongoose.set("bufferCommands", false);

  const consumer = new ExpenseChangedConsumer(config.RABBITMQ_URI, saveNotifications, log);
  const app = createApp({
    verify: createVerifier(config, log),
    isReady: () => mongoose.connection.readyState === mongoose.ConnectionStates.connected && consumer.isConnected(),
    log,
  });

  // HTTP starts first, so /healthz answers while dependencies are still connecting.
  const server = app.listen(config.PORT, () => log.info({ port: config.PORT }, "HTTP server listening"));

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, "Shutting down");
    // Safety net: if something hangs, exit anyway before Kubernetes kills us.
    setTimeout(() => {
      log.error("Shutdown took too long, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    server.close();
    await consumer.stop();
    await mongoose.disconnect();
    log.info("Shutdown complete");
    process.exit(0);
  };
  // Kubernetes sends SIGTERM; Ctrl+C sends SIGINT.
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // MongoDB first, then RabbitMQ: consuming while the database is down would
  // only burn delivery attempts. After the first connect the driver reconnects by itself.
  for (let delay = 1000; !shuttingDown; delay = Math.min(delay * 2, 30_000)) {
    try {
      await mongoose.connect(config.MONGODB_URI, { dbName: config.MONGODB_DB, serverSelectionTimeoutMS: 5000 });
      // Make sure the unique index exists: idempotency depends on it.
      await Notification.createIndexes();
      log.info("Connected to MongoDB");
      break;
    } catch (err) {
      log.warn({ err, retryInMs: delay }, "Could not connect to MongoDB");
      await mongoose.disconnect().catch(() => undefined);
      await sleep(delay);
    }
  }

  if (!shuttingDown) consumer.start();
}

main().catch((err) => {
  // Only config errors get here; print them plainly and exit non-zero.
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
