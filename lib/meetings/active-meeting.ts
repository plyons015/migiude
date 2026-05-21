export type ActiveMeetingDraft = {
  id: string;
  title: string;
  startedAt: number;
  tags: string[];
  agenda?: string;
  templateId?: string;
};

const KEY = "migiude-active-meeting";

export function loadActiveMeeting(): ActiveMeetingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveMeetingDraft;
    if (!parsed.id || !parsed.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveMeeting(draft: ActiveMeetingDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearActiveMeeting(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
