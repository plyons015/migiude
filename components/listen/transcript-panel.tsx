"use client";

import type { TranscriptionMode, TranscriptChunk } from "@/lib/speech/types";
import { useEffect, useRef } from "react";

const SPEAKER_COLORS = [
  "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
];

type TranscriptPanelProps = {
  chunks: TranscriptChunk[];
  interimText: string;
  isListening: boolean;
  transcriptionMode?: TranscriptionMode;
};

export function TranscriptPanel({
  chunks,
  interimText,
  isListening,
  transcriptionMode = "browser",
}: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const interim = interimText.trim();
  const hasContent = chunks.length > 0 || interim.length > 0;
  const cloud = transcriptionMode === "cloud";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks, interim]);

  return (
    <section
      aria-live="polite"
      aria-label="Live transcript"
      className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Transcript
        </h2>
        <p className="text-xs text-zinc-500">
          {isListening ? "Listening…" : "Paused"}
          {cloud
            ? " — cloud STT with speaker labels (~8s delay)"
            : " — text only, no audio stored"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!hasContent ? (
          <p className="text-sm text-zinc-500">
            {cloud
              ? "Tap the microphone. Audio is sent in short chunks for transcription; lines appear with speaker labels."
              : "Tap the microphone to start. Your speech appears here as text."}
          </p>
        ) : (
          <div className="space-y-3 text-base leading-relaxed text-zinc-900 dark:text-zinc-100">
            {chunks.map((chunk) => (
              <div key={chunk.id} className="flex gap-2">
                {chunk.speakerId != null ? (
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      SPEAKER_COLORS[(chunk.speakerId - 1) % SPEAKER_COLORS.length]
                    }`}
                  >
                    S{chunk.speakerId}
                  </span>
                ) : null}
                <p className="min-w-0 flex-1">{chunk.text}</p>
              </div>
            ))}
            {interim ? (
              <p className="italic text-zinc-500">{interim}</p>
            ) : null}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
