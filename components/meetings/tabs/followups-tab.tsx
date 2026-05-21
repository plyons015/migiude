"use client";

import type { MeetingRoomProps } from "@/components/meetings/meeting-room-shared";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  removeTodo,
  saveTodo,
  setTodoStatus,
  todoStatusOf,
  updateTodo,
} from "@/lib/data/todos-store";
import type { TodoRecord, TodoStatus } from "@/lib/data/types";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type FollowupsTabProps = MeetingRoomProps & {
  todos: TodoRecord[];
  topicTitles: string[];
};

const STATUSES: TodoStatus[] = ["open", "waiting", "done"];

export function FollowupsTab({
  userId,
  meeting,
  todos,
  topicTitles,
}: FollowupsTabProps) {
  const [text, setText] = useState("");
  const [topicTag, setTopicTag] = useState("");
  const [assignee, setAssignee] = useState("");

  const meetingTodos = useMemo(
    () => todos.filter((t) => t.meetingId === meeting.id),
    [todos, meeting.id],
  );

  const handleAdd = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await saveTodo(userId, {
      text: trimmed,
      meetingId: meeting.id,
      topicTag: topicTag || undefined,
      assigneeLabel: assignee.trim() || undefined,
      status: "open",
    });
    setText("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-border p-3">
        <Label>New follow-up</Label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Action item…"
          className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {topicTitles.length > 0 ? (
            <Select value={topicTag || "_none"} onValueChange={(v) => setTopicTag(v === "_none" ? "" : v)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No topic</SelectItem>
                {topicTitles.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Assignee (e.g. Speaker 2)"
            className="h-8 flex-1 min-w-32 rounded-md border border-border bg-background px-2 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleAdd()}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white"
        >
          Add follow-up
        </button>
      </div>

      <ul className="space-y-2">
        {meetingTodos.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            No follow-ups for this meeting yet.
          </li>
        ) : (
          meetingTodos.map((todo) => (
            <li
              key={todo.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start"
            >
              <Select
                value={todoStatusOf(todo)}
                onValueChange={(v) =>
                  void setTodoStatus(userId, todo, v as TodoStatus)
                }
              >
                <SelectTrigger className="h-8 w-28 text-xs">
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
              <div className="min-w-0 flex-1">
                <input
                  defaultValue={todo.text}
                  onBlur={(e) =>
                    void updateTodo(userId, {
                      ...todo,
                      text: e.target.value.trim() || todo.text,
                    })
                  }
                  className={`w-full bg-transparent text-sm outline-none ${
                    todo.completed ? "line-through text-muted-foreground" : ""
                  }`}
                />
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {todo.topicTag ? <span>#{todo.topicTag}</span> : null}
                  {todo.assigneeLabel ? (
                    <span>→ {todo.assigneeLabel}</span>
                  ) : null}
                  {todo.dueAt ? (
                    <span>Due {format(todo.dueAt, "MMM d")}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void removeTodo(userId, todo.id)}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
