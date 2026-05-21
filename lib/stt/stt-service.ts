import { FirebaseError } from "firebase/app";
import { FunctionsError, httpsCallable } from "firebase/functions";
import {
  transcribeInputSchema,
  transcribeOutputSchema,
  type TranscribeInput,
  type TranscribeOutput,
} from "@/lib/stt/types";
import { getFirebaseFunctions } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/env/client";

const TRANSCRIBE_FUNCTION = "transcribeAudio";

export class SttServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "not_configured" | "call_failed" = "call_failed",
  ) {
    super(message);
    this.name = "SttServiceError";
  }
}

export async function transcribeAudioChunk(
  input: TranscribeInput,
): Promise<TranscribeOutput> {
  if (!isFirebaseConfigured()) {
    throw new SttServiceError(
      "Firebase is not configured. Cloud STT requires sign-in and deployed functions.",
      "not_configured",
    );
  }

  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new SttServiceError("Firebase Functions is not initialized.", "not_configured");
  }

  const payload = transcribeInputSchema.parse(input);
  const callable = httpsCallable<TranscribeInput, TranscribeOutput>(
    functions,
    TRANSCRIBE_FUNCTION,
  );

  try {
    const { data } = await callable(payload);
    return transcribeOutputSchema.parse(data);
  } catch (error) {
    throw new SttServiceError(parseSttError(error), "call_failed");
  }
}

function parseSttError(error: unknown): string {
  if (error instanceof FunctionsError) {
    const details =
      typeof error.details === "string"
        ? error.details
        : error.message && error.message !== "internal"
          ? error.message
          : null;
    if (details) return details;
  }
  if (error instanceof FirebaseError && error.message !== "internal") {
    return error.message;
  }
  return "Cloud transcription failed. Check sign-in, network, and GEMINI_API_KEY on functions.";
}
