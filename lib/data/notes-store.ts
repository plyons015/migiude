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
  deleteLocalNote,
  listLocalNotes,
  upsertLocalNote,
} from "@/lib/data/local-db";
import type { NoteRecord } from "@/lib/data/types";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isLocalOnlyMode } from "@/lib/settings/preferences";

const listenersByUser = new Map<string, Set<() => void>>();

function notifyNotesChanged(userId: string): void {
  const set = listenersByUser.get(userId);
  if (!set) return;
  for (const listener of set) listener();
}

function notesCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "notes");
}

/** Drop local copies removed from Firestore so deletes do not reappear offline. */
async function syncRemoteNotesToLocal(
  userId: string,
  remoteNotes: NoteRecord[],
): Promise<void> {
  const remoteIds = new Set(remoteNotes.map((n) => n.id));
  const local = await listLocalNotes(userId);
  await Promise.all(
    local
      .filter((n) => !remoteIds.has(n.id))
      .map((n) => deleteLocalNote(userId, n.id)),
  );
  await Promise.all(remoteNotes.map((n) => upsertLocalNote(userId, n)));
}

export async function listNotes(userId: string): Promise<NoteRecord[]> {
  return listLocalNotes(userId);
}

export async function findNoteByMeetingId(
  userId: string,
  meetingId: string,
): Promise<NoteRecord | undefined> {
  const notes = await listLocalNotes(userId);
  return notes.find((n) => n.meetingId === meetingId);
}

export function subscribeNotes(
  userId: string,
  onData: (notes: NoteRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const refresh = () => {
    void listLocalNotes(userId).then(onData);
  };

  refresh();

  let set = listenersByUser.get(userId);
  if (!set) {
    set = new Set();
    listenersByUser.set(userId, set);
  }
  set.add(refresh);

  const col = notesCollection(userId);
  if (!col || isLocalOnlyMode()) {
    return () => {
      set?.delete(refresh);
    };
  }

  const q = query(col, orderBy("updatedAt", "desc"));
  const unsubFirestore = onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as NoteRecord,
      );
      void syncRemoteNotesToLocal(userId, notes)
        .then(() => onData(notes))
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

export async function saveNote(
  userId: string,
  input: Omit<NoteRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: number;
  },
): Promise<NoteRecord> {
  const now = Date.now();
  const note: NoteRecord = {
    id: input.id ?? createId("note"),
    title: input.title,
    body: input.body,
    transcript: input.transcript,
    mindMapSource: input.mindMapSource,
    source: input.source,
    meetingId: input.meetingId,
    seriesTag: input.seriesTag,
    groupId: input.groupId,
    processingScope: input.processingScope,
    cloudSyncMeta: input.cloudSyncMeta,
    tags: input.tags?.length ? input.tags : undefined,
    highlights: input.highlights?.length ? input.highlights : undefined,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  await upsertLocalNote(userId, note);

  const col = notesCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await setDoc(doc(col, note.id), {
      title: note.title,
      body: note.body,
      transcript: note.transcript ?? null,
      mindMapSource: note.mindMapSource ?? null,
      source: note.source,
      meetingId: note.meetingId ?? null,
      seriesTag: note.seriesTag ?? null,
      groupId: note.groupId ?? null,
      processingScope: note.processingScope ?? null,
      cloudSyncMeta: note.cloudSyncMeta ?? null,
      tags: note.tags ?? [],
      highlights: note.highlights ?? [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  }

  notifyNotesChanged(userId);
  return note;
}

export async function removeNote(
  userId: string,
  noteId: string,
): Promise<void> {
  await deleteLocalNote(userId, noteId);

  const col = notesCollection(userId);
  if (col && !isLocalOnlyMode()) {
    await deleteDoc(doc(col, noteId));
  }

  notifyNotesChanged(userId);
}
