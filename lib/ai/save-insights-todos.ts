import type { ParsedCommitment } from "@/lib/ai/parse-commitments";
import { mergeTodoTexts } from "@/lib/ai/parse-meeting-insights";
import { parseTodosFromMarkdown } from "@/lib/data/parse-todos";
import { listTodosForContext, saveTodo } from "@/lib/data/todos-store";
import type { TodoRecord } from "@/lib/data/types";

function normalizeTodoText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function saveInsightsTodos(
  userId: string,
  options: {
    todosMarkdown: string;
    commitments: ParsedCommitment[];
    meetingId?: string;
    noteId?: string;
  },
): Promise<TodoRecord[]> {
  const existing = await listTodosForContext(userId, {
    meetingId: options.meetingId,
    noteId: options.noteId,
  });
  const existingTexts = new Set(
    existing.map((t) => normalizeTodoText(t.text)),
  );

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
    const norm = normalizeTodoText(text);
    if (!norm || existingTexts.has(norm)) {
      continue;
    }
    existingTexts.add(norm);

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
