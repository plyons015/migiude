"use client";

import type { MeetingRoomProps } from "@/components/meetings/meeting-room-shared";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { aiService } from "@/lib/ai/ai-service";
import { buildMeetingAiContext } from "@/lib/meetings/meeting-context";
import type { MeetingAppendRecord, TodoRecord } from "@/lib/data/types";
import { isFirebaseConfigured } from "@/lib/env/client";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

type SummaryTabProps = MeetingRoomProps & {
  appends: MeetingAppendRecord[];
  todos: TodoRecord[];
};

export function SummaryTab({
  meeting,
  onSave,
  appends,
  todos,
}: SummaryTabProps) {
  const { provider } = useAiSettings();
  const [text, setText] = useState(meeting.aiSummary ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async () => {
    await onSave({ ...meeting, aiSummary: text.trim() || undefined });
    setMsg("Saved");
    setTimeout(() => setMsg(null), 2000);
  };

  const handleGenerate = async () => {
    if (!isFirebaseConfigured()) return;
    setBusy(true);
    setMsg(null);
    try {
      const ctx = buildMeetingAiContext(meeting, appends, todos);
      const out = await aiService.summarize(ctx, provider);
      setText(out.result);
      await onSave({ ...meeting, aiSummary: out.result });
      setMsg("Summary generated");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Editable AI summary — does not change the canonical transcript.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder="Meeting summary…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Save summary
        </button>
        {isFirebaseConfigured() ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerate()}
            className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate with AI
          </button>
        ) : null}
      </div>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
