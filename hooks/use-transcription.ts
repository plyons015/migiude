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
import {
  beginExclusiveCapture,
  endExclusiveCapture,
} from "@/lib/capacitor/recording-foreground";
import { isAndroid } from "@/lib/capacitor/platform";
import type { CloudSttUiPhase } from "@/hooks/use-cloud-transcription";
import {
  minutesFromMs,
  reportTrialUsage,
} from "@/lib/plan/report-trial-usage";
import { useCallback, useMemo, useRef, useState } from "react";

export type StartListeningOptions = {
  context?: TranscriptionContext;
  /** Override settings for this session (e.g. home-screen mic hold). */
  mode?: TranscriptionMode;
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
  const [activeSessionMode, setActiveSessionMode] =
    useState<TranscriptionMode | null>(null);
  const [captureWarning, setCaptureWarning] = useState<string | null>(null);
  const browserStartedAtRef = useRef<number | null>(null);

  const browser = useSpeechRecognition(langOverride);
  const cloud = useCloudTranscription(langOverride);

  const browserActive =
    browser.isListening || browser.state !== "idle";
  const cloudActive = cloud.isListening || cloud.state !== "idle";

  const sessionMode =
    activeSessionMode ??
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
      const mode = options?.mode ?? resolveMode(context);
      setActiveSessionMode(mode);
      setCaptureWarning(null);

      if (isAndroid()) {
        const { audioFocusGranted } = await beginExclusiveCapture();
        if (!audioFocusGranted) {
          setCaptureWarning(
            "Another app may still be playing audio. Close music, podcasts, or video apps, then try again.",
          );
        }
      }

      try {
        if (mode === "cloud") {
          await cloud.startListening();
        } else {
          browserStartedAtRef.current = Date.now();
          await browser.startListening();
        }
      } catch (error) {
        if (isAndroid()) {
          await endExclusiveCapture();
        }
        throw error;
      }
    },
    [idleContext, resolveMode, cloud, browser],
  );

  const stopListening = useCallback(() => {
    const mode = sessionMode;
    if (mode === "cloud") {
      cloud.stopListening();
    } else {
      browser.stopListening();
      const started = browserStartedAtRef.current;
      browserStartedAtRef.current = null;
      if (started != null) {
        const minutes = minutesFromMs(Date.now() - started);
        if (minutes > 0) {
          void reportTrialUsage({ onDeviceMinutes: minutes }).catch(() => undefined);
        }
      }
    }
    setActiveSessionMode(null);
    if (isAndroid()) {
      void endExclusiveCapture();
    }
  }, [sessionMode, cloud, browser]);

  const capturePhase: CloudSttUiPhase | undefined =
    sessionMode === "cloud"
      ? (active as { capturePhase?: CloudSttUiPhase }).capturePhase
      : undefined;

  return {
    ...active,
    supported,
    capturePhase,
    transcriptionMode: sessionMode,
    idleTranscriptionMode: idleMode,
    meetingTranscriptionMode: resolveMode("meeting"),
    quickTranscriptionMode: resolveMode("quick"),
    resolveMode,
    getTranscriptionModeForContext,
    capabilities,
    startListening,
    stopListening,
    captureWarning,
  };
}
