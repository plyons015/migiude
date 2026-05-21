"use client";

import { subscribeMeetingAppends } from "@/lib/data/appends-store";
import type { MeetingAppendRecord } from "@/lib/data/types";
import { useEffect, useState } from "react";

export function useMeetingAppends(
  userId: string | null,
  meetingId: string | null,
) {
  const [appends, setAppends] = useState<MeetingAppendRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !meetingId) {
      setAppends([]);
      return;
    }
    return subscribeMeetingAppends(
      userId,
      meetingId,
      setAppends,
      (err) => setError(err.message),
    );
  }, [userId, meetingId]);

  return { appends, error };
}
