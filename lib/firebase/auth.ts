import { signInAnonymously, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export async function signInAnonymousUser(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}
