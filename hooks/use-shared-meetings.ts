"use client";

import {
  subscribeSharedMeetings,
  type SharedMeetingRecord,
} from "@/lib/data/shared-meetings-store";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";
import { collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

export function useSharedMeetings(userId: string | null) {
  const [meetings, setMeetings] = useState<SharedMeetingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [groupIds, setGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setGroupIds([]);
      return;
    }
    if (isLocalOnlyMode()) {
      setGroupIds([]);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setGroupIds([]);
      return;
    }

    // membership docs are: groupWorkspaces/{groupId}/members/{uid}
    const q = query(
      collectionGroup(db, "members"),
      where("uid", "==", userId),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const ids = new Set<string>();
        for (const d of snap.docs) {
          const groupId = d.ref.parent.parent?.id;
          if (groupId) ids.add(groupId);
        }
        setGroupIds([...ids]);
      },
      (e) => setError(e.message),
    );

    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setMeetings([]);
      return;
    }
    return subscribeSharedMeetings(groupIds, setMeetings, (e) =>
      setError(e.message),
    );
  }, [groupIds, userId]);

  return { meetings, error, groupIds };
}

