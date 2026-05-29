"use client";

import { MermaidDiagram } from "@/components/mermaid-diagram";
import { TagChipInput } from "@/components/listen/tag-chip-input";
import type { NoteRecord } from "@/lib/data/types";
import { FileText, Save, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type NoteViewMode = "transcript" | "summary" | "mindmap";

function viewLabel(view: NoteViewMode): string {
  if (view === "transcript") return "Transcript";
  if (view === "summary") return "Summary";
  return "Mind map";
}

type NoteEditorPaneProps = {
  title: string;
  body: string;
  tags: string[];
  selected: NoteRecord | null;
  busy: boolean;
  deleteError: string | null;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
  onSave: () => void;
  onDelete: () => void;
};

export function NoteEditorPane({
  title,
  body,
  tags,
  selected,
  busy,
  deleteError,
  onTitleChange,
  onBodyChange,
  onTagsChange,
  onSave,
  onDelete,
}: NoteEditorPaneProps) {
  const hasTranscript = Boolean(selected?.transcript?.trim());
  const hasMindMap = Boolean(selected?.mindMapSource?.trim());
  const defaultView: NoteViewMode = useMemo(() => {
    if (hasTranscript) return "transcript";
    return "summary";
  }, [hasTranscript]);
  const [view, setView] = useState<NoteViewMode>(defaultView);

  useEffect(() => {
    setView(defaultView);
  }, [defaultView, selected?.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Title"
        className="rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-lg font-medium dark:border-zinc-700"
      />
      <TagChipInput tags={tags} onChange={onTagsChange} disabled={busy} />

      <div
        className="inline-flex w-full rounded-full border border-zinc-200 p-0.5 text-xs dark:border-zinc-700"
        role="tablist"
        aria-label="Note view"
      >
        {(["transcript", "summary", "mindmap"] as NoteViewMode[]).map((id) => {
          const disabledTab =
            (id === "transcript" && !hasTranscript) ||
            (id === "mindmap" && !hasMindMap);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              disabled={disabledTab}
              onClick={() => setView(id)}
              className={`flex-1 rounded-full px-3 py-1.5 font-medium transition-colors disabled:opacity-40 ${
                view === id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {viewLabel(id)}
            </button>
          );
        })}
      </div>

      {view === "transcript" ? (
        <textarea
          value={selected?.transcript ?? body}
          readOnly
          placeholder="Transcript…"
          rows={8}
          className="min-h-0 flex-1 resize-none rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm leading-relaxed dark:border-zinc-700"
        />
      ) : view === "summary" ? (
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="Summary / notes…"
          rows={8}
          className="min-h-0 flex-1 resize-none rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm leading-relaxed dark:border-zinc-700"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-200 bg-transparent p-3 dark:border-zinc-700">
          {selected?.mindMapSource ? (
            <MermaidDiagram source={selected.mindMapSource} />
          ) : (
            <p className="text-sm text-muted-foreground">No mind map yet.</p>
          )}
        </div>
      )}
      {selected?.highlights?.length ? (
        <div className="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-900 dark:text-amber-100">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            Highlights from Listen
          </p>
          <ul className="space-y-2 text-sm">
            {selected.highlights.map((h) => (
              <li key={h.id}>
                <p>{h.text}</p>
                {h.note ? (
                  <p className="text-xs italic text-zinc-500">{h.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {selected?.mindMapSource ? (
        null
      ) : null}
      {deleteError ? (
        <p className="text-sm text-destructive" role="alert">
          {deleteError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
        {selected ? (
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
