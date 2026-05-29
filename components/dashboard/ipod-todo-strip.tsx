"use client";

import { archiveUrl } from "@/lib/archive/routes";
import type { TodoRecord } from "@/lib/data/types";
import { meetingsUrl } from "@/lib/meetings/routes";
import {
  countOpenTodos,
  IPOD_TODO_MAX,
  pickIpodTodos,
} from "@/lib/todos/ipod-todos";
import { TODO_LANE_COLORS, todoLaneOf } from "@/lib/workspace/scope";
import { toggleTodo } from "@/lib/data/todos-store";
import { format } from "date-fns";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type IpodTodoStripProps = {
  userId: string;
  todos: TodoRecord[];
  className?: string;
};

export function IpodTodoStrip({ userId, todos, className }: IpodTodoStripProps) {
  const rows = useMemo(() => pickIpodTodos(todos, IPOD_TODO_MAX), [todos]);
  const openTotal = useMemo(() => countOpenTodos(todos), [todos]);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (rows.length === 0) return null;

  const overflow = openTotal - rows.length;

  function hrefFor(todo: TodoRecord): string {
    const lane = todoLaneOf(todo);
    if (lane === "meeting" && todo.meetingId) {
      return meetingsUrl({ id: todo.meetingId, tab: "followups" });
    }
    if (lane === "group") {
      return meetingsUrl({ view: "board" });
    }
    return archiveUrl({ filter: "todos" });
  }

  return (
    <div className={cn("space-y-1.5 border-t border-black/5 pt-2 dark:border-white/10", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
          Open todos ({openTotal})
        </p>
        <div className="flex gap-2 text-[9px] opacity-70">
          {(["personal", "meeting", "group"] as const).map((lane) => (
            <span key={lane} className="inline-flex items-center gap-0.5">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", TODO_LANE_COLORS[lane].dot)}
              />
              {TODO_LANE_COLORS[lane].label}
            </span>
          ))}
        </div>
      </div>
      <div
        className="max-h-36 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]"
        aria-label="Open todos list"
      >
        <ul className="space-y-1">
          {rows.map(({ todo, lane }) => {
          const colors = TODO_LANE_COLORS[lane];
          return (
            <li key={todo.id} className="flex items-start gap-2">
              <button
                type="button"
                disabled={busyId === todo.id}
                aria-label="Toggle complete"
                onClick={(e) => {
                  e.preventDefault();
                  setBusyId(todo.id);
                  void toggleTodo(userId, todo).finally(() => setBusyId(null));
                }}
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 bg-transparent opacity-90",
                  colors.ring,
                )}
              />
              <Link
                href={hrefFor(todo)}
                className={cn(
                  "min-w-0 flex-1 text-xs leading-snug underline-offset-2 hover:underline",
                  colors.text,
                )}
              >
                <span className="line-clamp-2">{todo.text}</span>
                {todo.dueAt ? (
                  <span className="block text-[10px] opacity-70">
                    Due {format(todo.dueAt, "MMM d")}
                  </span>
                ) : null}
              </Link>
            </li>
          );
          })}
        </ul>
      </div>
      {overflow > 0 ? (
        <p className="text-[10px] opacity-60">
          +{overflow} more in Notepad or Meetings
        </p>
      ) : null}
    </div>
  );
}
