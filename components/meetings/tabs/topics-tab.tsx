"use client";

import type { MeetingRoomProps } from "@/components/meetings/meeting-room-shared";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { parseTopicsFromAi } from "@/lib/ai/parse-topics";
import { aiService } from "@/lib/ai/ai-service";
import { buildMeetingAiContext } from "@/lib/meetings/meeting-context";
import type { MeetingAppendRecord, MeetingTopic, TodoRecord } from "@/lib/data/types";
import { isFirebaseConfigured } from "@/lib/env/client";
import { createId } from "@/lib/data/ids";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

type TopicsTabProps = MeetingRoomProps & {
  appends: MeetingAppendRecord[];
  todos: TodoRecord[];
};

export function TopicsTab({
  meeting,
  onSave,
  appends,
  todos,
}: TopicsTabProps) {
  const { provider } = useAiSettings();
  const topics = meeting.topics ?? [];
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const persist = (next: MeetingTopic[]) =>
    onSave({ ...meeting, topics: next.length ? next : undefined });

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    await persist([
      ...topics,
      { id: createId("topic"), title },
    ]);
    setNewTitle("");
  };

  const handleRemove = async (id: string) => {
    await persist(topics.filter((t) => t.id !== id));
  };

  const handleSuggest = async () => {
    if (!isFirebaseConfigured()) return;
    setBusy(true);
    try {
      const ctx = buildMeetingAiContext(meeting, appends, todos);
      const out = await aiService.suggestTopics(ctx, provider);
      const suggested = parseTopicsFromAi(out.result);
      const merged = [...topics];
      for (const s of suggested) {
        if (!merged.some((m) => m.title.toLowerCase() === s.title.toLowerCase())) {
          merged.push(s);
        }
      }
      await persist(merged);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Tag follow-ups by topic on the Follow-ups tab.
      </p>
      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New topic…"
          className="flex-1 rounded-md border border-border bg-background px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          className="rounded-full border border-border p-2"
          aria-label="Add topic"
        >
          <Plus className="h-4 w-4" />
        </button>
        {isFirebaseConfigured() ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSuggest()}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-medium"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            AI suggest
          </button>
        ) : null}
      </div>
      <ul className="space-y-2">
        {topics.length === 0 ? (
          <li className="text-sm text-muted-foreground">No topics yet.</li>
        ) : (
          topics.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <input
                defaultValue={t.title}
                onBlur={(e) => {
                  const title = e.target.value.trim();
                  if (!title || title === t.title) return;
                  void persist(
                    topics.map((x) =>
                      x.id === t.id ? { ...x, title } : x,
                    ),
                  );
                }}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void handleRemove(t.id)}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
