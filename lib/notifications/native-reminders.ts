import { LocalNotifications } from "@capacitor/local-notifications";
import { APP_NAME } from "@/lib/branding/app-name";
import { isNativePlatform } from "@/lib/capacitor/platform";
import type { TodoRecord } from "@/lib/data/types";
import { todoStatusOf } from "@/lib/data/todos-store";

/** Stable int id for LocalNotifications (must fit 32-bit). */
export function todoNotificationId(todoId: string): number {
  let hash = 0;
  for (let i = 0; i < todoId.length; i++) {
    hash = (hash << 5) - hash + todoId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1_000_000 + 10_000;
}

export async function ensureLocalNotificationChannel(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: "migiude_reminders",
      name: "Reminders",
      description: "Todo due times and meeting updates",
      importance: 4,
    });
  } catch {
    /* channel may already exist */
  }
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    await ensureLocalNotificationChannel();
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

export async function scheduleTodoLocalNotification(
  todo: TodoRecord,
): Promise<void> {
  if (!isNativePlatform() || !todo.dueAt) return;
  if (todoStatusOf(todo) === "done") return;
  const at = new Date(todo.dueAt);
  if (at.getTime() <= Date.now()) return;

  try {
    await ensureLocalNotificationChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: todoNotificationId(todo.id),
          title: `${APP_NAME} reminder`,
          body: todo.text,
          channelId: "migiude_reminders",
          schedule: { at, allowWhileIdle: true },
          extra: { todoId: todo.id },
        },
      ],
    });
  } catch {
    /* scheduling failed — web fallback still runs */
  }
}

export async function cancelTodoLocalNotification(todoId: string): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: todoNotificationId(todoId) }],
    });
  } catch {
    /* ignore */
  }
}

export async function syncTodoLocalNotifications(
  todos: TodoRecord[],
): Promise<void> {
  if (!isNativePlatform()) return;
  const pending = todos.filter(
    (t) => t.dueAt && todoStatusOf(t) !== "done" && t.dueAt > Date.now(),
  );
  try {
    await ensureLocalNotificationChannel();
    const { notifications: scheduled } = await LocalNotifications.getPending();
    const keepIds = new Set(pending.map((t) => todoNotificationId(t.id)));
    const toCancel =
      scheduled?.filter((n) => n.id != null && !keepIds.has(n.id)) ?? [];
    if (toCancel.length) {
      await LocalNotifications.cancel({
        notifications: toCancel.map((n) => ({ id: n.id! })),
      });
    }
    for (const todo of pending) {
      await scheduleTodoLocalNotification(todo);
    }
  } catch {
    /* ignore */
  }
}

export async function showImmediateLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await ensureLocalNotificationChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100_000) + 50_000,
          title,
          body,
          channelId: "migiude_reminders",
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    });
  } catch {
    /* ignore */
  }
}
