import { createId } from "@/lib/data/ids";
import type { MeetingTopic } from "@/lib/data/types";

/** Parse AI topic suggestions (one per line). */
export function parseTopicsFromAi(raw: string): MeetingTopic[] {
  const lines = raw
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((l) => l.length > 0 && l.length < 80);

  const seen = new Set<string>();
  const topics: MeetingTopic[] = [];

  for (const title of lines) {
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push({ id: createId("topic"), title });
    if (topics.length >= 12) break;
  }

  return topics;
}
