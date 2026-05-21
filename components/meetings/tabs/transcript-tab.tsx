"use client";

import type { MeetingRoomProps } from "@/components/meetings/meeting-room-shared";
import { HighlightsList } from "@/components/listen/highlights-list";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  parseTranscriptToSegments,
  speakerLabel,
  speakersFromSegments,
} from "@/lib/meetings/parse-transcript-segments";
import { speakerChipClass } from "@/lib/meetings/speaker-colors";
import type { TranscriptSegment } from "@/lib/data/types";
import { useEffect, useRef } from "react";

export function TranscriptTab({
  meeting,
  onSave,
  highlightSegmentId,
}: MeetingRoomProps) {
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const segments =
    meeting.segments?.length && meeting.segments.length > 0
      ? meeting.segments
      : parseTranscriptToSegments(meeting.transcript);

  const speakers =
    meeting.speakers?.length && meeting.speakers.length > 0
      ? meeting.speakers
      : speakersFromSegments(segments);

  useEffect(() => {
    if (!highlightSegmentId) return;
    segmentRefs.current[highlightSegmentId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [highlightSegmentId, segments.length]);

  const persist = async (
    nextSegments: TranscriptSegment[],
    nextSpeakers = speakers,
  ) => {
    await onSave({
      ...meeting,
      segments: nextSegments,
      speakers: nextSpeakers,
    });
  };

  const reassignSpeaker = async (segmentId: string, speakerId: number) => {
    const next = segments.map((s) =>
      s.id === segmentId ? { ...s, speakerId } : s,
    );
    await persist(next);
  };

  const updateSpeakerName = async (speakerId: number, displayName: string) => {
    const nextSpeakers = speakers.map((s) =>
      s.id === speakerId ? { ...s, displayName: displayName.trim() || s.displayName } : s,
    );
    await onSave({ ...meeting, segments, speakers: nextSpeakers });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Canonical transcript is preserved on the meeting record. Speaker labels
        and line edits apply to segments only.
      </p>

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
          segments.map((seg) => (
            <div
              key={seg.id}
              ref={(el) => {
                segmentRefs.current[seg.id] = el;
              }}
              className={`flex gap-2 rounded-lg border p-2 ${
                highlightSegmentId === seg.id
                  ? "border-violet-400 bg-violet-50/50 dark:bg-violet-950/30"
                  : "border-border"
              }`}
            >
              <Select
                value={String(seg.speakerId)}
                onValueChange={(v) =>
                  void reassignSpeaker(seg.id, Number(v))
                }
              >
                <SelectTrigger className="h-8 w-28 text-xs">
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
              <p className="min-w-0 flex-1 text-sm leading-relaxed">{seg.text}</p>
            </div>
          ))
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
