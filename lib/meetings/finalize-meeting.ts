import {
  parseTranscriptToSegments,
  speakersFromSegments,
} from "@/lib/meetings/parse-transcript-segments";
import { resolveMeetingTemplate } from "@/lib/meetings/custom-templates-store";
import { saveMeeting } from "@/lib/data/meetings-store";
import { saveNote } from "@/lib/data/notes-store";
import type { MeetingRecord, TranscriptHighlight } from "@/lib/data/types";
import { buildTemplateMinutesScaffold } from "@/lib/meetings/templates";

export type FinalizeMeetingInput = {
  meetingId: string;
  title: string;
  startedAt: number;
  transcript: string;
  tags?: string[];
  highlights?: TranscriptHighlight[];
  agenda?: string;
  templateId?: string;
};

export type FinalizeMeetingResult = {
  meeting: MeetingRecord;
  noteId: string;
};

export async function finalizeMeeting(
  userId: string,
  input: FinalizeMeetingInput,
): Promise<FinalizeMeetingResult> {
  const endedAt = Date.now();
  const transcript = input.transcript.trim();
  const title = input.title.trim() || "Meeting";
  const template = input.templateId
    ? resolveMeetingTemplate(input.templateId, userId)
    : undefined;

  const note = await saveNote(userId, {
    title: title || "Meeting notes",
    body: transcript,
    transcript,
    source: "meeting",
    meetingId: input.meetingId,
    tags: input.tags?.length ? input.tags : undefined,
    highlights: input.highlights?.length ? input.highlights : undefined,
  });

  const segments = parseTranscriptToSegments(transcript);
  const speakers =
    segments.length > 0 ? speakersFromSegments(segments) : undefined;

  const minutes = template
    ? buildTemplateMinutesScaffold(template, title)
    : undefined;

  const meeting: MeetingRecord = {
    id: input.meetingId,
    title,
    startedAt: input.startedAt,
    endedAt,
    transcript,
    canonicalNoteId: note.id,
    tags: input.tags?.length ? input.tags : undefined,
    highlights: input.highlights?.length ? input.highlights : undefined,
    segments: segments.length > 0 ? segments : undefined,
    speakers,
    agenda: input.agenda?.trim() || undefined,
    templateId: input.templateId,
    minutes,
  };

  await saveMeeting(userId, meeting);

  return {
    meeting,
    noteId: note.id,
  };
}
