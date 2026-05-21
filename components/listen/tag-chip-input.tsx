"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

type TagChipInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function TagChipInput({
  tags,
  onChange,
  placeholder = "Add tag…",
  disabled,
}: TagChipInputProps) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) return;
    const lower = tag.toLowerCase();
    if (tags.some((t) => t.toLowerCase() === lower)) return;
    onChange([...tags, tag]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/50">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
        >
          {tag}
          {!disabled ? (
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="rounded-full p-0.5 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </span>
      ))}
      <input
        type="text"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
    </div>
  );
}
