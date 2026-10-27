import { z } from "zod";

// All settings come from environment variables, validated once at startup.
// A missing or wrong value stops the process with a clear message (fail fast)
// instead of failing later on the first message or request.
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    // Local: mongodb://host:27017. Atlas: mongodb+srv://... (TLS is on by default).
    MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, "must start with mongodb:// or mongodb+srv://"),
    // Set explicitly: Atlas connection strings usually have no database in
    // the path, and the driver would then silently use "test".
    MONGODB_DB: z.string().min(1).default("notifications"),
    // Local: amqp://... CloudAMQP: amqps://... (TLS, port 5671).
    RABBITMQ_URI: z.string().regex(/^amqps?:\/\//, "must start with amqp:// or amqps://"),
    // "firebase" verifies real ID tokens. "dev" accepts any Bearer token as
    // DEV_USER_ID, for local demos without a Firebase login.
    AUTH_MODE: z.enum(["firebase", "dev"]).default("firebase"),
    DEV_USER_ID: z.string().min(1).default("dev-user"),
    FIREBASE_PROJECT_ID: z.string().min(1).default("todo-85812"),
    // Optional: verifying ID tokens only needs the project id (Google's public
    // keys are fetched automatically). Set it only if you need admin features.
    FIREBASE_CREDENTIALS_JSON: z.string().min(1).optional(),
  })
  .refine((c) => !(c.AUTH_MODE === "dev" && c.NODE_ENV === "production"), {
    message: "AUTH_MODE=dev is not allowed when NODE_ENV=production",
    path: ["AUTH_MODE"],
  });

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = schema.safeParse(env);
  if (!result.success) {
    // Only the variable names and problems, never the values (they can be secrets).
    const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid configuration:\n  ${problems.join("\n  ")}`);
  }
  return result.data;
}
