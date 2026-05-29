/** OAuth redirect registered in Entra app — must match exactly. */
export function microsoftOAuthRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/integrations/microsoft/callback/`;
}
