import { getFirestore } from "firebase-admin/firestore";
import { getLaunchPlanConfig } from "../plan/config";
import {
  isOverMonthlyQuotaFromConfig,
  type LaunchPlanConfig,
} from "../plan/defaults";
import {
  cloudSttUsageToMinutes,
  utcDaysInCurrentMonthThroughToday,
} from "./plan-limits";

export type MonthUsage = {
  aiCalls: number;
  cloudSttChunks: number;
  cloudSttSeconds: number;
  cloudSttMinutes: number;
};

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function readMonthUsage(uid: string, month?: string): Promise<MonthUsage> {
  const key = month ?? currentMonthKey();
  const db = getFirestore();
  const snap = await db.doc(`usageMonthly/${key}/users/${uid}`).get();
  const d = snap.data() ?? {};
  const cloudSttChunks = (d.cloudSttChunks as number) ?? 0;
  const cloudSttSeconds = (d.cloudSttSeconds as number) ?? 0;
  const aiCalls = (d.aiCalls as number) ?? 0;
  return {
    aiCalls,
    cloudSttChunks,
    cloudSttSeconds,
    cloudSttMinutes: cloudSttUsageToMinutes({ cloudSttChunks, cloudSttSeconds }),
  };
}

/** Backfill from daily docs when monthly rollup predates this feature. */
export async function readMonthUsageWithFallback(
  uid: string,
  month?: string,
): Promise<MonthUsage> {
  const fromMonthly = await readMonthUsage(uid, month);
  if (
    fromMonthly.aiCalls > 0 ||
    fromMonthly.cloudSttChunks > 0 ||
    fromMonthly.cloudSttSeconds > 0
  ) {
    return fromMonthly;
  }

  let aiCalls = 0;
  let cloudSttChunks = 0;
  let cloudSttSeconds = 0;
  const db = getFirestore();
  for (const day of utcDaysInCurrentMonthThroughToday()) {
    const usage = await db.doc(`usageDaily/${day}/users/${uid}`).get();
    const d = usage.data() ?? {};
    aiCalls += (d.aiCalls as number) ?? 0;
    cloudSttChunks += (d.cloudSttChunks as number) ?? 0;
    cloudSttSeconds += (d.cloudSttSeconds as number) ?? 0;
  }
  return {
    aiCalls,
    cloudSttChunks,
    cloudSttSeconds,
    cloudSttMinutes: cloudSttUsageToMinutes({ cloudSttChunks, cloudSttSeconds }),
  };
}

export function isOverMonthlyQuota(
  plan: string,
  usage: MonthUsage,
  config: LaunchPlanConfig,
): boolean {
  return isOverMonthlyQuotaFromConfig(config, plan, {
    aiCalls: usage.aiCalls,
    cloudSttMinutes: usage.cloudSttMinutes,
  });
}

export async function isOverMonthlyQuotaAsync(
  plan: string,
  usage: MonthUsage,
): Promise<boolean> {
  const config = await getLaunchPlanConfig();
  return isOverMonthlyQuota(plan, usage, config);
}

/** @deprecated Use isOverMonthlyQuota with config */
export const isOverFreeQuota = isOverMonthlyQuotaAsync;
