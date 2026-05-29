import {
  deleteLocalFriend,
  listLocalFriends,
  upsertLocalFriend,
} from "@/lib/data/local-db";
import type { FriendRecord } from "@/lib/groups/types";
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

function notifyFriendsChanged(userId: string): void {
  const set = listenersByUser.get(userId);
  if (!set) return;
  for (const listener of set) listener();
}

function friendsCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "friends");
}

async function syncRemoteFriendsToLocal(
  userId: string,
  remoteFriends: FriendRecord[],
): Promise<void> {
  const remoteIds = new Set(remoteFriends.map((f) => f.id));
  const local = await listLocalFriends(userId);
  await Promise.all(
    local
      .filter((f) => !remoteIds.has(f.id))
      .map((f) => deleteLocalFriend(userId, f.id)),
  );
  await Promise.all(remoteFriends.map((f) => upsertLocalFriend(userId, f)));
}

export function subscribeFriends(
  userId: string,
  onData: (friends: FriendRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const refresh = () => {
    void listLocalFriends(userId)
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

  const col = friendsCollection(userId);
  let unsubFirestore: FirestoreUnsubscribe | null = null;
  if (col && !isLocalOnlyMode()) {
    const q = query(col, orderBy("updatedAt", "desc"));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const friends = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as FriendRecord,
        );
        void syncRemoteFriendsToLocal(userId, friends)
          .then(() => onData(friends))
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

export async function saveFriend(
  userId: string,
  input: { email: string; displayName?: string; id?: string },
): Promise<FriendRecord> {
  const now = Date.now();
  const friend: FriendRecord = {
    id: input.id ?? createId("friend"),
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await upsertLocalFriend(userId, friend);

  const col = friendsCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await setDoc(doc(col, friend.id), {
      email: friend.email,
      displayName: friend.displayName ?? null,
      uid: friend.uid ?? null,
      createdAt: friend.createdAt,
      updatedAt: friend.updatedAt,
    });
  }

  notifyFriendsChanged(userId);
  return friend;
}

export async function removeFriend(
  userId: string,
  friendId: string,
): Promise<void> {
  await deleteLocalFriend(userId, friendId);

  const col = friendsCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await deleteDoc(doc(col, friendId));
  }

  notifyFriendsChanged(userId);
}

