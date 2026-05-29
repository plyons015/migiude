"use client";

import { applySpeechPersonalization } from "@/lib/speech/apply-personalization";
import type { SpeechPersonalization } from "@/lib/speech/personalization-types";
import { EMPTY_SPEECH_PERSONALIZATION } from "@/lib/speech/personalization-types";
import {
  addSpeechTerm,
  loadSpeechPersonalization,
  rememberSpeechCorrection,
  removeSpeechCorrection,
  removeSpeechTerm,
} from "@/lib/speech/personalization-store";
import { useCallback, useEffect, useState } from "react";

export function useSpeechPersonalization(userId: string | null) {
  const [prefs, setPrefs] = useState<SpeechPersonalization>(
    EMPTY_SPEECH_PERSONALIZATION,
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setPrefs(EMPTY_SPEECH_PERSONALIZATION);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await loadSpeechPersonalization(userId);
      setPrefs(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const personalize = useCallback(
    (text: string) => applySpeechPersonalization(text, prefs),
    [prefs],
  );

  const addTerm = useCallback(
    async (phrase: string, replacement: string) => {
      if (!userId) return;
      await addSpeechTerm(userId, phrase, replacement);
      await reload();
    },
    [userId, reload],
  );

  const deleteTerm = useCallback(
    async (termId: string) => {
      if (!userId) return;
      await removeSpeechTerm(userId, termId);
      await reload();
    },
    [userId, reload],
  );

  const saveCorrection = useCallback(
    async (from: string, to: string) => {
      if (!userId) return;
      await rememberSpeechCorrection(userId, from, to);
      await reload();
    },
    [userId, reload],
  );

  const deleteCorrection = useCallback(
    async (correctionId: string) => {
      if (!userId) return;
      await removeSpeechCorrection(userId, correctionId);
      await reload();
    },
    [userId, reload],
  );

  return {
    prefs,
    loading,
    personalize,
    addTerm,
    deleteTerm,
    saveCorrection,
    deleteCorrection,
    reload,
  };
}
