export const MEETING_TABS = [
  "transcript",
  "summary",
  "notes",
  "script",
  "followups",
  "topics",
  "ask",
] as const;

export type MeetingTabId = (typeof MEETING_TABS)[number];

export function parseMeetingTab(value: string | null): MeetingTabId {
  if (value && MEETING_TABS.includes(value as MeetingTabId)) {
    return value as MeetingTabId;
  }
  return "transcript";
}
