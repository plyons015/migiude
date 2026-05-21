import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/** Map provider errors to a client-visible HttpsError (not opaque "internal"). */
export function toAiHttpsError(error: unknown, provider: string): HttpsError {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  logger.error(`aiProcess ${provider} failed`, {
    message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  const lower = message.toLowerCase();

  if (
    lower.includes("api key") ||
    lower.includes("not set") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("permission") ||
    lower.includes("billing")
  ) {
    return new HttpsError("failed-precondition", message);
  }

  if (lower.includes("model") || lower.includes("not found") || lower.includes("404")) {
    return new HttpsError(
      "failed-precondition",
      `${provider} model error: ${message}`,
    );
  }

  return new HttpsError(
    "failed-precondition",
    message.length > 280 ? `${message.slice(0, 277)}…` : message,
  );
}
