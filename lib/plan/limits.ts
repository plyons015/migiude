export {
  type PlanId,
  type PlanLimitsConfig,
  type PlanDisplayConfig,
  type LaunchPlanConfig,
  type PlanTierConfig,
  PLAN_IDS,
  DEFAULT_LAUNCH_PLAN_CONFIG,
  normalizePlanId,
  resolvePlanLimits,
  resolvePlanDisplay,
  mergeLaunchPlanConfig,
  formatAiLimitLabelFromConfig,
  formatCloudSttLimitLabelFromConfig,
  isOverMonthlyQuotaFromConfig,
} from "@/lib/plan/config-schema";

import {
  DEFAULT_LAUNCH_PLAN_CONFIG,
  formatAiLimitLabelFromConfig,
  formatCloudSttLimitLabelFromConfig,
  isOverMonthlyQuotaFromConfig,
  resolvePlanDisplay,
  resolvePlanLimits,
  type LaunchPlanConfig,
} from "@/lib/plan/config-schema";

export const FAIR_USE_TOOLTIP = DEFAULT_LAUNCH_PLAN_CONFIG.fairUseTooltip;
export const FAIR_USE_POLICY_SHORT =
  DEFAULT_LAUNCH_PLAN_CONFIG.fairUsePolicyShort;

export function planLimitsFor(
  plan: string,
  config: LaunchPlanConfig = DEFAULT_LAUNCH_PLAN_CONFIG,
) {
  return resolvePlanLimits(config, plan);
}

export function planDisplayFor(
  plan: string,
  config: LaunchPlanConfig = DEFAULT_LAUNCH_PLAN_CONFIG,
) {
  return resolvePlanDisplay(config, plan);
}

export function formatAiLimitLabel(
  plan: string,
  config: LaunchPlanConfig = DEFAULT_LAUNCH_PLAN_CONFIG,
) {
  return formatAiLimitLabelFromConfig(config, plan);
}

export function formatCloudSttLimitLabel(
  plan: string,
  config: LaunchPlanConfig = DEFAULT_LAUNCH_PLAN_CONFIG,
) {
  return formatCloudSttLimitLabelFromConfig(config, plan);
}

export function isOverMonthlyQuota(
  plan: string,
  usage: { aiCalls: number; cloudSttChunks: number; cloudSttSeconds?: number },
  config: LaunchPlanConfig = DEFAULT_LAUNCH_PLAN_CONFIG,
): boolean {
  const cloudMinutes = cloudSttUsageToMinutes(usage);
  return isOverMonthlyQuotaFromConfig(config, plan, {
    aiCalls: usage.aiCalls,
    cloudSttMinutes: cloudMinutes,
  });
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

export function usagePercent(used: number, limit: number | null): number | null {
  if (limit == null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function isOverDailySttQuota(
  plan: string,
  cloudSttChunksToday: number,
  config: LaunchPlanConfig = DEFAULT_LAUNCH_PLAN_CONFIG,
): boolean {
  const limits = resolvePlanLimits(config, plan);
  if (limits.cloudSttChunksPerDay == null) return false;
  return cloudSttChunksToday >= limits.cloudSttChunksPerDay;
}
