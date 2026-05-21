"use client";

import { MermaidDiagram } from "@/components/mermaid-diagram";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { useAuthUser } from "@/hooks/use-auth-user";
import { aiService, AiServiceError } from "@/lib/ai/ai-service";
import { saveNote } from "@/lib/data/notes-store";
import { parseTodosFromMarkdown } from "@/lib/data/parse-todos";
import { saveTodosFromMarkdown } from "@/lib/data/todos-store";
import { signInAnonymousUser } from "@/lib/firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/env/client";
import type { AiProcessOutput, AiProvider, AiTask } from "@/lib/ai/types";
import { onAuthStateChanged, type User } from "firebase/auth";
import { copyToClipboard } from "@/lib/clipboard";
import {
  Brain,
  Copy,
  ListTodo,
  Loader2,
  Network,
  Save,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AiActionsPanelProps = {
  transcript: string;
  disabled?: boolean;
};

const tasks: { task: AiTask; icon: typeof Sparkles; label: string }[] = [
  { task: "summarize", icon: Sparkles, label: "Summarize" },
  { task: "extract_todos", icon: ListTodo, label: "Todos" },
  { task: "mind_map", icon: Network, label: "Mind map" },
];

export function AiActionsPanel({ transcript, disabled }: AiActionsPanelProps) {
  const firebaseReady = isFirebaseConfigured();
  const { provider, setProvider } = useAiSettings();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<AiProcessOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const { uid, ensureSignedIn } = useAuthUser();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, [firebaseReady]);

  const runTask = useCallback(
    async (task: AiTask) => {
      if (!transcript.trim()) return;
      setBusy(true);
      setError(null);
      setOutput(null);

      try {
        await ensureSignedIn();

        let result: AiProcessOutput;
        switch (task) {
          case "summarize":
            result = await aiService.summarize(transcript, provider);
            break;
          case "extract_todos":
            result = await aiService.extractTodos(transcript, provider);
            break;
          case "mind_map":
            result = await aiService.mindMap(transcript, provider);
            break;
          default:
            result = await aiService.ask(transcript, provider);
        }
        setOutput(result);
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
    },
    [transcript, provider, ensureSignedIn],
  );

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
          {(["gemini", "grok"] as AiProvider[]).map((p) => (
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
        <div className="flex flex-wrap gap-2">
          {tasks.map(({ task, icon: Icon, label }) => (
            <button
              key={task}
              type="button"
              disabled={disabled || busy || !transcript.trim()}
              onClick={() => void runTask(task)}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {label}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">{error}</p>
      ) : null}

      {output ? (
        <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            {aiService.getTaskLabel(output.task)} · {output.provider}
          </p>
          {output.task === "mind_map" ? (
            <MermaidDiagram source={output.result} />
          ) : (
            <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
              {output.result}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void copyToClipboard(output.result).then((ok) => {
                  setCopyMessage(ok ? "Copied to clipboard." : "Copy failed.");
                  setTimeout(() => setCopyMessage(null), 2000);
                });
              }}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy result
            </button>
            {copyMessage ? (
              <span className="text-xs text-zinc-500">{copyMessage}</span>
            ) : null}
          </div>
          {uid ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {output.task === "extract_todos" ? (
                <>
                  {(() => {
                    const lines = parseTodosFromMarkdown(output.result);
                    const n = lines.length;
                    return n > 0 ? (
                      <p className="w-full text-xs text-zinc-600 dark:text-zinc-400">
                        Create {n} todo{n === 1 ? "" : "s"} from this list?
                      </p>
                    ) : null;
                  })()}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      setSaveMessage(null);
                      void saveTodosFromMarkdown(uid, output.result)
                        .then((todos) =>
                          setSaveMessage(`Saved ${todos.length} todo(s).`),
                        )
                        .catch((e) => setSaveMessage(String(e)))
                        .finally(() => setBusy(false));
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save todos
                  </button>
                </>
              ) : null}
              {output.task === "mind_map" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void saveNote(uid, {
                      title: `Mind map ${format(new Date(), "MMM d HH:mm")}`,
                      body: transcript.slice(0, 500),
                      transcript,
                      mindMapSource: output.result,
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
              <Link
                href="/notes/?tab=todos"
                className="text-xs text-emerald-600 underline dark:text-emerald-400"
              >
                View todos
              </Link>
            </div>
          ) : (
            <button
              type="button"
              className="text-xs text-zinc-500 underline"
              onClick={() => void ensureSignedIn()}
            >
              Sign in to save results
            </button>
          )}
          {saveMessage ? (
            <p className="text-xs text-zinc-500">{saveMessage}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
