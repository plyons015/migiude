import type { TranscriptChunk } from "@/lib/speech/types";

function normalizeForCompare(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function createChunkId(): string {
  return `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Web Speech often emits cumulative finals ("my" → "my little" → "my little brother").
 * Replace the last chunk when the new text extends it; append when it's a new phrase.
 */
export type MergeFinalOptions = {
  /** After a pause (recognition onend), start a new line even if text overlaps. */
  forceNewChunk?: boolean;
};

export function mergeFinalTranscript(
  chunks: TranscriptChunk[],
  newText: string,
  options?: MergeFinalOptions,
): TranscriptChunk[] {
  const text = newText.trim();
  if (!text) return chunks;

  if (chunks.length === 0) {
    return [{ id: createChunkId(), text, timestamp: Date.now() }];
  }

  const last = chunks[chunks.length - 1];
  const lastNorm = normalizeForCompare(last.text);
  const newNorm = normalizeForCompare(text);

  if (lastNorm === newNorm) {
    return chunks;
  }

  if (options?.forceNewChunk) {
    // After a pause, Google often sends a cumulative final; keep only the new tail.
    let lineText = text;
    if (newNorm.startsWith(lastNorm) && newNorm.length > lastNorm.length) {
      const prefixLen = last.text.trimEnd().length;
      lineText = text.slice(prefixLen).trim();
    }
    if (!lineText) return chunks;
    return [
      ...chunks,
      { id: createChunkId(), text: lineText, timestamp: Date.now() },
    ];
  }

  if (newNorm.startsWith(lastNorm) || lastNorm.startsWith(newNorm)) {
    const merged =
      newNorm.length >= lastNorm.length ? text : last.text.trim();
    return [
      ...chunks.slice(0, -1),
      { ...last, text: merged, timestamp: Date.now() },
    ];
  }

  // Ignore tiny stray finals right after a longer phrase (common mis-hear on restart).
  if (
    lastNorm.length >= 12 &&
    newNorm.length <= 4 &&
    !lastNorm.includes(newNorm)
  ) {
    return chunks;
  }

  return [
    ...chunks,
    { id: createChunkId(), text, timestamp: Date.now() },
  ];
}

function formatChunkLine(chunk: TranscriptChunk): string {
  if (chunk.speakerId != null && chunk.speakerId > 0) {
    return `Speaker ${chunk.speakerId}: ${chunk.text}`;
  }
  return chunk.text;
}

/** Committed text plus live interim line for AI / save. */
export function buildDisplayTranscript(
  chunks: TranscriptChunk[],
  interimText: string,
): string {
  const committed = chunks.map(formatChunkLine).join("\n");
  const tail = interimText.trim();
  if (!committed) return tail;
  if (!tail) return committed;
  return `${committed}\n${tail}`;
}
