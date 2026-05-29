/** On-device Whisper model presets (Transformers.js / ONNX). */

import type { SpeechLanguage } from "@/lib/settings/preferences";

export type WhisperModelSize = "tiny" | "base";

export const WHISPER_MODEL_OPTIONS: {
  value: WhisperModelSize;
  label: string;
  approxMb: number;
}[] = [
  {
    value: "tiny",
    label: "Tiny (fast, ~40–75 MB)",
    approxMb: 40,
  },
  {
    value: "base",
    label: "Base (better accuracy, ~75–145 MB)",
    approxMb: 75,
  },
];

const EN_HUB: Record<WhisperModelSize, string> = {
  tiny: "Xenova/whisper-tiny.en",
  base: "Xenova/whisper-base.en",
};

const MULTI_HUB: Record<WhisperModelSize, string> = {
  tiny: "Xenova/whisper-tiny",
  base: "Xenova/whisper-base",
};

export function whisperLanguageCode(speechLang: SpeechLanguage): string {
  return speechLang.split("-")[0]?.toLowerCase() ?? "en";
}

/** ISO-style code → Whisper `language` argument (English names for Transformers.js). */
export function whisperTranscribeLanguage(code: string): string {
  const map: Record<string, string> = {
    en: "english",
    es: "spanish",
    fr: "french",
    de: "german",
    ja: "japanese",
  };
  return map[code] ?? code;
}

export function whisperUsesEnglishModel(speechLang: SpeechLanguage): boolean {
  return whisperLanguageCode(speechLang) === "en";
}

export function whisperHubId(
  size: WhisperModelSize,
  speechLang: SpeechLanguage,
): string {
  const english = whisperUsesEnglishModel(speechLang);
  const table = english ? EN_HUB : MULTI_HUB;
  return table[size] ?? MULTI_HUB.tiny;
}

export function whisperModelApproxMb(
  size: WhisperModelSize,
  speechLang: SpeechLanguage,
): number {
  const base =
    WHISPER_MODEL_OPTIONS.find((m) => m.value === size)?.approxMb ?? 40;
  return whisperUsesEnglishModel(speechLang) ? base : Math.round(base * 1.6);
}

const GGML_CDN =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";

/** GGML file for whisper.cpp native (Android Phase E). */
export function whisperGgmlModelFilename(
  size: WhisperModelSize,
  speechLang: SpeechLanguage,
): string {
  const en = whisperUsesEnglishModel(speechLang);
  if (size === "base") {
    return en ? "ggml-base.en.bin" : "ggml-base.bin";
  }
  return en ? "ggml-tiny.en.bin" : "ggml-tiny.bin";
}

export function whisperGgmlModelUrl(
  size: WhisperModelSize,
  speechLang: SpeechLanguage,
): string {
  return `${GGML_CDN}/${whisperGgmlModelFilename(size, speechLang)}`;
}

export const WHISPER_SAMPLE_RATE = 16_000;
export const WHISPER_CHUNK_SEC = 3;
export const WHISPER_CHUNK_OVERLAP_SEC = 0.5;
