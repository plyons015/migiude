"use client";

import { subscribeMeetings } from "@/lib/data/meetings-store";
import type { MeetingRecord } from "@/lib/data/types";
import { useEffect, useState } from "react";

export function useMeetings(userId: string | null) {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setMeetings([]);
      return;
    }
    return subscribeMeetings(
      userId,
      setMeetings,
      (err) => setError(err.message),
    );
  }, [userId]);

  return { meetings, error };
}
