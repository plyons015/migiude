import { createId } from "@/lib/data/ids";
import type { MeetingSpeaker, TranscriptSegment } from "@/lib/data/types";

const SPEAKER_LINE = /^(?:speaker\s*)?(\d+)\s*:\s*(.+)$/i;

export function parseTranscriptToSegments(transcript: string): TranscriptSegment[] {
  const lines = transcript.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const segments: TranscriptSegment[] = [];

  for (const line of lines) {
    const match = line.match(SPEAKER_LINE);
    if (match) {
      segments.push({
        id: createId("seg"),
        speakerId: Number(match[1]),
        text: match[2].trim(),
      });
      continue;
    }
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      last.text = `${last.text} ${line}`.trim();
    } else {
      segments.push({
        id: createId("seg"),
        speakerId: 1,
        text: line,
      });
    }
  }

  return segments;
}

export function speakersFromSegments(
  segments: TranscriptSegment[],
  existing?: MeetingSpeaker[],
): MeetingSpeaker[] {
  const ids = [...new Set(segments.map((s) => s.speakerId))].sort(
    (a, b) => a - b,
  );
  return ids.map((id) => {
    const prev = existing?.find((s) => s.id === id);
    return (
      prev ?? {
        id,
        displayName: `Speaker ${id}`,
      }
    );
  });
}

export function speakerLabel(
  speakerId: number,
  speakers?: MeetingSpeaker[],
): string {
  return (
    speakers?.find((s) => s.id === speakerId)?.displayName ?? `Speaker ${speakerId}`
  );
}

export function buildTranscriptFromSegments(
  segments: TranscriptSegment[],
  speakers?: MeetingSpeaker[],
): string {
  return segments
    .map((s) => `${speakerLabel(s.speakerId, speakers)}: ${s.text}`)
    .join("\n");
}
