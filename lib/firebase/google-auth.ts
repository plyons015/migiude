import {
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

const provider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }
  const result = await signInWithPopup(auth, provider);
  return result.user;
}
