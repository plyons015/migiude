"use client";

import { ConnectMeetingDialog } from "@/components/archive/connect-meeting-dialog";
import {
  linkNoteToMeeting,
  setMeetingSeriesTag,
  setNoteSeriesTag,
  unlinkNoteFromMeeting,
} from "@/lib/data/note-links";
import type { MeetingRecord, NoteRecord } from "@/lib/data/types";
import { meetingsUrl } from "@/lib/meetings/routes";
import { Link2, Tag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type NoteLinksBarProps = {
  userId: string;
  note: NoteRecord | null;
  meetings: MeetingRecord[];
  onNoteUpdated: (note: NoteRecord) => void;
};

export function NoteLinksBar({
  userId,
  note,
  meetings,
  onNoteUpdated,
}: NoteLinksBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!note?.id) return null;

  const linkedMeeting = note.meetingId
    ? meetings.find((m) => m.id === note.meetingId)
    : null;

  async function handleConnect(
    meetingId: string,
    seriesTag?: string,
    applySeriesToMeeting?: boolean,
  ) {
    setBusy(true);
    try {
      let updated = await linkNoteToMeeting(userId, note!, meetingId);
      if (seriesTag) {
        updated = await setNoteSeriesTag(userId, updated, seriesTag);
        if (applySeriesToMeeting) {
          const meeting = meetings.find((m) => m.id === meetingId);
          if (meeting) await setMeetingSeriesTag(userId, meeting, seriesTag);
        }
      }
      onNoteUpdated(updated);
      setDialogOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      const updated = await unlinkNoteFromMeeting(userId, note!);
      onNoteUpdated(updated);
      setDialogOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleSeriesOnly(seriesTag: string) {
    setBusy(true);
    try {
      const updated = await setNoteSeriesTag(userId, note!, seriesTag);
      onNoteUpdated(updated);
      setDialogOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ConnectMeetingDialog
        open={dialogOpen}
        meetings={meetings}
        currentMeetingId={note.meetingId}
        currentSeriesTag={note.seriesTag}
        busy={busy}
        onClose={() => setDialogOpen(false)}
        onConnect={(id, tag, apply) => void handleConnect(id, tag, apply)}
        onDisconnect={() => void handleDisconnect()}
        onSeriesOnly={(tag) => {
          if (tag) void handleSeriesOnly(tag);
        }}
      />
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs">
        {linkedMeeting ? (
          <Link
            href={meetingsUrl({ id: linkedMeeting.id })}
            className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200"
          >
            <Link2 className="h-3 w-3" />
            {linkedMeeting.title}
          </Link>
        ) : null}
        {note.seriesTag ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <Tag className="h-3 w-3" />
            {note.seriesTag}
          </span>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => setDialogOpen(true)}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-medium hover:bg-accent"
        >
          <Link2 className="h-3 w-3" />
          {linkedMeeting ? "Change link" : "Connect to meeting"}
        </button>
      </div>
    </>
  );
}
