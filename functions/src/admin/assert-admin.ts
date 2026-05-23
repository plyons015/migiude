import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getAdminEmails } from "./config";

export async function assertAdmin(
  request: CallableRequest<unknown>,
): Promise<{ email: string; uid: string }> {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Sign in to access the admin dashboard.",
    );
  }

  if (request.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError(
      "permission-denied",
      "Anonymous accounts cannot access admin.",
    );
  }

  const email = request.auth.token.email;
  if (!email || typeof email !== "string") {
    throw new HttpsError(
      "permission-denied",
      "Admin access requires an account with an email address.",
    );
  }

  const admins = await getAdminEmails();
  if (admins.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "No admin emails configured. Set ADMIN_EMAILS on Cloud Functions.",
    );
  }

  const normalized = email.trim().toLowerCase();
  if (!admins.includes(normalized)) {
    throw new HttpsError(
      "permission-denied",
      "Your account is not on the admin allowlist.",
    );
  }

  return { email: normalized, uid: request.auth.uid };
}
