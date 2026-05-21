import { connectAuthEmulator, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, type Functions } from "firebase/functions";

let emulatorsConnected = false;

export function connectFirebaseEmulators(
  auth: Auth,
  db: Firestore,
  functions: Functions,
): void {
  if (emulatorsConnected || typeof window === "undefined") return;

  const authHost =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
  const firestoreHost =
    process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ??
    "127.0.0.1:8080";
  const functionsHost =
    process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST ??
    "127.0.0.1:5001";

  const [authHostname, authPort] = authHost.split(":");
  const [fsHostname, fsPort] = firestoreHost.split(":");
  const [fnHostname, fnPort] = functionsHost.split(":");

  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  connectFirestoreEmulator(db, fsHostname, Number(fsPort));
  connectFunctionsEmulator(functions, fnHostname, Number(fnPort));

  emulatorsConnected = true;
}
