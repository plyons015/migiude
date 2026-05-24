import type { LaunchPlanConfig, PlanId, PlanLimitsConfig } from "@/lib/plan/config-schema";

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
};

export type AdminPlanConfigResponse = {
  config: LaunchPlanConfig;
  updatedAt: number | null;
  updatedBy: string | null;
};
