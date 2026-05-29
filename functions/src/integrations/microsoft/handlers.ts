import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getPlanLimitsFor } from "../../admin/plan-limits";
import { normalizePlanId } from "../../plan/defaults";
import { hasPaidEntitlement, readUserProfile } from "../../plan/trial";
import {
  microsoftOAuthConfigured,
  teamsBotWorkerConfigured,
} from "./config";
import {
  assertMicrosoftConnected,
  assertTeamsBotPlan,
  assertTeamsBotQuota,
} from "./enforce-teams-bot";
import { buildMicrosoftAuthorizeUrl, exchangeMicrosoftCode } from "./oauth";
import {
  consumeOAuthState,
  createTeamsBotJob,
  deleteMicrosoftIntegration,
  incrementTeamsBotUsage,
  readMicrosoftIntegration,
  readTeamsBotJob,
  saveOAuthState,
  readTeamsBotUsage,
  writeMicrosoftIntegration,
} from "./store";
import { dispatchTeamsBotJob } from "./worker-dispatch";

const callOptions = {
  invoker: "public" as const,
  // When Teams bot launches, set secrets in Firebase and bind:
  // secrets: [...microsoftSecretsForDeploy],
};

function publicJob(job: Awaited<ReturnType<typeof readTeamsBotJob>>) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    meetingUrl: job.meetingUrl,
    meetingTitle: job.meetingTitle,
    migiudeMeetingId: job.migiudeMeetingId,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export const getMicrosoftIntegrationStatus = onCall(
  callOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const uid = request.auth.uid;
    const profile = await readUserProfile(uid);
    const plan = normalizePlanId(profile.plan ?? undefined);
    const paid = hasPaidEntitlement(profile);
    const limits = await getPlanLimitsFor(plan);
    const integration = await readMicrosoftIntegration(uid);
    const usage = await readTeamsBotUsage(uid);

    const planRequired: "pro" | "power" =
      plan === "power" ? "power" : "pro";

    return {
      integration: {
        connected: Boolean(integration),
        displayName: integration?.displayName,
        email: integration?.email,
        connectedAt: integration?.connectedAt,
        workerReady: teamsBotWorkerConfigured(),
      },
      quota: {
        enabled: paid && limits.teamsBotEnabled,
        minutesUsed: usage.teamsBotMinutes,
        minutesLimit: limits.teamsBotMinutesPerMonth,
        joinsUsed: usage.teamsBotJoins,
        joinsLimit: limits.teamsBotJoinsPerMonth,
        calendarAutoJoin:
          paid && plan === "power" && limits.teamsBotCalendarAutoJoin,
      },
      planRequired,
    };
  },
);

export const beginMicrosoftOAuth = onCall(callOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  await assertTeamsBotPlan(request.auth.uid);

  if (!microsoftOAuthConfigured()) {
    throw new HttpsError(
      "failed-precondition",
      "Microsoft sign-in is not configured on the server yet.",
    );
  }

  const parsed = z
    .object({ redirectUri: z.string().url() })
    .safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "redirectUri is required.");
  }

  const state = randomBytes(24).toString("hex");
  await saveOAuthState(state, request.auth.uid, parsed.data.redirectUri);
  const url = buildMicrosoftAuthorizeUrl(parsed.data.redirectUri, state);
  return { url, state };
});

export const completeMicrosoftOAuth = onCall(callOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const parsed = z
    .object({
      code: z.string().min(1),
      state: z.string().min(1),
      redirectUri: z.string().url(),
    })
    .safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid OAuth payload.");
  }

  const oauthState = await consumeOAuthState(parsed.data.state);
  if (!oauthState || oauthState.uid !== request.auth.uid) {
    throw new HttpsError("invalid-argument", "OAuth state expired or invalid.");
  }
  if (oauthState.redirectUri !== parsed.data.redirectUri) {
    throw new HttpsError("invalid-argument", "redirectUri mismatch.");
  }

  const tokens = await exchangeMicrosoftCode(
    parsed.data.code,
    parsed.data.redirectUri,
  );

  await writeMicrosoftIntegration(request.auth.uid, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    scopes: tokens.scopes,
    displayName: tokens.displayName,
    email: tokens.email,
    microsoftUserId: tokens.microsoftUserId,
    tenantId: tokens.tenantId,
  });

  return { ok: true as const };
});

export const disconnectMicrosoftIntegration = onCall(
  callOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    await deleteMicrosoftIntegration(request.auth.uid);
    return { ok: true as const };
  },
);

const joinSchema = z.object({
  meetingUrl: z.string().url(),
  meetingTitle: z.string().max(200).optional(),
  migiudeMeetingId: z.string().max(128).optional(),
  estimatedMinutes: z.number().int().min(15).max(480).optional(),
});

export const requestTeamsBotJoin = onCall(callOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const uid = request.auth.uid;
  await assertTeamsBotPlan(uid);
  await assertMicrosoftConnected(uid);

  const parsed = joinSchema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  const estimatedMinutes = parsed.data.estimatedMinutes ?? 60;
  await assertTeamsBotQuota(uid, estimatedMinutes);

  const jobId = await createTeamsBotJob({
    uid,
    meetingUrl: parsed.data.meetingUrl,
    meetingTitle: parsed.data.meetingTitle,
    migiudeMeetingId: parsed.data.migiudeMeetingId,
    estimatedMinutes,
  });

  await incrementTeamsBotUsage(uid, 1, estimatedMinutes);

  const dispatched = await dispatchTeamsBotJob(jobId);
  if (!dispatched) {
    await getFirestore()
      .doc(`teamsBotJobs/${jobId}`)
      .set(
        {
          error:
            "Bot worker is not deployed yet. Your join is queued — we will process it when the Teams worker is live.",
          status: "queued",
          updatedAt: Date.now(),
        },
        { merge: true },
      );
  }

  const job = await readTeamsBotJob(jobId);
  return { job: publicJob(job)! };
});
