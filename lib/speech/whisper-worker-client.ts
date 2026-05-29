import {
  WHISPER_SAMPLE_RATE,
  type WhisperModelSize,
} from "@/lib/speech/whisper-models";
import type { SpeechLanguage } from "@/lib/settings/preferences";

type WorkerOut =
  | { type: "load-progress"; progress: number; file?: string }
  | { type: "ready"; modelSize: WhisperModelSize; speechLang: SpeechLanguage }
  | { type: "transcribe-result"; chunkId: string; text: string }
  | { type: "transcribe-error"; chunkId: string; message: string }
  | { type: "error"; message: string };

export type WhisperWorkerClientOptions = {
  onLoadProgress?: (progress: number, file?: string) => void;
  onReady?: () => void;
  onTranscribeResult?: (chunkId: string, text: string) => void;
  onError?: (message: string) => void;
};

let workerSingleton: Worker | null = null;

function getWorker(): Worker {
  if (workerSingleton) return workerSingleton;
  workerSingleton = new Worker(
    new URL("./whisper-stt.worker.ts", import.meta.url),
    { type: "module" },
  );
  return workerSingleton;
}

export class WhisperWorkerClient {
  private worker: Worker;
  private loadPromise: Promise<void> | null = null;
  private loadedKey: string | null = null;

  constructor(private readonly options: WhisperWorkerClientOptions) {
    this.worker = getWorker();
    this.worker.onmessage = (event: MessageEvent<WorkerOut>) => {
      const msg = event.data;
      switch (msg.type) {
        case "load-progress":
          this.options.onLoadProgress?.(msg.progress, msg.file);
          break;
        case "ready":
          this.loadedKey = `${msg.modelSize}:${msg.speechLang}`;
          this.options.onReady?.();
          break;
        case "transcribe-result":
          this.options.onTranscribeResult?.(msg.chunkId, msg.text);
          break;
        case "transcribe-error":
        case "error":
          this.options.onError?.(msg.message);
          break;
        default:
          break;
      }
    };
  }

  load(modelSize: WhisperModelSize, speechLang: SpeechLanguage): Promise<void> {
    const key = `${modelSize}:${speechLang}`;
    if (this.loadedKey === key && this.loadPromise) {
      return this.loadPromise;
    }
    this.loadPromise = new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerOut>) => {
        if (
          event.data.type === "ready" &&
          event.data.modelSize === modelSize &&
          event.data.speechLang === speechLang
        ) {
          this.worker.removeEventListener("message", onMessage);
          this.loadedKey = key;
          resolve();
        } else if (event.data.type === "error") {
          this.worker.removeEventListener("message", onMessage);
          reject(new Error(event.data.message));
        }
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({ type: "load", modelSize, speechLang });
    });
    return this.loadPromise;
  }

  transcribe(
    chunkId: string,
    samples: Float32Array,
    speechLang: SpeechLanguage,
  ): void {
    this.worker.postMessage(
      {
        type: "transcribe",
        chunkId,
        samples,
        sampleRate: WHISPER_SAMPLE_RATE,
        speechLang,
      },
      [samples.buffer],
    );
  }

  dispose(): void {
    this.worker.postMessage({ type: "dispose" });
    this.loadPromise = null;
    this.loadedKey = null;
  }
}

export function isWhisperWorkerSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof AudioContext !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}
