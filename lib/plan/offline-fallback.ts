import {
  DEFAULT_LAUNCH_PLAN_CONFIG,
  resolvePlanLimits,
} from "@/lib/plan/config-schema";
import type { PlanAndUsageResponse } from "@/lib/plan/types";

function utcMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Local defaults when Cloud Functions are unreachable (network/DNS/offline). */
export function offlinePlanAndUsageFallback(): PlanAndUsageResponse {
  const config = DEFAULT_LAUNCH_PLAN_CONFIG;
  const plan = "free";
  const limits = resolvePlanLimits(config, plan);
  const display = config.tiers[plan].display;
  return {
    plan,
    config,
    usage: {
      month: utcMonthKey(),
      aiCalls: 0,
      cloudSttMinutes: 0,
      cloudSttChunksToday: 0,
    },
    limits,
    display: { id: plan, ...display },
  };
}
