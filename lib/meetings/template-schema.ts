import { z } from "zod";

export const meetingTemplateSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(60),
  description: z.string().max(240),
  /** Supports `{date}` placeholder */
  defaultTitle: z.string().min(1).max(120),
  tags: z.array(z.string().min(1).max(40)).min(1).max(8),
  /** Primary Library series / filter tag */
  libraryTag: z.string().min(1).max(40),
  agenda: z.string().max(2000),
  /** Headings for AI summary & exported report */
  reportSections: z.array(z.string().min(1).max(80)).min(1).max(12),
  /** Extra instructions appended to AI meeting insights */
  reportPrompt: z.string().max(1500),
  preferCloud: z.boolean(),
  builtIn: z.boolean().optional(),
});

export type MeetingTemplate = z.infer<typeof meetingTemplateSchema>;

export const customMeetingTemplateSchema = meetingTemplateSchema.omit({
  builtIn: true,
});

export type CustomMeetingTemplate = z.infer<typeof customMeetingTemplateSchema>;

export function createCustomTemplateId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sectionsToReportPrompt(sections: string[]): string {
  const list = sections.map((s) => `- ${s}`).join("\n");
  return `Structure the "summary" field as markdown with exactly these section headings (use ## for each):\n${list}\n\nFill each section from the transcript only — do not invent facts.`;
}

export function parseReportSectionsText(raw: string): string[] {
  return raw
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function reportSectionsToText(sections: string[]): string {
  return sections.join("\n");
}
