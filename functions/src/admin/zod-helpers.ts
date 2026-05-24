import { z } from "zod";

/** Callable JSON often sends `null` for omitted optional fields. */
export function optionalString(max = 4000) {
  return z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v == null || v === "" ? undefined : v));
}

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join("; ") || "Invalid request.";
}
