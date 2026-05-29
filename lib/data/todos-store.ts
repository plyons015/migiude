import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { createId } from "@/lib/data/ids";
import {
  deleteLocalTodo,
  listLocalTodos,
  upsertLocalTodo,
} from "@/lib/data/local-db";
import { parseTodosFromMarkdown } from "@/lib/data/parse-todos";
import {
  cancelTodoLocalNotification,
  scheduleTodoLocalNotification,
} from "@/lib/notifications/native-reminders";
import type { TodoRecord, TodoStatus } from "@/lib/data/types";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";

function todosCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "todos");
}

export async function listTodosForContext(
  userId: string,
  options: { meetingId?: string; noteId?: string } = {},
): Promise<TodoRecord[]> {
  const all = await listLocalTodos(userId);
  const { meetingId, noteId } = options;
  if (!meetingId && !noteId) return all;
  return all.filter((todo) => {
    if (meetingId && todo.meetingId === meetingId) return true;
    if (noteId && todo.noteId === noteId) return true;
    return false;
  });
}

export function subscribeTodos(
  userId: string,
  onData: (todos: TodoRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const col = todosCollection(userId);

  void listLocalTodos(userId).then(onData);

  if (!col || isLocalOnlyMode()) {
    return () => {};
  }

  const q = query(col, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const todos = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as TodoRecord,
      );
      void Promise.all(todos.map((t) => upsertLocalTodo(userId, t))).then(() =>
        onData(todos),
      );
    },
    (err) => onError?.(err),
  );
}

export function todoStatusOf(todo: TodoRecord): TodoStatus {
  if (todo.status) return todo.status;
  return todo.completed ? "done" : "open";
}

function todoFirestorePayload(todo: TodoRecord) {
  const status = todoStatusOf(todo);
  return {
    text: todo.text,
    completed: status === "done",
    status,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
    dueAt: todo.dueAt ?? null,
    noteId: todo.noteId ?? null,
    meetingId: todo.meetingId ?? null,
    groupId: todo.groupId ?? null,
    processingScope: todo.processingScope ?? null,
    reminderNotified: todo.reminderNotified ?? false,
    topicTag: todo.topicTag ?? null,
    assigneeLabel: todo.assigneeLabel ?? null,
  };
}

function withStatus(
  input: Partial<TodoRecord> & { text: string },
): Pick<TodoRecord, "completed" | "status"> {
  const status: TodoStatus =
    input.status ?? (input.completed ? "done" : "open");
  return { status, completed: status === "done" };
}

export async function saveTodo(
  userId: string,
  input: {
    text: string;
    completed?: boolean;
    status?: TodoStatus;
    dueAt?: number;
    noteId?: string;
    meetingId?: string;
    groupId?: string;
    processingScope?: TodoRecord["processingScope"];
    topicTag?: string;
    assigneeLabel?: string;
    id?: string;
  },
): Promise<TodoRecord> {
  const now = Date.now();
  const { status, completed } = withStatus(input);
  const todo: TodoRecord = {
    id: input.id ?? createId("todo"),
    text: input.text,
    completed,
    status,
    createdAt: now,
    updatedAt: now,
    dueAt: input.dueAt,
    noteId: input.noteId,
    meetingId: input.meetingId,
    groupId: input.groupId,
    processingScope:
      input.processingScope ??
      (input.meetingId ? "cloud" : input.groupId ? "cloud" : "local"),
    topicTag: input.topicTag,
    assigneeLabel: input.assigneeLabel,
    reminderNotified: false,
  };

  await upsertLocalTodo(userId, todo);

  const col = todosCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await setDoc(doc(col, todo.id), todoFirestorePayload(todo));
  }

  void scheduleTodoLocalNotification(todo);
  return todo;
}

export async function saveTodosFromMarkdown(
  userId: string,
  markdown: string,
  noteId?: string,
  meetingId?: string,
): Promise<TodoRecord[]> {
  const lines = parseTodosFromMarkdown(markdown);
  const created: TodoRecord[] = [];
  for (const text of lines) {
    created.push(
      await saveTodo(userId, {
        text,
        noteId,
        meetingId,
        processingScope: meetingId ? "cloud" : "local",
      }),
    );
  }
  return created;
}

export async function updateTodo(
  userId: string,
  todo: TodoRecord,
): Promise<TodoRecord> {
  const status = todoStatusOf(todo);
  const updated: TodoRecord = {
    ...todo,
    status,
    completed: status === "done",
    updatedAt: Date.now(),
  };
  await upsertLocalTodo(userId, updated);
  const col = todosCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await setDoc(doc(col, updated.id), todoFirestorePayload(updated));
  }
  if (status === "done") void cancelTodoLocalNotification(updated.id);
  else void scheduleTodoLocalNotification(updated);
  return updated;
}

export async function setTodoStatus(
  userId: string,
  todo: TodoRecord,
  status: TodoStatus,
): Promise<TodoRecord> {
  return updateTodo(userId, { ...todo, status, completed: status === "done" });
}

export async function toggleTodo(
  userId: string,
  todo: TodoRecord,
): Promise<TodoRecord> {
  const current = todoStatusOf(todo);
  const next: TodoStatus = current === "done" ? "open" : "done";
  return setTodoStatus(userId, todo, next);
}

export async function setTodoDueAt(
  userId: string,
  todo: TodoRecord,
  dueAt: number | undefined,
): Promise<TodoRecord> {
  const updated: TodoRecord = {
    ...todo,
    dueAt,
    reminderNotified: false,
    updatedAt: Date.now(),
  };
  await upsertLocalTodo(userId, updated);
  const col = todosCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await setDoc(doc(col, updated.id), todoFirestorePayload(updated));
  }
  void scheduleTodoLocalNotification(updated);
  return updated;
}

export async function markTodoReminderNotified(
  userId: string,
  todo: TodoRecord,
): Promise<TodoRecord> {
  const updated: TodoRecord = {
    ...todo,
    reminderNotified: true,
    updatedAt: Date.now(),
  };
  await upsertLocalTodo(userId, updated);
  const col = todosCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await setDoc(doc(col, updated.id), todoFirestorePayload(updated));
  }
  return updated;
}

export async function removeTodo(
  userId: string,
  todoId: string,
): Promise<void> {
  void cancelTodoLocalNotification(todoId);
  await deleteLocalTodo(userId, todoId);
  const col = todosCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await deleteDoc(doc(col, todoId));
  }
}
