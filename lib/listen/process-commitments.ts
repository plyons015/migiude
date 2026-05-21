import { aiService } from "@/lib/ai/ai-service";
import type { AiProvider } from "@/lib/ai/types";
import {
  parseCommitmentsFromAi,
  type ParsedCommitment,
} from "@/lib/ai/parse-commitments";
import { saveTodo } from "@/lib/data/todos-store";
import type { TodoRecord } from "@/lib/data/types";
import { mightContainCommitment } from "@/lib/listen/commitment-heuristics";

export type DetectedCommitment = ParsedCommitment & {
  todoId: string;
};

export async function detectAndSaveCommitments(
  userId: string,
  contextText: string,
  options: {
    provider: AiProvider;
    meetingId?: string;
    noteId?: string;
  },
): Promise<DetectedCommitment[]> {
  const snippet = contextText.trim();
  if (!snippet || !mightContainCommitment(snippet)) return [];

  const out = await aiService.detectCommitments(
    `Current local time: ${new Date().toISOString()}\n\nTranscript:\n${snippet}`,
    options.provider,
  );

  const parsed = parseCommitmentsFromAi(out.result);
  const saved: DetectedCommitment[] = [];

  for (const c of parsed) {
    const todo = await saveTodo(userId, {
      text: c.text,
      dueAt: c.dueAt,
      meetingId: options.meetingId,
      noteId: options.noteId,
    });
    saved.push({ ...c, todoId: todo.id });
  }

  return saved;
}

export function formatCommitmentToast(items: DetectedCommitment[]): string {
  if (items.length === 0) return "";
  const first = items[0];
  const more = items.length > 1 ? ` (+${items.length - 1} more)` : "";
  return `Reminder: ${first.text}${more}`;
}
