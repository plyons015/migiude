"use client";

import { useAppSettings } from "@/hooks/use-app-settings";
import { useThrottledValue } from "@/lib/hooks/use-throttled-value";
import {
  buildNativeLoadOptions,
  getWhisperNativeAvailability,
  NativeWhisper,
} from "@/lib/capacitor/whisper-native";
import { isAndroid } from "@/lib/capacitor/platform";
import { ensureMicrophonePermission } from "@/lib/speech/microphone";
import { WhisperPcmCapture } from "@/lib/speech/whisper-pcm-capture";
import type { SpeechListenState, TranscriptChunk } from "@/lib/speech/types";
import {
  buildDisplayTranscript,
  mergeFinalTranscript,
} from "@/lib/speech/transcript-merge";
import { assertWhisperModelDownloadAllowed } from "@/lib/speech/whisper-network";
import {
  isWhisperWorkerSupported,
  WhisperWorkerClient,
} from "@/lib/speech/whisper-worker-client";
import type { PluginListenerHandle } from "@capacitor/core";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const INTERIM_THROTTLE_MS = 300;

function subscribeWhisperSupport() {
  return () => {};
}

export type UseWhisperSTTOptions = {
  personalize?: (text: string) => string;
};

export type WhisperBackend = "native" | "wasm";

