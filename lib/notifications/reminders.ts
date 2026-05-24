import { APP_NAME } from "@/lib/branding/app-name";
import { isNativePlatform } from "@/lib/capacitor/platform";
import {
  requestNativeNotificationPermission,
  syncTodoLocalNotifications,
} from "@/lib/notifications/native-reminders";
import type { TodoRecord } from "@/lib/data/types";
import { markTodoReminderNotified, todoStatusOf } from "@/lib/data/todos-store";

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    return requestNativeNotificationPermission();
  }
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showTodoReminder(todo: TodoRecord): void {
  if (typeof window === "undefined" || Notification.permission !== "granted") {
    return;
  }
  new Notification(`${APP_NAME} reminder`, {
    body: todo.text,
    tag: todo.id,
  });
}

/** Poll due todos; on native, also sync LocalNotifications schedules. */
export function startReminderScheduler(
  userId: string,
  getTodos: () => TodoRecord[],
  intervalMs = 30_000,
): () => void {
  const tick = () => {
    const todos = getTodos();
    if (isNativePlatform()) {
      void syncTodoLocalNotifications(todos);
    }

    const now = Date.now();
    for (const todo of todos) {
      if (
        todoStatusOf(todo) === "done" ||
        !todo.dueAt ||
        todo.dueAt > now ||
        todo.reminderNotified
      ) {
        continue;
      }
      if (!isNativePlatform()) {
        showTodoReminder(todo);
      }
      void markTodoReminderNotified(userId, todo);
    }
  };

  const id = window.setInterval(tick, intervalMs);
  tick();
  return () => window.clearInterval(id);
}
