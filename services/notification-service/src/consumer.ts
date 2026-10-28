import { connect, type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";
import { z } from "zod";
import type { Logger } from "./logger";
import type { NotificationFields } from "./models";
import { reachedThresholds, toCents, type Threshold } from "./thresholds";

// Queue setup (section 5 of the plan). Declaring is idempotent: running it
// again with the same settings changes nothing.
export const EXCHANGE = "budget.events";
export const ROUTING_KEY = "expense.changed";
export const QUEUE = "notification-service.expense-changed";
export const DLX = "budget.events.dlx";
export const DLQ = "notification-service.expense-changed.dlq";

const PREFETCH = 10;
const MAX_DELIVERIES = 5;
const DB_RETRY_DELAY_MS = 2000;

// ---------- Parsing (pure, unit tested) ----------

const money = z.string().regex(/^-?\d{1,15}(\.\d{1,2})?$/, "must be a money string like 12.34");

const expenseChangedV1 = z.object({
  eventId: z.uuid(),
  eventType: z.literal("ExpenseChanged"),
  schemaVersion: z.literal(1),
  occurredAt: z.iso.datetime({ offset: true }),
  userId: z.string().min(1).max(128),
  categoryId: z.number().int().positive(),
  categoryName: z.string().min(1).max(200),
  categoryBudget: money,
  categorySpentAfter: money,
  budgetYear: z.number().int().min(2000).max(2100),
  budgetMonth: z.number().int().min(1).max(12),
});

export type ExpenseChanged = z.infer<typeof expenseChangedV1>;

export type ParseResult = { ok: true; event: ExpenseChanged } | { ok: false; reason: string };

export function parseEvent(body: Buffer): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(body.toString("utf8"));
  } catch {
    return { ok: false, reason: "body is not valid JSON" };
  }

  // Checked first so the log says clearly "unknown version", not "invalid field".
  const version = (json as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (version !== 1) return { ok: false, reason: `unknown schemaVersion: ${JSON.stringify(version)}` };

  const result = expenseChangedV1.safeParse(json);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { ok: false, reason: `invalid event: ${problems.join("; ")}` };
  }
  return { ok: true, event: result.data };
}

// One event can reach both thresholds at once (for example 50% -> 120%).
export function buildNotifications(event: ExpenseChanged): NotificationFields[] {
  // The regex above guarantees these parse.
  const budget = toCents(event.categoryBudget)!;
  const spent = toCents(event.categorySpentAfter)!;
  return reachedThresholds(budget, spent).map((threshold) => ({
    userId: event.userId,
    categoryId: event.categoryId,
    categoryName: event.categoryName,
    threshold,
    // From the event, never the server clock: an event processed on
    // November 1st can still be about October.
    budgetYear: event.budgetYear,
    budgetMonth: event.budgetMonth,
    message: messageFor(event, threshold),
  }));
}

function messageFor(event: ExpenseChanged, threshold: Threshold): string {
  const month = `${event.budgetYear}-${String(event.budgetMonth).padStart(2, "0")}`;
  return threshold === 100
    ? `You have reached your ${event.categoryName} budget for ${month} (${event.categorySpentAfter} of ${event.categoryBudget}).`
    : `You have used ${threshold}% of your ${event.categoryName} budget for ${month} (${event.categorySpentAfter} of ${event.categoryBudget}).`;
}

// ---------- RabbitMQ consumer ----------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type SaveNotifications = (docs: NotificationFields[]) => Promise<void>;

