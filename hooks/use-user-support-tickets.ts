"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import {
  countUnreadSupportReplies,
  subscribeUserSupportTickets,
} from "@/lib/support/user-tickets";
import type { UserSupportTicket } from "@/lib/support/types";
import { useEffect, useState } from "react";

export function useUserSupportTickets() {
  const { uid } = useAuthUser();
  const [tickets, setTickets] = useState<UserSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const unreadCount = countUnreadSupportReplies(tickets);

  return { tickets, loading, error, unreadCount };
}