export function useWhisperSTT(options: UseWhisperSTTOptions = {}) {
  const { personalize } = options;
  const {
    whisperModelSize,
    whisperVadEnabled,
    whisperWifiOnlyDownload,
    speechLang,
    preferNativeWhisper,
  } = useAppSettings();

  const captureRef = useRef<WhisperPcmCapture | null>(null);
  const workerRef = useRef<WhisperWorkerClient | null>(null);
  const transcribeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const personalizeRef = useRef(personalize);
  personalizeRef.current = personalize;

  const nativeListenersRef = useRef<PluginListenerHandle[]>([]);
  const backendRef = useRef<WhisperBackend>("wasm");

  const [state, setState] = useState<SpeechListenState>("idle");
  const [interimText, setInterimText] = useState("");
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modelLoadProgress, setModelLoadProgress] = useState<number | null>(
    null,
  );
  const [modelLoadLabel, setModelLoadLabel] = useState<string | null>(null);
  const [vadSilent, setVadSilent] = useState(false);
  const [backend, setBackend] = useState<WhisperBackend>("wasm");

  const throttledInterim = useThrottledValue(interimText, INTERIM_THROTTLE_MS);

  const wasmSupported = useSyncExternalStore(
    subscribeWhisperSupport,
    isWhisperWorkerSupported,
    () => false,
  );

  const [nativeReady, setNativeReady] = useState(false);

  useEffect(() => {
    if (!isAndroid() || !preferNativeWhisper) {
      setNativeReady(false);
      return;
    }
    void getWhisperNativeAvailability().then(({ available }) => {
      setNativeReady(available);
    });
  }, [preferNativeWhisper]);

  const supported = wasmSupported || nativeReady;

  const fullTranscript = useMemo(
    () => buildDisplayTranscript(chunks, throttledInterim),
    [chunks, throttledInterim],
  );

  const applyTranscript = useCallback((text: string) => {
    if (!text.trim()) {
      setInterimText("");
      return;
    }
    const display = personalizeRef.current?.(text) ?? text;
    setChunks((prev) =>
      mergeFinalTranscript(prev, display, { forceNewChunk: true }),
    );
    setInterimText("");
  }, []);

  const clearNativeListeners = useCallback(async () => {
    for (const handle of nativeListenersRef.current) {
      await handle.remove();
    }
    nativeListenersRef.current = [];
  }, []);

  const enqueueTranscribe = useCallback(
    (chunkId: string, samples: Float32Array) => {
      transcribeQueueRef.current = transcribeQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          setInterimText("Transcribing…");
          workerRef.current?.transcribe(chunkId, samples, speechLang);
        });
    },
    [speechLang],
  );

  useEffect(() => {
    workerRef.current = new WhisperWorkerClient({
      onLoadProgress: (progress, file) => {
        setModelLoadProgress(progress);
        setModelLoadLabel(file ?? null);
      },
      onTranscribeResult: (_chunkId, text) => {
        applyTranscript(text);
      },
      onError: (message) => {
        setError(message);
        setState("error");
      },
    });
    return () => {
      workerRef.current?.dispose();
      workerRef.current = null;
    };
  }, [applyTranscript]);

  const startWasm = useCallback(async () => {
    if (!workerRef.current) {
      throw new Error("Whisper worker is not available.");
    }
    backendRef.current = "wasm";
    setBackend("wasm");
    assertWhisperModelDownloadAllowed(whisperWifiOnlyDownload);
    await workerRef.current.load(whisperModelSize, speechLang);
    setModelLoadProgress(null);
    setModelLoadLabel(null);

    captureRef.current = new WhisperPcmCapture(
      ({ samples, chunkId }) => {
        enqueueTranscribe(chunkId, samples);
      },
      {
        vadEnabled: whisperVadEnabled,
        onVadSilentChange: setVadSilent,
      },
    );
    await captureRef.current.start();
  }, [
    whisperModelSize,
    speechLang,
    whisperVadEnabled,
    whisperWifiOnlyDownload,
    enqueueTranscribe,
  ]);

  const startNative = useCallback(async () => {
    await clearNativeListeners();
    backendRef.current = "native";
    setBackend("native");
    setVadSilent(false);

    assertWhisperModelDownloadAllowed(whisperWifiOnlyDownload);
    setModelLoadProgress(0);
    setModelLoadLabel("Downloading model…");

    const progressHandle = await NativeWhisper.addListener(
      "loadProgress",
      (event) => {
        setModelLoadProgress(event.progress);
        setModelLoadLabel(event.file ?? "model");
      },
    );
    const transcriptHandle = await NativeWhisper.addListener(
      "transcript",
      (event) => {
        setInterimText("Transcribing…");
        applyTranscript(event.text);
      },
    );
    nativeListenersRef.current = [progressHandle, transcriptHandle];

    await NativeWhisper.loadModel(
      buildNativeLoadOptions(
        whisperModelSize,
        speechLang,
        whisperWifiOnlyDownload,
      ),
    );
    setModelLoadProgress(null);
    setModelLoadLabel(null);
    await NativeWhisper.start({ speechLang });
  }, [
    applyTranscript,
    clearNativeListeners,
    speechLang,
    whisperModelSize,
    whisperWifiOnlyDownload,
  ]);

  const startListening = useCallback(async () => {
    setError(null);
    setModelLoadProgress(0);
    setVadSilent(false);
    setState("starting");
    try {
      await ensureMicrophonePermission();

      const useNative =
        isAndroid() &&
        preferNativeWhisper &&
        (await getWhisperNativeAvailability()).available;

      if (useNative) {
        try {
          await startNative();
          setState("listening");
          return;
        } catch (nativeErr) {
          await clearNativeListeners();
          void NativeWhisper.release().catch(() => undefined);
          if (!wasmSupported) throw nativeErr;
        }
      }

      if (!wasmSupported) {
        throw new Error("On-device Whisper is not supported on this device.");
      }
      await startWasm();
      setState("listening");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not start on-device Whisper.";
      setError(message);
      setState("error");
      setModelLoadProgress(null);
      throw e;
    }
  }, [
    preferNativeWhisper,
    startNative,
    startWasm,
    wasmSupported,
    clearNativeListeners,
  ]);

  const stopListening = useCallback(async () => {
    setState("stopping");
    if (backendRef.current === "native") {
      await NativeWhisper.stop().catch(() => undefined);
      await clearNativeListeners();
    } else {
      await captureRef.current?.stop().catch(() => undefined);
      captureRef.current = null;
    }
    setInterimText("");
    setVadSilent(false);
    setState("idle");
  }, [clearNativeListeners]);

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

  const updateChunkText = useCallback((chunkId: string, text: string) => {
    setChunks((prev) =>
      prev.map((c) => (c.id === chunkId ? { ...c, text } : c)),
    );
  }, []);

  useEffect(() => {
    return () => {
      void clearNativeListeners();
      void NativeWhisper.release().catch(() => undefined);
    };
  }, [clearNativeListeners]);

  const isListening = state === "listening" || state === "starting";

  return {
    supported,
    backend,
    state,
    isListening,
    interimText: throttledInterim,
    chunks,
    fullTranscript,
    error,
    modelLoadProgress,
    modelLoadLabel,
    whisperVadSilent: backend === "wasm" && vadSilent && isListening,
    startListening,
    stopListening,
    clearTranscript,
    restoreTranscript,
    updateChunkText,
  };
}
