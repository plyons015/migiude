"use client";

import type { MeetingRoomProps } from "@/components/meetings/meeting-room-shared";
import { HighlightsList } from "@/components/listen/highlights-list";
import {
  TranscriptLineMenu,
  type TranscriptLineAction,
} from "@/components/meetings/transcript-line-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createId } from "@/lib/data/ids";
import { saveTodo } from "@/lib/data/todos-store";
import type {
  TranscriptHighlight,
  TranscriptSegment,
} from "@/lib/data/types";
import {
  parseTranscriptToSegments,
  speakerLabel,
  speakersFromSegments,
} from "@/lib/meetings/parse-transcript-segments";
import { speakerChipClass } from "@/lib/meetings/speaker-colors";
import { useEffect, useRef, useState } from "react";

export function TranscriptTab({
  userId,
  meeting,
  onSave,
  highlightSegmentId,
}: MeetingRoomProps) {
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [menuSegmentId, setMenuSegmentId] = useState<string | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const segments =
    meeting.segments?.length && meeting.segments.length > 0
      ? meeting.segments
      : parseTranscriptToSegments(meeting.transcript);

  const speakers =
    meeting.speakers?.length && meeting.speakers.length > 0
      ? meeting.speakers
      : speakersFromSegments(segments);

  const menuSegment = segments.find((s) => s.id === menuSegmentId) ?? null;

  useEffect(() => {
    if (!highlightSegmentId) return;
    segmentRefs.current[highlightSegmentId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [highlightSegmentId, segments.length]);

  const flash = (msg: string) => {
    setActionMsg(msg);
    window.setTimeout(() => setActionMsg(null), 2500);
  };

  const persist = async (
    nextSegments: TranscriptSegment[],
    nextSpeakers = speakers,
    nextHighlights = meeting.highlights,
  ) => {
    await onSave({
      ...meeting,
      segments: nextSegments,
      speakers: nextSpeakers,
      highlights: nextHighlights,
    });
  };

  const addHighlight = async (seg: TranscriptSegment, note?: string) => {
    const hl: TranscriptHighlight = {
      id: createId("hl"),
      text: seg.text,
      note,
      segmentId: seg.id,
      createdAt: Date.now(),
    };
    await persist(segments, speakers, [...(meeting.highlights ?? []), hl]);
    flash("Highlighted");
  };

  const addFollowUp = async (seg: TranscriptSegment, note?: string) => {
    const text = note ? `${seg.text} — ${note}` : seg.text;
    await saveTodo(userId, {
      text,
      meetingId: meeting.id,
      status: "open",
    });
    flash("Follow-up added");
  };

  const reassignSpeaker = async (segmentId: string, speakerId: number) => {
    const next = segments.map((s) =>
      s.id === segmentId ? { ...s, speakerId } : s,
    );
    await persist(next);
  };

  const updateSpeakerName = async (speakerId: number, displayName: string) => {
    const nextSpeakers = speakers.map((s) =>
      s.id === speakerId
        ? { ...s, displayName: displayName.trim() || s.displayName }
        : s,
    );
    await onSave({ ...meeting, segments, speakers: nextSpeakers });
  };

  const startEdit = (seg: TranscriptSegment) => {
    setEditingSegmentId(seg.id);
    setEditDraft(seg.text);
    setMenuSegmentId(null);
  };

  const saveEdit = async (segmentId: string) => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    const next = segments.map((s) =>
      s.id === segmentId ? { ...s, text: trimmed } : s,
    );
    await persist(next);
    setEditingSegmentId(null);
    setEditDraft("");
    flash("Line updated");
  };

  const handleLineAction = async (
    seg: TranscriptSegment,
    action: TranscriptLineAction,
    note?: string,
  ) => {
    switch (action) {
      case "highlight":
        await addHighlight(seg, note);
        break;
      case "todo":
        await addFollowUp(seg, note);
        break;
      case "both":
        await addHighlight(seg, note);
        await addFollowUp(seg, note);
        break;
      case "edit":
        startEdit(seg);
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Tap a line to highlight, add a follow-up, or edit text (e.g. replace
        names before AI). Speaker labels apply per line. The original capture
        stays read-only below.
      </p>

      {actionMsg ? (
        <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
          {actionMsg}
        </p>
      ) : null}

      {speakers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {speakers.map((sp) => (
            <div
              key={sp.id}
              className="flex items-center gap-2 rounded-lg border border-border px-2 py-1"
            >
              <span
                className={`rounded px-1 text-[10px] font-semibold ${speakerChipClass(sp.id)}`}
              >
                S{sp.id}
              </span>
              <input
                type="text"
                defaultValue={sp.displayName}
                onBlur={(e) => void updateSpeakerName(sp.id, e.target.value)}
                className="w-28 bg-transparent text-xs outline-none"
                aria-label={`Name for speaker ${sp.id}`}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        {segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transcript lines yet.</p>
        ) : (
          segments.map((seg) => {
            const isEditing = editingSegmentId === seg.id;
            const isMenuOpen = menuSegmentId === seg.id;
            const isJumpTarget = highlightSegmentId === seg.id;

            return (
              <div
                key={seg.id}
                ref={(el) => {
                  segmentRefs.current[seg.id] = el;
                }}
                className={`rounded-lg border p-2 ${
                  isJumpTarget || isMenuOpen
                    ? "border-violet-400 bg-violet-50/50 dark:bg-violet-950/30"
                    : "border-border"
                }`}
              >
                <div className="flex gap-2">
                  <Select
                    value={String(seg.speakerId)}
                    onValueChange={(v) =>
                      void reassignSpeaker(seg.id, Number(v))
                    }
                  >
                    <SelectTrigger className="h-8 w-28 shrink-0 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {speakers.map((sp) => (
                        <SelectItem key={sp.id} value={String(sp.id)}>
                          {speakerLabel(sp.id, speakers)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isEditing ? (
                    <div className="min-w-0 flex-1 space-y-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm leading-relaxed"
                        aria-label="Edit transcript line"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveEdit(seg.id)}
                          className="rounded-md bg-violet-600 px-2 py-1 text-xs font-medium text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSegmentId(null);
                            setEditDraft("");
                          }}
                          className="rounded-md border border-border px-2 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setMenuSegmentId(isMenuOpen ? null : seg.id)
                      }
                      className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left text-sm leading-relaxed hover:bg-muted/50"
                    >
                      {seg.text}
                    </button>
                  )}
                </div>

                {isMenuOpen && menuSegment ? (
                  <TranscriptLineMenu
                    segment={menuSegment}
                    onClose={() => setMenuSegmentId(null)}
                    onAction={(action, note) =>
                      void handleLineAction(seg, action, note)
                    }
                  />
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          View canonical transcript (read-only)
        </summary>
        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-dashed border-border p-3 text-xs leading-relaxed">
          {meeting.transcript || "(empty)"}
        </p>
      </details>

      {meeting.highlights?.length ? (
        <div>
          <Label className="text-xs text-muted-foreground">Highlights</Label>
          <HighlightsList highlights={meeting.highlights} />
        </div>
      ) : null}
    </div>
  );
}
