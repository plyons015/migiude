"use client";

import type { MeetingRoomProps } from "@/components/meetings/meeting-room-shared";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { aiService } from "@/lib/ai/ai-service";
import { buildMeetingAiContext } from "@/lib/meetings/meeting-context";
import type { MeetingAppendRecord, TodoRecord } from "@/lib/data/types";
import { isFirebaseConfigured } from "@/lib/env/client";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";

type AskTabProps = MeetingRoomProps & {
  appends: MeetingAppendRecord[];
  todos: TodoRecord[];
};

type ChatLine = { role: "user" | "assistant"; text: string };

export function AskTab({ meeting, appends, todos }: AskTabProps) {
  const { provider } = useAiSettings();
  const [question, setQuestion] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [busy, setBusy] = useState(false);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || !isFirebaseConfigured()) return;
    setQuestion("");
    setLines((prev) => [...prev, { role: "user", text: q }]);
    setBusy(true);
    try {
      const ctx = buildMeetingAiContext(meeting, appends, todos);
      const out = await aiService.ask(
        `You are answering questions about ONE meeting only. Use the context below.\n\n${ctx}\n\n---\n\nQuestion: ${q}`,
        provider,
      );
      setLines((prev) => [...prev, { role: "assistant", text: out.result }]);
    } catch (e) {
      setLines((prev) => [
        ...prev,
        {
          role: "assistant",
          text: e instanceof Error ? e.message : "Could not get an answer.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Chat scoped to this meeting (transcript, summary, appends, follow-ups).
      </p>
      <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border p-3">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            e.g. &quot;What did we decide about the timeline?&quot;
          </p>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              className={
                line.role === "user"
                  ? "text-sm font-medium text-violet-700 dark:text-violet-300"
                  : "text-sm leading-relaxed whitespace-pre-wrap"
              }
            >
              {line.role === "user" ? `You: ${line.text}` : line.text}
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleAsk();
            }
          }}
          placeholder="Ask about this meeting…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
          disabled={!isFirebaseConfigured() || busy}
        />
        <button
          type="button"
          disabled={busy || !question.trim() || !isFirebaseConfigured()}
          onClick={() => void handleAsk()}
          className="rounded-full bg-violet-600 p-2 text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
