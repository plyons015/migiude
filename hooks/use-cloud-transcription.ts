"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { useAppSettings } from "@/hooks/use-app-settings";
import { ensureMicrophonePermission } from "@/lib/speech/microphone";
import { blobToBase64 } from "@/lib/speech/cloud-audio-capture";
import { measureAudioLevel } from "@/lib/speech/measure-audio-level";
import { MIN_UPLOAD_BYTES } from "@/lib/speech/vad/vad-config";
import {
  VadAudioCapture,
  isMediaRecorderSupported,
  type CloudCapturePhase,
} from "@/lib/speech/vad-audio-capture";
import {
  MEETING_VAD_PROFILE,
  QUICK_VAD_PROFILE,
} from "@/lib/speech/vad/vad-config";
import { buildDisplayTranscript } from "@/lib/speech/transcript-merge";
import type { SpeechListenState, TranscriptChunk } from "@/lib/speech/types";
import { filterTranscriptSegments } from "@/lib/stt/sanitize-segments";
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

export type CloudSttUiPhase = CloudCapturePhase | "transcribing" | "idle";

export function useCloudTranscription(langOverride?: string) {
  const { speechLang } = useAppSettings();
  const lang = langOverride ?? speechLang;
  const { ensureSignedIn } = useAuthUser();
  const captureRef = useRef<VadAudioCapture | null>(null);
  const sttContextRef = useRef<"quick" | "meeting">("quick");
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const [state, setState] = useState<SpeechListenState>("idle");
  const [capturePhase, setCapturePhase] = useState<CloudCapturePhase>("idle");
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

  const uiPhase: CloudSttUiPhase = useMemo(() => {
    if (pendingChunks > 0) return "transcribing";
    if (state === "listening" || state === "starting") return capturePhase;
    return "idle";
  }, [pendingChunks, state, capturePhase]);

  const appendSegments = useCallback(
    (segments: Array<{ speakerId: number; text: string }>) => {
      const filtered = filterTranscriptSegments(segments);
      if (filtered.length === 0) return;

      const now = Date.now();
      const next: TranscriptChunk[] = filtered.map((s, i) => ({
        id: createChunkId(),
        text: s.text,
        timestamp: now + i,
        speakerId: s.speakerId,
      }));

      setChunks((prev) => {
        const last = prev[prev.length - 1];
        const deduped = next.filter(
          (n) =>
            !(
              last &&
              last.text === n.text &&
              last.speakerId === n.speakerId
            ),
        );
        if (deduped.length === 0) return prev;
        return [...prev, ...deduped];
      });
    },
    [],
  );

  const processSegment = useCallback(
    async (blob: Blob, mimeType: string, durationHintSec: number) => {
      if (blob.size < MIN_UPLOAD_BYTES) {
        return;
      }

      const level = await measureAudioLevel(blob);
      const audioDurationMs = Math.round(
        Math.max(level.durationSec, durationHintSec, 0.3) * 1000,
      );

      setPendingChunks((n) => n + 1);
      setInterimText("Transcribing…");
      try {
        await ensureSignedIn();
        const audioBase64 = await blobToBase64(blob);
        const out = await transcribeAudioChunk({
          audioBase64,
          mimeType,
          lang,
          audioDurationMs,
          context: sttContextRef.current,
        });
        const spoken = filterTranscriptSegments(out.segments);
        if (spoken.length === 0) return;
        appendSegments(spoken);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Cloud transcription failed.";
        setError(message);
        setState("error");
      } finally {
        setPendingChunks((n) => Math.max(0, n - 1));
        setInterimText((prev) => (prev === "Transcribing…" ? "" : prev));
      }
    },
    [appendSegments, ensureSignedIn, lang],
  );

  const attachCapture = useCallback(
    (meeting: boolean) => {
      captureRef.current?.destroy();
      const timing = meeting ? MEETING_VAD_PROFILE : QUICK_VAD_PROFILE;
      captureRef.current = new VadAudioCapture(
        (payload) => {
          queueRef.current = queueRef.current.then(() =>
            processSegment(payload.blob, payload.mimeType, payload.durationSec),
          );
        },
        (phase) => setCapturePhase(phase),
        timing,
      );
    },
    [processSegment],
  );

  useEffect(() => {
    attachCapture(false);
    return () => {
      captureRef.current?.destroy();
      captureRef.current = null;
    };
  }, [attachCapture]);

  const startListening = useCallback(
    async (options?: { meeting?: boolean }) => {
      const meeting = options?.meeting === true;
      sttContextRef.current = meeting ? "meeting" : "quick";
      attachCapture(meeting);
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
    },
    [attachCapture, ensureSignedIn],
  );

  const stopListening = useCallback(() => {
    setState("stopping");
    void captureRef.current?.stop().finally(() => {
      setInterimText("");
      setCapturePhase("idle");
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
    capturePhase: uiPhase,
    interimText:
      uiPhase === "transcribing" && !interimText ? "Transcribing…" : interimText,
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
