import {
  deleteLocalGroup,
  listLocalGroups,
  upsertLocalGroup,
} from "@/lib/data/local-db";
import type { GroupRecord } from "@/lib/groups/types";
import { createId } from "@/lib/data/ids";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe as FirestoreUnsubscribe,
} from "firebase/firestore";

type Unsubscribe = () => void;

const listenersByUser = new Map<string, Set<() => void>>();

function notifyGroupsChanged(userId: string): void {
  const set = listenersByUser.get(userId);
  if (!set) return;
  for (const listener of set) listener();
}

function groupsCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "groups");
}

async function syncRemoteGroupsToLocal(
  userId: string,
  remoteGroups: GroupRecord[],
): Promise<void> {
  const remoteIds = new Set(remoteGroups.map((g) => g.id));
  const local = await listLocalGroups(userId);
  await Promise.all(
    local
      .filter((g) => !remoteIds.has(g.id))
      .map((g) => deleteLocalGroup(userId, g.id)),
  );
  await Promise.all(remoteGroups.map((g) => upsertLocalGroup(userId, g)));
}

export function subscribeGroups(
  userId: string,
  onData: (groups: GroupRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const refresh = () => {
    void listLocalGroups(userId)
      .then(onData)
      .catch((err) =>
        onError?.(err instanceof Error ? err : new Error(String(err))),
      );
  };

  refresh();

  let set = listenersByUser.get(userId);
  if (!set) {
    set = new Set();
    listenersByUser.set(userId, set);
  }

  set.add(refresh);

  const col = groupsCollection(userId);
  let unsubFirestore: FirestoreUnsubscribe | null = null;
  if (col && !isLocalOnlyMode()) {
    const q = query(col, orderBy("updatedAt", "desc"));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const groups = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as GroupRecord,
        );
        void syncRemoteGroupsToLocal(userId, groups)
          .then(() => onData(groups))
          .catch((err) =>
            onError?.(err instanceof Error ? err : new Error(String(err))),
          );
      },
      (err) => onError?.(err),
    );
  }

  return () => {
    set?.delete(refresh);
    unsubFirestore?.();
  };
}

export async function saveGroup(
  userId: string,
  input: {
    name: string;
    friendIds: string[];
    memberUids?: string[];
    id?: string;
  },
): Promise<GroupRecord> {
  const now = Date.now();
  const group: GroupRecord = {
    id: input.id ?? createId("group"),
    name: input.name.trim(),
    friendIds: input.friendIds,
    memberUids: input.memberUids ?? [],
    createdAt: now,
    updatedAt: now,
  };

  // If editing an existing group, preserve createdAt.
  const existing = await listLocalGroups(userId);
  const existingMatch = existing.find((g) => g.id === group.id);
  if (existingMatch) {
    group.createdAt = existingMatch.createdAt;
  }

  await upsertLocalGroup(userId, group);

  const col = groupsCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await setDoc(doc(col, group.id), {
      name: group.name,
      friendIds: group.friendIds,
      memberUids: group.memberUids,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  }

  notifyGroupsChanged(userId);
  return group;
}

export async function removeGroup(
  userId: string,
  groupId: string,
): Promise<void> {
  await deleteLocalGroup(userId, groupId);

  const col = groupsCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await deleteDoc(doc(col, groupId));
  }

  notifyGroupsChanged(userId);
}

