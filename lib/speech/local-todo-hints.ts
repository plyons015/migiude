import { createId } from "@/lib/data/ids";
import { defaultCommitmentDueAt } from "@/lib/ai/parse-commitments";

export type LocalTodoHint = {
  id: string;
  text: string;
  dueAt?: number;
  sourceChunkId?: string;
};

type Pattern = {
  re: RegExp;
  map: (match: RegExpMatchArray) => string | null;
};

const PATTERNS: Pattern[] = [
  {
    re: /\bI(?:'ll| will)\s+(.+?)(?:[.!?]|$)/i,
    map: (m) => m[1]?.trim() ?? null,
  },
  {
    re: /\bI need to\s+(.+?)(?:[.!?]|$)/i,
    map: (m) => m[1]?.trim() ?? null,
  },
  {
    re: /\bremind me to\s+(.+?)(?:[.!?]|$)/i,
    map: (m) => m[1]?.trim() ?? null,
  },
  {
    re: /\baction item\s*[:\-]\s*(.+?)(?:[.!?]|$)/i,
    map: (m) => m[1]?.trim() ?? null,
  },
  {
    re: /\bfollow up (?:on |with )?(.+?)(?:[.!?]|$)/i,
    map: (m) => `Follow up: ${m[1]?.trim() ?? ""}`,
  },
];

function toImperative(raw: string): string {
  let t = raw.trim();
  if (!t) return "";
  t = t.replace(/^(to|on)\s+/i, "");
  if (t.length > 0) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

export function detectLocalTodoHints(
  line: string,
  sourceChunkId?: string,
): LocalTodoHint[] {
  const trimmed = line.trim();
  if (trimmed.length < 8) return [];

  const seen = new Set<string>();
  const hints: LocalTodoHint[] = [];

  for (const { re, map } of PATTERNS) {
    const match = trimmed.match(re);
    if (!match) continue;
    const captured = map(match);
    if (!captured || captured.length < 3 || captured.length > 180) continue;
    const text = toImperative(captured);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    hints.push({
      id: createId("hint"),
      text,
      dueAt: defaultCommitmentDueAt(),
      sourceChunkId,
    });
    if (hints.length >= 2) break;
  }

  return hints;
}

export function mergeTodoHints(
  existing: LocalTodoHint[],
  incoming: LocalTodoHint[],
  max = 5,
): LocalTodoHint[] {
  const seen = new Set(existing.map((h) => h.text.toLowerCase()));
  const out = [...existing];
  for (const h of incoming) {
    const key = h.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out.slice(0, max);
}
