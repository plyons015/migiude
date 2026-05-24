"use client";

import {
  applyTemplateTitle,
  BUILTIN_MEETING_TEMPLATES,
} from "@/lib/meetings/templates";
import type { MeetingTemplate } from "@/lib/meetings/template-schema";
import { Play } from "lucide-react";

type StartMeetingPanelProps = {
  disabled?: boolean;
  onStart: (template: MeetingTemplate | null) => void;
  seriesTag?: string | null;
  seriesOpenCount?: number;
};

export function StartMeetingPanel({
  disabled,
  onStart,
  seriesTag,
  seriesOpenCount,
}: StartMeetingPanelProps) {
  return (
    <div className="space-y-3">
      {seriesTag && seriesOpenCount && seriesOpenCount > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          Series &quot;{seriesTag}&quot;: {seriesOpenCount} open follow-up
          {seriesOpenCount === 1 ? "" : "s"} from earlier meetings — check Library
          before you start.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        {BUILTIN_MEETING_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onStart(t)}
            className="rounded-xl border border-zinc-200 p-3 text-left transition-colors hover:border-violet-400 hover:bg-violet-50/50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-violet-950/30"
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t.label}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">{t.description}</p>
            <p className="mt-2 text-[10px] text-violet-600 dark:text-violet-400">
              {applyTemplateTitle(t, new Date()).slice(0, 32)}…
            </p>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onStart(null)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        <Play className="h-5 w-5" />
        Start meeting (no template)
      </button>
    </div>
  );
}
