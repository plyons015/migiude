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

const listenersByUser = new Map<string, Set<() => void>>();

function notifyMeetingsChanged(userId: string): void {
  const set = listenersByUser.get(userId);
  if (!set) return;
  for (const listener of set) listener();
}

function meetingsCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "meetings");
}

async function syncRemoteMeetingsToLocal(
  userId: string,
  remoteMeetings: MeetingRecord[],
): Promise<void> {
  const remoteIds = new Set(remoteMeetings.map((m) => m.id));
  const local = await listLocalMeetings(userId);
  await Promise.all(
    local
      .filter((m) => !remoteIds.has(m.id))
      .map((m) => deleteLocalMeeting(userId, m.id)),
  );
  await Promise.all(
    remoteMeetings.map((m) => upsertLocalMeeting(userId, m)),
  );
}

export function subscribeMeetings(
  userId: string,
  onData: (meetings: MeetingRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const refresh = () => {
    void listLocalMeetings(userId).then(onData);
  };

  refresh();

  let set = listenersByUser.get(userId);
  if (!set) {
    set = new Set();
    listenersByUser.set(userId, set);
  }
  set.add(refresh);

  const col = meetingsCollection(userId);
  if (!col || isLocalOnlyMode()) {
    return () => {
      set?.delete(refresh);
    };
  }

  const q = query(col, orderBy("startedAt", "desc"));
  const unsubFirestore = onSnapshot(
    q,
    (snapshot) => {
      const meetings = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as MeetingRecord,
      );
      void syncRemoteMeetingsToLocal(userId, meetings)
        .then(() => onData(meetings))
        .catch((err) =>
          onError?.(err instanceof Error ? err : new Error(String(err))),
        );
    },
    (err) => onError?.(err),
  );

  return () => {
    set?.delete(refresh);
    unsubFirestore();
  };
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

  notifyMeetingsChanged(userId);
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
  notifyMeetingsChanged(userId);
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
    seriesTag: meeting.seriesTag ?? null,
    groupId: meeting.groupId ?? null,
    cloudSyncMeta: meeting.cloudSyncMeta ?? null,
  };
}
