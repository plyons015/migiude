import { FunctionsError, httpsCallable } from "firebase/functions";
import { isFirebaseConfigured } from "@/lib/env/client";
import { getFirebaseFunctions } from "@/lib/firebase/client";

type ReportInput = {
  message: string;
  stack?: string;
  platform?: string;
  appVersion?: string;
  route?: string;
};

export async function reportClientError(input: ReportInput): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const functions = getFirebaseFunctions();
  if (!functions) return;
  const fn = httpsCallable<ReportInput, { ok: boolean }>(
    functions,
    "reportClientError",
  );
  try {
    await fn(input);
  } catch (e) {
    if (e instanceof FunctionsError) return;
    if (e instanceof Error) return;
  }
}
