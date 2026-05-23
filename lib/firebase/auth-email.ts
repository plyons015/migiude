import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";
import { getEmailActionSettings } from "@/lib/firebase/auth-action-url";
import { getFirebaseAuth } from "@/lib/firebase/client";

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }
  return auth;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ cred: UserCredential; verificationSent: boolean }> {
  const auth = requireAuth();
  const cred = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );
  if (displayName?.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  let verificationSent = false;
  try {
    await sendEmailVerification(cred.user, getEmailActionSettings());
    verificationSent = true;
  } catch {
    // Account exists even if email provider throttles or rejects send.
  }
  return { cred, verificationSent };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  const auth = requireAuth();
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function sendVerificationEmail(user: User): Promise<void> {
  await reload(user);
  if (user.emailVerified) {
    throw new FirebaseError(
      "auth/email-already-verified",
      "This email is already verified.",
    );
  }
  await sendEmailVerification(user, getEmailActionSettings());
}

export async function resetPassword(email: string): Promise<void> {
  const auth = requireAuth();
  await sendPasswordResetEmail(auth, email.trim(), getEmailActionSettings());
}
