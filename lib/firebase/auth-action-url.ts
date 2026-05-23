import type { ActionCodeSettings } from "firebase/auth";

/** Where Firebase sends users after they click verify / reset links in email. */
export function getEmailActionSettings(): ActionCodeSettings | undefined {
  if (typeof window === "undefined") return undefined;
  const origin = window.location.origin.replace(/\/$/, "");
  return {
    url: `${origin}/settings/`,
    handleCodeInApp: false,
  };
}
