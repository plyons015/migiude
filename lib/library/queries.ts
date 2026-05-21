import { todoStatusOf } from "@/lib/data/todos-store";
import type { MeetingRecord, TodoRecord } from "@/lib/data/types";

export type LibraryFilters = {
  tag?: string;
  topic?: string;
  openFollowUpsOnly?: boolean;
};

export function collectAllTags(meetings: MeetingRecord[]): string[] {
  const set = new Set<string>();
  for (const m of meetings) {
    for (const t of m.tags ?? []) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function collectAllTopics(meetings: MeetingRecord[]): string[] {
  const set = new Set<string>();
  for (const m of meetings) {
    for (const t of m.topics ?? []) set.add(t.title);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function meetingHasOpenFollowUps(
  meetingId: string,
  todos: TodoRecord[],
): boolean {
  return todos.some(
    (t) => t.meetingId === meetingId && todoStatusOf(t) !== "done",
  );
}

export function filterMeetings(
  meetings: MeetingRecord[],
  filters: LibraryFilters,
  todos: TodoRecord[],
): MeetingRecord[] {
  let list = [...meetings];

  if (filters.tag) {
    const q = filters.tag.toLowerCase();
    list = list.filter((m) =>
      m.tags?.some((t) => t.toLowerCase() === q),
    );
  }

  if (filters.topic) {
    const q = filters.topic.toLowerCase();
    list = list.filter((m) =>
      m.topics?.some((t) => t.title.toLowerCase() === q),
    );
  }

  if (filters.openFollowUpsOnly) {
    list = list.filter((m) => meetingHasOpenFollowUps(m.id, todos));
  }

  return list.sort((a, b) => b.startedAt - a.startedAt);
}

export type SeriesInfo = {
  tag: string;
  meetings: MeetingRecord[];
  openTodos: TodoRecord[];
};

/** Meetings sharing a tag + open todos from earlier meetings in the series. */
export function getSeriesForTag(
  meetings: MeetingRecord[],
  tag: string,
  todos: TodoRecord[],
  excludeMeetingId?: string,
): SeriesInfo {
  const q = tag.toLowerCase();
  const seriesMeetings = meetings
    .filter((m) => m.tags?.some((t) => t.toLowerCase() === q))
    .filter((m) => m.id !== excludeMeetingId)
    .sort((a, b) => b.startedAt - a.startedAt);

  const seriesIds = new Set(seriesMeetings.map((m) => m.id));
  const openTodos = todos.filter(
    (t) =>
      t.meetingId &&
      seriesIds.has(t.meetingId) &&
      todoStatusOf(t) !== "done",
  );

  return { tag, meetings: seriesMeetings, openTodos };
}

export function getMeetingTodosByStatus(todos: TodoRecord[]): {
  open: TodoRecord[];
  waiting: TodoRecord[];
  done: TodoRecord[];
} {
  const withMeeting = todos.filter((t) => t.meetingId);
  const open: TodoRecord[] = [];
  const waiting: TodoRecord[] = [];
  const done: TodoRecord[] = [];

  for (const t of withMeeting) {
    const status = todoStatusOf(t);
    if (status === "waiting") waiting.push(t);
    else if (status === "done") done.push(t);
    else open.push(t);
  }

  return { open, waiting, done };
}
