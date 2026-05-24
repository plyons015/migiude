/** Client-side guard — never show raw JSON or duplicate lines from cloud STT. */

export function looksLikeSttJsonLeak(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.startsWith("{") || t.startsWith("[")) return true;
  if (t.includes('"segments"') || t.includes('"speakerId"')) return true;
  return false;
}

export function filterTranscriptSegments<
  T extends { speakerId: number; text: string },
>(segments: T[]): T[] {
  const out: T[] = [];
  let lastText = "";

  for (const seg of segments) {
    const text = seg.text.trim();
    if (!text || looksLikeSttJsonLeak(text)) continue;
    if (text === lastText) continue;
    lastText = text;
    out.push({ ...seg, text } as T);
  }

  return out;
}
