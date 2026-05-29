import type {
  LocalVault,
  MeetingAppendRecord,
  MeetingRecord,
  NoteRecord,
  TodoRecord,
} from "@/lib/data/types";
import type { FriendRecord, GroupRecord } from "@/lib/groups/types";

const DB_NAME = "migiude-offline";
const DB_VERSION = 3;
const STORE = "vault";

function vaultKey(userId: string): string {
  return `user:${userId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function readVault(userId: string): Promise<LocalVault> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const request = store.get(vaultKey(userId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const raw = request.result as LocalVault | undefined;
      resolve({
        notes: raw?.notes ?? [],
        todos: raw?.todos ?? [],
        meetings: raw?.meetings ?? [],
        appends: raw?.appends ?? [],
        friends: raw?.friends ?? [],
        groups: raw?.groups ?? [],
      });
    };
  });
}

async function writeVault(userId: string, vault: LocalVault): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const request = store.put(vault, vaultKey(userId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function listLocalNotes(userId: string): Promise<NoteRecord[]> {
  const vault = await readVault(userId);
  return [...vault.notes].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertLocalNote(
  userId: string,
  note: NoteRecord,
): Promise<void> {
  const vault = await readVault(userId);
  const idx = vault.notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) vault.notes[idx] = note;
  else vault.notes.push(note);
  await writeVault(userId, vault);
}

export async function deleteLocalNote(
  userId: string,
  noteId: string,
): Promise<void> {
  const vault = await readVault(userId);
  vault.notes = vault.notes.filter((n) => n.id !== noteId);
  await writeVault(userId, vault);
}

export async function listLocalTodos(userId: string): Promise<TodoRecord[]> {
  const vault = await readVault(userId);
  return [...vault.todos].sort((a, b) => b.createdAt - a.createdAt);
}

export async function upsertLocalTodo(
  userId: string,
  todo: TodoRecord,
): Promise<void> {
  const vault = await readVault(userId);
  const idx = vault.todos.findIndex((t) => t.id === todo.id);
  if (idx >= 0) vault.todos[idx] = todo;
  else vault.todos.push(todo);
  await writeVault(userId, vault);
}

export async function deleteLocalTodo(
  userId: string,
  todoId: string,
): Promise<void> {
  const vault = await readVault(userId);
  vault.todos = vault.todos.filter((t) => t.id !== todoId);
  await writeVault(userId, vault);
}

export async function listLocalMeetings(
  userId: string,
): Promise<MeetingRecord[]> {
  const vault = await readVault(userId);
  return [...vault.meetings].sort((a, b) => b.startedAt - a.startedAt);
}

export async function upsertLocalMeeting(
  userId: string,
  meeting: MeetingRecord,
): Promise<void> {
  const vault = await readVault(userId);
  const idx = vault.meetings.findIndex((m) => m.id === meeting.id);
  if (idx >= 0) vault.meetings[idx] = meeting;
  else vault.meetings.push(meeting);
  await writeVault(userId, vault);
}

export async function deleteLocalMeeting(
  userId: string,
  meetingId: string,
): Promise<void> {
  const vault = await readVault(userId);
  vault.meetings = vault.meetings.filter((m) => m.id !== meetingId);
  vault.appends = vault.appends.filter((a) => a.parentMeetingId !== meetingId);
  await writeVault(userId, vault);
}

export async function listLocalAppends(
  userId: string,
  meetingId?: string,
): Promise<MeetingAppendRecord[]> {
  const vault = await readVault(userId);
  const list = vault.appends ?? [];
  const filtered = meetingId
    ? list.filter((a) => a.parentMeetingId === meetingId)
    : list;
  return [...filtered].sort((a, b) => a.createdAt - b.createdAt);
}

export async function upsertLocalAppend(
  userId: string,
  append: MeetingAppendRecord,
): Promise<void> {
  const vault = await readVault(userId);
  if (!vault.appends) vault.appends = [];
  const idx = vault.appends.findIndex((a) => a.id === append.id);
  if (idx >= 0) vault.appends[idx] = append;
  else vault.appends.push(append);
  await writeVault(userId, vault);
}

export async function deleteLocalAppend(
  userId: string,
  appendId: string,
): Promise<void> {
  const vault = await readVault(userId);
  vault.appends = (vault.appends ?? []).filter((a) => a.id !== appendId);
  await writeVault(userId, vault);
}

export async function listLocalFriends(userId: string): Promise<FriendRecord[]> {
  const vault = await readVault(userId);
  return [...vault.friends].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertLocalFriend(
  userId: string,
  friend: FriendRecord,
): Promise<void> {
  const vault = await readVault(userId);
  const idx = vault.friends.findIndex((f) => f.id === friend.id);
  if (idx >= 0) vault.friends[idx] = friend;
  else vault.friends.push(friend);
  await writeVault(userId, vault);
}

export async function deleteLocalFriend(
  userId: string,
  friendId: string,
): Promise<void> {
  const vault = await readVault(userId);
  vault.friends = vault.friends.filter((f) => f.id !== friendId);
  vault.groups = vault.groups.map((g) => ({
    ...g,
    friendIds: g.friendIds.filter((id) => id !== friendId),
  }));
  await writeVault(userId, vault);
}

export async function listLocalGroups(userId: string): Promise<GroupRecord[]> {
  const vault = await readVault(userId);
  return [...vault.groups].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertLocalGroup(
  userId: string,
  group: GroupRecord,
): Promise<void> {
  const vault = await readVault(userId);
  const idx = vault.groups.findIndex((g) => g.id === group.id);
  if (idx >= 0) vault.groups[idx] = group;
  else vault.groups.push(group);
  await writeVault(userId, vault);
}

export async function deleteLocalGroup(
  userId: string,
  groupId: string,
): Promise<void> {
  const vault = await readVault(userId);
  vault.groups = vault.groups.filter((g) => g.id !== groupId);
  await writeVault(userId, vault);
}

/** Wipe all offline notes/todos/meetings (privacy action). */
export function clearAllLocalData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
