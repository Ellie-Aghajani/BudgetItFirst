import pino from "pino";

// Structured JSON logs on stdout: Docker and Kubernetes collect stdout, and
// JSON is easy to search. For readable local logs: `npm run dev | npx pino-pretty`.
export function createLogger(level: string) {
  return pino({
    level,
    base: { service: "notification-service" },
    // Never log tokens, even by accident.
    redact: ["req.headers.authorization", "headers.authorization"],
  });
}

export type Logger = ReturnType<typeof createLogger>;
