import { FunctionsError, httpsCallable } from "firebase/functions";
import type { AdminPlanConfigResponse, PlanAndUsageResponse } from "@/lib/plan/types";
import type { LaunchPlanConfig } from "@/lib/plan/config-schema";
import { getFirebaseFunctions } from "@/lib/firebase/client";
import {
  formatCloudFunctionsNetworkError,
  isCloudFunctionsNetworkFailure,
} from "@/lib/firebase/functions-network-error";
import { isFirebaseConfigured } from "@/lib/env/client";

let planAndUsageInflight: Promise<PlanAndUsageResponse> | null = null;

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

export async function fetchPlanAndUsage(): Promise<PlanAndUsageResponse> {
  if (planAndUsageInflight) return planAndUsageInflight;

  const fn = httpsCallable<void, PlanAndUsageResponse>(
    requireFunctions(),
    "getPlanAndUsage",
  );

  planAndUsageInflight = (async () => {
    try {
      const { data } = await fn();
      return data;
    } catch (error) {
      if (isCloudFunctionsNetworkFailure(error)) {
        throw error;
      }
      throw new Error(parseError(error));
    } finally {
      planAndUsageInflight = null;
    }
  })();

  return planAndUsageInflight;
}

export async function adminGetPlanConfig(): Promise<AdminPlanConfigResponse> {
  const fn = httpsCallable<void, AdminPlanConfigResponse>(
    requireFunctions(),
    "adminGetPlanConfig",
  );
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminUpdatePlanConfig(input: {
  config?: LaunchPlanConfig;
  fairUseTooltip?: string;
  fairUsePolicyShort?: string;
  tiers?: Partial<
    Record<
      "free" | "pro" | "power",
      {
        limits?: Partial<LaunchPlanConfig["tiers"]["free"]["limits"]>;
        display?: Partial<LaunchPlanConfig["tiers"]["free"]["display"]>;
      }
    >
  >;
}): Promise<{ ok: boolean; config: LaunchPlanConfig }> {
  const fn = httpsCallable<
    typeof input,
    { ok: boolean; config: LaunchPlanConfig }
  >(requireFunctions(), "adminUpdatePlanConfig");
  try {
    const { data } = await fn(input);
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function adminResetPlanConfig(): Promise<{
  ok: boolean;
  config: LaunchPlanConfig;
}> {
  const fn = httpsCallable<void, { ok: boolean; config: LaunchPlanConfig }>(
    requireFunctions(),
    "adminResetPlanConfig",
  );
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw new Error(parseError(error));
  }
}
