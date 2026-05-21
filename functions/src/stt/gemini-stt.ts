import { getGeminiApiKey } from "../ai/genkit";
import { sttResponseSchema, type SttResponse } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";

const STT_PROMPT = `Transcribe the spoken audio accurately.
If multiple speakers are present, assign speakerId 1, 2, etc. (same speaker = same id).
If only one speaker, use speakerId 1.

Return ONLY valid JSON (no markdown):
{"segments":[{"speakerId":1,"text":"..."}]}

Split into short segments when speakers change or after natural pauses.`;

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return body.slice(start, end + 1);
}

function parseSttResponse(raw: string): SttResponse {
  const jsonText = extractJsonObject(raw);
  if (!jsonText) {
    throw new Error("STT model did not return JSON segments.");
  }
  const parsed = sttResponseSchema.safeParse(JSON.parse(jsonText));
  if (!parsed.success) {
    throw new Error("STT JSON did not match expected segment shape.");
  }
  return parsed.data;
}

export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType: string,
  lang: string,
): Promise<SttResponse> {
  const apiKey = getGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: `${STT_PROMPT}\nLanguage hint: ${lang}` },
            {
              inlineData: {
                mimeType: mimeType || "audio/webm",
                data: audioBase64,
              },
            },
          ],
        },
      ],
    }),
  });

  const body = (await response.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  if (!response.ok) {
    const msg = body.error?.message ?? `Gemini STT HTTP ${response.status}`;
    throw new Error(msg);
  }

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty transcription.");
  }

  try {
    return parseSttResponse(text);
  } catch {
    return {
      segments: [{ speakerId: 1, text: text.replace(/^```[\s\S]*?```/g, "").trim() }],
    };
  }
}
