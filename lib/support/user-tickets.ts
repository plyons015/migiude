import { getFirebaseDb } from "@/lib/firebase/client";
import { parseFirestoreDate } from "@/lib/support/parse-timestamp";
import type { UserSupportTicket } from "@/lib/support/types";
import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";

function docToTicket(id: string, data: Record<string, unknown>): UserSupportTicket {
  return {
    id,
    message: (data.message as string) ?? "",
    status: (data.status as string) ?? "open",
    adminReply: (data.adminReply as string | undefined) ?? null,
    createdAt: parseFirestoreDate(data.createdAt),
    updatedAt: parseFirestoreDate(data.updatedAt),
  };
}

export function subscribeUserSupportTickets(
  uid: string,
  onData: (tickets: UserSupportTicket[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  if (!db) {
    onError?.(new Error("Firestore is not initialized."));
    return () => undefined;
  }

  const q = query(collection(db, "supportTickets"), where("uid", "==", uid));

  return onSnapshot(
    q,
    (snap) => {
      const tickets = snap.docs
        .map((d) => docToTicket(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => {
          const ta = a.updatedAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
          const tb = b.updatedAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
          return tb - ta;
        });
      onData(tickets);
    },
    (err) => onError?.(err),
  );
}

const SEEN_KEY = "migiude-help-seen-ticket-ids";

let seenRevision = 0;
const seenListeners = new Set<() => void>();

function notifySeenChanged(): void {
  seenRevision += 1;
  for (const listener of seenListeners) listener();
}

export function subscribeSupportTicketsSeen(
  onStoreChange: () => void,
): () => void {
  seenListeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SEEN_KEY) notifySeenChanged();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    seenListeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getSupportTicketsSeenRevision(): number {
  return seenRevision;
}

export function getSeenSupportTicketIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markSupportTicketsSeen(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  const seen = getSeenSupportTicketIds();
  let changed = false;
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      changed = true;
    }
  }
  if (!changed) return;
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  notifySeenChanged();
}

export function markSupportTicketSeen(id: string): void {
  markSupportTicketsSeen([id]);
}

export function isSupportTicketUnread(ticket: UserSupportTicket): boolean {
  if (ticket.status !== "resolved" || !ticket.adminReply?.trim()) return false;
  return !getSeenSupportTicketIds().has(ticket.id);
}

export function countUnreadSupportReplies(tickets: UserSupportTicket[]): number {
  return tickets.filter(isSupportTicketUnread).length;
}
