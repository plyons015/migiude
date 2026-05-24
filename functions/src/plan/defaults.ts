/** Server-side defaults — keep aligned with lib/plan/config-schema.ts */

export type PlanId = "free" | "pro" | "power";

export type PlanLimitsConfig = {
  aiCallsPerMonth: number | null;
  cloudSttMinutesPerMonth: number | null;
  cloudSttChunksPerDay: number | null;
  cloudSttChunksPerDayWarn: number | null;
  aiFairUse: boolean;
  prioritySupport: boolean;
  usageDashboard: boolean;
};

export type PlanDisplayConfig = {
  name: string;
  priceMonthlyUsd: number | null;
  priceYearlyUsd: number | null;
  tagline: string;
  cloudSttLabel: string;
  aiLabel: string;
  bullets: string[];
};

export type PlanTierConfig = {
  limits: PlanLimitsConfig;
  display: PlanDisplayConfig;
};

export type LaunchPlanConfig = {
  fairUseTooltip: string;
  fairUsePolicyShort: string;
  tiers: Record<PlanId, PlanTierConfig>;
};

export const DEFAULT_LAUNCH_PLAN_CONFIG: LaunchPlanConfig = {
  fairUseTooltip:
    "Fair use means typical professional usage. Sustained extreme usage may be reviewed so we can keep the service sustainable for everyone.",
  fairUsePolicyShort:
    "Our Power plan is designed for heavy professional use with very high monthly limits on cloud transcription and AI. In rare cases of sustained extreme usage that affects service for others, we may reach out to discuss options.",
  tiers: {
    free: {
      limits: {
        aiCallsPerMonth: 12,
        cloudSttMinutesPerMonth: 30,
        cloudSttChunksPerDay: null,
        cloudSttChunksPerDayWarn: null,
        aiFairUse: false,
        prioritySupport: false,
        usageDashboard: false,
      },
      display: {
        name: "Free",
        priceMonthlyUsd: 0,
        priceYearlyUsd: 0,
        tagline:
          "Unlimited on-device transcription; limited cloud when you need it.",
        cloudSttLabel: "30 cloud transcription minutes / month",
        aiLabel: "12 AI actions / month",
        bullets: [
          "Unlimited on-device (browser) transcription",
          "30 min cloud transcription per month",
          "12 AI actions per month",
          "Local vault storage",
        ],
      },
    },
    pro: {
      limits: {
        aiCallsPerMonth: 200,
        cloudSttMinutesPerMonth: 1000,
        cloudSttChunksPerDay: null,
        cloudSttChunksPerDayWarn: null,
        aiFairUse: false,
        prioritySupport: true,
        usageDashboard: true,
      },
      display: {
        name: "Pro",
        priceMonthlyUsd: 14.99,
        priceYearlyUsd: 129,
        tagline: "Generous monthly limits for everyday professional use.",
        cloudSttLabel: "1,000 cloud transcription minutes / month",
        aiLabel: "200 AI actions / month",
        bullets: [
          "1,000 cloud transcription minutes per month",
          "200 AI actions per month",
          "Full sync across Web + Android",
          "Daily recap, exports, usage dashboard",
          "Priority email support (48h target)",
        ],
      },
    },
    power: {
      limits: {
        aiCallsPerMonth: null,
        cloudSttMinutesPerMonth: 3000,
        cloudSttChunksPerDay: 800,
        cloudSttChunksPerDayWarn: 500,
        aiFairUse: true,
        prioritySupport: true,
        usageDashboard: true,
      },
      display: {
        name: "Power",
        priceMonthlyUsd: 22.99,
        priceYearlyUsd: 229,
        tagline: "High-volume fair use for full workdays and heavy AI.",
        cloudSttLabel: "~3,000 cloud transcription minutes / month (fair use)",
        aiLabel: "High-volume AI processing (fair use)",
        bullets: [
          "~3,000 cloud transcription minutes per month (fair use)",
          "Generous AI processing (fair use)",
          "Higher daily cloud burst for long sessions",
          "24h priority support, longer history, beta features first",
        ],
      },
    },
  },
};

export function normalizePlanId(plan: string | null | undefined): PlanId {
  if (plan === "pro") return "pro";
  if (plan === "power" || plan === "business") return "power";
  return "free";
}

export function mergeLaunchPlanConfig(partial: unknown): LaunchPlanConfig {
  const base = structuredClone(DEFAULT_LAUNCH_PLAN_CONFIG);
  if (!partial || typeof partial !== "object") return base;
  const p = partial as Record<string, unknown>;

  if (typeof p.fairUseTooltip === "string") {
    base.fairUseTooltip = p.fairUseTooltip;
  }
  if (typeof p.fairUsePolicyShort === "string") {
    base.fairUsePolicyShort = p.fairUsePolicyShort;
  }

  const tiers = p.tiers;
  if (tiers && typeof tiers === "object") {
    for (const id of ["free", "pro", "power"] as PlanId[]) {
      const tier = (tiers as Record<string, unknown>)[id];
      if (!tier || typeof tier !== "object") continue;
      const t = tier as Record<string, unknown>;
      if (t.limits && typeof t.limits === "object") {
        base.tiers[id].limits = {
          ...base.tiers[id].limits,
          ...(t.limits as PlanLimitsConfig),
        };
      }
      if (t.display && typeof t.display === "object") {
        const d = t.display as Record<string, unknown>;
        base.tiers[id].display = {
          ...base.tiers[id].display,
          ...d,
          bullets: Array.isArray(d.bullets)
            ? (d.bullets as string[])
            : base.tiers[id].display.bullets,
        } as PlanDisplayConfig;
      }
    }
  }

  return base;
}

export function resolvePlanLimits(
  config: LaunchPlanConfig,
  plan: string,
): PlanLimitsConfig {
  return config.tiers[normalizePlanId(plan)].limits;
}

export function isOverMonthlyQuotaFromConfig(
  config: LaunchPlanConfig,
  plan: string,
  usage: { aiCalls: number; cloudSttMinutes: number },
): boolean {
  const limits = resolvePlanLimits(config, plan);
  if (
    limits.aiCallsPerMonth != null &&
    usage.aiCalls > limits.aiCallsPerMonth
  ) {
    return true;
  }
  if (
    limits.cloudSttMinutesPerMonth != null &&
    usage.cloudSttMinutes > limits.cloudSttMinutesPerMonth
  ) {
    return true;
  }
  return false;
}
