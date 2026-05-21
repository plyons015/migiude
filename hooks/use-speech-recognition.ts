"use client";

import { ensureMicrophonePermission } from "@/lib/speech/microphone";
import {
  buildDisplayTranscript,
  mergeFinalTranscript,
} from "@/lib/speech/transcript-merge";
import type { SpeechListenState, TranscriptChunk } from "@/lib/speech/types";
import {
  isWebSpeechSupported,
  WebSpeechRecognizer,
} from "@/lib/speech/web-speech";
import { useAppSettings } from "@/hooks/use-app-settings";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

function subscribeSpeechSupport() {
  return () => {};
}

export function useSpeechRecognition(langOverride?: string) {
  const { speechLang } = useAppSettings();
  const lang = langOverride ?? speechLang;
  const recognizerRef = useRef<WebSpeechRecognizer | null>(null);
  const forceNewChunkRef = useRef(false);
  const [state, setState] = useState<SpeechListenState>("idle");
  const [interimText, setInterimText] = useState("");
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Must read on the client only — static export pre-renders with no `window`,
  // so useMemo([]) would stay false forever after a full WebView refresh.
  const supported = useSyncExternalStore(
    subscribeSpeechSupport,
    isWebSpeechSupported,
    () => false,
  );

  const fullTranscript = useMemo(
    () => buildDisplayTranscript(chunks, interimText),
    [chunks, interimText],
  );

  useEffect(() => {
    recognizerRef.current = new WebSpeechRecognizer(
      {
        onInterim: setInterimText,
        onUtteranceEnd: () => {
          forceNewChunkRef.current = true;
        },
        onFinalChunk: (chunk) => {
          const forceNew = forceNewChunkRef.current;
          forceNewChunkRef.current = false;
          setChunks((prev) =>
            mergeFinalTranscript(prev, chunk.text, { forceNewChunk: forceNew }),
          );
          setInterimText("");
        },
        onStateChange: setState,
        onError: (message) => {
          setError(message);
          setState("error");
        },
      },
      lang,
    );

    return () => {
      recognizerRef.current?.destroy();
      recognizerRef.current = null;
    };
  }, [lang]);

  const startListening = useCallback(async () => {
    setError(null);
    try {
      await ensureMicrophonePermission();
      await recognizerRef.current?.start();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start listening.";
      setError(message);
      setState("error");
    }
  }, []);

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop();
    setInterimText("");
  }, []);

  const clearTranscript = useCallback(() => {
    setChunks([]);
    setInterimText("");
    setError(null);
    if (state === "error") setState("idle");
  }, [state]);

  const restoreTranscript = useCallback((restored: TranscriptChunk[]) => {
    setChunks(restored);
    setInterimText("");
    setError(null);
    setState((s) => (s === "error" ? "idle" : s));
  }, []);

  const isListening = state === "listening" || state === "starting";

  return {
    supported,
    state,
    isListening,
    interimText,
    chunks,
    fullTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    restoreTranscript,
  };
}
