import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { buildTaskPrompt } from "./prompts";
import type { AiTask } from "./types";

/** xAI chat model — see https://docs.x.ai/docs/models */
const GROK_MODEL = "grok-4-1-fast-non-reasoning";

export async function runGrokFlow(text: string, task: AiTask): Promise<string> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "XAI_API_KEY is not set. Run: firebase functions:secrets:set XAI_API_KEY",
    );
  }

  const xai = createXai({ apiKey });
  const { text: result } = await generateText({
    model: xai(GROK_MODEL),
    prompt: buildTaskPrompt(task, text),
  });

  const trimmed = result?.trim();
  if (!trimmed) {
    throw new Error("Grok returned an empty response. Try again.");
  }

  return trimmed;
}
