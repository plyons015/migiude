import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { createId } from "@/lib/data/ids";
import {
  deleteLocalAppend,
  listLocalAppends,
  upsertLocalAppend,
} from "@/lib/data/local-db";
import type { MeetingAnchor, MeetingAppendRecord } from "@/lib/data/types";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";

function appendsCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "meetingAppends");
}

export function subscribeMeetingAppends(
  userId: string,
  meetingId: string,
  onData: (appends: MeetingAppendRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const col = appendsCollection(userId);

  void listLocalAppends(userId, meetingId).then(onData);

  if (!col || isLocalOnlyMode()) {
    return () => {};
  }

  const q = query(col, where("parentMeetingId", "==", meetingId));
  return onSnapshot(
    q,
    (snapshot) => {
      const appends = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as MeetingAppendRecord)
        .sort((a, b) => a.createdAt - b.createdAt);
      void Promise.all(appends.map((a) => upsertLocalAppend(userId, a))).then(
        () => onData(appends),
      );
    },
    (err) => onError?.(err),
  );
}

export async function saveMeetingAppend(
  userId: string,
  input: {
    parentMeetingId: string;
    body: string;
    anchor?: MeetingAnchor;
    id?: string;
  },
): Promise<MeetingAppendRecord> {
  const append: MeetingAppendRecord = {
    id: input.id ?? createId("append"),
    parentMeetingId: input.parentMeetingId,
    body: input.body.trim(),
    anchor: input.anchor,
    createdAt: Date.now(),
  };

  await upsertLocalAppend(userId, append);

  const col = appendsCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await setDoc(doc(col, append.id), {
      parentMeetingId: append.parentMeetingId,
      body: append.body,
      anchor: append.anchor ?? null,
      createdAt: append.createdAt,
    });
  }

  return append;
}

export async function removeMeetingAppend(
  userId: string,
  appendId: string,
): Promise<void> {
  await deleteLocalAppend(userId, appendId);
  const col = appendsCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await deleteDoc(doc(col, appendId));
  }
}
