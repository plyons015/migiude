import { runGeminiFlow } from "./genkit";
import { runGrokFlow } from "./grok";
import type { AiProvider, AiTask } from "./types";

export async function runAiByProvider(
  provider: AiProvider,
  text: string,
  task: AiTask,
): Promise<string> {
  if (provider === "grok") {
    return runGrokFlow(text, task);
  }
  return runGeminiFlow(text, task);
}

export function assertProviderConfigured(provider: AiProvider): void {
  if (provider === "grok" && !process.env.XAI_API_KEY) {
    throw new Error(
      "XAI_API_KEY is not set. Use: firebase functions:secrets:set XAI_API_KEY",
    );
  }
  if (provider === "gemini" && !process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Use: firebase functions:secrets:set GEMINI_API_KEY",
    );
  }
}
