import { FirebaseError } from "firebase/app";

export function formatAuthError(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : "Authentication failed.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Try signing in.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/multi-factor-auth-required":
      return "Two-factor verification required.";
    case "auth/invalid-verification-code":
      return "Invalid verification code. Try again.";
    case "auth/missing-multi-factor-session":
      return "MFA session expired. Sign in again.";
    case "auth/unverified-email":
      return "Verify your email before setting up two-factor authentication.";
    case "auth/requires-recent-login":
      return "Sign out and sign in again before changing security settings.";
    case "auth/operation-not-allowed":
      return "This sign-in method is disabled in Firebase Console.";
    case "auth/email-already-verified":
      return "This email is already verified. Refresh the page or sign in again.";
    case "auth/invalid-continue-uri":
      return "Email link domain not authorized. Add this site URL under Firebase → Authentication → Settings → Authorized domains.";
    case "auth/unauthorized-continue-uri":
      return "This site URL is not authorized for email links. Add it in Firebase Authorized domains.";
    case "auth/missing-continue-uri":
      return "Email action URL is missing. Try again from the hosted app URL, not a file:// path.";
    default:
      return `${error.message}${error.code ? ` (${error.code})` : ""}`;
  }
}

export function isMfaRequiredError(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    error.code === "auth/multi-factor-auth-required"
  );
}
