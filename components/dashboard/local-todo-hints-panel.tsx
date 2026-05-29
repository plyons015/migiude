"use client";

import type { LocalTodoHint } from "@/lib/speech/local-todo-hints";
import { CheckSquare, X } from "lucide-react";

type LocalTodoHintsPanelProps = {
  hints: LocalTodoHint[];
  onAdd: (hint: LocalTodoHint) => void;
  onDismiss: (hintId: string) => void;
};

export function LocalTodoHintsPanel({
  hints,
  onAdd,
  onDismiss,
}: LocalTodoHintsPanelProps) {
  if (hints.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-sm space-y-2 rounded-xl border border-teal-200/80 bg-teal-50/90 px-3 py-2.5 dark:border-teal-900/50 dark:bg-teal-950/40">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-200">
        Possible follow-ups (on-device)
      </p>
      <ul className="space-y-1.5">
        {hints.map((hint) => (
          <li
            key={hint.id}
            className="flex items-start gap-2 text-xs text-teal-950 dark:text-teal-100"
          >
            <span className="min-w-0 flex-1 leading-snug">{hint.text}</span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => onAdd(hint)}
                className="inline-flex items-center gap-0.5 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-medium text-white"
              >
                <CheckSquare className="h-3 w-3" />
                Add
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => onDismiss(hint.id)}
                className="rounded-full p-0.5 text-teal-700 hover:bg-teal-200/60 dark:text-teal-300 dark:hover:bg-teal-900/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
