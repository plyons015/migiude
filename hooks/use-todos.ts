"use client";

import { subscribeTodos, todoStatusOf } from "@/lib/data/todos-store";
import type { TodoRecord } from "@/lib/data/types";
import { useEffect, useMemo, useState } from "react";

export function useTodos(userId: string | null) {
  const [todos, setTodos] = useState<TodoRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTodos([]);
      return;
    }
    return subscribeTodos(
      userId,
      setTodos,
      (err) => setError(err.message),
    );
  }, [userId]);

  const openTodos = useMemo(
    () => todos.filter((t) => todoStatusOf(t) !== "done"),
    [todos],
  );

  const dueSoon = useMemo(
    () =>
      openTodos.filter(
        (t) => t.dueAt && t.dueAt <= Date.now() + 24 * 60 * 60 * 1000,
      ),
    [openTodos],
  );

  return { todos, openTodos, dueSoon, error };
}
