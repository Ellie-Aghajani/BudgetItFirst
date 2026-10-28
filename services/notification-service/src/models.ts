import { Schema, model, type InferSchemaType } from "mongoose";
import { THRESHOLDS } from "./thresholds";

const notificationSchema = new Schema(
  {
    userId: { type: String, required: true },
    categoryId: { type: Number, required: true },
    categoryName: { type: String, required: true },
    threshold: { type: Number, required: true, enum: [...THRESHOLDS] },
    budgetYear: { type: Number, required: true },
    budgetMonth: { type: Number, required: true },
    message: { type: String, required: true },
    readAt: { type: Date, default: null },
    // Soft delete: the user removed it from their list. The document stays,
    // so the unique index below still stops the same alert from coming back.
    dismissedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON: {
      // The API returns "id", and never the owner's userId.
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.userId;
        delete ret.dismissedAt;
        return ret;
      },
    },
  },
);

// Idempotency: one notification per (user, category, month, threshold).
// A duplicate message hits this unique index (error code 11000) instead of
// creating a second notification. This also means no "re-arm" in the same month.
notificationSchema.index(
  { userId: 1, categoryId: 1, budgetYear: 1, budgetMonth: 1, threshold: 1 },
  { unique: true, name: "one_per_threshold_per_month" },
);

// For GET /notifications: a user's newest notifications, optionally unread only.
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 }, { name: "by_user_newest" });

export type NotificationFields = Omit<InferSchemaType<typeof notificationSchema>, "readAt" | "dismissedAt" | "createdAt">;

export const Notification = model("Notification", notificationSchema);

const DUPLICATE_KEY = 11000;

// Inserts each notification; one that already exists counts as success.
export async function saveNotifications(docs: NotificationFields[]): Promise<void> {
  for (const doc of docs) {
    try {
      await Notification.create(doc);
    } catch (err) {
      if ((err as { code?: number }).code !== DUPLICATE_KEY) throw err;
    }
  }
}
