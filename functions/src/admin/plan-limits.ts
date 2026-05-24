import { getLaunchPlanConfig } from "../plan/config";
import {
  normalizePlanId,
  resolvePlanLimits,
  type LaunchPlanConfig,
  type PlanId,
  type PlanLimitsConfig,
} from "../plan/defaults";

export { normalizePlanId, type PlanId, type PlanLimitsConfig };

export async function getPlanLimitsFor(plan: string): Promise<PlanLimitsConfig> {
  const config = await getLaunchPlanConfig();
  return resolvePlanLimits(config, plan);
}

export function getPlanLimitsForSync(
  plan: string,
  config: LaunchPlanConfig,
): PlanLimitsConfig {
  return resolvePlanLimits(config, plan);
}

export function cloudSttChunksToMinutes(chunks: number): number {
  return Math.round(((chunks * 8) / 60) * 10) / 10;
}

export function cloudSttUsageToMinutes(usage: {
  cloudSttChunks?: number;
  cloudSttSeconds?: number;
}): number {
  const seconds = usage.cloudSttSeconds ?? 0;
  if (seconds > 0) {
    return Math.round((seconds / 60) * 10) / 10;
  }
  return cloudSttChunksToMinutes(usage.cloudSttChunks ?? 0);
}

export function utcDaysInCurrentMonthThroughToday(): string[] {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const days: string[] = [];
  for (let d = 1; d <= now.getUTCDate(); d++) {
    days.push(new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10));
  }
  return days;
}

export function utcTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function planDisplayName(plan: PlanId, config?: LaunchPlanConfig): string {
  if (config) return config.tiers[plan].display.name;
  if (plan === "pro") return "Pro";
  if (plan === "power") return "Power";
  return "Free";
}

export function upgradeHintForAi(plan: PlanId): string {
  if (plan === "free") return "Upgrade to Pro for more AI actions per month.";
  if (plan === "pro") return "Upgrade to Power for high-volume fair use AI.";
  return "";
}

export function upgradeHintForCloudStt(plan: PlanId): string {
  if (plan === "free") {
    return "Upgrade to Pro for more cloud transcription minutes per month.";
  }
  if (plan === "pro") {
    return "Upgrade to Power for higher monthly limits (fair use).";
  }
  return "";
}

export function quotaExceededMessage(
  kind: "ai" | "cloudStt" | "cloudSttDaily",
  plan: PlanId,
  limits: PlanLimitsConfig,
  config?: LaunchPlanConfig,
): string {
  const name = planDisplayName(plan, config);
  if (kind === "ai" && limits.aiCallsPerMonth != null) {
    return `${name} plan includes ${limits.aiCallsPerMonth} AI actions per month (UTC). ${upgradeHintForAi(plan)}`.trim();
  }
  if (kind === "cloudStt" && limits.cloudSttMinutesPerMonth != null) {
    return `${name} plan includes ${limits.cloudSttMinutesPerMonth} cloud transcription minutes per month (UTC). ${upgradeHintForCloudStt(plan)}`.trim();
  }
  if (kind === "cloudSttDaily" && limits.cloudSttChunksPerDay != null) {
    return `Power plan daily cloud transcription burst limit reached (${limits.cloudSttChunksPerDay} segments per UTC day). Resets at midnight UTC.`;
  }
  return "Usage limit reached for your plan.";
}

/** @deprecated Use resolvePlanLimits with live config */
export async function planLimitsFor(plan: string): Promise<PlanLimitsConfig> {
  return getPlanLimitsFor(plan);
}
