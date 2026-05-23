"use client";

import { useCloudTranscription } from "@/hooks/use-cloud-transcription";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useAppSettings } from "@/hooks/use-app-settings";
import { isMediaRecorderSupported } from "@/lib/speech/cloud-audio-capture";
import { isWebSpeechSupported } from "@/lib/speech/web-speech";
import type { TranscriptionMode } from "@/lib/speech/types";
import {
  getTranscriptionModeForContext,
  type TranscriptionContext,
} from "@/lib/settings/preferences";
import { useCallback, useMemo, useRef } from "react";

export type StartListeningOptions = {
  context?: TranscriptionContext;
};

export function useTranscription(
  idleContext: TranscriptionContext = "quick",
  langOverride?: string,
) {
  const { localOnly, meetingTranscriptionMode, quickTranscriptionMode } =
    useAppSettings();

  const resolveMode = useCallback(
    (context: TranscriptionContext): TranscriptionMode => {
      const pref =
        context === "meeting"
          ? meetingTranscriptionMode
          : quickTranscriptionMode;
      if (localOnly || pref !== "cloud") return "browser";
      return "cloud";
    },
    [localOnly, meetingTranscriptionMode, quickTranscriptionMode],
  );

  const idleMode = resolveMode(idleContext);
  const sessionModeRef = useRef<TranscriptionMode | null>(null);

  const browser = useSpeechRecognition(langOverride);
  const cloud = useCloudTranscription(langOverride);

  const browserActive =
    browser.isListening || browser.state !== "idle";
  const cloudActive = cloud.isListening || cloud.state !== "idle";

  const sessionMode =
    sessionModeRef.current ??
    (cloudActive ? "cloud" : browserActive ? "browser" : idleMode);

  const active = sessionMode === "cloud" ? cloud : browser;

  const supported = useMemo(() => {
    if (sessionMode === "cloud") return cloud.supported;
    return browser.supported;
  }, [sessionMode, cloud.supported, browser.supported]);

  const capabilities = useMemo(
    () => ({
      webSpeech: isWebSpeechSupported(),
      cloudStt: isMediaRecorderSupported(),
    }),
    [],
  );

  const startListening = useCallback(
    async (options?: StartListeningOptions) => {
      const context = options?.context ?? idleContext;
      const mode = resolveMode(context);
      sessionModeRef.current = mode;
      if (mode === "cloud") {
        await cloud.startListening();
      } else {
        await browser.startListening();
      }
    },
    [idleContext, resolveMode, cloud, browser],
  );

  const stopListening = useCallback(() => {
    const mode = sessionModeRef.current ?? sessionMode;
    if (mode === "cloud") {
      cloud.stopListening();
    } else {
      browser.stopListening();
    }
    sessionModeRef.current = null;
  }, [sessionMode, cloud, browser]);

  return {
    ...active,
    supported,
    transcriptionMode: sessionMode,
    idleTranscriptionMode: idleMode,
    meetingTranscriptionMode: resolveMode("meeting"),
    quickTranscriptionMode: resolveMode("quick"),
    resolveMode,
    getTranscriptionModeForContext,
    capabilities,
    startListening,
    stopListening,
  };
}
