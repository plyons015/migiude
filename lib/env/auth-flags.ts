/** Dev-only: show "Continue without account" on the sign-in screen. */
export function allowAnonymousSignIn(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_ANONYMOUS === "true";
}
