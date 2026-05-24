export type AiTask =
  | "summarize"
  | "extract_todos"
  | "mind_map"
  | "meeting_insights"
  | "daily_recap"
  | "suggest_topics"
  | "meeting_minutes"
  | "generic";
export type AiProvider = "gemini" | "grok";

export type AiProcessRequest = {
  text: string;
  task?: AiTask;
  provider?: AiProvider;
};

export type AiProcessResponse = {
  result: string;
  provider: AiProvider;
  task: AiTask;
};
