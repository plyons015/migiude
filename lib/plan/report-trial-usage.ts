import { FunctionsError, httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase/client";
import {
  formatCloudFunctionsNetworkError,
  isCloudFunctionsNetworkFailure,
} from "@/lib/firebase/functions-network-error";
import { isFirebaseConfigured } from "@/lib/env/client";
import type { TrialStatus } from "@/lib/plan/types";

function requireFunctions() {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseFunctions();
}

export async function reportTrialUsage(input: {
  meetingMinutes?: number;
  onDeviceMinutes?: number;
}): Promise<TrialStatus | null> {
  const functions = requireFunctions();
  if (!functions) return null;
  if (
    (input.meetingMinutes ?? 0) <= 0 &&
    (input.onDeviceMinutes ?? 0) <= 0
  ) {
    return null;
  }

  const fn = httpsCallable<
    typeof input,
    { ok: boolean; trial: TrialStatus }
  >(functions, "recordTrialUsage");

  try {
    const { data } = await fn(input);
    return data.trial;
  } catch (error) {
    if (isCloudFunctionsNetworkFailure(error)) return null;
    if (error instanceof FunctionsError) throw new Error(error.message);
    if (error instanceof Error) throw error;
    throw new Error("Could not record trial usage.");
  }
}

export function minutesFromMs(ms: number): number {
  if (ms <= 0) return 0;
  return Math.round((ms / 60_000) * 100) / 100;
}
