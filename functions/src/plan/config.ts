import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  DEFAULT_LAUNCH_PLAN_CONFIG,
  mergeLaunchPlanConfig,
  type LaunchPlanConfig,
} from "./defaults";

const PLANS_PATH = "adminConfig/plans";
const CACHE_MS = 60_000;

let cache: { config: LaunchPlanConfig; at: number } | null = null;

export function invalidatePlanConfigCache(): void {
  cache = null;
}

export async function getLaunchPlanConfig(): Promise<LaunchPlanConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.config;
  }

  const snap = await getFirestore().doc(PLANS_PATH).get();
  const merged = mergeLaunchPlanConfig(snap.data()?.config ?? snap.data());
  cache = { config: merged, at: Date.now() };
  return merged;
}

export async function getLaunchPlanConfigMeta(): Promise<{
  config: LaunchPlanConfig;
  updatedAt: number | null;
  updatedBy: string | null;
}> {
  const snap = await getFirestore().doc(PLANS_PATH).get();
  const data = snap.data();
  const config = mergeLaunchPlanConfig(data?.config ?? data);
  return {
    config,
    updatedAt: (data?.updatedAt as number | undefined) ?? null,
    updatedBy: (data?.updatedBy as string | undefined) ?? null,
  };
}

export async function setLaunchPlanConfig(
  config: LaunchPlanConfig,
  updatedBy: string,
): Promise<void> {
  await getFirestore()
    .doc(PLANS_PATH)
    .set(
      {
        config,
        updatedAt: Date.now(),
        updatedBy,
        seededAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  invalidatePlanConfigCache();
}

export async function ensureLaunchPlanConfigSeeded(): Promise<LaunchPlanConfig> {
  const ref = getFirestore().doc(PLANS_PATH);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      config: DEFAULT_LAUNCH_PLAN_CONFIG,
      updatedAt: Date.now(),
      updatedBy: "system",
      seededAt: FieldValue.serverTimestamp(),
    });
    invalidatePlanConfigCache();
    return DEFAULT_LAUNCH_PLAN_CONFIG;
  }
  return getLaunchPlanConfig();
}
