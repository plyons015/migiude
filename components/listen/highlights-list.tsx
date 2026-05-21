"use client";

import type { TranscriptHighlight } from "@/lib/data/types";
import { Star } from "lucide-react";

type HighlightsListProps = {
  highlights: TranscriptHighlight[];
};

export function HighlightsList({ highlights }: HighlightsListProps) {
  if (highlights.length === 0) return null;

  return (
    <section className="shrink-0 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-900 dark:text-amber-100">
        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
        Highlights ({highlights.length})
      </h3>
      <ul className="max-h-28 space-y-2 overflow-y-auto">
        {highlights.map((h) => (
          <li key={h.id} className="text-sm">
            <p className="leading-snug text-zinc-800 dark:text-zinc-200">{h.text}</p>
            {h.note ? (
              <p className="mt-0.5 text-xs italic text-zinc-500">{h.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
