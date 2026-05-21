"use client";

import { MermaidDiagram } from "@/components/mermaid-diagram";
import { TagChipInput } from "@/components/listen/tag-chip-input";
import { TodoList } from "@/components/todos/todo-list";
import { Badge } from "@/components/ui/badge";
import { useNotes } from "@/hooks/use-notes";
import { useTodos } from "@/hooks/use-todos";
import { removeNote, saveNote } from "@/lib/data/notes-store";
import type { NoteRecord } from "@/lib/data/types";
import { format } from "date-fns";
import { FileText, Save, Star, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NotesViewProps = {
  userId: string;
};

export function NotesView({ userId }: NotesViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "todos" ? "todos" : "notes";
  const selectedId = searchParams.get("id");
  const tagFilter = searchParams.get("tag")?.trim() ?? "";

  const { notes } = useNotes(userId);
  const { todos, openTodos } = useTodos(userId);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      for (const t of n.tags ?? []) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!tagFilter) return notes;
    const q = tagFilter.toLowerCase();
    return notes.filter((n) =>
      n.tags?.some((t) => t.toLowerCase() === q),
    );
  }, [notes, tagFilter]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (selected) {
      setTitle(selected.title);
      setBody(selected.body);
      setTags(selected.tags ?? []);
    } else if (!selectedId) {
      setTitle("");
      setBody("");
      setTags([]);
    }
  }, [selected, selectedId]);

  function setTagFilter(tag: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (tag) params.set("tag", tag);
    else params.delete("tag");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  function selectNote(note: NoteRecord | null) {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      const url = new URL(window.location.href);
      url.searchParams.set("id", note.id);
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    } else {
      setTitle("");
      setBody("");
    }
  }

  async function handleSave() {
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    try {
      const saved = await saveNote(userId, {
        id: selected?.id,
        title: title.trim() || "Untitled note",
        body: body.trim(),
        source: selected?.source ?? "manual",
        transcript: selected?.transcript,
        mindMapSource: selected?.mindMapSource,
        tags: tags.length ? tags : undefined,
        highlights: selected?.highlights,
        createdAt: selected?.createdAt,
      });
      selectNote(saved);
      const url = new URL(window.location.href);
      url.searchParams.set("id", saved.id);
      window.history.replaceState({}, "", url.toString());
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setBusy(true);
    try {
      await removeNote(userId, selected.id);
      selectNote(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());
    } finally {
      setBusy(false);
    }
  }

  if (tab === "todos") {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <h1 className="text-xl font-semibold">Todos</h1>
        <TodoList userId={userId} todos={openTodos.length ? openTodos : todos} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-zinc-200 lg:w-64 lg:border-b-0 lg:border-r dark:border-zinc-800">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-semibold">Notes</h1>
          <button
            type="button"
            onClick={() => {
              selectNote(null);
              const url = new URL(window.location.href);
              url.searchParams.delete("id");
              window.history.replaceState({}, "", url.toString());
            }}
            className="text-sm font-medium text-emerald-600"
          >
            + New
          </button>
        </div>
        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-1 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`rounded-full px-2 py-0.5 text-xs ${
                !tagFilter
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tag)}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  tagFilter.toLowerCase() === tag.toLowerCase()
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}
        <ul className="max-h-48 overflow-y-auto lg:max-h-none">
          {filteredNotes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => selectNote(note)}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
                  selectedId === note.id ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                <p className="font-medium truncate">{note.title}</p>
                {note.tags?.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <p className="mt-1 text-xs text-zinc-500">
                  {format(note.updatedAt, "MMM d")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-lg font-medium dark:border-zinc-700"
        />
        <TagChipInput tags={tags} onChange={setTags} disabled={busy} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Note body or transcript…"
          rows={8}
          className="min-h-0 flex-1 resize-none rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm leading-relaxed dark:border-zinc-700"
        />
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
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <FileText className="h-3.5 w-3.5" />
              Mind map
            </p>
            <MermaidDiagram source={selected.mindMapSource} />
          </div>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          {selected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
