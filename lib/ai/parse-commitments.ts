export type ParsedCommitment = {
  text: string;
  dueAt?: number;
};

function extractJsonArray(raw: string): unknown[] | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseDueAt(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const iso = String(value).trim();
  const ms = Date.parse(iso);
  if (Number.isFinite(ms) && ms > Date.now() - 60_000) return ms;
  return undefined;
}

/** Default reminder: 3 hours from now if AI gave no time. */
export function defaultCommitmentDueAt(): number {
  return Date.now() + 3 * 60 * 60 * 1000;
}

/** End of local calendar day. */
export function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d.getTime();
}

export function parseCommitmentsFromAi(raw: string): ParsedCommitment[] {
  const arr = extractJsonArray(raw);
  if (!arr) return [];

  const out: ParsedCommitment[] = [];
  const seen = new Set<string>();

  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const text = String(rec.text ?? "").trim();
    if (!text || text.length > 200) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let dueAt = parseDueAt(rec.dueAt);
    if (!dueAt && /afternoon|tonight|today|this evening/i.test(raw)) {
      dueAt = endOfToday();
    }
    if (!dueAt) dueAt = defaultCommitmentDueAt();

    out.push({ text, dueAt });
    if (out.length >= 5) break;
  }

  return out;
}
