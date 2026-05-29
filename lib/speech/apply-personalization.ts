import type { SpeechPersonalization } from "@/lib/speech/personalization-types";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Apply custom terms and learned corrections to transcript text. */
export function applySpeechPersonalization(
  text: string,
  prefs: SpeechPersonalization,
): string {
  if (!text.trim()) return text;
  let out = text;

  const terms = [...prefs.terms].sort(
    (a, b) => b.phrase.length - a.phrase.length,
  );
  for (const term of terms) {
    if (!term.phrase || !term.replacement) continue;
    const re = new RegExp(escapeRegExp(term.phrase), "gi");
    out = out.replace(re, term.replacement);
  }

  const corrections = [...prefs.corrections].sort(
    (a, b) => b.useCount - a.useCount || b.from.length - a.from.length,
  );
  for (const c of corrections) {
    if (!c.from || !c.to) continue;
    const re = new RegExp(`\\b${escapeRegExp(c.from)}\\b`, "gi");
    out = out.replace(re, c.to);
  }

  return out;
}
