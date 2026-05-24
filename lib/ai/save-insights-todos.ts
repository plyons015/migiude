import type { ParsedCommitment } from "@/lib/ai/parse-commitments";
import { mergeTodoTexts } from "@/lib/ai/parse-meeting-insights";
import { parseTodosFromMarkdown } from "@/lib/data/parse-todos";
import { saveTodo } from "@/lib/data/todos-store";
import type { TodoRecord } from "@/lib/data/types";

export async function saveInsightsTodos(
  userId: string,
  options: {
    todosMarkdown: string;
    commitments: ParsedCommitment[];
    meetingId?: string;
    noteId?: string;
  },
): Promise<TodoRecord[]> {
  const fromMd = parseTodosFromMarkdown(options.todosMarkdown);
  const merged = mergeTodoTexts(
    fromMd.join("\n"),
    options.commitments,
  );

  const saved: TodoRecord[] = [];
  const commitmentByText = new Map(
    options.commitments.map((c) => [c.text.toLowerCase(), c]),
  );

  for (const text of merged) {
    const c = commitmentByText.get(text.toLowerCase());
    const todo = await saveTodo(userId, {
      text,
      dueAt: c?.dueAt,
      meetingId: options.meetingId,
      noteId: options.noteId,
    });
    saved.push(todo);
  }

  return saved;
}
