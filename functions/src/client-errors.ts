import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { ensureFirebaseAdmin } from "./firebase-admin-app";
import { touchUserProfile } from "./admin/usage";

const reportSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  stack: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  platform: z.string().max(64).optional(),
  appVersion: z.string().max(32).optional(),
  route: z.string().max(256).optional(),
});

/** Client-reported crashes/errors (Android + web). */
export const reportClientError = onCall(
  { invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to report errors.");
    }
    const parsed = reportSchema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    ensureFirebaseAdmin();
    const uid = request.auth.uid;
    void touchUserProfile(uid, {
      email: request.auth.token.email ?? null,
      platform: parsed.data.platform,
    }).catch(() => undefined);

    await getFirestore()
      .collection("clientErrors")
      .add({
        uid,
        email: request.auth.token.email ?? null,
        message: parsed.data.message,
        stack: parsed.data.stack ?? null,
        platform: parsed.data.platform ?? null,
        appVersion: parsed.data.appVersion ?? null,
        route: parsed.data.route ?? null,
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
      });

    return { ok: true };
  },
);
