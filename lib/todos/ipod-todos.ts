import type { TodoRecord } from "@/lib/data/types";
import { todoStatusOf } from "@/lib/data/todos-store";
import { todoLaneOf, type TodoLane } from "@/lib/workspace/scope";

export type IpodTodoRow = {
  todo: TodoRecord;
  lane: TodoLane;
};

/** Max open todos shown in the Home iPod strip (scrollable). */
export const IPOD_TODO_MAX = 10;

function sortScore(todo: TodoRecord): number {
  if (todo.dueAt) return todo.dueAt;
  return -todo.updatedAt;
}

/** Open todos for the Home iPod strip, due-soon first, up to {@link IPOD_TODO_MAX}. */
export function pickIpodTodos(
  todos: TodoRecord[],
  limit = IPOD_TODO_MAX,
): IpodTodoRow[] {
  const open = todos
    .filter((t) => todoStatusOf(t) !== "done")
    .sort((a, b) => sortScore(a) - sortScore(b))
    .slice(0, limit);
  return open.map((todo) => ({ todo, lane: todoLaneOf(todo) }));
}

export function countOpenTodos(todos: TodoRecord[]): number {
  return todos.filter((t) => todoStatusOf(t) !== "done").length;
}

export function countOpenTodosByLane(todos: TodoRecord[]): Record<TodoLane, number> {
  const counts: Record<TodoLane, number> = {
    personal: 0,
    meeting: 0,
    group: 0,
  };
  for (const todo of todos) {
    if (todoStatusOf(todo) === "done") continue;
    counts[todoLaneOf(todo)] += 1;
  }
  return counts;
}
