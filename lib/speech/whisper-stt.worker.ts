/// <reference lib="webworker" />

import { env, pipeline, RawAudio } from "@huggingface/transformers";
import {
  whisperHubId,
  whisperTranscribeLanguage,
  type WhisperModelSize,
} from "@/lib/speech/whisper-models";
import type { SpeechLanguage } from "@/lib/settings/preferences";

env.allowLocalModels = false;
env.useBrowserCache = true;

type WorkerLoad = {
  modelSize: WhisperModelSize;
  speechLang: SpeechLanguage;
};

type WorkerIn =
  | { type: "load" } & WorkerLoad
  | { type: "transcribe"; chunkId: string; samples: Float32Array; sampleRate: number; speechLang: SpeechLanguage }
  | { type: "dispose" };

type WorkerOut =
  | { type: "load-progress"; progress: number; file?: string }
  | { type: "ready"; modelSize: WhisperModelSize; speechLang: SpeechLanguage }
  | { type: "transcribe-result"; chunkId: string; text: string }
  | { type: "transcribe-error"; chunkId: string; message: string }
  | { type: "error"; message: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;
let loadedKey: string | null = null;

function loadKey(modelSize: WhisperModelSize, speechLang: SpeechLanguage): string {
  return `${modelSize}:${speechLang}`;
}

async function ensureModel(modelSize: WhisperModelSize, speechLang: SpeechLanguage) {
  const key = loadKey(modelSize, speechLang);
  if (transcriber && loadedKey === key) return;

  const modelId = whisperHubId(modelSize, speechLang);
  transcriber = await pipeline("automatic-speech-recognition", modelId, {
    dtype: "q8",
    progress_callback: (progress: {
      status: string;
      progress?: number;
      file?: string;
    }) => {
      if (progress.status === "progress" && progress.progress != null) {
        const out: WorkerOut = {
          type: "load-progress",
          progress: progress.progress,
          file: progress.file,
        };
        self.postMessage(out);
      }
    },
  });
  loadedKey = key;
}

self.onmessage = async (event: MessageEvent<WorkerIn>) => {
  const msg = event.data;
  try {
    if (msg.type === "dispose") {
      transcriber = null;
      loadedKey = null;
      return;
    }

    if (msg.type === "load") {
      await ensureModel(msg.modelSize, msg.speechLang);
      const out: WorkerOut = {
        type: "ready",
        modelSize: msg.modelSize,
        speechLang: msg.speechLang,
      };
      self.postMessage(out);
      return;
    }

    if (msg.type === "transcribe") {
      if (!transcriber) {
        throw new Error("Whisper model not loaded.");
      }
      const audio = new RawAudio(msg.samples, msg.sampleRate);
      const langCode = msg.speechLang.split("-")[0]?.toLowerCase() ?? "en";
      const language = whisperTranscribeLanguage(langCode);
      const result = await transcriber(audio, {
        language,
        task: "transcribe",
      });
      const text =
        typeof result?.text === "string"
          ? result.text.trim()
          : String(result ?? "").trim();
      const out: WorkerOut = {
        type: "transcribe-result",
        chunkId: msg.chunkId,
        text,
      };
      self.postMessage(out);
      return;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (msg.type === "transcribe") {
      const out: WorkerOut = {
        type: "transcribe-error",
        chunkId: msg.chunkId,
        message,
      };
      self.postMessage(out);
      return;
    }
    const out: WorkerOut = { type: "error", message };
    self.postMessage(out);
  }
};

export {};
