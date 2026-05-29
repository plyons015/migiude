"use client";

import { subscribeFriends } from "@/lib/data/friends-store";
import type { FriendRecord } from "@/lib/groups/types";
import { useEffect, useState } from "react";

export function useFriends(userId: string | null) {
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setFriends([]);
      return;
    }
    return subscribeFriends(
      userId,
      setFriends,
      (err) => setError(err.message),
    );
  }, [userId]);

  return { friends, error };
}

