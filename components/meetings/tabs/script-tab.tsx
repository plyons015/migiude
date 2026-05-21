"use client";

import type { MeetingRoomProps } from "@/components/meetings/meeting-room-shared";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { aiService } from "@/lib/ai/ai-service";
import { buildMeetingAiContext } from "@/lib/meetings/meeting-context";
import type { MeetingAppendRecord, TodoRecord } from "@/lib/data/types";
import { isFirebaseConfigured } from "@/lib/env/client";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

type ScriptTabProps = MeetingRoomProps & {
  appends: MeetingAppendRecord[];
  todos: TodoRecord[];
};

export function ScriptTab({
  meeting,
  onSave,
  appends,
  todos,
}: ScriptTabProps) {
  const { provider } = useAiSettings();
  const [agenda, setAgenda] = useState(meeting.agenda ?? "");
  const [minutes, setMinutes] = useState(meeting.minutes ?? "");
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    await onSave({
      ...meeting,
      agenda: agenda.trim() || undefined,
      minutes: minutes.trim() || undefined,
    });
  };

  const handlePolish = async () => {
    if (!isFirebaseConfigured()) return;
    setBusy(true);
    try {
      const ctx = buildMeetingAiContext(meeting, appends, todos);
      const prompt = `${ctx}\n\n---\n\nAgenda (if any):\n${agenda || "(none)"}`;
      const out = await aiService.meetingMinutes(prompt, provider);
      setMinutes(out.result);
      await onSave({ ...meeting, agenda: agenda.trim() || undefined, minutes: out.result });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Agenda (before)</h3>
        <p className="text-xs text-muted-foreground">
          Optional outline for the meeting
        </p>
        <textarea
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          rows={5}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="1. Introduction…"
        />
      </div>
      <div>
        <h3 className="text-sm font-medium">Minutes / narrative (after)</h3>
        <textarea
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          rows={10}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed"
          placeholder="Polished minutes…"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Save script
        </button>
        {isFirebaseConfigured() ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handlePolish()}
            className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI polish minutes
          </button>
        ) : null}
      </div>
    </div>
  );
}
