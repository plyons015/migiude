import { z } from "zod";

export const sttSegmentSchema = z.object({
  speakerId: z.number().int().min(1),
  text: z.string().min(1),
});

export const transcribeInputSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().default("audio/webm"),
  lang: z.string().default("en-US"),
});

export const transcribeOutputSchema = z.object({
  segments: z.array(sttSegmentSchema),
});

export type TranscribeInput = z.infer<typeof transcribeInputSchema>;
export type TranscribeOutput = z.infer<typeof transcribeOutputSchema>;
