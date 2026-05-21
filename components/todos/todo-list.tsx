"use client";

import {
  removeTodo,
  setTodoDueAt,
  toggleTodo,
} from "@/lib/data/todos-store";
import type { TodoRecord } from "@/lib/data/types";
import { requestNotificationPermission } from "@/lib/notifications/reminders";
import { format } from "date-fns";
import { Bell, Check, Trash2 } from "lucide-react";
import { useState } from "react";

type TodoListProps = {
  userId: string;
  todos: TodoRecord[];
  compact?: boolean;
};

export function TodoList({ userId, todos, compact }: TodoListProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (todos.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No todos yet. Extract them from a note or transcript.</p>
    );
  }

  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {todos.map((todo) => (
        <li
          key={todo.id}
          className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <button
            type="button"
            disabled={busyId === todo.id}
            onClick={() => {
              setBusyId(todo.id);
              void toggleTodo(userId, todo).finally(() => setBusyId(null));
            }}
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
              todo.completed
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 dark:border-zinc-600"
            }`}
            aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
          >
            {todo.completed ? <Check className="h-3.5 w-3.5" /> : null}
          </button>
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm ${
                todo.completed
                  ? "text-zinc-400 line-through"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {todo.text}
            </p>
            {todo.dueAt ? (
              <p className="mt-1 text-xs text-zinc-500">
                Due {format(todo.dueAt, "MMM d, h:mm a")}
              </p>
            ) : null}
          </div>
          {!compact ? (
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                title="Remind in 1 hour"
                disabled={busyId === todo.id}
                onClick={() => {
                  setBusyId(todo.id);
                  void (async () => {
                    await requestNotificationPermission();
                    const dueAt = Date.now() + 60 * 60 * 1000;
                    await setTodoDueAt(userId, todo, dueAt);
                  })().finally(() => setBusyId(null));
                }}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={busyId === todo.id}
                onClick={() => {
                  setBusyId(todo.id);
                  void removeTodo(userId, todo.id).finally(() => setBusyId(null));
                }}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
