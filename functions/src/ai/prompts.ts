import type { AiTask } from "./types";

const taskPrompts: Record<AiTask, string> = {
  summarize: "Summarize the following text concisely in plain language.",
  extract_todos:
    "Extract actionable todo items from the following. Return a markdown bullet list only.",
  mind_map:
    "Create a mind-map outline from the following. Return valid Mermaid flowchart syntax only (e.g. flowchart TD with nodes). No prose outside the diagram.",
  suggest_tags:
    "Suggest 3 to 5 short topic tags for organizing this conversation. Return one tag per line only, no bullets, numbers, or punctuation at the end.",
  daily_recap:
    "Write a brief morning-brief style recap (under 200 words) from the meeting and todo context below. Mention open follow-ups. Use short paragraphs.",
  detect_commitments: `You detect first-person commitments in spoken transcript text (promises, plans, obligations).
Return ONLY a valid JSON array (no markdown). Each item:
{"text":"short actionable reminder","dueAt":"ISO8601 datetime or null"}
Rules:
- Include only clear commitments (e.g. "I will", "I'll", "I need to", "I have to", "I'm going to", "remind me to").
- "text" is imperative-style (e.g. "Drop book off") not the full quote.
- Parse time phrases ("this afternoon", "tomorrow at 3", "by Friday") into dueAt using the user's local implied timezone from context; use null if no time hint.
- If none, return []`,
  suggest_topics:
    "Suggest 4 to 8 discussion topics from this meeting transcript. Return one short topic title per line only (no bullets or numbers).",
  meeting_minutes:
    "Write polished meeting minutes from the agenda and transcript below. Use sections: Summary, Key points, Decisions, Action items. Plain markdown.",
  generic: "Respond helpfully to the following.",
};

export function buildTaskPrompt(task: AiTask, text: string): string {
  return `${taskPrompts[task]}\n\n---\n\n${text}`;
}
