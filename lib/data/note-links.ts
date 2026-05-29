import { listLocalMeetings } from "@/lib/data/local-db";
import { saveNote } from "@/lib/data/notes-store";
import { saveMeeting } from "@/lib/data/meetings-store";
import type { MeetingRecord, NoteRecord } from "@/lib/data/types";

export async function linkNoteToMeeting(
  userId: string,
  note: NoteRecord,
  meetingId: string,
): Promise<NoteRecord> {
  return saveNote(userId, {
    ...note,
    meetingId,
    processingScope: "cloud",
  });
}

export async function unlinkNoteFromMeeting(
  userId: string,
  note: NoteRecord,
): Promise<NoteRecord> {
  return saveNote(userId, {
    ...note,
    meetingId: undefined,
    processingScope: "local",
  });
}

export async function setNoteSeriesTag(
  userId: string,
  note: NoteRecord,
  seriesTag: string | undefined,
): Promise<NoteRecord> {
  const trimmed = seriesTag?.trim();
  return saveNote(userId, {
    ...note,
    seriesTag: trimmed || undefined,
  });
}

/** Apply the same topic tag to a meeting when linking a series from a note. */
export async function setMeetingSeriesTag(
  userId: string,
  meeting: MeetingRecord,
  seriesTag: string | undefined,
): Promise<MeetingRecord> {
  const trimmed = seriesTag?.trim();
  const updated: MeetingRecord = {
    ...meeting,
    seriesTag: trimmed || undefined,
  };
  await saveMeeting(userId, updated);
  return updated;
}

export async function listMeetingsForNoteLink(
  userId: string,
): Promise<MeetingRecord[]> {
  const meetings = await listLocalMeetings(userId);
  return [...meetings].sort(
    (a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt),
  );
}
