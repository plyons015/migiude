import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { ensureFirebaseAdmin } from "./firebase-admin-app";

const submitSchema = z.object({
  message: z.string().trim().min(10).max(4000),
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join("; ") || "Invalid request.";
}

/** Authenticated users submit support tickets (Admin SDK write). */
export const submitSupportTicket = onCall(
  { invoker: "public" },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Sign in to contact support.",
        );
      }

      const parsed = submitSchema.safeParse(request.data ?? {});
      if (!parsed.success) {
        throw new HttpsError("invalid-argument", formatZodError(parsed.error));
      }

      ensureFirebaseAdmin();

      const email = request.auth.token.email;
      const ref = await getFirestore()
        .collection("supportTickets")
        .add({
          uid: request.auth.uid,
          message: parsed.data.message,
          status: "open",
          createdAt: FieldValue.serverTimestamp(),
          ...(typeof email === "string" && email.length > 0 ? { email } : {}),
        });

      logger.info("submitSupportTicket", {
        ticketId: ref.id,
        uid: request.auth.uid,
      });

      return { ticketId: ref.id };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : "Support ticket failed.";
      logger.error("submitSupportTicket failed", { message, error });
      throw new HttpsError(
        "internal",
        "Could not save your message. Please try again in a moment.",
      );
    }
  },
);
