"use client";

import { MermaidDiagram } from "@/components/mermaid-diagram";
import { PlanQuotaMessage } from "@/components/plan/plan-quota-message";
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
import { isFirebaseConfigured } from "@/lib/env/client";
import { resolveMeetingTemplate } from "@/lib/meetings/custom-templates-store";
import { buildTemplateInsightsContext } from "@/lib/meetings/templates";
import type { SavedCapture } from "@/hooks/use-listen-session";
import { format } from "date-fns";
import { Brain, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

type PostSaveAiDialogProps = {
  capture: SavedCapture;
  userId: string;
  onClose: () => void;
};

export function PostSaveAiDialog({
  capture,
  userId,
  onClose,
}: PostSaveAiDialogProps) {
  const { provider } = useAiSettings();
  const { ensureSignedIn } = useAuthUser();
  const [step, setStep] = useState<"prompt" | "running" | "results">("prompt");
  const [insights, setInsights] = useState<MeetingInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const template =
    capture.templateId && userId
      ? resolveMeetingTemplate(capture.templateId, userId)
      : null;

  const runAi = useCallback(async () => {
    if (!isFirebaseConfigured() || !capture.transcript.trim()) return;
    setStep("running");
    setError(null);
    try {
      await ensureSignedIn();
      const ctx = buildTemplateInsightsContext(capture.transcript, template);
      const out = await aiService.meetingInsights(ctx, provider);
      setInsights(parseMeetingInsights(out.result));
      setStep("results");
    } catch (err) {
      setError(
        err instanceof AiServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "AI request failed",
      );
      setStep("prompt");
    }
  }, [capture.transcript, template, provider, ensureSignedIn]);

  const saveableTodoCount = insights
    ? mergeTodoTexts(
        parseTodosFromMarkdown(insights.todos).join("\n"),
        insights.commitments,
      ).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-save-ai-title"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2
              id="post-save-ai-title"
              className="flex items-center gap-2 text-base font-semibold"
            >
              <Brain className="h-4 w-4" />
              {step === "results" ? "AI results" : "Run AI on this capture?"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {capture.title} — one call for summary, todos & mind map
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "prompt" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate a summary, suggested todos, and a mind map from what you
              just saved?
            </p>
            {error ? <PlanQuotaMessage message={error} /> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runAi()}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                <Sparkles className="h-4 w-4" />
                Run AI
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-4 py-2.5 text-sm font-medium"
              >
                Skip
              </button>
            </div>
            <Link
              href={
                capture.kind === "meeting" && capture.meetingId
                  ? `/meetings/?id=${capture.meetingId}`
                  : `/notes/?id=${capture.noteId}`
              }
              className="block text-center text-xs text-violet-600 underline dark:text-violet-400"
              onClick={onClose}
            >
              View saved {capture.kind === "meeting" ? "meeting" : "note"}
            </Link>
          </div>
        ) : null}

        {step === "running" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm text-muted-foreground">
              Summary, todos & mind map…
            </p>
          </div>
        ) : null}

        {step === "results" && insights ? (
          <div className="space-y-4">
            {insights.summary ? (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground">
                  Summary
                </h3>
                <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm">
                  {insights.summary}
                </p>
              </div>
            ) : null}
            {insights.todos ? (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground">
                  Todos
                </h3>
                <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-sm">
                  {insights.todos}
                </p>
              </div>
            ) : null}
            {insights.mindMap ? (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground">
                  Mind map
                </h3>
                <MermaidDiagram source={insights.mindMap} />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {saveableTodoCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    void saveInsightsTodos(userId, {
                      todosMarkdown: insights.todos,
                      commitments: insights.commitments,
                      meetingId: capture.meetingId,
                      noteId: capture.noteId,
                    }).then((todos) =>
                      setSaveMsg(`Saved ${todos.length} todo(s).`),
                    );
                  }}
                  className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Save {saveableTodoCount} todo
                  {saveableTodoCount === 1 ? "" : "s"}
                </button>
              ) : null}
              {insights.mindMap ? (
                <button
                  type="button"
                  onClick={() => {
                    void saveNote(userId, {
                      title: `Mind map ${format(new Date(), "MMM d HH:mm")}`,
                      body: insights.summary || capture.transcript.slice(0, 500),
                      transcript: capture.transcript,
                      mindMapSource: insights.mindMap,
                      source: "listen",
                      meetingId: capture.meetingId,
                    }).then(() => setSaveMsg("Mind map note saved."));
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium"
                >
                  Save mind map note
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium"
              >
                Done
              </button>
            </div>
            {saveMsg ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {saveMsg}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
