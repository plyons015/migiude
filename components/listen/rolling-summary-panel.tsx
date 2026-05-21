"use client";

import { format } from "date-fns";

type RollingSummary = {
  at: number;
  text: string;
};

type RollingSummaryPanelProps = {
  summaries: RollingSummary[];
  busy?: boolean;
};

export function RollingSummaryPanel({
  summaries,
  busy,
}: RollingSummaryPanelProps) {
  if (summaries.length === 0 && !busy) return null;

  return (
    <section className="shrink-0 rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/25">
      <h3 className="text-xs font-medium text-indigo-900 dark:text-indigo-100">
        Rolling summary {busy ? "(updating…)" : ""}
      </h3>
      <ul className="mt-2 max-h-32 space-y-2 overflow-y-auto">
        {summaries.map((s, i) => (
          <li key={`${s.at}-${i}`} className="text-sm">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-300">
              {format(s.at, "HH:mm")}
            </p>
            <p className="leading-snug text-zinc-800 dark:text-zinc-200">{s.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
