import { defineSecret } from "firebase-functions/params";
import { ensureFirebaseAdmin } from "./firebase-admin-app";
import * as logger from "firebase-functions/logger";

ensureFirebaseAdmin();
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { toAiHttpsError } from "./ai/errors";
import { assertProviderConfigured, runAiByProvider } from "./ai/router";
import type { AiProcessResponse } from "./ai/types";
import { transcribeAudioWithGemini } from "./stt";
import {
  adminGetDashboard,
  adminGetUser,
  adminListFlags,
  adminListSupportTickets,
  adminListUsers,
  adminResolveFlag,
  adminUpdateSupportTicket,
  adminUpdateUser,
  adminVerify,
} from "./admin/handlers";
import {
  adminAddOrgMember,
  adminCreateOrg,
  adminDeleteUser,
  adminGetAdminConfig,
  adminGetRetention,
  adminListAuditLog,
  adminListClientErrors,
  adminListOrgs,
  adminRemoveOrgMember,
  adminUpdateAdminConfig,
  adminUpdateOrg,
} from "./admin/extended-handlers";
import { recordUsage, touchUserProfile } from "./admin/usage";
import { assertCanUseAi, assertCanUseCloudStt } from "./plan/enforce-quota";
import {
  getPlanAndUsage,
  adminGetPlanConfig,
  adminUpdatePlanConfig,
  adminResetPlanConfig,
  recordTrialUsage,
} from "./plan/handlers";
import { recordTrialAiUsage } from "./plan/trial";
import { submitSupportTicket } from "./support";
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "./billing/handlers";
import { stripeWebhook } from "./billing/webhook";
import { reportClientError } from "./client-errors";
import {
  beginMicrosoftOAuth,
  completeMicrosoftOAuth,
  disconnectMicrosoftIntegration,
  getMicrosoftIntegrationStatus,
  requestTeamsBotJoin,
} from "./integrations/microsoft/handlers";

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const xaiApiKey = defineSecret("XAI_API_KEY");

const requestSchema = z.object({
  text: z.string().min(1),
  task: z
    .enum([
      "summarize",
      "extract_todos",
      "mind_map",
      "meeting_insights",
      "daily_recap",
      "suggest_topics",
      "meeting_minutes",
      "generic",
    ])
    .default("generic"),
  provider: z.enum(["gemini", "grok"]).default("gemini"),
});

/**
 * Callable AI endpoint — Gemini (Genkit) or Grok (Vercel AI SDK).
 * API keys live only in Functions secrets (never in the client bundle).
 */
export const aiProcess = onCall(
  { secrets: [geminiApiKey, xaiApiKey], invoker: "public" },
  async (request): Promise<AiProcessResponse> => {
    try {
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Sign in required before using AI features.",
        );
      }

      const parsed = requestSchema.safeParse(request.data);
      if (!parsed.success) {
        throw new HttpsError("invalid-argument", parsed.error.message);
      }

      const { text, task, provider } = parsed.data;

      // Production: Cloud Secret Manager via defineSecret. Emulator: functions/.env or .secret.local
      if (!process.env.FUNCTIONS_EMULATOR) {
        process.env.GEMINI_API_KEY = geminiApiKey.value();
        process.env.XAI_API_KEY = xaiApiKey.value();
      }

      logger.info("aiProcess", {
        provider,
        task,
        uid: request.auth.uid,
        textLength: text.length,
      });

      assertProviderConfigured(provider);

      const uid = request.auth.uid;
      await assertCanUseAi(uid);
      void touchUserProfile(uid, {
        email: request.auth.token.email ?? null,
      }).catch(() => undefined);
      void recordUsage(uid, "aiCalls").catch(() => undefined);
      void recordTrialAiUsage(uid).catch(() => undefined);

      const result = await runAiByProvider(provider, text, task);
      return { result, provider, task };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      const provider =
        request.data &&
        typeof request.data === "object" &&
        "provider" in request.data &&
        (request.data.provider === "grok" || request.data.provider === "gemini")
          ? request.data.provider
          : "gemini";
      throw toAiHttpsError(error, provider);
    }
  },
);

const transcribeRequestSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().default("audio/webm"),
  lang: z.string().default("en-US"),
  audioDurationMs: z.number().int().min(0).max(120_000).optional(),
  /** Meeting mode uses longer VAD chunks client-side and a diarization-friendly prompt. */
  context: z.enum(["quick", "meeting"]).optional(),
});

export type TranscribeAudioResponse = {
  segments: Array<{ speakerId: number; text: string }>;
};

/**
 * Cloud STT — short audio chunks sent for transcription (not retained server-side).
 * Uses Gemini multimodal; speaker diarization when multiple voices are present.
 */
export const transcribeAudio = onCall(
  { secrets: [geminiApiKey], invoker: "public" },
  async (request): Promise<TranscribeAudioResponse> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in required before using cloud transcription.",
      );
    }

    const parsed = transcribeRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const { audioBase64, mimeType, lang, audioDurationMs, context } =
      parsed.data;

    if (audioBase64.length > 12_000_000) {
      throw new HttpsError(
        "invalid-argument",
        "Audio chunk too large. Use shorter recording segments.",
      );
    }

    if (!process.env.FUNCTIONS_EMULATOR) {
      process.env.GEMINI_API_KEY = geminiApiKey.value();
    }

    logger.info("transcribeAudio", {
      uid: request.auth.uid,
      mimeType,
      lang,
      audioDurationMs,
      bytesApprox: Math.round((audioBase64.length * 3) / 4),
    });

    try {
      const uid = request.auth.uid;
      await assertCanUseCloudStt(uid);
      const bytesApprox = Math.round((audioBase64.length * 3) / 4);
      void touchUserProfile(uid, {
        email: request.auth.token.email ?? null,
      }).catch(() => undefined);
      const sttSeconds =
        audioDurationMs && audioDurationMs > 0
          ? Math.max(1, Math.round(audioDurationMs / 1000))
          : 0;
      void recordUsage(uid, "cloudSttChunks", 1, {
        cloudSttBytes: bytesApprox,
        cloudSttSeconds: sttSeconds,
      }).catch(() => undefined);

      const durationSec =
        audioDurationMs && audioDurationMs > 0 ? audioDurationMs / 1000 : 0;
      const { segments } = await transcribeAudioWithGemini(
        audioBase64,
        mimeType,
        lang,
        durationSec,
        context === "meeting" ? "meeting" : "quick",
      );
      return { segments };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      const message =
        error instanceof Error ? error.message : "Transcription failed.";
      throw new HttpsError("internal", message);
    }
  },
);

export {
  adminVerify,
  adminGetDashboard,
  adminListUsers,
  adminUpdateUser,
  adminListFlags,
  adminResolveFlag,
  adminGetUser,
  adminListSupportTickets,
  adminUpdateSupportTicket,
  adminListAuditLog,
  adminDeleteUser,
  adminGetRetention,
  adminGetAdminConfig,
  adminUpdateAdminConfig,
  adminListOrgs,
  adminCreateOrg,
  adminUpdateOrg,
  adminAddOrgMember,
  adminRemoveOrgMember,
  adminListClientErrors,
  submitSupportTicket,
  reportClientError,
  createCheckoutSession,
  createBillingPortalSession,
  stripeWebhook,
  getPlanAndUsage,
  adminGetPlanConfig,
  adminUpdatePlanConfig,
  adminResetPlanConfig,
  recordTrialUsage,
  getMicrosoftIntegrationStatus,
  beginMicrosoftOAuth,
  completeMicrosoftOAuth,
  disconnectMicrosoftIntegration,
  requestTeamsBotJoin,
};
