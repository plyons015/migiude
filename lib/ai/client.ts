import { FirebaseError } from "firebase/app";
import { FunctionsError, httpsCallable } from "firebase/functions";
import {
  aiProcessInputSchema,
  aiProcessOutputSchema,
  type AiProcessInput,
  type AiProcessOutput,
} from "@/lib/ai/types";
import { getFirebaseFunctions } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/env/client";

const AI_PROCESS_FUNCTION = "aiProcess";

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "not_configured" | "call_failed" = "call_failed",
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

/**
 * Client for server-side AI (Firebase Functions).
 * API keys never live in the static/Capacitor bundle.
 */
export async function processWithAi(
  input: AiProcessInput,
): Promise<AiProcessOutput> {
  if (!isFirebaseConfigured()) {
    throw new AiServiceError(
      "Firebase is not configured. Copy .env.example to .env.local and add your project keys.",
      "not_configured",
    );
  }

  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new AiServiceError("Firebase Functions is not initialized.", "not_configured");
  }

  const payload = aiProcessInputSchema.parse(input);
  const callable = httpsCallable<AiProcessInput, AiProcessOutput>(
    functions,
    AI_PROCESS_FUNCTION,
  );

  try {
    const { data } = await callable(payload);
    return aiProcessOutputSchema.parse(data);
  } catch (error) {
    throw new AiServiceError(parseCallableError(error), "call_failed");
  }
}

function parseCallableError(error: unknown): string {
  const code =
    error instanceof FunctionsError
      ? error.code
      : error instanceof FirebaseError
        ? error.code
        : null;

  let message: string | null = null;

  if (error instanceof FunctionsError) {
    message =
      formatFunctionsDetails(error.details) ??
      (error.message && error.message !== "internal" ? error.message : null);
  } else if (error instanceof FirebaseError) {
    message =
      error.message && error.message !== "internal" ? error.message : null;
  } else if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: string }).message);
    if (msg && msg !== "internal") message = msg;
  }

  if (message) {
    return code ? `${message} (${code})` : message;
  }

  return fallbackForFunctionsCode(code ?? "unknown");
}

function formatFunctionsDetails(details: unknown): string | null {
  if (typeof details === "string" && details.trim()) {
    return details.trim();
  }
  if (details && typeof details === "object") {
    if ("message" in details) {
      const msg = String((details as { message: unknown }).message);
      if (msg.trim()) return msg.trim();
    }
    try {
      return JSON.stringify(details);
    } catch {
      return null;
    }
  }
  return null;
}

function fallbackForFunctionsCode(code: string): string {
  switch (code) {
    case "functions/unauthenticated":
      return "Sign in required. Tap “Sign in to use AI” on Listen, and enable Anonymous auth in Firebase Console.";
    case "functions/failed-precondition":
      return "AI provider blocked the request (billing, API key, or quota). For Gemini: add credits at ai.google.dev / AI Studio. For Grok: add credits at console.x.ai.";
    case "functions/deadline-exceeded":
      return "AI request timed out. Try again with shorter text.";
    case "functions/unavailable":
      return "AI service unavailable. Check internet connection and try again.";
    case "functions/internal":
      return "Cannot reach AI server (network or blocked). Ensure the phone can access cloudfunctions.net; try Wi‑Fi, disable VPN/firewall, or retry after a moment.";
    case "functions/permission-denied":
      return "AI function access denied. In Google Cloud Console, Cloud Run → aiprocess → Permissions → allow public invoke (allUsers as Cloud Run Invoker) for callable functions.";
    default:
      return code ? `AI request failed (${code})` : "AI request failed";
  }
}
