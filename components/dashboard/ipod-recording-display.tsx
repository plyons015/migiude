"use client";

import type { CloudSttUiPhase } from "@/hooks/use-cloud-transcription";
import type { TranscriptHighlight } from "@/lib/data/types";
import type { TranscriptionMode, TranscriptChunk } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import { CheckSquare, Star, StarOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SPEAKER_COLORS = [
  "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
];

export type LineAction = "highlight" | "todo" | "both";

type IpodRecordingDisplayProps = {
  title: string;
  subtitle?: string;
  chunks: TranscriptChunk[];
  interimText: string;
  isListening: boolean;
  isPaused: boolean;
  transcriptionMode: TranscriptionMode;
  capturePhase?: CloudSttUiPhase;
  highlights: TranscriptHighlight[];
  lineActionMsg?: string | null;
  saveBusy?: boolean;
  error?: string | null;
  onLineAction: (chunk: TranscriptChunk, action: LineAction) => void;
  onDiscard: () => void;
  onContinue: () => void;
  onSave: () => void;
};

export function IpodRecordingDisplay({
  title,
  subtitle,
  chunks,
  interimText,
  isListening,
  isPaused,
  transcriptionMode,
  capturePhase,
  highlights,
  lineActionMsg,
  saveBusy,
  error,
  onLineAction,
  onDiscard,
  onContinue,
  onSave,
}: IpodRecordingDisplayProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const interim = interimText.trim();
  const hasContent = chunks.length > 0 || interim.length > 0;
  const highlightedIds = new Set(
    highlights.map((h) => h.segmentId).filter(Boolean),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks, interim]);

  const statusLine = isListening
    ? transcriptionMode === "cloud"
      ? capturePhase === "transcribing"
        ? "Transcribing…"
        : "Listening · cloud"
      : "Listening · on-device"
    : isPaused
      ? "Paused"
      : "Ready";

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-sm min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-300/80 bg-zinc-100 shadow-inner transition-[min-height] duration-300 dark:border-zinc-700 dark:bg-zinc-900/80",
        "min-h-[12rem] max-h-[min(52vh,28rem)]",
      )}
    >
      <div className="shrink-0 border-b border-black/5 px-3 py-1.5 dark:border-white/10">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {statusLine}
        </p>
      </div>

      <div className="shrink-0 border-b border-black/5 px-4 py-2 dark:border-white/10">
        <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        {subtitle ? (
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div
        aria-live="polite"
        aria-label="Live transcript"
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      >
        {!hasContent ? (
          <p className="text-sm text-zinc-500">
            {isListening
              ? "Speak — lines appear as you talk. Tap a line to highlight or add a todo."
              : "Tap the red mic to start, or Continue if you paused."}
          </p>
        ) : (
          <div className="space-y-2 text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
            {chunks.map((chunk) => {
              const selected = selectedId === chunk.id;
              const highlighted = highlightedIds.has(chunk.id);
              return (
                <div key={chunk.id} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId((id) => (id === chunk.id ? null : chunk.id))
                    }
                    className={cn(
                      "w-full rounded-lg px-2 py-1.5 text-left transition-colors",
                      selected
                        ? "bg-violet-100 ring-1 ring-violet-400 dark:bg-violet-950/50 dark:ring-violet-600"
                        : highlighted
                          ? "bg-amber-50/80 dark:bg-amber-950/30"
                          : "hover:bg-black/5 dark:hover:bg-white/5",
                    )}
                  >
                    <div className="flex gap-2">
                      {chunk.speakerId != null ? (
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase",
                            SPEAKER_COLORS[
                              (chunk.speakerId - 1) % SPEAKER_COLORS.length
                            ],
                          )}
                        >
                          S{chunk.speakerId}
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1">{chunk.text}</span>
                      {highlighted ? (
                        <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                      ) : null}
                    </div>
                  </button>
                  {selected ? (
                    <div className="mt-1 flex flex-wrap gap-1.5 pl-1">
                      <button
                        type="button"
                        onClick={() => {
                          onLineAction(chunk, "highlight");
                          setSelectedId(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                      >
                        <Star className="h-3 w-3" />
                        Highlight
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void onLineAction(chunk, "todo");
                          setSelectedId(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                      >
                        <CheckSquare className="h-3 w-3" />
                        Add todo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void onLineAction(chunk, "both");
                          setSelectedId(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
                      >
                        <StarOff className="h-3 w-3" />
                        Both
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {interim ? (
              <p className="px-2 italic text-zinc-500">{interim}</p>
            ) : null}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {lineActionMsg ? (
        <p className="shrink-0 px-3 py-1 text-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          {lineActionMsg}
        </p>
      ) : null}

      {error ? (
        <p className="shrink-0 px-3 py-1 text-center text-[11px] text-amber-700 dark:text-amber-300">
          {error}
        </p>
      ) : null}

      {isPaused ? (
        <div className="shrink-0 space-y-2 border-t border-black/5 px-3 py-3 dark:border-white/10">
          <p className="text-center text-[10px] text-zinc-500">
            Paused — discard, continue, or save
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saveBusy}
              onClick={onDiscard}
              className="flex-1 rounded-full border border-zinc-300 py-2 text-xs font-medium dark:border-zinc-600"
            >
              Discard
            </button>
            <button
              type="button"
              disabled={saveBusy}
              onClick={onContinue}
              className="flex-1 rounded-full border border-violet-300 bg-violet-50 py-2 text-xs font-medium text-violet-900 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100"
            >
              Continue
            </button>
            <button
              type="button"
              disabled={saveBusy || !hasContent}
              onClick={onSave}
              className="flex-1 rounded-full bg-emerald-600 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {saveBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
