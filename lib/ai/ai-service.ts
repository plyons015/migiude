import { processWithAi, AiServiceError } from "@/lib/ai/client";
import type {
  AiProcessInput,
  AiProcessOutput,
  AiProvider,
  AiTask,
} from "@/lib/ai/types";

export { AiServiceError };

const PROVIDER_KEY = "migiude-ai-provider";

const taskLabels: Record<AiTask, string> = {
  summarize: "Summarize",
  extract_todos: "Extract todos",
  mind_map: "Mind map",
  suggest_tags: "Suggest tags",
  daily_recap: "Daily recap",
  detect_commitments: "Detect commitments",
  suggest_topics: "Suggest topics",
  meeting_minutes: "Meeting minutes",
  generic: "Ask AI",
};

export class AiService {
  getPreferredProvider(): AiProvider {
    if (typeof window === "undefined") return "gemini";
    const stored = localStorage.getItem(PROVIDER_KEY);
    return stored === "grok" ? "grok" : "gemini";
  }

  setPreferredProvider(provider: AiProvider): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROVIDER_KEY, provider);
  }

  getTaskLabel(task: AiTask): string {
    return taskLabels[task];
  }

  async process(
    input: Omit<AiProcessInput, "provider"> & { provider?: AiProvider },
    options?: { provider?: AiProvider },
  ): Promise<AiProcessOutput> {
    const provider =
      options?.provider ?? input.provider ?? this.getPreferredProvider();
    return processWithAi({
      text: input.text,
      task: input.task ?? "generic",
      provider,
    });
  }

  async summarize(
    text: string,
    provider?: AiProvider,
  ): Promise<AiProcessOutput> {
    return this.process({ text, task: "summarize", provider });
  }

  async extractTodos(
    text: string,
    provider?: AiProvider,
  ): Promise<AiProcessOutput> {
    return this.process({ text, task: "extract_todos", provider });
  }

  async mindMap(text: string, provider?: AiProvider): Promise<AiProcessOutput> {
    return this.process({ text, task: "mind_map", provider });
  }

  async ask(text: string, provider?: AiProvider): Promise<AiProcessOutput> {
    return this.process({ text, task: "generic", provider });
  }

  async suggestTags(
    text: string,
    provider?: AiProvider,
  ): Promise<AiProcessOutput> {
    return this.process({ text, task: "suggest_tags", provider });
  }

  async dailyRecap(
    text: string,
    provider?: AiProvider,
  ): Promise<AiProcessOutput> {
    return this.process({ text, task: "daily_recap", provider });
  }

  async detectCommitments(
    text: string,
    provider?: AiProvider,
  ): Promise<AiProcessOutput> {
    return this.process({ text, task: "detect_commitments", provider });
  }

  async suggestTopics(
    text: string,
    provider?: AiProvider,
  ): Promise<AiProcessOutput> {
    return this.process({ text, task: "suggest_topics", provider });
  }

  async meetingMinutes(
    text: string,
    provider?: AiProvider,
  ): Promise<AiProcessOutput> {
    return this.process({ text, task: "meeting_minutes", provider });
  }
}

export const aiService = new AiService();