export class ExpenseChangedConsumer {
  private model: ChannelModel | null = null;
  private channel: Channel | null = null;
  private consumerTag: string | null = null;
  private stopping = false;
  private inFlight = 0;
  private reconnectDelayMs = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly url: string,
    private readonly save: SaveNotifications,
    private readonly log: Logger,
  ) {}

  isConnected(): boolean {
    return this.channel !== null && this.consumerTag !== null;
  }

  // Never throws: if RabbitMQ is not reachable, it keeps retrying in the
  // background. The service must not depend on start-up order.
  start(): void {
    void this.connect();
  }

  private async connect(): Promise<void> {
    if (this.stopping) return;
    try {
      const model = await connect(this.url);
      this.model = model;
      // "error" is always followed by "close"; reconnect once, on "close".
      model.on("error", (err) => this.log.warn({ err }, "RabbitMQ connection error"));
      model.on("close", () => this.onConnectionLost());

      const channel = await model.createChannel();
      channel.on("error", (err) => this.log.warn({ err }, "RabbitMQ channel error"));
      // A channel can close on its own (for example a queue declared with
      // different settings). Close the connection too so we reconnect.
      channel.on("close", () => {
        if (!this.stopping) void model.close().catch(() => undefined);
      });

      await this.declareTopology(channel);
      // At most 10 unacked messages at a time per consumer (back-pressure).
      await channel.prefetch(PREFETCH);
      const { consumerTag } = await channel.consume(QUEUE, (msg) => {
        if (msg) void this.handle(channel, msg);
      });

      this.channel = channel;
      this.consumerTag = consumerTag;
      this.reconnectDelayMs = 1000;
      this.log.info({ queue: QUEUE }, "Consuming from RabbitMQ");
    } catch (err) {
      this.log.warn({ err, retryInMs: this.reconnectDelayMs }, "Could not connect to RabbitMQ");
      await this.model?.close().catch(() => undefined);
      this.scheduleReconnect();
    }
  }

  private async declareTopology(channel: Channel): Promise<void> {
    await channel.assertExchange(EXCHANGE, "topic", { durable: true });
    await channel.assertExchange(DLX, "fanout", { durable: true });
    await channel.assertQueue(DLQ, { durable: true });
    await channel.bindQueue(DLQ, DLX, "");
    await channel.assertQueue(QUEUE, {
      durable: true,
      arguments: {
        // Quorum queue: replicated and safer than a classic queue; it also
        // supports a delivery limit.
        "x-queue-type": "quorum",
        // After 5 deliveries the message goes to the DLQ instead of looping forever.
        "x-delivery-limit": MAX_DELIVERIES,
        "x-dead-letter-exchange": DLX,
      },
    });
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
  }

  private onConnectionLost(): void {
    this.model = null;
    this.channel = null;
    this.consumerTag = null;
    if (this.stopping) return;
    this.log.warn("RabbitMQ connection lost");
    this.scheduleReconnect();
  }

  // Exponential backoff with jitter, capped at 30 s, so many pods don't all
  // reconnect at the same moment (thundering herd).
  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) return;
    const delay = this.reconnectDelayMs + Math.floor(Math.random() * 500);
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 30_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private async handle(channel: Channel, msg: ConsumeMessage): Promise<void> {
    this.inFlight++;
    try {
      const parsed = parseEvent(msg.content);
      if (!parsed.ok) {
        // A bad message will never get better: reject without requeue -> DLQ.
        this.log.warn({ messageId: msg.properties.messageId, reason: parsed.reason }, "Rejected message to the DLQ");
        settle(() => channel.nack(msg, false, false));
        return;
      }

      try {
        await this.save(buildNotifications(parsed.event));
        // Ack only after the write succeeded: if we crash before this line,
        // RabbitMQ redelivers the message (at-least-once).
        settle(() => channel.ack(msg));
      } catch (err) {
        // Probably MongoDB is down: requeue and try again. The delay avoids a
        // hot loop; x-delivery-limit stops it after 5 attempts.
        this.log.error({ err, eventId: parsed.event.eventId }, "Could not save notifications; will retry");
        await sleep(DB_RETRY_DELAY_MS);
        settle(() => channel.nack(msg, false, true));
      }
    } finally {
      this.inFlight--;
    }
  }

  // Graceful shutdown: stop taking new messages, let in-flight ones finish
  // (they ack or nack), then close. Unacked messages are redelivered anyway.
  async stop(timeoutMs = 10_000): Promise<void> {
    this.stopping = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.channel && this.consumerTag) await this.channel.cancel(this.consumerTag).catch(() => undefined);

    const deadline = Date.now() + timeoutMs;
    while (this.inFlight > 0 && Date.now() < deadline) await sleep(50);

    await this.channel?.close().catch(() => undefined);
    await this.model?.close().catch(() => undefined);
    this.channel = null;
    this.consumerTag = null;
  }
}

// ack/nack throw if the channel already closed (connection dropped). That is
// fine: the broker redelivers unacked messages, and the consumer is idempotent.
function settle(action: () => void): void {
  try {
    action();
  } catch {
    // Channel is gone; the message will be redelivered.
  }
}
