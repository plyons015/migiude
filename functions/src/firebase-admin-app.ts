import { getApps, initializeApp } from "firebase-admin/app";

/** Ensure Admin SDK is initialized (required for some 2nd-gen cold starts). */
export function ensureFirebaseAdmin(): void {
  if (!getApps().length) {
    initializeApp();
  }
}
