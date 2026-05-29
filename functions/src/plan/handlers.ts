import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { assertAdmin } from "../admin/assert-admin";
import { writeAdminAuditLog } from "../admin/audit";
import { currentMonthKey, readMonthUsage } from "../admin/month-usage";
import { readTeamsBotUsage } from "../integrations/microsoft/store";
import { utcTodayKey } from "../admin/plan-limits";
import { adminSecrets, bindAdminEmailsEnv } from "../admin/secrets";
import { formatZodError } from "../admin/zod-helpers";
import {
  getLaunchPlanConfigMeta,
  setLaunchPlanConfig,
  ensureLaunchPlanConfigSeeded,
} from "./config";
import {
  DEFAULT_LAUNCH_PLAN_CONFIG,
  mergeLaunchPlanConfig,
  normalizePlanId,
  resolvePlanLimits,
  type LaunchPlanConfig,
  type PlanId,
} from "./defaults";
import {
  assertTrialUsageRoom,
  buildTrialStatus,
  ensureNewUserTrial,
  incrementTrialUsage,
  readTrialUsage,
  shouldApplyTrialLimits,
  trialExpiredRequiresUpgrade,
} from "./trial";

const callOptions = { invoker: "public" as const };
const adminOptions = { invoker: "public" as const, secrets: adminSecrets };

const planLimitsPatchSchema = z.object({
  aiCallsPerMonth: z.number().int().min(0).nullable().optional(),
  cloudSttMinutesPerMonth: z.number().int().min(0).nullable().optional(),
  cloudSttChunksPerDay: z.number().int().min(0).nullable().optional(),
  cloudSttChunksPerDayWarn: z.number().int().min(0).nullable().optional(),
  aiFairUse: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
  usageDashboard: z.boolean().optional(),
  teamsBotEnabled: z.boolean().optional(),
  teamsBotMinutesPerMonth: z.number().int().min(0).nullable().optional(),
  teamsBotJoinsPerMonth: z.number().int().min(0).nullable().optional(),
  teamsBotCalendarAutoJoin: z.boolean().optional(),
});

const planDisplayPatchSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  priceMonthlyUsd: z.number().min(0).nullable().optional(),
  priceYearlyUsd: z.number().min(0).nullable().optional(),
  tagline: z.string().max(240).optional(),
  cloudSttLabel: z.string().max(120).optional(),
  aiLabel: z.string().max(120).optional(),
  bullets: z.array(z.string().max(200)).max(12).optional(),
});

const tierPatchSchema = z.object({
  limits: planLimitsPatchSchema.optional(),
  display: planDisplayPatchSchema.optional(),
});

const adminUpdatePlanConfigSchema = z
  .object({
    /** Replace entire config (admin Plans editor). */
    config: z.record(z.string(), z.unknown()).optional(),
    fairUseTooltip: z.string().max(500).optional(),
    fairUsePolicyShort: z.string().max(1000).optional(),
    tiers: z
      .object({
        free: tierPatchSchema.optional(),
        pro: tierPatchSchema.optional(),
        power: tierPatchSchema.optional(),
      })
      .optional(),
  })
  .refine(
    (d) => d.config != null || d.fairUseTooltip != null || d.fairUsePolicyShort != null || d.tiers != null,
    { message: "No plan config fields to update." },
  );

function applyTierPatch(
  config: LaunchPlanConfig,
  id: PlanId,
  patch: z.infer<typeof tierPatchSchema>,
): void {
  if (patch.limits) {
    config.tiers[id].limits = {
      ...config.tiers[id].limits,
      ...patch.limits,
    };
  }
  if (patch.display) {
    config.tiers[id].display = {
      ...config.tiers[id].display,
      ...patch.display,
    };
  }
}

async function readTodayCloudSttChunks(uid: string): Promise<number> {
  const day = utcTodayKey();
  const snap = await getFirestore().doc(`usageDaily/${day}/users/${uid}`).get();
  return (snap.data()?.cloudSttChunks as number | undefined) ?? 0;
}

