import { buildTaskPrompt } from "./prompts";
import type { AiTask } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Run: firebase functions:secrets:set GEMINI_API_KEY",
    );
  }
  return key;
}

/**
 * Gemini via Generative Language API (no Genkit runtime — smaller cold start).
 */
export async function runGeminiFlow(
  text: string,
  task: AiTask,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const prompt = buildTaskPrompt(task, text);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  const body = (await response.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  if (!response.ok) {
    const msg =
      body.error?.message ??
      `Gemini HTTP ${response.status}`;
    throw new Error(msg);
  }

  const result = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!result) {
    throw new Error("Gemini returned an empty response. Try again.");
  }

  return result;
}
