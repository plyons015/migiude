export type MeetingTemplate = {
  id: string;
  label: string;
  description: string;
  /** Supports `{date}` placeholder */
  defaultTitle: string;
  tags: string[];
  agenda: string;
};

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: "one-on-one",
    label: "1:1",
    description: "Weekly check-in with one person",
    defaultTitle: "1:1 — {date}",
    tags: ["1:1"],
    agenda: `1. How are things going?
2. Wins since last time
3. Blockers / needs
4. Priorities until next 1:1
5. Action items`,
  },
  {
    id: "client",
    label: "Client call",
    description: "External stakeholder meeting",
    defaultTitle: "Client call — {date}",
    tags: ["client"],
    agenda: `1. Attendees & context
2. Goals for this call
3. Updates / demo
4. Questions & concerns
5. Decisions & next steps
6. Follow-up email needed?`,
  },
  {
    id: "standup",
    label: "Standup",
    description: "Short team sync",
    defaultTitle: "Standup — {date}",
    tags: ["standup", "team"],
    agenda: `1. What did you do since last standup?
2. What will you do today?
3. Any blockers?`,
  },
];

export function getMeetingTemplate(id: string): MeetingTemplate | undefined {
  return MEETING_TEMPLATES.find((t) => t.id === id);
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
