"use client";

import { MeetingWorkspacePane } from "@/components/archive/meeting-workspace-pane";
import { MeetingFollowupsBoard } from "@/components/library/meeting-followups-board";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMeetings } from "@/hooks/use-meetings";
import { useSharedMeetings } from "@/hooks/use-shared-meetings";
import { useTodos } from "@/hooks/use-todos";
import { removeMeeting } from "@/lib/data/meetings-store";
import {
  collectAllTags,
  collectAllTopics,
  filterMeetings,
  getSeriesForTag,
  meetingHasOpenFollowUps,
} from "@/lib/library/queries";
import {
  MEETINGS_PATH,
  type MeetingsScope,
} from "@/lib/meetings/routes";
import { todoStatusOf } from "@/lib/data/todos-store";
import { format } from "date-fns";
import {
  Calendar,
  ChevronDown,
  Cloud,
  Filter,
  ListTodo,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type HubView = "list" | "board";

function parseScope(raw: string | null): MeetingsScope {
  if (raw === "mine" || raw === "shared") return raw;
  return "all";
}

type MeetingsHubViewProps = {
  userId: string;
};

export function MeetingsHubView({ userId }: MeetingsHubViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("id");
  const scope = parseScope(searchParams.get("scope"));
  const tagFilter = searchParams.get("tag")?.trim() ?? "";
  const seriesFilter = searchParams.get("series")?.trim() ?? "";
  const topicFilter = searchParams.get("topic")?.trim() ?? "";
  const openOnly = searchParams.get("open") === "1";
  const hubView: HubView =
    searchParams.get("view") === "board" ? "board" : "list";

  const { meetings } = useMeetings(userId);
  const { todos } = useTodos(userId);
  const { meetings: sharedMeetings } = useSharedMeetings(userId);
  const allMeetings = useMemo(
    () => [...meetings, ...sharedMeetings],
    [meetings, sharedMeetings],
  );

  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const privateMeetings = useMemo(
    () =>
      filterMeetings(
        meetings,
        {
          tag: tagFilter || undefined,
          topic: topicFilter || undefined,
          openFollowUpsOnly: openOnly,
        },
        todos,
      ).filter((m) => {
        if (!seriesFilter) return true;
        const q = seriesFilter.toLowerCase();
        return m.seriesTag?.toLowerCase() === q;
      }),
    [meetings, tagFilter, topicFilter, openOnly, todos, seriesFilter],
  );

  const sharedFilteredMeetings = useMemo(
    () =>
      filterMeetings(
        sharedMeetings,
        {
          tag: tagFilter || undefined,
          topic: topicFilter || undefined,
          openFollowUpsOnly: openOnly,
        },
        todos,
      ).filter((m) => {
        if (!seriesFilter) return true;
        const q = seriesFilter.toLowerCase();
        return m.seriesTag?.toLowerCase() === q;
      }),
    [sharedMeetings, tagFilter, topicFilter, openOnly, todos, seriesFilter],
  );

  const listMeetings = useMemo(() => {
    if (scope === "mine") return privateMeetings;
    if (scope === "shared") return sharedFilteredMeetings;
    return [...privateMeetings, ...sharedFilteredMeetings].sort(
      (a, b) => b.startedAt - a.startedAt,
    );
  }, [scope, privateMeetings, sharedFilteredMeetings]);

  const selectedMeeting = useMemo(
    () =>
      meetingId
        ? meetings.find((m) => m.id === meetingId) ??
          sharedMeetings.find((m) => m.id === meetingId) ??
          null
        : null,
    [meetingId, meetings, sharedMeetings],
  );

  const openFollowUps = useMemo(() => {
    if (!selectedMeeting) return 0;
    return todos.filter(
      (t) =>
        t.meetingId === selectedMeeting.id && todoStatusOf(t) !== "done",
    ).length;
  }, [selectedMeeting, todos]);

  const allTags = useMemo(() => collectAllTags(allMeetings), [allMeetings]);
  const allTopics = useMemo(
    () => collectAllTopics(allMeetings),
    [allMeetings],
  );
  const allSeriesTags = useMemo(() => {
    const set = new Set<string>();
    for (const m of allMeetings) {
      if (m.seriesTag) set.add(m.seriesTag);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allMeetings]);
  const series = useMemo(() => {
    if (seriesFilter) {
      const q = seriesFilter.toLowerCase();
      const seriesMeetings = allMeetings
        .filter((m) => m.seriesTag?.toLowerCase() === q)
        .sort((a, b) => b.startedAt - a.startedAt);
      const ids = new Set(seriesMeetings.map((m) => m.id));
      return {
        tag: seriesFilter,
        meetings: seriesMeetings,
        openTodos: todos.filter(
          (t) =>
            t.meetingId &&
            ids.has(t.meetingId) &&
            // Todo status can differ by Phase 9 `status` vs `completed`.
            todoStatusOf(t) !== "done",
        ),
      };
    }

    if (!tagFilter) return null;
    return getSeriesForTag(allMeetings, tagFilter, todos);
  }, [allMeetings, tagFilter, seriesFilter, todos]);

  const replaceParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const q = params.toString();
      router.replace(q ? `${MEETINGS_PATH}?${q}` : MEETINGS_PATH);
    },
    [router, searchParams],
  );

  const selectMeeting = (id: string) => {
    replaceParams({ id, view: null });
  };

  const clearSelection = () => {
    replaceParams({ id: null });
  };

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    setDeleteError(null);
    try {
      await removeMeeting(userId, pendingDelete.id);
      setPendingDelete(null);
      if (meetingId === pendingDelete.id) clearSelection();
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Could not delete this meeting.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const showListOnMobile = !meetingId;
  const showDetailOnMobile = Boolean(meetingId);

  if (hubView === "board") {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <MeetingsHubHeader
          scope={scope}
          onScopeChange={(s) => replaceParams({ scope: s, id: null })}
          hubView={hubView}
          onHubViewChange={(v) =>
            replaceParams({ view: v === "board" ? "board" : null, id: null })
          }
        />
        <MeetingFollowupsBoard userId={userId} />
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete meeting?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        busy={deletingId !== null}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deletingId) setPendingDelete(null);
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          className={`shrink-0 border-b border-zinc-200 lg:w-72 lg:border-b-0 lg:border-r dark:border-zinc-800 ${
            showDetailOnMobile ? "hidden lg:flex lg:flex-col" : "flex flex-col"
          }`}
        >
          <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 text-violet-600" />
              Meetings
            </h1>
            <p className="text-xs text-muted-foreground">
              Private & shared — transcript, follow-ups, cloud
            </p>
            <MeetingsHubHeader
              compact
              scope={scope}
              onScopeChange={(s) => replaceParams({ scope: s, id: null })}
              hubView={hubView}
              onHubViewChange={(v) =>
                replaceParams({ view: v === "board" ? "board" : null })
              }
            />
          </div>

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

          {allSeriesTags.length > 0 ? (
            <div className="flex flex-wrap gap-1 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => replaceParams({ series: null })}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  !seriesFilter
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600"
                }`}
              >
                All series
              </button>
              {allSeriesTags.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => replaceParams({ series: s })}
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    seriesFilter.toLowerCase() === s.toLowerCase()
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          {allTopics.length > 0 ? (
            <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground"
              >
                <span className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showFilters ? (
                <div className="mt-2 space-y-2">
                  <Select
                    value={topicFilter || "_all"}
                    onValueChange={(v) =>
                      replaceParams({ topic: v === "_all" ? null : v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Topic" />
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
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="meetings-open-only" className="text-xs">
                      Open follow-ups only
                    </Label>
                    <Switch
                      id="meetings-open-only"
                      checked={openOnly}
                      onCheckedChange={(on) =>
                        replaceParams({ open: on ? "1" : null })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {series && series.openTodos.length > 0 ? (
            <div className="border-b border-violet-200/60 bg-violet-50/40 px-3 py-2 text-xs dark:border-violet-900/40">
              Series “{series.tag}”: {series.openTodos.length} open
            </div>
          ) : null}

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {scope === "shared" && sharedFilteredMeetings.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">
                <Cloud className="mb-2 h-6 w-6 opacity-50" />
                <p>Shared meetings from friends will appear here.</p>
              </li>
            ) : listMeetings.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">
                No meetings yet. End a capture from Home.
              </li>
            ) : (
              listMeetings.map((m) => {
                const isShared = Boolean(
                  m.cloudSyncMeta?.ownerUid && m.cloudSyncMeta.ownerUid !== userId,
                );
                const active = meetingId === m.id;
                return (
                  <li
                    key={m.id}
                    className={`flex items-stretch ${
                      active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectMeeting(m.id)}
                      className="min-w-0 flex-1 px-3 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <p className="truncate font-medium">{m.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {format(m.startedAt, "MMM d, yyyy")}
                        {isShared ? " · shared" : ""}
                        {m.seriesTag ? ` · ${m.seriesTag}` : ""}
                        {meetingHasOpenFollowUps(m.id, todos)
                          ? " · open follow-ups"
                          : ""}
                        {m.aiSummary ? " · summarized" : ""}
                      </p>
                    </button>
                    {!isShared ? (
                      <button
                        type="button"
                        disabled={deletingId === m.id}
                        aria-label={`Delete ${m.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete({ id: m.id, title: m.title });
                        }}
                        className="shrink-0 px-2 text-zinc-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <div
          className={`min-h-0 flex-1 flex-col ${
            showListOnMobile ? "hidden lg:flex" : "flex"
          }`}
        >
          {selectedMeeting ? (
            <>
              <button
                type="button"
                onClick={clearSelection}
                className="border-b px-4 py-2 text-left text-sm text-violet-600 lg:hidden"
              >
                ← Back to list
              </button>
              <MeetingWorkspacePane
                userId={userId}
                meeting={selectedMeeting}
                openFollowUps={openFollowUps}
                busy={deletingId !== null}
                deleteError={deleteError}
                onDelete={() =>
                  setPendingDelete({
                    id: selectedMeeting.id,
                    title: selectedMeeting.title,
                  })
                }
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <Calendar className="h-10 w-10 opacity-40" />
              <p>Select a meeting to work the transcript and follow-ups.</p>
              <p className="text-xs">
                Use <strong className="font-medium">Mine</strong> for your
                captures and <strong className="font-medium">Shared</strong>{" "}
                when collaborators are added.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MeetingsHubHeader({
  scope,
  onScopeChange,
  hubView,
  onHubViewChange,
  compact = false,
}: {
  scope: MeetingsScope;
  onScopeChange: (scope: MeetingsScope) => void;
  hubView: HubView;
  onHubViewChange: (view: HubView) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${compact ? "mt-2" : "mt-3"}`}>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Meeting scope">
        {(
          [
            ["all", "All"],
            ["mine", "Mine"],
            ["shared", "Shared"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={scope === id}
            onClick={() => onScopeChange(id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              scope === id
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800"
            }`}
          >
            {id === "shared" ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {label}
              </span>
            ) : (
              label
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onHubViewChange("list")}
          className={`rounded-full px-2.5 py-1 text-xs ${
            hubView === "list"
              ? "bg-violet-600 text-white"
              : "border border-border"
          }`}
        >
          Meetings
        </button>
        <button
          type="button"
          onClick={() => onHubViewChange("board")}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
            hubView === "board"
              ? "bg-violet-600 text-white"
              : "border border-border"
          }`}
        >
          <ListTodo className="h-3 w-3" />
          All follow-ups
        </button>
      </div>
    </div>
  );
}
