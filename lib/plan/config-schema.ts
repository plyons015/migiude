import { z } from "zod";

export const PLAN_IDS = ["free", "pro", "power"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const planLimitsSchema = z.object({
  aiCallsPerMonth: z.number().int().min(0).nullable(),
  cloudSttMinutesPerMonth: z.number().int().min(0).nullable(),
  cloudSttChunksPerDay: z.number().int().min(0).nullable(),
  cloudSttChunksPerDayWarn: z.number().int().min(0).nullable(),
  aiFairUse: z.boolean(),
  prioritySupport: z.boolean(),
  usageDashboard: z.boolean(),
  /** Teams calling bot (Otter-style join) — Pro/Power only. */
  teamsBotEnabled: z.boolean(),
  teamsBotMinutesPerMonth: z.number().int().min(0).nullable(),
  teamsBotJoinsPerMonth: z.number().int().min(0).nullable(),
  /** Power: auto-join from calendar (when integration ships). */
  teamsBotCalendarAutoJoin: z.boolean(),
});

export const planDisplaySchema = z.object({
  name: z.string().min(1).max(40),
  priceMonthlyUsd: z.number().min(0).nullable(),
  priceYearlyUsd: z.number().min(0).nullable(),
  tagline: z.string().max(240),
  cloudSttLabel: z.string().max(120),
  aiLabel: z.string().max(120),
  teamsBotLabel: z.string().max(160).optional(),
  bullets: z.array(z.string().max(200)).max(12),
});

export const planTierSchema = z.object({
  limits: planLimitsSchema,
  display: planDisplaySchema,
});

export const launchPlanConfigSchema = z.object({
  fairUseTooltip: z.string().max(500),
  fairUsePolicyShort: z.string().max(1000),
  tiers: z.object({
    free: planTierSchema,
    pro: planTierSchema,
    power: planTierSchema,
  }),
});

export type PlanLimitsConfig = z.infer<typeof planLimitsSchema>;
export type PlanDisplayConfig = z.infer<typeof planDisplaySchema>;
export type PlanTierConfig = z.infer<typeof planTierSchema>;
export type LaunchPlanConfig = z.infer<typeof launchPlanConfigSchema>;

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
        teamsBotEnabled: false,
        teamsBotMinutesPerMonth: null,
        teamsBotJoinsPerMonth: null,
        teamsBotCalendarAutoJoin: false,
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
        teamsBotEnabled: true,
        teamsBotMinutesPerMonth: 600,
        teamsBotJoinsPerMonth: 30,
        teamsBotCalendarAutoJoin: false,
      },
      display: {
        name: "Pro",
        priceMonthlyUsd: 14.99,
        priceYearlyUsd: 129,
        tagline: "Generous monthly limits for everyday professional use.",
        cloudSttLabel: "1,000 cloud transcription minutes / month",
        aiLabel: "200 AI actions / month",
        teamsBotLabel: "Teams meeting bot — 600 bot-min / month",
        bullets: [
          "1,000 cloud transcription minutes per month",
          "200 AI actions per month",
          "Teams meeting bot joins your calls (Otter-style)",
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
        teamsBotEnabled: true,
        teamsBotMinutesPerMonth: 2400,
        teamsBotJoinsPerMonth: 120,
        teamsBotCalendarAutoJoin: true,
      },
      display: {
        name: "Power",
        priceMonthlyUsd: 22.99,
        priceYearlyUsd: 229,
        tagline: "High-volume fair use for full workdays and heavy AI.",
        cloudSttLabel: "~3,000 cloud transcription minutes / month (fair use)",
        aiLabel: "High-volume AI processing (fair use)",
        teamsBotLabel: "Teams bot — ~2,400 bot-min / mo + calendar auto-join (beta)",
        bullets: [
          "~3,000 cloud transcription minutes per month (fair use)",
          "Generous AI processing (fair use)",
          "Teams meeting bot with higher limits + calendar auto-join (beta)",
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

export function resolvePlanLimits(
  config: LaunchPlanConfig,
  plan: string,
): PlanLimitsConfig {
  return config.tiers[normalizePlanId(plan)].limits;
}

export function resolvePlanDisplay(
  config: LaunchPlanConfig,
  plan: string,
): PlanDisplayConfig & { id: PlanId } {
  const id = normalizePlanId(plan);
  return { id, ...config.tiers[id].display };
}

/** Deep-merge Firestore partial over defaults. */
export function mergeLaunchPlanConfig(
  partial: unknown,
): LaunchPlanConfig {
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
    for (const id of PLAN_IDS) {
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
        };
      }
    }
  }

  return launchPlanConfigSchema.parse(base);
}

export function formatAiLimitLabelFromConfig(
  config: LaunchPlanConfig,
  plan: string,
): string {
  const limits = resolvePlanLimits(config, plan);
  if (limits.aiFairUse || limits.aiCallsPerMonth == null) {
    return "Fair use AI";
  }
  return `${limits.aiCallsPerMonth} / month`;
}

export function formatCloudSttLimitLabelFromConfig(
  config: LaunchPlanConfig,
  plan: string,
): string {
  const limits = resolvePlanLimits(config, plan);
  if (limits.cloudSttMinutesPerMonth == null) {
    return "Fair use cloud transcription";
  }
  return `${limits.cloudSttMinutesPerMonth} min / month`;
}

export function isOverMonthlyQuotaFromConfig(
  config: LaunchPlanConfig,
  plan: string,
  usage: {
    aiCalls: number;
    cloudSttMinutes: number;
  },
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
