import { allowAnonymousSignIn } from "@/lib/env/auth-flags";
import type { User } from "firebase/auth";

/** True when the user may use the app (email/password, Google, or dev anonymous). */
export function isAppSession(user: User | null): boolean {
  if (!user) return false;
  if (user.isAnonymous) return allowAnonymousSignIn();
  return true;
}
