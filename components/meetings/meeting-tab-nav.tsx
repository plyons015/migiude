"use client";

import type { MeetingTabId } from "@/components/meetings/meeting-tab-types";

const TAB_LABELS: Record<MeetingTabId, string> = {
  transcript: "Transcript",
  summary: "Summary",
  notes: "Your notes",
  script: "Script",
  followups: "Follow-ups",
  topics: "Topics",
  ask: "Ask",
};

type MeetingTabNavProps = {
  active: MeetingTabId;
  onChange: (tab: MeetingTabId) => void;
};

export function MeetingTabNav({ active, onChange }: MeetingTabNavProps) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border pb-0 scrollbar-thin"
      aria-label="Meeting sections"
    >
      {(Object.keys(TAB_LABELS) as MeetingTabId[]).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`shrink-0 rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${
            active === tab
              ? "border-b-2 border-violet-600 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}
