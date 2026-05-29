import type { NoteRecord, ProcessingScope, TodoRecord } from "@/lib/data/types";

export type { ProcessingScope };

/** Todo lane for iPod color + navigation (groups deferred). */
export type TodoLane = "personal" | "meeting" | "group";

export function todoLaneOf(todo: TodoRecord): TodoLane {
  if (todo.groupId) return "group";
  if (todo.meetingId) return "meeting";
  return "personal";
}

export function inferProcessingScope(
  entity: Pick<NoteRecord, "source" | "meetingId" | "processingScope">,
): ProcessingScope {
  if (entity.processingScope) return entity.processingScope;
  if (entity.meetingId || entity.source === "meeting") return "cloud";
  return "local";
}

export const TODO_LANE_COLORS: Record<
  TodoLane,
  { dot: string; ring: string; text: string; label: string }
> = {
  personal: {
    dot: "bg-emerald-500",
    ring: "border-emerald-500",
    text: "text-emerald-800 dark:text-emerald-200",
    label: "Personal",
  },
  meeting: {
    dot: "bg-violet-500",
    ring: "border-violet-500",
    text: "text-violet-800 dark:text-violet-200",
    label: "Meeting",
  },
  group: {
    dot: "bg-sky-500",
    ring: "border-sky-500",
    text: "text-sky-800 dark:text-sky-200",
    label: "Group",
  },
};
