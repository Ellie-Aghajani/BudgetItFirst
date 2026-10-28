import type { NextFunction, Request, Response } from "express";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Config } from "./config";
import type { Logger } from "./logger";

// Takes a token, returns the user id, or throws if the token is not valid.
export type VerifyToken = (token: string) => Promise<string>;

export function createVerifier(config: Config, log: Logger): VerifyToken {
  if (config.AUTH_MODE === "dev") {
    // Local demos only (config.ts refuses it with NODE_ENV=production).
    // Any Bearer token is accepted as DEV_USER_ID.
    log.warn({ userId: config.DEV_USER_ID }, "AUTH_MODE=dev: tokens are NOT verified");
    return async () => config.DEV_USER_ID;
  }

  const app = initializeApp(
    {
      projectId: config.FIREBASE_PROJECT_ID,
      ...(config.FIREBASE_CREDENTIALS_JSON && { credential: cert(JSON.parse(config.FIREBASE_CREDENTIALS_JSON)) }),
    },
    "notification-service",
  );
  const auth = getAuth(app);
  // Same check as the .NET FirebaseAuthMiddleware: signature, expiry,
  // audience (our project) and issuer.
  return async (token) => (await auth.verifyIdToken(token)).uid;
}

// The user id comes ONLY from the verified token, never from the query
// string or body, so a user can only ever see their own notifications.
export function requireAuth(verify: VerifyToken) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? "";
    if (!header.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Bearer token" });
      return;
    }
    try {
      res.locals.userId = await verify(header.slice("Bearer ".length));
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    next();
  };
}
