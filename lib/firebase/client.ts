import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
} from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Functions, getFunctions } from "firebase/functions";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { shouldUseFirebaseEmulators } from "@/lib/env/client";
import { getFirebaseOptions } from "@/lib/firebase/config";
import { connectFirebaseEmulators } from "@/lib/firebase/emulators";

const FUNCTIONS_REGION =
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? "us-central1";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;

export function getFirebaseApp(): FirebaseApp | null {
  const options = getFirebaseOptions();
  if (!options) return null;

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(options);
  }

  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  if (!auth) {
    if (typeof window !== "undefined" && isNativePlatform()) {
      try {
        auth = initializeAuth(firebaseApp, {
          persistence: indexedDBLocalPersistence,
        });
      } catch {
        auth = getAuth(firebaseApp);
      }
    } else {
      auth = getAuth(firebaseApp);
    }
  }

  return auth;
}

export function getFirebaseDb(): Firestore | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  if (!db) {
    db = getFirestore(firebaseApp);
  }

  return db;
}

export function getFirebaseFunctions(): Functions | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  if (!functions) {
    functions = getFunctions(firebaseApp, FUNCTIONS_REGION);
  }

  return functions;
}

/** Call once on the client after Firebase is configured. */
export function initFirebaseClient(): boolean {
  if (typeof window === "undefined") return false;

  const firebaseApp = getFirebaseApp();
  const firebaseAuth = getFirebaseAuth();
  const firestore = getFirebaseDb();
  const firebaseFunctions = getFirebaseFunctions();

  if (!firebaseApp || !firebaseAuth || !firestore || !firebaseFunctions) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[Firebase] Client init failed — check NEXT_PUBLIC_FIREBASE_* in .env.local and rebuild for Android.",
      );
    }
    return false;
  }

  if (shouldUseFirebaseEmulators()) {
    connectFirebaseEmulators(firebaseAuth, firestore, firebaseFunctions);
  }

  return true;
}
