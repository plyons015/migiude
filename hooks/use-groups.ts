"use client";

import { subscribeGroups } from "@/lib/data/groups-store";
import type { GroupRecord } from "@/lib/groups/types";
import { useEffect, useState } from "react";

export function useGroups(userId: string | null) {
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      return;
    }
    return subscribeGroups(
      userId,
      setGroups,
      (err) => setError(err.message),
    );
  }, [userId]);

  return { groups, error };
}

