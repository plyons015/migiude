import type { TranscriptChunk } from "@/lib/speech/types";
import type { TranscriptHighlight } from "@/lib/data/types";

export const SESSION_KEY = "migiude-listen-session";

/** Periodic backup while recording (Phase C). */
export const LISTEN_AUTOSAVE_MS = 12_000;

export type ListenSessionSnapshot = {
  chunks: TranscriptChunk[];
  highlights: TranscriptHighlight[];
  savedAt: number;
  captureActive?: boolean;
  inMeeting?: boolean;
};

export function loadListenSession(): ListenSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ListenSessionSnapshot;
    if (!Array.isArray(parsed.chunks)) return null;
    return {
      chunks: parsed.chunks,
      highlights: parsed.highlights ?? [],
      savedAt: parsed.savedAt ?? 0,
    };
  } catch {
    return null;
  }
}

export function saveListenSession(
  chunks: TranscriptChunk[],
  highlights: TranscriptHighlight[],
  meta?: { captureActive?: boolean; inMeeting?: boolean },
): void {
  if (typeof window === "undefined") return;
  const snapshot: ListenSessionSnapshot = {
    chunks,
    highlights,
    savedAt: Date.now(),
    ...(meta?.captureActive ? { captureActive: true } : {}),
    ...(meta?.inMeeting ? { inMeeting: true } : {}),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
}

export function clearListenSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
