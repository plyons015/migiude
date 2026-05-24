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
  for (const id of ids) seen.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

export function countUnreadSupportReplies(tickets: UserSupportTicket[]): number {
  const seen = getSeenSupportTicketIds();
  return tickets.filter(
    (t) =>
      t.status === "resolved" &&
      Boolean(t.adminReply?.trim()) &&
      !seen.has(t.id),
  ).length;
}
