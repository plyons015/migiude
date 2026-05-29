import {
  DEFAULT_LAUNCH_PLAN_CONFIG,
  resolvePlanLimits,
} from "@/lib/plan/config-schema";
import { TRIAL_DAYS, TRIAL_LIMITS } from "@/lib/plan/trial";
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
  const endsAt = Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return {
    plan,
    config,
    usage: {
      month: utcMonthKey(),
      aiCalls: 0,
      cloudSttMinutes: 0,
      cloudSttChunksToday: 0,
      teamsBotMinutes: 0,
      teamsBotJoins: 0,
    },
    limits,
    display: { id: plan, ...display },
    trial: {
      active: true,
      expired: false,
      requiresUpgrade: false,
      endsAt,
      daysRemaining: TRIAL_DAYS,
      limits: TRIAL_LIMITS,
      usage: { aiCalls: 0, meetingMinutes: 0, onDeviceMinutes: 0 },
    },
  };
}
