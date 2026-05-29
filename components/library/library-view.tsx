"use client";

import { MeetingFollowupsBoard } from "@/components/library/meeting-followups-board";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useMeetings } from "@/hooks/use-meetings";
import { useTodos } from "@/hooks/use-todos";
import { removeMeeting } from "@/lib/data/meetings-store";
import {
  collectAllTags,
  collectAllTopics,
  filterMeetings,
  getSeriesForTag,
  meetingHasOpenFollowUps,
} from "@/lib/library/queries";
import { format } from "date-fns";
import { Calendar, Columns3, Filter, ListTodo, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { meetingsUrl } from "@/lib/meetings/routes";

type LibraryViewProps = {
  userId: string;
};

export function LibraryView({ userId }: LibraryViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "board" ? "board" : "list";
  const tagFilter = searchParams.get("tag")?.trim() ?? "";
  const topicFilter = searchParams.get("topic")?.trim() ?? "";
  const openOnly = searchParams.get("open") === "1";

  const { meetings } = useMeetings(userId);
  const { todos } = useTodos(userId);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function requestDeleteMeeting(meetingId: string, title: string) {
    setDeleteError(null);
    setPendingDelete({ id: meetingId, title });
  }

  async function confirmDeleteMeeting() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    setDeleteError(null);
    try {
      await removeMeeting(userId, pendingDelete.id);
      setPendingDelete(null);
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Could not delete this meeting.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const allTags = useMemo(() => collectAllTags(meetings), [meetings]);
  const allTopics = useMemo(() => collectAllTopics(meetings), [meetings]);

  const filtered = useMemo(
    () =>
      filterMeetings(
        meetings,
        {
          tag: tagFilter || undefined,
          topic: topicFilter || undefined,
          openFollowUpsOnly: openOnly,
        },
        todos,
      ),
    [meetings, tagFilter, topicFilter, openOnly, todos],
  );

  const series = useMemo(() => {
    if (!tagFilter) return null;
    return getSeriesForTag(meetings, tagFilter, todos);
  }, [meetings, tagFilter, todos]);

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <>
    <ConfirmDialog
      open={pendingDelete !== null}
      title="Delete meeting?"
      description={
        pendingDelete
          ? `“${pendingDelete.title}” will be removed from your library. This cannot be undone.`
          : ""
      }
      confirmLabel="Delete"
      destructive
      busy={deletingId !== null}
      onConfirm={() => void confirmDeleteMeeting()}
      onCancel={() => {
        if (!deletingId) setPendingDelete(null);
      }}
    />
    <div className="flex flex-1 flex-col gap-4 p-4 pb-8">
      {deleteError ? (
        <p className="text-sm text-destructive" role="alert">
          {deleteError}
        </p>
      ) : null}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground">
          Find meetings by tag or topic, track series follow-ups, export minutes
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setParams({ view: "list" })}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
            view === "list"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-border"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Meetings
        </button>
        <button
          type="button"
          onClick={() => setParams({ view: "board" })}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
            view === "board"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-border"
          }`}
        >
          <Columns3 className="h-3.5 w-3.5" />
          Follow-ups board
        </button>
      </div>

      {view === "board" ? (
        <MeetingFollowupsBoard userId={userId} />
      ) : (
        <>
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filters
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Tag</Label>
                <Select
                  value={tagFilter || "_all"}
                  onValueChange={(v) =>
                    setParams({ tag: v === "_all" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All tags</SelectItem>
                    {allTags.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Topic</Label>
                <Select
                  value={topicFilter || "_all"}
                  onValueChange={(v) =>
                    setParams({ topic: v === "_all" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All topics</SelectItem>
                    {allTopics.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="open-only" className="text-sm">
                Only meetings with open follow-ups
              </Label>
              <Switch
                id="open-only"
                checked={openOnly}
                onCheckedChange={(on) =>
                  setParams({ open: on ? "1" : null })
                }
              />
            </div>
          </div>

          {series && series.openTodos.length > 0 ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-violet-600" />
                <h2 className="text-sm font-semibold">
                  Series: {series.tag}
                </h2>
                <Badge variant="secondary">
                  {series.openTodos.length} open
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                From {series.meetings.length} earlier meeting
                {series.meetings.length === 1 ? "" : "s"} with this tag
              </p>
              <ul className="mt-3 space-y-2">
                {series.openTodos.slice(0, 8).map((t) => {
                  const m = meetings.find((x) => x.id === t.meetingId);
                  return (
                    <li key={t.id} className="text-sm">
                      <span>{t.text}</span>
                      {m ? (
                        <Link
                          href={meetingsUrl({
                            id: m.id,
                            room: true,
                            tab: "followups",
                          })}
                          className="ml-2 text-xs text-violet-600 underline dark:text-violet-400"
                        >
                          {m.title}
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {filtered.length} meeting{filtered.length === 1 ? "" : "s"}
            </p>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No meetings match. End a meeting from Listen or clear filters.
              </p>
            ) : (
              filtered.map((m) => (
                <div
                  key={m.id}
                  className="flex items-stretch rounded-lg border border-border transition-colors hover:bg-accent/50"
                >
                  <Link
                    href={meetingsUrl({ id: m.id, room: true })}
                    className="flex min-w-0 flex-1 items-start gap-3 p-3"
                  >
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(m.startedAt, "MMM d, yyyy HH:mm")}
                        {m.aiSummary ? " · summarized" : ""}
                        {meetingHasOpenFollowUps(m.id, todos)
                          ? " · open follow-ups"
                          : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {m.tags?.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                        {m.topics?.slice(0, 3).map((t) => (
                          <Badge
                            key={t.id}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {t.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    disabled={deletingId === m.id}
                    aria-label={`Delete ${m.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeleteMeeting(m.id, m.title);
                    }}
                    className="shrink-0 self-center px-3 text-muted-foreground hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
}
