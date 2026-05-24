import type { ParsedCommitment } from "@/lib/ai/parse-commitments";
import { defaultCommitmentDueAt } from "@/lib/ai/parse-commitments";

export type MeetingInsights = {
  summary: string;
  todos: string;
  mindMap: string;
  /** First-person promises — double-check against todos before saving. */
  commitments: ParsedCommitment[];
};

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return match ? match[1].trim() : trimmed;
}

function parseDueAt(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const ms = Date.parse(String(value).trim());
  if (Number.isFinite(ms) && ms > Date.now() - 60_000) return ms;
  return undefined;
}

function parseCommitmentsField(raw: unknown): ParsedCommitment[] {
  if (!Array.isArray(raw)) return [];

  const out: ParsedCommitment[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const text = String(rec.text ?? "").trim();
    if (!text || text.length > 200) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let dueAt = parseDueAt(rec.dueAt);
    if (!dueAt) dueAt = defaultCommitmentDueAt();
    out.push({ text, dueAt });
    if (out.length >= 8) break;
  }

  return out;
}

export function parseMeetingInsights(raw: string): MeetingInsights {
  const jsonText = stripCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI returned invalid JSON. Try again.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response was not a JSON object.");
  }

  const record = parsed as Record<string, unknown>;
  const summary =
    typeof record.summary === "string" ? record.summary.trim() : "";
  const todos = typeof record.todos === "string" ? record.todos.trim() : "";
  const mindMap =
    typeof record.mindMap === "string"
      ? record.mindMap.trim()
      : typeof record.mind_map === "string"
        ? record.mind_map.trim()
        : "";
  const commitments = parseCommitmentsField(record.commitments);

  if (!summary && !todos && !mindMap && commitments.length === 0) {
    throw new Error("AI returned empty insights. Try again.");
  }

  return { summary, todos, mindMap, commitments };
}

/** Merge markdown todo lines with commitment reminders (deduped). */
export function mergeTodoTexts(
  markdownTodos: string,
  commitments: ParsedCommitment[],
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const line of markdownTodos.split("\n")) {
    const text = line.replace(/^[-*•]\s*/, "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(text);
  }

  for (const c of commitments) {
    const key = c.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(c.text);
  }

  return lines;
}
