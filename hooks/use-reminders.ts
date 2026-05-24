"use client";

import { useAppSettings } from "@/hooks/use-app-settings";
import { startReminderScheduler } from "@/lib/notifications/reminders";
import type { TodoRecord } from "@/lib/data/types";
import { useEffect, useRef } from "react";

export function useReminders(userId: string | null, todos: TodoRecord[]) {
  const { notifications } = useAppSettings();
  const todosRef = useRef(todos);

  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  useEffect(() => {
    if (!userId || !notifications) return;
    return startReminderScheduler(userId, () => todosRef.current);
  }, [userId, notifications, todos]);
}
