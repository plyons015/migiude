"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import {
  countUnreadSupportReplies,
  getSupportTicketsSeenRevision,
  isSupportTicketUnread,
  markSupportTicketSeen,
  markSupportTicketsSeen,
  subscribeSupportTicketsSeen,
  subscribeUserSupportTickets,
} from "@/lib/support/user-tickets";
import type { UserSupportTicket } from "@/lib/support/types";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

export function useUserSupportTickets() {
  const { uid } = useAuthUser();
  const [tickets, setTickets] = useState<UserSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const seenRevision = useSyncExternalStore(
    subscribeSupportTicketsSeen,
    getSupportTicketsSeenRevision,
    () => 0,
  );

  useEffect(() => {
    if (!uid) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeUserSupportTickets(
      uid,
      (next) => {
        setTickets(next);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  const unreadCount = useMemo(
    () => countUnreadSupportReplies(tickets),
    [tickets, seenRevision],
  );

  const markTicketsSeen = useCallback((ids: string[]) => {
    markSupportTicketsSeen(ids);
  }, []);

  const markTicketSeen = useCallback((id: string) => {
    markSupportTicketSeen(id);
  }, []);

  const markAllRepliesSeen = useCallback(() => {
    markSupportTicketsSeen(
      tickets.filter(isSupportTicketUnread).map((ticket) => ticket.id),
    );
  }, [tickets]);

  return {
    tickets,
    loading,
    error,
    unreadCount,
    isTicketUnread: isSupportTicketUnread,
    markTicketsSeen,
    markTicketSeen,
    markAllRepliesSeen,
  };
}
