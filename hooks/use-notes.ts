"use client";

import { subscribeNotes } from "@/lib/data/notes-store";
import type { NoteRecord } from "@/lib/data/types";
import { useEffect, useState } from "react";

export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      return;
    }
    return subscribeNotes(
      userId,
      setNotes,
      (err) => setError(err.message),
    );
  }, [userId]);

  return { notes, error };
}
