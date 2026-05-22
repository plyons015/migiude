"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMeetings } from "@/hooks/use-meetings";
import { useTodos } from "@/hooks/use-todos";
import { setTodoStatus, todoStatusOf } from "@/lib/data/todos-store";
import { getMeetingTodosByStatus } from "@/lib/library/queries";
import type { TodoRecord, TodoStatus } from "@/lib/data/types";
import Link from "next/link";
import { useMemo } from "react";

const STATUSES: TodoStatus[] = ["open", "waiting", "done"];

type MeetingFollowupsBoardProps = {
  userId: string;
};

function BoardColumn({
  title,
  todos,
  meetingsById,
  userId,
}: {
  title: string;
  todos: TodoRecord[];
  meetingsById: Map<string, string>;
  userId: string;
}) {
  return (
    <div className="flex min-h-48 flex-1 flex-col rounded-xl border border-border bg-muted/30">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <span className="text-xs text-muted-foreground">{todos.length}</span>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto p-2">
        {todos.length === 0 ? (
          <li className="p-2 text-xs text-muted-foreground">None</li>
        ) : (
          todos.map((todo) => (
            <li
              key={todo.id}
              className="rounded-lg border border-border bg-background p-2 text-sm shadow-sm"
            >
              <p className="leading-snug">{todo.text}</p>
              {todo.meetingId ? (
                <Link
                  href={`/meetings/?id=${todo.meetingId}&tab=followups`}
                  className="mt-1 block text-[10px] font-medium text-violet-600 underline dark:text-violet-400"
                >
                  {meetingsById.get(todo.meetingId) ?? "Meeting"}
                </Link>
              ) : null}
              {todo.topicTag ? (
                <span className="mt-1 inline-block text-[10px] text-muted-foreground">
                  #{todo.topicTag}
                </span>
              ) : null}
              <Select
                value={todoStatusOf(todo)}
                onValueChange={(v) =>
                  void setTodoStatus(userId, todo, v as TodoStatus)
                }
              >
                <SelectTrigger className="mt-2 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function MeetingFollowupsBoard({ userId }: MeetingFollowupsBoardProps) {
  const { meetings } = useMeetings(userId);
  const { todos } = useTodos(userId);

  const meetingsById = useMemo(
    () => new Map(meetings.map((m) => [m.id, m.title])),
    [meetings],
  );

  const { open, waiting, done } = useMemo(
    () => getMeetingTodosByStatus(todos),
    [todos],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <BoardColumn
        title="Open"
        todos={open}
        meetingsById={meetingsById}
        userId={userId}
      />
      <BoardColumn
        title="Waiting"
        todos={waiting}
        meetingsById={meetingsById}
        userId={userId}
      />
      <BoardColumn
        title="Done"
        todos={done.slice(0, 20)}
        meetingsById={meetingsById}
        userId={userId}
      />
    </div>
  );
}
