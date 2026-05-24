import type { MeetingTemplate } from "@/lib/meetings/template-schema";
import { sectionsToReportPrompt } from "@/lib/meetings/template-schema";

export const BUILTIN_MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: "one-on-one",
    label: "1:1",
    description: "Weekly check-in with one person",
    defaultTitle: "1:1 — {date}",
    tags: ["1:1"],
    libraryTag: "1:1",
    agenda: `1. How are things going?
2. Wins since last time
3. Blockers / needs
4. Priorities until next 1:1
5. Action items`,
    reportSections: [
      "Check-in",
      "Wins",
      "Blockers",
      "Priorities",
      "Action items",
    ],
    reportPrompt: sectionsToReportPrompt([
      "Check-in",
      "Wins",
      "Blockers",
      "Priorities",
      "Action items",
    ]),
    preferCloud: true,
    builtIn: true,
  },
  {
    id: "client",
    label: "Client call",
    description: "External stakeholder meeting",
    defaultTitle: "Client call — {date}",
    tags: ["client"],
    libraryTag: "client",
    agenda: `1. Attendees & context
2. Goals for this call
3. Updates / demo
4. Questions & concerns
5. Decisions & next steps
6. Follow-up email needed?`,
    reportSections: [
      "Attendees & context",
      "Goals",
      "Updates",
      "Questions & concerns",
      "Decisions",
      "Next steps",
    ],
    reportPrompt: sectionsToReportPrompt([
      "Attendees & context",
      "Goals",
      "Updates",
      "Questions & concerns",
      "Decisions",
      "Next steps",
    ]),
    preferCloud: true,
    builtIn: true,
  },
  {
    id: "standup",
    label: "Standup",
    description: "Short team sync",
    defaultTitle: "Standup — {date}",
    tags: ["standup", "team"],
    libraryTag: "standup",
    agenda: `1. What did you do since last standup?
2. What will you do today?
3. Any blockers?`,
    reportSections: ["Since last standup", "Today", "Blockers"],
    reportPrompt: sectionsToReportPrompt([
      "Since last standup",
      "Today",
      "Blockers",
    ]),
    preferCloud: true,
    builtIn: true,
  },
];

/** @deprecated use BUILTIN_MEETING_TEMPLATES */
export const MEETING_TEMPLATES = BUILTIN_MEETING_TEMPLATES;

export function getMeetingTemplate(id: string): MeetingTemplate | undefined {
  return BUILTIN_MEETING_TEMPLATES.find((t) => t.id === id);
}

export function applyTemplateTitle(template: MeetingTemplate, date: Date): string {
  const dateStr = date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return template.defaultTitle.replace("{date}", dateStr);
}

export function buildTemplateInsightsContext(
  transcript: string,
  template: MeetingTemplate | null | undefined,
): string {
  if (!template) return transcript;
  const parts = [
    `Meeting type: ${template.label}`,
    `Library series: ${template.libraryTag}`,
    template.reportPrompt,
  ];
  if (template.agenda.trim()) {
    parts.push(`Agenda:\n${template.agenda.trim()}`);
  }
  parts.push(`---\n\nTranscript:\n${transcript}`);
  return parts.join("\n\n");
}

export function buildTemplateMinutesScaffold(
  template: MeetingTemplate,
  title: string,
): string {
  const headings = template.reportSections.map((s) => `## ${s}\n\n`).join("");
  return `# ${title}\n\n${headings}`;
}