/** Signed-in users: live plan config + month-to-date usage. */
export const getPlanAndUsage = onCall(callOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in to view plan usage.");
  }

  const uid = request.auth.uid;
  const config = await ensureLaunchPlanConfigSeeded();

  const profile = await ensureNewUserTrial(
    uid,
    request.auth.token.email ?? null,
  );
  const plan = normalizePlanId(profile.plan ?? undefined);
  const limits = resolvePlanLimits(config, plan);
  const display = config.tiers[plan].display;

  const monthUsage = await readMonthUsage(uid);
  const teamsBotUsage = await readTeamsBotUsage(uid);
  const cloudSttChunksToday = await readTodayCloudSttChunks(uid);
  const trialUsage = await readTrialUsage(uid);

  return {
    plan,
    config,
    usage: {
      month: currentMonthKey(),
      aiCalls: monthUsage.aiCalls,
      cloudSttMinutes: monthUsage.cloudSttMinutes,
      cloudSttChunksToday,
      teamsBotMinutes: teamsBotUsage.teamsBotMinutes,
      teamsBotJoins: teamsBotUsage.teamsBotJoins,
    },
    limits,
    display: { id: plan, ...display },
    trial: buildTrialStatus(profile, trialUsage),
    planOverride: profile.planOverride === true,
    requiresUpgrade: trialExpiredRequiresUpgrade(profile),
  };
});

export const adminGetPlanConfig = onCall(adminOptions, async (request) => {
  bindAdminEmailsEnv();
  await assertAdmin(request);
  const meta = await getLaunchPlanConfigMeta();
  if (meta.updatedAt == null) {
    await ensureLaunchPlanConfigSeeded();
    return await getLaunchPlanConfigMeta();
  }
  return meta;
});

export const adminUpdatePlanConfig = onCall(adminOptions, async (request) => {
  bindAdminEmailsEnv();
  const actor = await assertAdmin(request);
  const parsed = adminUpdatePlanConfigSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", formatZodError(parsed.error));
  }

  if (parsed.data.config) {
    const validated = mergeLaunchPlanConfig(parsed.data.config);
    await setLaunchPlanConfig(validated, actor.uid);
    await writeAdminAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "plan.config_update",
      snapshot: { fullReplace: true },
    });
    return { ok: true, config: validated };
  }

  const current = await ensureLaunchPlanConfigSeeded();
  const next = structuredClone(current);

  if (parsed.data.fairUseTooltip !== undefined) {
    next.fairUseTooltip = parsed.data.fairUseTooltip;
  }
  if (parsed.data.fairUsePolicyShort !== undefined) {
    next.fairUsePolicyShort = parsed.data.fairUsePolicyShort;
  }
  if (parsed.data.tiers) {
    for (const id of ["free", "pro", "power"] as PlanId[]) {
      const patch = parsed.data.tiers[id];
      if (patch) applyTierPatch(next, id, patch);
    }
  }

  const validated = mergeLaunchPlanConfig(next);
  await setLaunchPlanConfig(validated, actor.uid);

  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "plan.config_update",
    snapshot: parsed.data as Record<string, unknown>,
  });

  return { ok: true, config: validated };
});

export const adminResetPlanConfig = onCall(adminOptions, async (request) => {
  bindAdminEmailsEnv();
  const actor = await assertAdmin(request);
  await setLaunchPlanConfig(DEFAULT_LAUNCH_PLAN_CONFIG, actor.uid);
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action: "plan.config_reset",
  });
  return { ok: true, config: DEFAULT_LAUNCH_PLAN_CONFIG };
});

const recordTrialUsageSchema = z.object({
  meetingMinutes: z.number().min(0).max(480).optional(),
  onDeviceMinutes: z.number().min(0).max(480).optional(),
});

/** Report meeting or on-device minutes during the 7-day trial. */
export const recordTrialUsage = onCall(callOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in to record usage.");
  }
  const parsed = recordTrialUsageSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", formatZodError(parsed.error));
  }
  const { meetingMinutes, onDeviceMinutes } = parsed.data;
  if (meetingMinutes == null && onDeviceMinutes == null) {
    throw new HttpsError("invalid-argument", "No usage to record.");
  }

  const uid = request.auth.uid;
  const profile = await ensureNewUserTrial(
    uid,
    request.auth.token.email ?? null,
  );
  if (!shouldApplyTrialLimits(profile)) {
    const usage = await readTrialUsage(uid);
    return { ok: true, trial: buildTrialStatus(profile, usage) };
  }

  await assertTrialUsageRoom(uid, {
    meetingMinutes: meetingMinutes ?? 0,
    onDeviceMinutes: onDeviceMinutes ?? 0,
  });
  await incrementTrialUsage(uid, {
    meetingMinutes: meetingMinutes ?? 0,
    onDeviceMinutes: onDeviceMinutes ?? 0,
  });

  const usage = await readTrialUsage(uid);
  return {
    ok: true,
    trial: buildTrialStatus(profile, usage),
  };
});
