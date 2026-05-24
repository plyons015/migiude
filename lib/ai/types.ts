import { z } from "zod";

export const aiTaskSchema = z.enum([
  "summarize",
  "extract_todos",
  "mind_map",
  "meeting_insights",
  "daily_recap",
  "suggest_topics",
  "meeting_minutes",
  "generic",
]);

export type AiTask = z.infer<typeof aiTaskSchema>;

export const aiProviderSchema = z.enum(["gemini", "grok"]);

export type AiProvider = z.infer<typeof aiProviderSchema>;

export const aiProcessInputSchema = z.object({
  text: z.string().min(1),
  task: aiTaskSchema.default("generic"),
  provider: aiProviderSchema.default("gemini"),
});

export type AiProcessInput = z.infer<typeof aiProcessInputSchema>;

export const aiProcessOutputSchema = z.object({
  result: z.string(),
  provider: aiProviderSchema,
  task: aiTaskSchema,
});

export type AiProcessOutput = z.infer<typeof aiProcessOutputSchema>;
