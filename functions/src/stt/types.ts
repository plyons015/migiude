import { z } from "zod";

export const sttSegmentSchema = z.object({
  speakerId: z.number().int().min(1).max(8),
  text: z.string().min(1),
});

export const sttResponseSchema = z.object({
  segments: z.array(sttSegmentSchema),
});

export type SttSegment = z.infer<typeof sttSegmentSchema>;
export type SttResponse = z.infer<typeof sttResponseSchema>;
