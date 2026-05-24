import type { AiTask } from "./types";

const taskPrompts: Record<AiTask, string> = {
  summarize: "Summarize the following text concisely in plain language.",
  extract_todos:
    "Extract actionable todo items from the following. Return a markdown bullet list only.",
  mind_map:
    "Create a mind-map outline from the following. Return valid Mermaid flowchart syntax only (e.g. flowchart TD with nodes). No prose outside the diagram.",
  meeting_insights: `From the transcript below, return ONE JSON object only (no markdown fences, no prose outside JSON).

Keys:
- "summary": concise plain-language summary of what was actually said
- "todos": markdown bullet list of actionable items (use "- " bullets) from the transcript
- "mindMap": valid Mermaid flowchart syntax only (e.g. flowchart TD with nodes)
- "commitments": JSON array of first-person promises to double-check todos. Each item: {"text":"imperative reminder","dueAt":"ISO8601 or null"}
  Include commitments only for clear phrases like "I will", "I'll", "I need to". If none, use [].
  Do not invent content not in the audio/transcript.

Return ONLY valid JSON.`,
  daily_recap:
    "Write a brief morning-brief style recap (under 200 words) from the meeting and todo context below. Mention open follow-ups. Use short paragraphs.",
  suggest_topics:
    "Suggest 4 to 8 discussion topics from this meeting transcript. Return one short topic title per line only (no bullets or numbers).",
  meeting_minutes:
    "Write polished meeting minutes from the agenda and transcript below. Use sections: Summary, Key points, Decisions, Action items. Plain markdown.",
  generic: "Respond helpfully to the following.",
};

export function buildTaskPrompt(task: AiTask, text: string): string {
  return `${taskPrompts[task]}\n\n---\n\n${text}`;
}
