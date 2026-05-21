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

function notesCollection(userId: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return collection(db, "users", userId, "notes");
}

export async function listNotes(userId: string): Promise<NoteRecord[]> {
  const local = await listLocalNotes(userId);
  return local;
}

export function subscribeNotes(
  userId: string,
  onData: (notes: NoteRecord[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const col = notesCollection(userId);

  void listLocalNotes(userId).then(onData);

  if (!col || isLocalOnlyMode()) {
    return () => {};
  }

  const q = query(col, orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as NoteRecord,
      );
      void Promise.all(notes.map((n) => upsertLocalNote(userId, n))).then(() =>
        onData(notes),
      );
    },
    (err) => onError?.(err),
  );
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
      tags: note.tags ?? [],
      highlights: note.highlights ?? [],
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  }

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
}
