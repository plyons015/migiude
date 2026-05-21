"use client";

import { TagChipInput } from "@/components/listen/tag-chip-input";
import { Loader2 } from "lucide-react";

type EndMeetingTagsProps = {
  loading: boolean;
  suggested: string[];
  tags: string[];
  onChangeTags: (tags: string[]) => void;
  onToggleSuggested: (tag: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  busy: boolean;
};

export function EndMeetingTags({
  loading,
  suggested,
  tags,
  onChangeTags,
  onToggleSuggested,
  onConfirm,
  onSkip,
  busy,
}: EndMeetingTagsProps) {
  return (
    <div className="space-y-3 rounded-xl border border-violet-300 bg-violet-50/80 p-3 dark:border-violet-800 dark:bg-violet-950/40">
      <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
        Suggested tags
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-violet-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI is suggesting tags…
        </div>
      ) : (
        <>
          {suggested.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {suggested.map((tag) => {
                const on = tags.some(
                  (t) => t.toLowerCase() === tag.toLowerCase(),
                );
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleSuggested(tag)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      on
                        ? "bg-violet-700 text-white"
                        : "border border-violet-300 bg-white text-violet-800 dark:border-violet-600 dark:bg-violet-900/50 dark:text-violet-100"
                    }`}
                  >
                    {on ? "✓ " : "+ "}
                    {tag}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-violet-700 dark:text-violet-300">
              No suggestions — add tags manually below.
            </p>
          )}
          <TagChipInput tags={tags} onChange={onChangeTags} disabled={busy} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="rounded-full bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save meeting"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSkip}
              className="rounded-full border border-violet-300 px-4 py-2 text-sm dark:border-violet-600"
            >
              Skip tags
            </button>
          </div>
        </>
      )}
    </div>
  );
}
