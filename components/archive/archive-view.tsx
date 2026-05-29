"use client";

import { NoteEditorPane } from "@/components/archive/note-editor-pane";
import { NoteWorkspaceBar } from "@/components/collaboration/note-workspace-bar";
import { TodoList } from "@/components/todos/todo-list";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NoteLinksBar } from "@/components/archive/note-links-bar";
import { useMeetings } from "@/hooks/use-meetings";
import { useNotes } from "@/hooks/use-notes";
import { useTodos } from "@/hooks/use-todos";
import { useGroups } from "@/hooks/use-groups";
import { ARCHIVE_PATH, archiveUrl } from "@/lib/archive/routes";
import type { ArchiveFilter } from "@/lib/archive/types";
import {
  DEFAULT_CLOUD_META,
  type CloudSyncMeta,
} from "@/lib/collaboration/types";
import { removeNote, saveNote } from "@/lib/data/notes-store";
import { format } from "date-fns";
import { BookText, FileText, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const FILTERS: { id: ArchiveFilter; label: string }[] = [
  { id: "all", label: "All notes" },
  { id: "notes", label: "Notes" },
  { id: "todos", label: "Todos" },
];

function parseFilter(raw: string | null): ArchiveFilter {
  if (raw === "notes" || raw === "todos") return raw;
  return "all";
}

type ArchiveViewProps = {
  userId: string;
};

export function ArchiveView({ userId }: ArchiveViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get("filter"));
  const selectedId = searchParams.get("id");
  const tagFilter = searchParams.get("tag")?.trim() ?? "";

  const { notes } = useNotes(userId);
  const { meetings } = useMeetings(userId);
  const { todos } = useTodos(userId);
  const { groups } = useGroups(userId);

  const personalTodos = useMemo(
    () => todos.filter((t) => !t.meetingId),
    [todos],
  );
  const openPersonalTodos = useMemo(
    () => personalTodos.filter((t) => !t.completed && t.status !== "done"),
    [personalTodos],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      for (const t of n.tags ?? []) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let list = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (tagFilter) {
      const q = tagFilter.toLowerCase();
      list = list.filter((n) =>
        n.tags?.some((t) => t.toLowerCase() === q),
      );
    }
    return list;
  }, [notes, tagFilter]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const cloudMeta: CloudSyncMeta = useMemo(() => {
    return selectedNote?.cloudSyncMeta ?? DEFAULT_CLOUD_META(userId);
  }, [selectedNote?.cloudSyncMeta, userId]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setBody(selectedNote.body);
      setTags(selectedNote.tags ?? []);
    } else if (!selectedId) {
      setTitle("");
      setBody("");
      setTags([]);
    }
  }, [selectedNote, selectedId]);

  const replaceParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const q = params.toString();
      router.replace(q ? `${ARCHIVE_PATH}?${q}` : ARCHIVE_PATH);
    },
    [router, searchParams],
  );

  const selectNote = (id: string | null) => {
    if (id) replaceParams({ id, kind: "note" });
    else replaceParams({ id: null, kind: null });
  };

  const startNewNote = () => {
    router.replace(archiveUrl({ filter: "notes" }));
    setTitle("");
    setBody("");
    setTags([]);
  };

  async function handleSaveNote() {
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    try {
      const saved = await saveNote(userId, {
        id: selectedNote?.id,
        title: title.trim() || "Untitled note",
        body: body.trim(),
        source: selectedNote?.source ?? "manual",
        transcript: selectedNote?.transcript,
        mindMapSource: selectedNote?.mindMapSource,
        tags: tags.length ? tags : undefined,
        highlights: selectedNote?.highlights,
        createdAt: selectedNote?.createdAt,
        meetingId: selectedNote?.meetingId,
        seriesTag: selectedNote?.seriesTag,
        processingScope: selectedNote?.processingScope,
        cloudSyncMeta: selectedNote?.cloudSyncMeta,
      });
      selectNote(saved.id);
    } finally {
      setBusy(false);
    }
  }

  const onCloudMetaChange = useCallback(
    async (next: CloudSyncMeta) => {
      if (!selectedNote) return;
      setBusy(true);
      try {
        await saveNote(userId, {
          id: selectedNote.id,
          title: title.trim() || selectedNote.title,
          body: body.trim(),
          source: selectedNote.source,
          transcript: selectedNote.transcript,
          mindMapSource: selectedNote.mindMapSource,
          tags: tags.length ? tags : undefined,
          highlights: selectedNote.highlights,
          createdAt: selectedNote.createdAt,
          meetingId: selectedNote.meetingId,
          seriesTag: selectedNote.seriesTag,
          groupId:
            next.sharedWithGroups?.[0]?.groupId ?? selectedNote.groupId,
          // Promote/demote processing scope along with cloud meta.
          processingScope: next.isCloud ? "cloud" : "local",
          cloudSyncMeta: next,
        });
      } finally {
        setBusy(false);
      }
    },
    [selectedNote, userId, title, body, tags],
  );

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await removeNote(userId, pendingDelete.id);
      setPendingDelete(null);
      if (selectedId === pendingDelete.id) selectNote(null);
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Could not delete this note.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (filter === "todos") {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <ArchivePageHeader
          filter={filter}
          onFilterChange={(f) => replaceParams({ filter: f, id: null })}
          onNewNote={startNewNote}
        />
        <p className="text-xs text-muted-foreground">
          Personal todos only — meeting follow-ups live under Meetings.
        </p>
        <TodoList
          userId={userId}
          todos={
            openPersonalTodos.length ? openPersonalTodos : personalTodos
          }
        />
      </div>
    );
  }

  const showListOnMobile = !selectedId;
  const showDetailOnMobile = Boolean(selectedId);

  return (
    <>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete note?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!busy) setPendingDelete(null);
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          className={`shrink-0 border-b border-zinc-200 lg:w-72 lg:border-b-0 lg:border-r dark:border-zinc-800 ${
            showDetailOnMobile ? "hidden lg:flex lg:flex-col" : "flex flex-col"
          }`}
        >
          <ArchivePageHeader
            filter={filter}
            onFilterChange={(f) => replaceParams({ filter: f, id: null })}
            onNewNote={startNewNote}
          />

          {allTags.length > 0 ? (
            <div className="flex flex-wrap gap-1 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => replaceParams({ tag: null })}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  !tagFilter
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600"
                }`}
              >
                All tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => replaceParams({ tag })}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    tagFilter.toLowerCase() === tag.toLowerCase()
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {filteredNotes.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">
                No notes yet. Capture from Home or tap + New.
              </li>
            ) : (
              filteredNotes.map((note) => (
                <li
                  key={note.id}
                  className={`flex items-stretch ${
                    selectedId === note.id ? "bg-zinc-100 dark:bg-zinc-800" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectNote(note.id)}
                    className="min-w-0 flex-1 px-3 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <p className="truncate font-medium">{note.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {format(note.updatedAt, "MMM d, yyyy")} · {note.source}
                      {note.meetingId ? " · linked meeting" : ""}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Delete ${note.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete({ id: note.id, title: note.title });
                    }}
                    className="shrink-0 px-2 text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <div
          className={`min-h-0 flex-1 flex-col ${
            showListOnMobile ? "hidden lg:flex" : "flex"
          }`}
        >
          {selectedId || filter === "notes" ? (
            <>
              {selectedId ? (
                <button
                  type="button"
                  onClick={() => selectNote(null)}
                  className="border-b px-4 py-2 text-left text-sm text-violet-600 lg:hidden"
                >
                  ← Back to list
                </button>
              ) : null}
              <NoteWorkspaceBar
                userId={userId}
                noteId={selectedNote?.id}
                noteTitle={selectedNote?.title ?? (title || "New note")}
                cloudMeta={cloudMeta}
                onCloudMetaChange={selectedNote ? onCloudMetaChange : undefined}
                groups={groups.map((g) => ({ id: g.id, name: g.name }))}
                selectedGroupId={selectedNote?.groupId ?? null}
                onShareToGroup={
                  selectedNote
                    ? (groupId) => {
                        const groupName = groups.find((g) => g.id === groupId)
                          ?.name;
                        const next: CloudSyncMeta = {
                          ...cloudMeta,
                          sharedWithGroups: [
                            {
                              groupId,
                              groupName,
                              permission: "view_append",
                            },
                          ],
                          isCloud: true,
                          lastSyncedAt: Date.now(),
                        };
                        void onCloudMetaChange(next);
                      }
                    : undefined
                }
              />
              {selectedNote ? (
                <NoteLinksBar
                  userId={userId}
                  note={selectedNote}
                  meetings={meetings}
                  onNoteUpdated={(n) => {
                    setTitle(n.title);
                    setBody(n.body);
                    setTags(n.tags ?? []);
                    selectNote(n.id);
                  }}
                />
              ) : null}
              <NoteEditorPane
                title={title}
                body={body}
                tags={tags}
                selected={selectedNote}
                busy={busy}
                deleteError={deleteError}
                onTitleChange={setTitle}
                onBodyChange={setBody}
                onTagsChange={setTags}
                onSave={() => void handleSaveNote()}
                onDelete={() => {
                  if (selectedNote) {
                    setPendingDelete({
                      id: selectedNote.id,
                      title: selectedNote.title,
                    });
                  }
                }}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <BookText className="h-10 w-10 opacity-40" />
              <p>Select a note or create a new one.</p>
              <p className="text-xs">
                Meetings and meeting todos are under the Meetings tab.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ArchivePageHeader({
  filter,
  onFilterChange,
  onNewNote,
}: {
  filter: ArchiveFilter;
  onFilterChange: (filter: ArchiveFilter) => void;
  onNewNote: () => void;
}) {
  return (
    <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <BookText className="h-5 w-5 text-violet-600" />
            Notepad
          </h1>
          <p className="text-xs text-muted-foreground">Private notes & todos</p>
        </div>
        <button
          type="button"
          onClick={onNewNote}
          className="shrink-0 text-sm font-medium text-emerald-600"
        >
          + New
        </button>
      </div>
      <div
        className="mt-2 flex flex-wrap gap-1"
        role="tablist"
        aria-label="Notepad filters"
      >
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => onFilterChange(id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              filter === id
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
