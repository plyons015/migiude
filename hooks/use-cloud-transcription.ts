"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useAppSettings } from "@/hooks/use-app-settings";
import { ensureMicrophonePermission } from "@/lib/speech/microphone";
import {
  blobToBase64,
  CloudAudioCapture,
  isMediaRecorderSupported,
} from "@/lib/speech/cloud-audio-capture";
import { buildDisplayTranscript } from "@/lib/speech/transcript-merge";
import type { SpeechListenState, TranscriptChunk } from "@/lib/speech/types";
import { transcribeAudioChunk } from "@/lib/stt/stt-service";
import { isFirebaseConfigured } from "@/lib/env/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

function subscribeCloudSupport() {
  return () => {};
}

function createChunkId(): string {
  return `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useCloudTranscription(langOverride?: string) {
  const { speechLang } = useAppSettings();
  const lang = langOverride ?? speechLang;
  const { ensureSignedIn } = useAuthUser();
  const captureRef = useRef<CloudAudioCapture | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const [state, setState] = useState<SpeechListenState>("idle");
  const [interimText, setInterimText] = useState("");
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingChunks, setPendingChunks] = useState(0);

  const supported = useSyncExternalStore(
    subscribeCloudSupport,
    () => isMediaRecorderSupported() && isFirebaseConfigured(),
    () => false,
  );

  const fullTranscript = useMemo(
    () => buildDisplayTranscript(chunks, interimText),
    [chunks, interimText],
  );

  const appendSegments = useCallback(
    (segments: Array<{ speakerId: number; text: string }>) => {
      const now = Date.now();
      const next: TranscriptChunk[] = segments
        .filter((s) => s.text.trim())
        .map((s, i) => ({
          id: createChunkId(),
          text: s.text.trim(),
          timestamp: now + i,
          speakerId: s.speakerId,
        }));
      if (next.length === 0) return;
      setChunks((prev) => [...prev, ...next]);
    },
    [],
  );

  const processBlob = useCallback(
    async (blob: Blob, mimeType: string) => {
      setPendingChunks((n) => n + 1);
      setInterimText("Transcribing audio…");
      try {
        await ensureSignedIn();
        const audioBase64 = await blobToBase64(blob);
        const out = await transcribeAudioChunk({
          audioBase64,
          mimeType,
          lang,
        });
        appendSegments(out.segments);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Cloud transcription failed.";
        setError(message);
        setState("error");
      } finally {
        setPendingChunks((n) => Math.max(0, n - 1));
        setInterimText((prev) =>
          prev === "Transcribing audio…" ? "" : prev,
        );
      }
    },
    [appendSegments, ensureSignedIn, lang],
  );

  useEffect(() => {
    captureRef.current = new CloudAudioCapture((blob, mime) => {
      queueRef.current = queueRef.current.then(() => processBlob(blob, mime));
    });
    return () => {
      captureRef.current?.destroy();
      captureRef.current = null;
    };
  }, [processBlob]);

  const startListening = useCallback(async () => {
    setError(null);
    try {
      await ensureMicrophonePermission();
      await ensureSignedIn();
      setState("starting");
      await captureRef.current?.start();
      setState("listening");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start cloud STT.";
      setError(message);
      setState("error");
    }
  }, [ensureSignedIn]);

  const stopListening = useCallback(() => {
    setState("stopping");
    void captureRef.current?.stop().finally(() => {
      setInterimText("");
      setState("idle");
    });
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
  const busyTranscribing = pendingChunks > 0;

  return {
    supported,
    state,
    isListening,
    interimText: busyTranscribing && !interimText ? "Transcribing audio…" : interimText,
    chunks,
    fullTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    restoreTranscript,
    transcriptionMode: "cloud" as const,
    busyTranscribing,
  };
}
