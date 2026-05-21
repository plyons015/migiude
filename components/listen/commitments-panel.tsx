"use client";

import type { DetectedCommitment } from "@/lib/listen/process-commitments";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import Link from "next/link";

type CommitmentsPanelProps = {
  items: DetectedCommitment[];
};

export function CommitmentsPanel({ items }: CommitmentsPanelProps) {
  if (items.length === 0) return null;

  return (
    <section className="shrink-0 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/25">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-900 dark:text-emerald-100">
        <Bell className="h-3.5 w-3.5" />
        Detected commitments ({items.length})
      </h3>
      <ul className="max-h-28 space-y-2 overflow-y-auto text-sm">
        {items.map((c) => (
          <li key={c.todoId}>
            <p className="font-medium text-zinc-800 dark:text-zinc-200">{c.text}</p>
            {c.dueAt ? (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                Remind {format(c.dueAt, "MMM d, h:mm a")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <Link
        href="/notes/?tab=todos"
        className="mt-2 inline-block text-xs font-medium text-emerald-700 underline dark:text-emerald-300"
      >
        View todos
      </Link>
    </section>
  );
}
