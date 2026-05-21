"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useReminders } from "@/hooks/use-reminders";
import { useTodos } from "@/hooks/use-todos";

/** Starts due-todo notification polling when a user is signed in. */
export function RemindersBootstrap({ children }: { children: React.ReactNode }) {
  const { uid } = useAuthUser();
  const { todos } = useTodos(uid);
  useReminders(uid, todos);
  return children;
}
