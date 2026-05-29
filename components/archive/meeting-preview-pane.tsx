"use client";

import { Badge } from "@/components/ui/badge";
import { archiveUrl } from "@/lib/archive/routes";
import { meetingsUrl } from "@/lib/meetings/routes";
import type { MeetingRecord } from "@/lib/data/types";
import { format } from "date-fns";
import { Calendar, FileText, ListTodo, Trash2 } from "lucide-react";
import Link from "next/link";

type MeetingPreviewPaneProps = {
  meeting: MeetingRecord;
  openFollowUps: number;
  busy: boolean;
  deleteError: string | null;
  onDelete: () => void;
};

export function MeetingPreviewPane({
  meeting,
  openFollowUps,
  busy,
  deleteError,
  onDelete,
}: MeetingPreviewPaneProps) {
  const summary =
    meeting.aiSummary?.trim() ||
    meeting.minutes?.trim()?.slice(0, 400) ||
    meeting.transcript?.trim().slice(0, 400) ||
    "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        <Calendar className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{meeting.title}</h2>
          <p className="text-sm text-muted-foreground">
            {format(meeting.startedAt, "MMM d, yyyy · HH:mm")}
            {meeting.endedAt ? ` – ${format(meeting.endedAt, "HH:mm")}` : ""}
          </p>
        </div>
      </div>

      {meeting.tags?.length ? (
        <div className="flex flex-wrap gap-1">
          {meeting.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      ) : null}

      {openFollowUps > 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-violet-700 dark:text-violet-300">
          <ListTodo className="h-4 w-4" />
          {openFollowUps} open follow-up{openFollowUps === 1 ? "" : "s"}
        </p>
      ) : null}

      {summary ? (
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {summary}
          {summary.length >= 400 ? "…" : ""}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No summary yet. Open the meeting room for transcript, script, and AI.
        </p>
      )}

      {deleteError ? (
        <p className="text-sm text-destructive" role="alert">
          {deleteError}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={meetingsUrl({ id: meeting.id, room: true })}
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Open meeting room
        </Link>
        {meeting.canonicalNoteId ? (
          <Link
            href={archiveUrl({
              filter: "notes",
              id: meeting.canonicalNoteId,
            })}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            Edit note
          </Link>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
