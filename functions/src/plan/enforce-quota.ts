import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { readMonthUsage } from "../admin/month-usage";
import {
  getPlanLimitsFor,
  normalizePlanId,
  quotaExceededMessage,
  utcTodayKey,
  type PlanId,
} from "../admin/plan-limits";
import { getLaunchPlanConfig } from "./config";
import {
  assertTrialAiAllowed,
  assertTrialUpgradeRequired,
  hasPaidEntitlement,
  readUserProfile,
  shouldApplyTrialLimits,
  trialExpiredRequiresUpgrade,
  trialUpgradeMessage,
} from "./trial";

async function planForUid(uid: string): Promise<PlanId> {
  const profile = await readUserProfile(uid);
  if (hasPaidEntitlement(profile)) {
    return normalizePlanId(profile.plan ?? undefined);
  }
  return "free";
}

async function readTodayCloudSttChunks(uid: string): Promise<number> {
  const day = utcTodayKey();
  const snap = await getFirestore().doc(`usageDaily/${day}/users/${uid}`).get();
  return (snap.data()?.cloudSttChunks as number | undefined) ?? 0;
}

export async function assertCanUseAi(uid: string): Promise<void> {
  const profile = await readUserProfile(uid);
  assertTrialUpgradeRequired(profile);

  if (shouldApplyTrialLimits(profile)) {
    await assertTrialAiAllowed(uid);
    return;
  }

  const plan = normalizePlanId(profile.plan ?? undefined);
  const [limits, config] = await Promise.all([
    getPlanLimitsFor(plan),
    getLaunchPlanConfig(),
  ]);
  if (limits.aiCallsPerMonth == null) return;

  const usage = await readMonthUsage(uid);
  if (usage.aiCalls >= limits.aiCallsPerMonth) {
    throw new HttpsError(
      "resource-exhausted",
      quotaExceededMessage("ai", plan, limits, config),
    );
  }
}

export async function assertCanUseCloudStt(uid: string): Promise<void> {
  const profile = await readUserProfile(uid);
  if (trialExpiredRequiresUpgrade(profile)) {
    throw new HttpsError("resource-exhausted", trialUpgradeMessage());
  }

  const plan = await planForUid(uid);
  const [limits, config] = await Promise.all([
    getPlanLimitsFor(plan),
    getLaunchPlanConfig(),
  ]);

  if (limits.cloudSttChunksPerDay != null) {
    const chunksToday = await readTodayCloudSttChunks(uid);
    if (chunksToday >= limits.cloudSttChunksPerDay) {
      throw new HttpsError(
        "resource-exhausted",
        quotaExceededMessage("cloudSttDaily", plan, limits, config),
      );
    }
  }

  if (limits.cloudSttMinutesPerMonth != null) {
    const usage = await readMonthUsage(uid);
    if (usage.cloudSttMinutes >= limits.cloudSttMinutesPerMonth) {
      throw new HttpsError(
        "resource-exhausted",
        quotaExceededMessage("cloudStt", plan, limits, config),
      );
    }
  }
}
