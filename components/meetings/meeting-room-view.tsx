"use client";

import { ExportMeetingButton } from "@/components/meetings/export-meeting-button";
import { MeetingTabNav } from "@/components/meetings/meeting-tab-nav";
import {
  parseMeetingTab,
  type MeetingTabId,
} from "@/components/meetings/meeting-tab-types";
import { AskTab } from "@/components/meetings/tabs/ask-tab";
import { FollowupsTab } from "@/components/meetings/tabs/followups-tab";
import { NotesTab } from "@/components/meetings/tabs/notes-tab";
import { ScriptTab } from "@/components/meetings/tabs/script-tab";
import { SummaryTab } from "@/components/meetings/tabs/summary-tab";
import { TopicsTab } from "@/components/meetings/tabs/topics-tab";
import { TranscriptTab } from "@/components/meetings/tabs/transcript-tab";
import { Badge } from "@/components/ui/badge";
import { useMeetingAppends } from "@/hooks/use-meeting-appends";
import { useMeetings } from "@/hooks/use-meetings";
import { useSharedMeetings } from "@/hooks/use-shared-meetings";
import { useTodos } from "@/hooks/use-todos";
import { archiveUrl } from "@/lib/archive/routes";
import { saveMeeting } from "@/lib/data/meetings-store";
import type { MeetingRecord } from "@/lib/data/types";
import {
  parseTranscriptToSegments,
  speakersFromSegments,
} from "@/lib/meetings/parse-transcript-segments";
import { format } from "date-fns";
import { FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type MeetingRoomViewProps = {
  userId: string;
  meetingId: string;
};

export function MeetingRoomView({ userId, meetingId }: MeetingRoomViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseMeetingTab(searchParams.get("tab"));
  const { meetings } = useMeetings(userId);
  const { meetings: sharedMeetings } = useSharedMeetings(userId);
  const { todos } = useTodos(userId);
  const { appends } = useMeetingAppends(userId, meetingId);
  const [highlightSegmentId, setHighlightSegmentId] = useState<string | null>(
    null,
  );
  const [segmentsReady, setSegmentsReady] = useState(false);

  const allMeetings = useMemo(
    () => [...meetings, ...sharedMeetings],
    [meetings, sharedMeetings],
  );

  const meeting = allMeetings.find((m) => m.id === meetingId);

  const isOwner = meeting?.cloudSyncMeta?.ownerUid
    ? meeting.cloudSyncMeta.ownerUid === userId
    : true;

  const setTab = useCallback(
    (next: MeetingTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("id", meetingId);
      params.set("tab", next);
      router.replace(`/meetings/?${params.toString()}`);
    },
    [router, searchParams, meetingId],
  );

  const onSave = useCallback(
    async (updated: MeetingRecord) => {
      if (!isOwner) return;
      await saveMeeting(userId, updated);
    },
    [isOwner, userId],
  );

  useEffect(() => {
    if (!meeting || segmentsReady) return;
    if (meeting.segments?.length) {
      setSegmentsReady(true);
      return;
    }
    const segments = parseTranscriptToSegments(meeting.transcript);
    if (segments.length === 0) {
      setSegmentsReady(true);
      return;
    }
    if (!isOwner) {
      setSegmentsReady(true);
      return;
    }
    void saveMeeting(userId, {
      ...meeting,
      segments,
      speakers: speakersFromSegments(segments, meeting.speakers),
    }).then(() => setSegmentsReady(true));
  }, [meeting, isOwner, userId, segmentsReady]);

  const segmentOptions = useMemo(() => {
    if (!meeting) return [];
    const segs =
      meeting.segments?.length && meeting.segments.length > 0
        ? meeting.segments
        : parseTranscriptToSegments(meeting.transcript);
    return segs.slice(0, 40).map((s) => ({
      id: s.id,
      label: s.text.slice(0, 48) + (s.text.length > 48 ? "…" : ""),
    }));
  }, [meeting]);

  const topicTitles = useMemo(
    () => meeting?.topics?.map((t) => t.title) ?? [],
    [meeting?.topics],
  );

  if (!meeting) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const durationMin = Math.max(
    1,
    Math.round((meeting.endedAt - meeting.startedAt) / 60_000),
  );

  const roomProps = {
    userId,
    meeting,
    onSave,
    highlightSegmentId,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b border-border p-4">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">
            {meeting.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(meeting.startedAt, "MMM d, yyyy HH:mm")} · {durationMin}{" "}
            min
          </p>
          {meeting.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {meeting.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={archiveUrl({
              filter: "notes",
              id: meeting.canonicalNoteId,
            })}
            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 underline dark:text-violet-400"
          >
            <FileText className="h-4 w-4" />
            Canonical note
          </Link>
          <ExportMeetingButton userId={userId} meeting={meeting} />
        </div>
        <MeetingTabNav active={tab} onChange={setTab} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "transcript" ? (
          <TranscriptTab {...roomProps} />
        ) : null}
        {tab === "summary" ? (
          <SummaryTab {...roomProps} appends={appends} todos={todos} />
        ) : null}
        {tab === "notes" ? (
          <NotesTab
            {...roomProps}
            appends={appends}
            segmentOptions={segmentOptions}
            topicOptions={
              meeting.topics?.map((t) => ({ id: t.id, label: t.title })) ?? []
            }
            onJumpToSegment={(id) => {
              setHighlightSegmentId(id);
              setTab("transcript");
            }}
          />
        ) : null}
        {tab === "script" ? (
          <ScriptTab {...roomProps} appends={appends} todos={todos} />
        ) : null}
        {tab === "followups" ? (
          <FollowupsTab
            {...roomProps}
            todos={todos}
            topicTitles={topicTitles}
          />
        ) : null}
        {tab === "topics" ? (
          <TopicsTab {...roomProps} appends={appends} todos={todos} />
        ) : null}
        {tab === "ask" ? (
          <AskTab {...roomProps} appends={appends} todos={todos} />
        ) : null}
      </div>
    </div>
  );
}
