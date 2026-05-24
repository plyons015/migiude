import type { LaunchPlanConfig, PlanId, PlanLimitsConfig } from "@/lib/plan/config-schema";
import { TRIAL_LIMITS } from "@/lib/plan/trial";

export type TrialStatus = {
  active: boolean;
  expired: boolean;
  requiresUpgrade: boolean;
  endsAt: number | null;
  daysRemaining: number | null;
  limits: typeof TRIAL_LIMITS;
  usage: {
    aiCalls: number;
    meetingMinutes: number;
    onDeviceMinutes: number;
  };
};

export type PlanAndUsageResponse = {
  plan: PlanId;
  config: LaunchPlanConfig;
  usage: {
    month: string;
    aiCalls: number;
    cloudSttMinutes: number;
    cloudSttChunksToday: number;
  };
  limits: PlanLimitsConfig;
  display: {
    id: PlanId;
    name: string;
    priceMonthlyUsd: number | null;
    priceYearlyUsd: number | null;
    tagline: string;
    cloudSttLabel: string;
    aiLabel: string;
    bullets: string[];
  };
  trial: TrialStatus;
  planOverride?: boolean;
  requiresUpgrade?: boolean;
};

export type AdminPlanConfigResponse = {
  config: LaunchPlanConfig;
  updatedAt: number | null;
  updatedBy: string | null;
};
