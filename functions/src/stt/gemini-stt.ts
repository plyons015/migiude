import { getGeminiApiKey } from "../ai/genkit";
import * as logger from "firebase-functions/logger";
import { parseSttResponse } from "./parse-stt-response";
import { sanitizeSttSegments } from "./sanitize-segments";
import type { SttResponse } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";

const STT_PROMPT_QUICK = `Transcribe only words clearly spoken in this microphone audio clip.
If silent or unintelligible, return an empty segments list.
Do not invent dialogue, meetings, interviews, or names not heard in the audio.
Use speakerId 1 for a single speaker.`;

const STT_PROMPT_MEETING = `Transcribe only words clearly spoken in this microphone audio clip.
If silent or unintelligible, return an empty segments list.
Do not invent dialogue, meetings, interviews, or names not heard in the audio.
Speaker labels (speakerId 1–8):
- One clear voice → speakerId 1 only.
- Multiple distinct voices (different pitch/timbre, or clear turn-taking) → use 1, 2, 3… consistently within this clip for each voice.
- Do not merge different speakers into one id unless they sound like the same person.
- Overlapping or unclear audio: transcribe what you hear; split speakers only when reasonably confident.`;

export type SttContext = "quick" | "meeting";

function sttPromptFor(context: SttContext): string {
  return context === "meeting" ? STT_PROMPT_MEETING : STT_PROMPT_QUICK;
}

type GeminiBody = {
  error?: { message?: string };
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

async function requestGemini(
  url: string,
  generationConfig: Record<string, unknown>,
  contents: unknown[],
): Promise<GeminiBody> {
  const post = async (config: Record<string, unknown>) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generationConfig: config, contents }),
    });
    return {
      response,
      body: (await response.json()) as GeminiBody,
    };
  };

  let { response, body } = await post(generationConfig);
  if (
    !response.ok &&
    generationConfig.responseSchema &&
    body.error?.message?.toLowerCase().includes("schema")
  ) {
    logger.warn("transcribeAudio.schema_unsupported retrying without schema");
    const { temperature, maxOutputTokens, responseMimeType } = generationConfig;
    ({ response, body } = await post({
      temperature,
      maxOutputTokens,
      responseMimeType,
    }));
  }

  if (!response.ok) {
    const msg = body.error?.message ?? `Gemini STT HTTP ${response.status}`;
    throw new Error(msg);
  }
  return body;
}

const STT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          speakerId: { type: "integer" },
          text: { type: "string" },
        },
        required: ["speakerId", "text"],
      },
    },
  },
  required: ["segments"],
};

export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType: string,
  lang: string,
  audioDurationSec = 0,
  context: SttContext = "quick",
): Promise<SttResponse> {
  const apiKey = getGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = [
    {
      role: "user",
      parts: [
        { text: `${sttPromptFor(context)}\nLanguage: ${lang}` },
        {
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: audioBase64,
          },
        },
      ],
    },
  ];

  const body = await requestGemini(
    url,
    {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: STT_RESPONSE_SCHEMA,
    },
    contents,
  );

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    return { segments: [] };
  }

  try {
    const parsed = parseSttResponse(text);
    const duration =
      audioDurationSec > 0
        ? audioDurationSec
        : Math.max(1, parsed.segments.length * 2);
    const segments = sanitizeSttSegments(parsed.segments, duration);
    return { segments };
  } catch (error) {
    logger.warn("transcribeAudio.parse_failed", {
      preview: text.slice(0, 120),
      message: error instanceof Error ? error.message : String(error),
    });
    return { segments: [] };
  }
}
