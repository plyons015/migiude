"use client";

import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useWhisperSTT } from "@/hooks/use-whisper-stt";
import type { LocalSttEngine } from "@/lib/speech/types";
import { useCallback, useRef, useState } from "react";

export type UseLocalTranscriptionOptions = {
  personalize?: (text: string) => string;
};

/**
 * On-device STT: native whisper.cpp on Android (arm64), else WASM Whisper, then Web Speech.
 */
export function useLocalTranscription(
  langOverride?: string,
  options: UseLocalTranscriptionOptions = {},
) {
  const whisper = useWhisperSTT({ personalize: options.personalize });
  const webspeech = useSpeechRecognition(langOverride, {
    personalize: options.personalize,
  });

  const [engine, setEngine] = useState<LocalSttEngine>("whisper");
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const forcedWebSpeechRef = useRef(false);

  const usingWhisper =
    (engine === "whisper" || engine === "whisper-native") &&
    !forcedWebSpeechRef.current;

  const active = usingWhisper ? whisper : webspeech;

  const localEngine: LocalSttEngine = forcedWebSpeechRef.current
    ? "webspeech"
    : whisper.backend === "native"
      ? "whisper-native"
      : engine;

  const supported = whisper.supported || webspeech.supported;

  const startListening = useCallback(async () => {
    setFallbackNotice(null);
    forcedWebSpeechRef.current = false;
    if (whisper.supported) {
      try {
        await whisper.startListening();
        setEngine(
          whisper.backend === "native" ? "whisper-native" : "whisper",
        );
        return;
      } catch {
        forcedWebSpeechRef.current = true;
        setEngine("webspeech");
        setFallbackNotice(
          "On-device Whisper could not start. Using limited browser speech instead.",
        );
      }
    }

    if (!webspeech.supported) {
      throw new Error("On-device speech is not supported in this browser.");
    }
    setEngine("webspeech");
    await webspeech.startListening();
  }, [whisper, webspeech]);

  const stopListening = useCallback(async () => {
    if (
      (engine === "whisper" || engine === "whisper-native") &&
      !forcedWebSpeechRef.current
    ) {
      await whisper.stopListening();
    } else {
      webspeech.stopListening();
    }
  }, [engine, whisper, webspeech]);

  const updateChunkText = useCallback(
    (chunkId: string, text: string) => {
      active.updateChunkText?.(chunkId, text);
    },
    [active],
  );

  return {
    ...active,
    supported,
    localEngine,
    fallbackNotice,
    whisperModelLoadProgress: usingWhisper
      ? whisper.modelLoadProgress
      : null,
    whisperModelLoadLabel: usingWhisper ? whisper.modelLoadLabel : null,
    whisperVadSilent: usingWhisper ? whisper.whisperVadSilent : false,
    startListening,
    stopListening,
    clearTranscript: active.clearTranscript,
    restoreTranscript: active.restoreTranscript,
    updateChunkText,
  };
}
