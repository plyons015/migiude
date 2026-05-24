"use client";

import { MermaidDiagram } from "@/components/mermaid-diagram";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { useAuthUser } from "@/hooks/use-auth-user";
import { aiService, AiServiceError } from "@/lib/ai/ai-service";
import {
  mergeTodoTexts,
  parseMeetingInsights,
  type MeetingInsights,
} from "@/lib/ai/parse-meeting-insights";
import { saveInsightsTodos } from "@/lib/ai/save-insights-todos";
import { saveNote } from "@/lib/data/notes-store";
import { parseTodosFromMarkdown } from "@/lib/data/parse-todos";
import { signInAnonymousUser } from "@/lib/firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/env/client";
import { onAuthStateChanged, type User } from "firebase/auth";
import { copyToClipboard } from "@/lib/clipboard";
import { Brain, Copy, Loader2, Save, Sparkles } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { PlanQuotaMessage } from "@/components/plan/plan-quota-message";
import { resolveMeetingTemplate } from "@/lib/meetings/custom-templates-store";
import { buildTemplateInsightsContext } from "@/lib/meetings/templates";
import { useCallback, useEffect, useMemo, useState } from "react";

type AiActionsPanelProps = {
  transcript: string;
  disabled?: boolean;
  templateId?: string | null;
};

export function AiActionsPanel({
  transcript,
  disabled,
  templateId,
}: AiActionsPanelProps) {
  const firebaseReady = isFirebaseConfigured();
  const { provider, setProvider } = useAiSettings();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [insights, setInsights] = useState<MeetingInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const { uid, ensureSignedIn } = useAuthUser();

  const template = useMemo(
    () => (templateId && uid ? resolveMeetingTemplate(templateId, uid) : null),
    [templateId, uid],
  );

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, [firebaseReady]);

  const runInsights = useCallback(async () => {
    if (!transcript.trim()) return;
    setBusy(true);
    setError(null);
    setInsights(null);
    setSaveMessage(null);

    try {
      await ensureSignedIn();
      const ctx = buildTemplateInsightsContext(transcript, template);
      const out = await aiService.meetingInsights(ctx, provider);
      setInsights(parseMeetingInsights(out.result));
    } catch (err) {
      setError(
        err instanceof AiServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "AI request failed",
      );
    } finally {
      setBusy(false);
    }
  }, [transcript, provider, ensureSignedIn, template]);

  const saveableTodoCount = useMemo(() => {
    if (!insights) return 0;
    return mergeTodoTexts(
      parseTodosFromMarkdown(insights.todos).join("\n"),
      insights.commitments,
    ).length;
  }, [insights]);

  if (!firebaseReady) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700">
        Add Firebase config in .env.local to enable AI actions.
      </p>
    );
  }

  return (
    <section className="shrink-0 space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <Brain className="h-4 w-4" />
          AI actions
        </div>
        <div
          className="inline-flex rounded-full border border-zinc-200 p-0.5 text-xs dark:border-zinc-700"
          role="group"
          aria-label="AI provider"
        >
          {(["gemini", "grok"] as const).map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => setProvider(p)}
              className={`rounded-full px-2.5 py-1 capitalize transition-colors ${
                provider === p
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {!user ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void signInAnonymousUser().catch((e) => setError(String(e)))}
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Sign in to use AI
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled || busy || !transcript.trim()}
          onClick={() => void runInsights()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Summary, todos, commitments & mind map
        </button>
      )}

      {error ? <PlanQuotaMessage message={error} /> : null}

      {insights ? (
        <div className="space-y-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            {aiService.getTaskLabel("meeting_insights")} · {provider} · 1 AI call
          </p>

          {insights.summary ? (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Summary
              </h3>
              <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {insights.summary}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void copyToClipboard(insights.summary).then((ok) => {
                    setCopyMessage(ok ? "Summary copied." : "Copy failed.");
                    setTimeout(() => setCopyMessage(null), 2000);
                  });
                }}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2.5 py-1 text-xs font-medium dark:border-zinc-600"
              >
                <Copy className="h-3 w-3" />
                Copy summary
              </button>
            </div>
          ) : null}

          {insights.todos ? (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Todos
              </h3>
              <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {insights.todos}
              </div>
            </div>
          ) : null}

          {insights.commitments.length > 0 ? (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Commitments (double-check)
              </h3>
              <p className="text-[11px] text-zinc-500">
                First-person promises — merged with todos when you save.
              </p>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-sm text-zinc-800 dark:text-zinc-200">
                {insights.commitments.map((c) => (
                  <li key={c.text} className="flex flex-wrap gap-x-2">
                    <span>{c.text}</span>
                    {c.dueAt ? (
                      <span className="text-xs text-zinc-500">
                        due {format(c.dueAt, "MMM d, h:mm a")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(insights.todos || insights.commitments.length > 0) && uid ? (
            <button
              type="button"
              disabled={busy || saveableTodoCount === 0}
              onClick={() => {
                setBusy(true);
                setSaveMessage(null);
                void saveInsightsTodos(uid, {
                  todosMarkdown: insights.todos,
                  commitments: insights.commitments,
                })
                  .then((todos) =>
                    setSaveMessage(`Saved ${todos.length} todo(s).`),
                  )
                  .catch((e) => setSaveMessage(String(e)))
                  .finally(() => setBusy(false));
              }}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Save {saveableTodoCount} todo{saveableTodoCount === 1 ? "" : "s"}
            </button>
          ) : null}

          {insights.mindMap ? (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Mind map
              </h3>
              <MermaidDiagram source={insights.mindMap} />
              {uid ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void saveNote(uid, {
                      title: `Mind map ${format(new Date(), "MMM d HH:mm")}`,
                      body: insights.summary || transcript.slice(0, 500),
                      transcript,
                      mindMapSource: insights.mindMap,
                      source: "listen",
                    })
                      .then((note) =>
                        setSaveMessage(`Note saved. ID: ${note.id.slice(0, 8)}…`),
                      )
                      .catch((e) => setSaveMessage(String(e)))
                      .finally(() => setBusy(false));
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save as note
                </button>
              ) : null}
            </div>
          ) : null}

          {uid ? (
            <Link
              href="/notes/?tab=todos"
              className="text-xs text-emerald-600 underline dark:text-emerald-400"
            >
              View todos
            </Link>
          ) : (
            <button
              type="button"
              className="text-xs text-zinc-500 underline"
              onClick={() => void ensureSignedIn()}
            >
              Sign in to save results
            </button>
          )}

          {copyMessage ? (
            <p className="text-xs text-zinc-500">{copyMessage}</p>
          ) : null}
          {saveMessage ? (
            <p className="text-xs text-zinc-500">{saveMessage}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
