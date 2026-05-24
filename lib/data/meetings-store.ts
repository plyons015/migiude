import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { createId } from "@/lib/data/ids";
import {
  deleteLocalMeeting,
  listLocalMeetings,
  upsertLocalMeeting,
} from "@/lib/data/local-db";
import type { MeetingRecord } from "@/lib/data/types";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";

function meetingsCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "meetings");
}

export function subscribeMeetings(
  userId: string,
  onData: (meetings: MeetingRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const col = meetingsCollection(userId);

  void listLocalMeetings(userId).then(onData);

  if (!col || isLocalOnlyMode()) {
    return () => {};
  }

  const q = query(col, orderBy("startedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const meetings = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as MeetingRecord,
      );
      void Promise.all(meetings.map((m) => upsertLocalMeeting(userId, m))).then(
        () => onData(meetings),
      );
    },
    (err) => onError?.(err),
  );
}

export async function saveMeeting(
  userId: string,
  meeting: MeetingRecord,
): Promise<MeetingRecord> {
  await upsertLocalMeeting(userId, meeting);

  const col = meetingsCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await setDoc(doc(col, meeting.id), meetingFirestorePayload(meeting));
  }

  return meeting;
}

export async function removeMeeting(
  userId: string,
  meetingId: string,
): Promise<void> {
  await deleteLocalMeeting(userId, meetingId);
  const col = meetingsCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await deleteDoc(doc(col, meetingId));
  }
}

export function createMeetingId(): string {
  return createId("meet");
}

function meetingFirestorePayload(meeting: MeetingRecord) {
  return {
    title: meeting.title,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
    transcript: meeting.transcript,
    canonicalNoteId: meeting.canonicalNoteId,
    tags: meeting.tags ?? [],
    highlights: meeting.highlights ?? [],
    aiSummary: meeting.aiSummary ?? null,
    segments: meeting.segments ?? [],
    speakers: meeting.speakers ?? [],
    topics: meeting.topics ?? [],
    agenda: meeting.agenda ?? null,
    minutes: meeting.minutes ?? null,
    templateId: meeting.templateId ?? null,
  };
}
