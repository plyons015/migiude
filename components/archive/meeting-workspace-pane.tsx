"use client";

import { AppendThread } from "@/components/collaboration/append-thread";
import { ShareModal } from "@/components/collaboration/share-modal";
import { NotesTab } from "@/components/meetings/tabs/notes-tab";
import { TranscriptTab } from "@/components/meetings/tabs/transcript-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMeetingAppends } from "@/hooks/use-meeting-appends";
import { useGroups } from "@/hooks/use-groups";
import {
  ensureGroupWorkspace,
  publishMeetingToGroupWorkspace,
} from "@/lib/collaboration/group-workspaces";
import {
  DEFAULT_CLOUD_META,
  type CloudSyncMeta,
  type CollaboratorAppend,
  type SharedWithEntry,
} from "@/lib/collaboration/types";
import {
  formatSyncStatus,
  placeholderCollaboratorAppends,
} from "@/lib/collaboration/placeholders";
import { FollowupsTab } from "@/components/meetings/tabs/followups-tab";
import { useTodos } from "@/hooks/use-todos";
import { saveMeeting } from "@/lib/data/meetings-store";
import type { MeetingRecord } from "@/lib/data/types";
import { meetingsUrl } from "@/lib/meetings/routes";
import {
  parseTranscriptToSegments,
  speakersFromSegments,
} from "@/lib/meetings/parse-transcript-segments";
import { format } from "date-fns";
import {
  Cloud,
  CloudUpload,
  ExternalLink,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type WorkspacePanel = "transcript" | "followups" | "appends" | "shared";

type MeetingWorkspacePaneProps = {
  userId: string;
  meeting: MeetingRecord;
  openFollowUps: number;
  busy: boolean;
  deleteError: string | null;
  onDelete: () => void;
};

export function MeetingWorkspacePane({
  userId,
  meeting,
  openFollowUps,
  busy,
  deleteError,
  onDelete,
}: MeetingWorkspacePaneProps) {
  const { appends } = useMeetingAppends(userId, meeting.id);
  const { todos } = useTodos(userId);
  const { groups } = useGroups(userId);
  const [panel, setPanel] = useState<WorkspacePanel>("transcript");
  const [highlightSegmentId, setHighlightSegmentId] = useState<string | null>(
    null,
  );
  const [segmentsReady, setSegmentsReady] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [cloudMeta, setCloudMeta] = useState<CloudSyncMeta>(() => {
    return meeting.cloudSyncMeta ?? DEFAULT_CLOUD_META(userId);
  });
  const [collabAppends, setCollabAppends] = useState<CollaboratorAppend[]>(() =>
    placeholderCollaboratorAppends(meeting.id),
  );
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const hasStructuredTranscript =
    Boolean(meeting.segments?.length) ||
    parseTranscriptToSegments(meeting.transcript).length > 0;

  const segmentOptions = useMemo(() => {
    const segments =
      meeting.segments?.length && meeting.segments.length > 0
        ? meeting.segments
        : parseTranscriptToSegments(meeting.transcript);
    return segments.slice(0, 40).map((s) => ({
      id: s.id,
      label: s.text.slice(0, 48) + (s.text.length > 48 ? "…" : ""),
    }));
  }, [meeting]);

  const topicOptions = useMemo(
    () =>
      (meeting.topics ?? []).map((t) => ({
        id: t.id,
        label: t.title,
      })),
    [meeting.topics],
  );

  const topicTitles = useMemo(
    () => meeting.topics?.map((t) => t.title) ?? [],
    [meeting.topics],
  );

  const meetingTodos = useMemo(
    () => todos.filter((t) => t.meetingId === meeting.id),
    [todos, meeting.id],
  );

  const onSave = useCallback(
    async (updated: MeetingRecord) => {
      await saveMeeting(userId, updated);
    },
    [userId],
  );

  // Keep local cloudMeta in sync with persisted meeting.cloudSyncMeta.
  useEffect(() => {
    setCloudMeta(meeting.cloudSyncMeta ?? DEFAULT_CLOUD_META(userId));
  }, [meeting.cloudSyncMeta, userId]);

  useEffect(() => {
    if (segmentsReady) return;
    if (meeting.segments?.length) {
      setSegmentsReady(true);
      return;
    }
    const segments = parseTranscriptToSegments(meeting.transcript);
    if (segments.length === 0) {
      setSegmentsReady(true);
      return;
    }
    void saveMeeting(userId, {
      ...meeting,
      segments,
      speakers: speakersFromSegments(segments, meeting.speakers),
      cloudSyncMeta: meeting.cloudSyncMeta ?? cloudMeta,
    }).then(() => setSegmentsReady(true));
  }, [meeting, userId, segmentsReady, cloudMeta]);

  const flash = (msg: string) => {
    setSyncMsg(msg);
    window.setTimeout(() => setSyncMsg(null), 3000);
  };

  const shareToCloud = () => {
    const next: CloudSyncMeta = {
      ...cloudMeta,
      isCloud: true,
      lastSyncedAt: Date.now(),
    };
    void saveMeeting(userId, { ...meeting, cloudSyncMeta: next }).then(() => {
      setCloudMeta(next);
      flash("Marked for cloud — Firestore sync saved.");
    });
  };

  const pushTranscriptToCloud = () => {
    if (!cloudMeta.isCloud) {
      flash("Share to cloud first, then push transcript.");
      return;
    }
    const next: CloudSyncMeta = { ...cloudMeta, lastSyncedAt: Date.now() };
    void saveMeeting(userId, { ...meeting, cloudSyncMeta: next }).then(() => {
      setCloudMeta(next);
      flash("Transcript queued for cloud upload (placeholder).");
    });
  };

  const roomProps = {
    userId,
    meeting,
    onSave,
    highlightSegmentId,
  };

  return (
    <>
      <ShareModal
        open={shareOpen}
        title={meeting.title}
        cloudMeta={cloudMeta}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        selectedGroupId={meeting.groupId ?? null}
        onClose={() => setShareOpen(false)}
        onShareToCloud={shareToCloud}
        onShareToGroup={(groupId) => {
          const group = groups.find((g) => g.id === groupId);
          const groupName = group?.name;
          const next: CloudSyncMeta = {
            ...cloudMeta,
            sharedWithGroups: [
              { groupId, groupName, permission: "view_append" },
            ],
          };
          void saveMeeting(userId, {
            ...meeting,
            groupId,
            cloudSyncMeta: next,
          }).then(() => {
            setCloudMeta(next);
            void ensureGroupWorkspace(
              userId,
              groupId,
              group?.memberUids ?? [],
            ).then(() =>
              publishMeetingToGroupWorkspace(userId, groupId, {
                ...meeting,
                groupId,
                cloudSyncMeta: next,
              }),
            );
            flash("Shared to group workspace.");
          });
        }}
        onAddCollaborator={(entry: SharedWithEntry) =>
          void saveMeeting(userId, {
            ...meeting,
            cloudSyncMeta: {
              ...cloudMeta,
              sharedWith: [...cloudMeta.sharedWith, entry],
            },
          }).then(() => {
            const next: CloudSyncMeta = {
              ...cloudMeta,
              sharedWith: [...cloudMeta.sharedWith, entry],
            };
            setCloudMeta(next);
          })
        }
        onSetPermission={(uid, permission) =>
          void saveMeeting(userId, {
            ...meeting,
            cloudSyncMeta: {
              ...cloudMeta,
              sharedWith: cloudMeta.sharedWith.map((e) =>
                e.uid === uid ? { ...e, permission } : e,
              ),
            },
          }).then(() => {
            const next: CloudSyncMeta = {
              ...cloudMeta,
              sharedWith: cloudMeta.sharedWith.map((e) =>
                e.uid === uid ? { ...e, permission } : e,
              ),
            };
            setCloudMeta(next);
          })
        }
        onRemoveCollaborator={(uid) =>
          void saveMeeting(userId, {
            ...meeting,
            cloudSyncMeta: {
              ...cloudMeta,
              sharedWith: cloudMeta.sharedWith.filter((e) => e.uid !== uid),
            },
          }).then(() => {
            const next: CloudSyncMeta = {
              ...cloudMeta,
              sharedWith: cloudMeta.sharedWith.filter((e) => e.uid !== uid),
            };
            setCloudMeta(next);
          })
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{meeting.title}</h2>
              <p className="text-xs text-muted-foreground">
                {format(meeting.startedAt, "MMM d, yyyy · HH:mm")}
                {openFollowUps > 0
                  ? ` · ${openFollowUps} open follow-up${openFollowUps === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                variant={cloudMeta.isCloud ? "default" : "secondary"}
                className="text-[10px]"
              >
                <Cloud className="mr-1 h-3 w-3" />
                {formatSyncStatus(cloudMeta)}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              disabled={!hasStructuredTranscript}
              onClick={pushTranscriptToCloud}
            >
              <CloudUpload className="h-3.5 w-3.5" />
              Send to cloud
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" asChild>
              <Link
                href={meetingsUrl({
                  id: meeting.id,
                  room: true,
                  tab: "transcript",
                })}
              >
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Full room
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-xs text-destructive"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>

          {syncMsg ? (
            <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
              {syncMsg}
            </p>
          ) : null}
          {deleteError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {deleteError}
            </p>
          ) : null}

          <div
            className="mt-3 flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="Meeting workspace"
          >
            {(
              [
                ["transcript", "Transcript"],
                ["followups", "Follow-ups"],
                ["appends", "Your appends"],
                ["shared", "Shared"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={panel === id}
                onClick={() => setPanel(id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  panel === id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {panel === "transcript" ? (
            <TranscriptTab {...roomProps} />
          ) : null}
          {panel === "followups" ? (
            <FollowupsTab
              {...roomProps}
              todos={meetingTodos}
              topicTitles={topicTitles}
            />
          ) : null}
          {panel === "appends" ? (
            <NotesTab
              {...roomProps}
              appends={appends}
              segmentOptions={segmentOptions}
              topicOptions={topicOptions}
              onJumpToSegment={(id) => {
                setHighlightSegmentId(id);
                setPanel("transcript");
              }}
            />
          ) : null}
          {panel === "shared" ? (
            <AppendThread
              appends={collabAppends}
              isOwner={cloudMeta.ownerUid === userId}
              canAppend={
                cloudMeta.isCloud &&
                cloudMeta.sharedWith.some((s) => s.permission === "view_append")
              }
              onAccept={(id) => {
                setCollabAppends((list) =>
                  list.map((a) =>
                    a.id === id ? { ...a, status: "accepted" as const } : a,
                  ),
                );
                flash("Accepted (local preview — merge ships later).");
              }}
              onIgnore={(id) => {
                setCollabAppends((list) =>
                  list.map((a) =>
                    a.id === id ? { ...a, status: "ignored" as const } : a,
                  ),
                );
              }}
              onSubmitAppend={(body) => {
                setCollabAppends((list) => [
                  ...list,
                  {
                    id: `append_${Date.now()}`,
                    authorUid: userId,
                    authorDisplayName: "You",
                    body,
                    createdAt: Date.now(),
                    status: "pending",
                  },
                ]);
                setCloudMeta((m) => ({
                  ...m,
                  pendingOfflineAppends: (m.pendingOfflineAppends ?? 0) + 1,
                }));
                flash("Append saved locally — cloud sync placeholder.");
              }}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
