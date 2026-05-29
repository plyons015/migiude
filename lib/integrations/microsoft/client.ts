import { FunctionsError, httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase/client";
import { formatCloudFunctionsNetworkError } from "@/lib/firebase/functions-network-error";
import { isFirebaseConfigured } from "@/lib/env/client";
import type {
  MicrosoftIntegrationStatus,
  TeamsBotJobPublic,
} from "@/lib/integrations/microsoft/types";

function requireFunctions() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new Error("Firebase Functions is not initialized.");
  }
  return functions;
}

function parseError(error: unknown): string {
  const network = formatCloudFunctionsNetworkError(error);
  if (network) return network;
  if (error instanceof FunctionsError) return error.message;
  if (error instanceof Error) return error.message;
  return "Request failed.";
}

export async function getMicrosoftIntegrationStatus(): Promise<MicrosoftIntegrationStatus> {
  const fn = httpsCallable<void, MicrosoftIntegrationStatus>(
    requireFunctions(),
    "getMicrosoftIntegrationStatus",
  );
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function beginMicrosoftOAuth(redirectUri: string): Promise<{
  url: string;
  state: string;
}> {
  const fn = httpsCallable<{ redirectUri: string }, { url: string; state: string }>(
    requireFunctions(),
    "beginMicrosoftOAuth",
  );
  try {
    const { data } = await fn({ redirectUri });
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function completeMicrosoftOAuth(input: {
  code: string;
  state: string;
  redirectUri: string;
}): Promise<{ ok: true }> {
  const fn = httpsCallable<typeof input, { ok: true }>(
    requireFunctions(),
    "completeMicrosoftOAuth",
  );
  try {
    const { data } = await fn(input);
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function disconnectMicrosoftIntegration(): Promise<{ ok: true }> {
  const fn = httpsCallable<void, { ok: true }>(
    requireFunctions(),
    "disconnectMicrosoftIntegration",
  );
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function requestTeamsBotJoin(input: {
  meetingUrl: string;
  meetingTitle?: string;
  migiudeMeetingId?: string;
  /** Estimated duration for quota (minutes). Default 60. */
  estimatedMinutes?: number;
}): Promise<{ job: TeamsBotJobPublic }> {
  const fn = httpsCallable<typeof input, { job: TeamsBotJobPublic }>(
    requireFunctions(),
    "requestTeamsBotJoin",
  );
  try {
    const { data } = await fn(input);
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}
