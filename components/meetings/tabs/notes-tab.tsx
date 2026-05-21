"use client";

import type { MeetingRoomProps } from "@/components/meetings/meeting-room-shared";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveMeetingAppend, removeMeetingAppend } from "@/lib/data/appends-store";
import type { MeetingAnchor, MeetingAppendRecord } from "@/lib/data/types";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";

type NotesTabProps = MeetingRoomProps & {
  appends: MeetingAppendRecord[];
  segmentOptions: { id: string; label: string }[];
  topicOptions: { id: string; label: string }[];
  onJumpToSegment: (segmentId: string) => void;
};

export function NotesTab({
  userId,
  meeting,
  appends,
  segmentOptions,
  topicOptions,
  onJumpToSegment,
}: NotesTabProps) {
  const [body, setBody] = useState("");
  const [anchorType, setAnchorType] = useState<"none" | "segment" | "topic" | "highlight">(
    "none",
  );
  const [anchorId, setAnchorId] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    let anchor: MeetingAnchor | undefined;
    if (anchorType === "segment" && anchorId) {
      anchor = { type: "segment", id: anchorId };
    } else if (anchorType === "topic" && anchorId) {
      anchor = { type: "topic", id: anchorId };
    } else if (anchorType === "highlight" && anchorId) {
      anchor = { type: "highlight", id: anchorId };
    }
    await saveMeetingAppend(userId, {
      parentMeetingId: meeting.id,
      body: trimmed,
      anchor,
    });
    setBody("");
    setAnchorType("none");
    setAnchorId("");
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Linked appends stay separate from the canonical transcript. Optional
        anchors jump to transcript or topics.
      </p>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <Label>New append</Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Your follow-up note…"
          className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Select
            value={anchorType}
            onValueChange={(v) => {
              setAnchorType(v as typeof anchorType);
              setAnchorId("");
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Anchor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No anchor</SelectItem>
              <SelectItem value="segment">Transcript line</SelectItem>
              <SelectItem value="topic">Topic</SelectItem>
              <SelectItem value="highlight">Highlight</SelectItem>
            </SelectContent>
          </Select>
          {anchorType === "segment" && segmentOptions.length > 0 ? (
            <Select value={anchorId} onValueChange={setAnchorId}>
              <SelectTrigger className="h-8 min-w-40 text-xs">
                <SelectValue placeholder="Line" />
              </SelectTrigger>
              <SelectContent>
                {segmentOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {anchorType === "topic" && topicOptions.length > 0 ? (
            <Select value={anchorId} onValueChange={setAnchorId}>
              <SelectTrigger className="h-8 min-w-40 text-xs">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                {topicOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {anchorType === "highlight" &&
          meeting.highlights?.length ? (
            <Select value={anchorId} onValueChange={setAnchorId}>
              <SelectTrigger className="h-8 min-w-40 text-xs">
                <SelectValue placeholder="Highlight" />
              </SelectTrigger>
              <SelectContent>
                {meeting.highlights.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.text.slice(0, 40)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy || !body.trim()}
          onClick={() => void handleAdd()}
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add linked note
        </button>
      </div>

      <ul className="space-y-3">
        {appends.length === 0 ? (
          <li className="text-sm text-muted-foreground">No appends yet.</li>
        ) : (
          appends.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border p-3 text-sm"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(a.createdAt, "MMM d, HH:mm")}
                </span>
                <button
                  type="button"
                  aria-label="Delete append"
                  onClick={() => void removeMeetingAppend(userId, a.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{a.body}</p>
              {a.anchor?.type === "segment" ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-violet-600 underline dark:text-violet-400"
                  onClick={() => onJumpToSegment(a.anchor!.id)}
                >
                  Jump to transcript line
                </button>
              ) : null}
              {a.anchor?.type === "topic" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Linked to topic
                </p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
