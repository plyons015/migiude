import { defineSecret } from "firebase-functions/params";

/** Bound at deploy via `firebase functions:secrets:set ADMIN_EMAILS` */
export const adminEmailsSecret = defineSecret("ADMIN_EMAILS");

export function bindAdminEmailsEnv(): void {
  if (process.env.FUNCTIONS_EMULATOR) return;
  try {
    const raw = adminEmailsSecret.value().trim();
    if (raw) {
      process.env.ADMIN_EMAILS = raw;
    }
  } catch {
    // Secret not mounted on this function revision — use Firestore adminConfig/config
  }
}
