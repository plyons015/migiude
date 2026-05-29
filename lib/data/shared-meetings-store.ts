import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";
import type { MeetingRecord } from "@/lib/data/types";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";

export type SharedMeetingRecord = MeetingRecord & {
  sharedAt?: number;
  ownerUid?: string;
  groupId?: string;
};

/**
 * Subscribe to shared meetings from group workspaces the user belongs to.
 * v1: one listener per group workspace.
 */
export function subscribeSharedMeetings(
  groupIds: string[],
  onData: (meetings: SharedMeetingRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (isLocalOnlyMode()) {
    onData([]);
    return () => {};
  }

  const db = getFirebaseDb();
  if (!db || groupIds.length === 0) {
    onData([]);
    return () => {};
  }

  const byGroup = new Map<string, SharedMeetingRecord[]>();
  const unsubs: Unsubscribe[] = [];

  const publish = () => {
    const all = [...byGroup.values()].flat();
    all.sort((a, b) => b.startedAt - a.startedAt);
    onData(all);
  };

  for (const groupId of groupIds) {
    const col = collection(db, "groupWorkspaces", groupId, "meetings");
    const q = query(col, orderBy("startedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data(), groupId }) as SharedMeetingRecord,
        );
        byGroup.set(groupId, list);
        publish();
      },
      (e) => onError?.(e as unknown as Error),
    );
    unsubs.push(unsub);
  }

  return () => {
    for (const u of unsubs) u();
  };
}

