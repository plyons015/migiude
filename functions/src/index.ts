import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
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
import { recordUsage, touchUserProfile } from "./admin/usage";
import { submitSupportTicket } from "./support";

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
      "suggest_tags",
      "daily_recap",
      "detect_commitments",
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
      void touchUserProfile(uid, {
        email: request.auth.token.email ?? null,
      }).catch(() => undefined);
      void recordUsage(uid, "aiCalls").catch(() => undefined);

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

    const { audioBase64, mimeType, lang } = parsed.data;

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
      bytesApprox: Math.round((audioBase64.length * 3) / 4),
    });

    try {
      const uid = request.auth.uid;
      const bytesApprox = Math.round((audioBase64.length * 3) / 4);
      void touchUserProfile(uid, {
        email: request.auth.token.email ?? null,
      }).catch(() => undefined);
      void recordUsage(uid, "cloudSttChunks", 1, {
        cloudSttBytes: bytesApprox,
      }).catch(() => undefined);

      const { segments } = await transcribeAudioWithGemini(
        audioBase64,
        mimeType,
        lang,
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
  submitSupportTicket,
};
