import { looksLikeJsonLeak } from "./parse-stt-response";
import type { SttSegment } from "./types";

/** Generous cap — only drops obvious hallucination walls of text. */
const WORDS_PER_SEC_MAX = 6;

export function sanitizeSttSegments(
  segments: SttSegment[],
  audioDurationSec: number,
): SttSegment[] {
  const duration = Math.max(audioDurationSec, 0.5);
  const maxWordsTotal = Math.max(3, Math.ceil(duration * WORDS_PER_SEC_MAX));
  let wordsUsed = 0;

  const cleaned: SttSegment[] = [];
  let lastText = "";

  for (const seg of segments) {
    const text = seg.text.trim();
    if (!text || looksLikeJsonLeak(text)) continue;
    if (text === lastText) continue;

    const words = text.split(/\s+/).filter(Boolean).length;
    if (wordsUsed + words > maxWordsTotal) {
      break;
    }
    wordsUsed += words;
    lastText = text;
    cleaned.push({
      speakerId: Math.min(8, Math.max(1, seg.speakerId)),
      text,
    });
  }

  return cleaned;
}
