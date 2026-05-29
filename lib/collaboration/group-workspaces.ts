import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";
import type { MeetingRecord } from "@/lib/data/types";
import {
  collection,
  doc,
  setDoc,
  type Firestore,
} from "firebase/firestore";

function requireDb(): Firestore | null {
  if (isLocalOnlyMode()) return null;
  return getFirebaseDb();
}

/**
 * Ensure the group workspace exists and member docs exist.
 * v1 rules: owner can write; members can read.
 */
export async function ensureGroupWorkspace(
  ownerUid: string,
  groupId: string,
  memberUids: string[],
): Promise<void> {
  const db = requireDb();
  if (!db) return;

  await setDoc(
    doc(db, "groupWorkspaces", groupId),
    { ownerUid, updatedAt: Date.now() },
    { merge: true },
  );

  // Always include owner.
  const set = new Set<string>([ownerUid, ...memberUids]);
  await Promise.all(
    [...set].map((uid) =>
      setDoc(
        doc(db, "groupWorkspaces", groupId, "members", uid),
        { uid, addedAt: Date.now() },
        { merge: true },
      ),
    ),
  );
}

/**
 * Publish a meeting snapshot into a group workspace.
 * v1: copy the meeting doc as-is (owner-only writes).
 */
export async function publishMeetingToGroupWorkspace(
  ownerUid: string,
  groupId: string,
  meeting: MeetingRecord,
): Promise<void> {
  const db = requireDb();
  if (!db) return;

  const col = collection(db, "groupWorkspaces", groupId, "meetings");
  await setDoc(doc(col, meeting.id), {
    ...meeting,
    ownerUid,
    sharedAt: Date.now(),
  });
}

