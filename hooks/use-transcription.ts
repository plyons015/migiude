"use client";

import { useCloudTranscription } from "@/hooks/use-cloud-transcription";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useAppSettings } from "@/hooks/use-app-settings";
import { isMediaRecorderSupported } from "@/lib/speech/cloud-audio-capture";
import { isWebSpeechSupported } from "@/lib/speech/web-speech";
import type { TranscriptionMode } from "@/lib/speech/types";
import { useMemo } from "react";

export function useTranscription(langOverride?: string) {
  const { transcriptionMode, localOnly } = useAppSettings();
  const mode: TranscriptionMode =
    localOnly || transcriptionMode !== "cloud" ? "browser" : "cloud";

  const browser = useSpeechRecognition(langOverride);
  const cloud = useCloudTranscription(langOverride);

  const active = mode === "cloud" ? cloud : browser;

  const supported = useMemo(() => {
    if (mode === "cloud") return cloud.supported;
    return browser.supported;
  }, [mode, cloud.supported, browser.supported]);

  const capabilities = useMemo(
    () => ({
      webSpeech: isWebSpeechSupported(),
      cloudStt: isMediaRecorderSupported(),
    }),
    [],
  );

  return {
    ...active,
    supported,
    transcriptionMode: mode,
    capabilities,
  };
}
