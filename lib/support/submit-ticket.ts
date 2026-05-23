import { isFirebaseConfigured } from "@/lib/env/client";
import { getFirebaseDb, getFirebaseFunctions } from "@/lib/firebase/client";
import { formatCloudFunctionsNetworkError } from "@/lib/firebase/functions-network-error";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { FunctionsError, httpsCallable } from "firebase/functions";

async function submitViaFirestore(
  uid: string,
  message: string,
  email?: string | null,
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }
  const payload: Record<string, unknown> = {
    uid,
    message,
    status: "open",
    createdAt: serverTimestamp(),
  };
  if (email) {
    payload.email = email;
  }
  const ref = await addDoc(collection(db, "supportTickets"), payload);
  return ref.id;
}

export async function submitSupportTicket(
  message: string,
  uid: string,
  email?: string | null,
): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }
  const trimmed = message.trim();
  if (trimmed.length < 10) {
    throw new Error("Please enter at least 10 characters.");
  }

  const functions = getFirebaseFunctions();
  if (functions) {
    const fn = httpsCallable<{ message: string }, { ticketId: string }>(
      functions,
      "submitSupportTicket",
    );
    try {
      const { data } = await fn({ message: trimmed });
      return data.ticketId;
    } catch (error) {
      const network = formatCloudFunctionsNetworkError(error);
      if (network) {
        throw new Error(network);
      }
      // Callable failed (500, etc.) — fall back to direct Firestore create.
      if (
        error instanceof FunctionsError &&
        (error.code === "functions/internal" ||
          error.code === "functions/unavailable" ||
          error.code === "functions/unknown")
      ) {
        try {
          return await submitViaFirestore(uid, trimmed, email);
        } catch (fallbackError) {
          throw new Error(
            fallbackError instanceof Error
              ? fallbackError.message
              : "Could not send message.",
          );
        }
      }
      if (error instanceof FunctionsError) {
        throw new Error(error.message);
      }
      throw error instanceof Error ? error : new Error("Could not send message.");
    }
  }

  return submitViaFirestore(uid, trimmed, email);
}
