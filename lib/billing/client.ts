import { FunctionsError, httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase/client";
import { formatCloudFunctionsNetworkError } from "@/lib/firebase/functions-network-error";
import { isFirebaseConfigured } from "@/lib/env/client";

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

export async function createCheckoutSession(options: {
  plan?: "pro" | "power";
  interval?: "month" | "year";
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const fn = httpsCallable<
    typeof options,
    { url: string }
  >(requireFunctions(), "createCheckoutSession");
  try {
    const { data } = await fn(options);
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function createBillingPortalSession(
  returnUrl: string,
): Promise<{ url: string }> {
  const fn = httpsCallable<{ returnUrl: string }, { url: string }>(
    requireFunctions(),
    "createBillingPortalSession",
  );
  try {
    const { data } = await fn({ returnUrl });
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}
