import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { isAndroid } from "@/lib/capacitor/platform";
import type { SpeechLanguage } from "@/lib/settings/preferences";
import type { WhisperModelSize } from "@/lib/speech/whisper-models";
import {
  whisperGgmlModelUrl,
  whisperLanguageCode,
} from "@/lib/speech/whisper-models";

export type WhisperNativeAvailability = {
  available: boolean;
  reason?: string;
};

export type WhisperNativeLoadOptions = {
  modelSize: WhisperModelSize;
  speechLang: SpeechLanguage;
  wifiOnly?: boolean;
};

export type WhisperNativeTranscriptEvent = {
  chunkId: string;
  text: string;
};

export type WhisperNativeLoadProgressEvent = {
  progress: number;
  file?: string;
};

type WhisperNativePlugin = {
  isAvailable(): Promise<WhisperNativeAvailability>;
  loadModel(options: {
    modelSize: string;
    speechLang: string;
    modelUrl: string;
    wifiOnly?: boolean;
  }): Promise<void>;
  start(options: { speechLang: string }): Promise<void>;
  stop(): Promise<void>;
  release(): Promise<void>;
  addListener(
    event: "transcript",
    listener: (event: WhisperNativeTranscriptEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: "loadProgress",
    listener: (event: WhisperNativeLoadProgressEvent) => void,
  ): Promise<PluginListenerHandle>;
};

const NativeWhisper = registerPlugin<WhisperNativePlugin>("WhisperNative");

let cachedAvailability: WhisperNativeAvailability | null = null;

export async function getWhisperNativeAvailability(): Promise<WhisperNativeAvailability> {
  if (!isAndroid()) {
    return { available: false, reason: "Native Whisper is Android-only." };
  }
  if (cachedAvailability) return cachedAvailability;
  try {
    cachedAvailability = await NativeWhisper.isAvailable();
  } catch {
    cachedAvailability = {
      available: false,
      reason: "Native Whisper plugin unavailable.",
    };
  }
  return cachedAvailability;
}

export function buildNativeLoadOptions(
  modelSize: WhisperModelSize,
  speechLang: SpeechLanguage,
  wifiOnly: boolean,
) {
  return {
    modelSize,
    speechLang,
    modelUrl: whisperGgmlModelUrl(modelSize, speechLang),
    wifiOnly,
  };
}

export { NativeWhisper, whisperLanguageCode };
