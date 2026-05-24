import { APP_NAME } from "@/lib/branding/app-name";
import type {
  SpeechListenState,
  SpeechRecognitionHandlers,
  TranscriptChunk,
} from "@/lib/speech/types";

function getSpeechRecognitionCtor(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isWebSpeechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

function createChunkId(): string {
  return `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatSpeechError(code: string, message: string): string {
  switch (code) {
    case "not-allowed":
      return `Microphone permission denied. Open Settings → Apps → ${APP_NAME} → Permissions and allow Microphone.`;
    case "service-not-allowed":
      return "Speech recognition is not allowed. Update Google app / Play services and try again.";
    case "network":
      return (
        "Chrome could not reach Google’s speech servers (this is not your Wi‑Fi). " +
        "Try: turn off VPN/proxy, allow Chrome through firewall/antivirus (e.g. Avast), " +
        "use Google Chrome (not Edge/Firefox), then reload and tap Listen again."
      );
    case "audio-capture":
      return "Could not use the microphone. Close other apps using the mic and try again.";
    case "no-speech":
      return "No speech detected. Try speaking closer to the microphone.";
    default:
      return message?.trim() || code || "Speech recognition error";
  }
}

const RESTART_DELAY_MS = 300;
const NETWORK_ERROR_MAX_RETRIES = 3;
const NETWORK_ERROR_RETRY_MS = 800;

/**
 * Web Speech API wrapper — continuous listening with interim + final chunks.
 * No audio is stored; only transcript text is emitted.
 */
export class WebSpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  private shouldListen = false;
  private state: SpeechListenState = "idle";
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private networkErrorRetries = 0;

  constructor(
    private readonly handlers: SpeechRecognitionHandlers,
    private readonly lang = "en-US",
  ) {}

  getState(): SpeechListenState {
    return this.state;
  }

  private setState(next: SpeechListenState): void {
    this.state = next;
    this.handlers.onStateChange?.(next);
  }

  private clearRestartTimer(): void {
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private attachRecognition(): SpeechRecognition {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      throw new Error("Speech recognition is not supported in this browser.");
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = this.lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let lastFinal = "";

      // Only the latest final in this event counts — earlier finals are cumulative
      // partials ("my" → "my little" → "my little brother").
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (!transcript.trim()) continue;

        if (result.isFinal) {
          lastFinal = transcript.trim();
        } else {
          interim = transcript.trim();
        }
      }

      if (interim) {
        this.handlers.onInterim?.(interim);
      }

      if (lastFinal) {
        const chunk: TranscriptChunk = {
          id: createChunkId(),
          text: lastFinal,
          timestamp: Date.now(),
        };
        this.handlers.onFinalChunk?.(chunk);
        this.handlers.onInterim?.("");
      }
    };

    recognition.onstart = () => {
      this.setState("listening");
    };

    recognition.onend = () => {
      if (!this.shouldListen) {
        this.setState("idle");
        return;
      }

      // Pause between phrases — next finals should start a new transcript line.
      this.handlers.onUtteranceEnd?.();

      this.clearRestartTimer();
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        if (!this.shouldListen) return;
        this.restartListening();
      }, RESTART_DELAY_MS);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }

      // Transient — VPN/firewall glitches; retry before surfacing an error.
      if (
        event.error === "network" &&
        this.shouldListen &&
        this.networkErrorRetries < NETWORK_ERROR_MAX_RETRIES
      ) {
        this.networkErrorRetries += 1;
        this.clearRestartTimer();
        this.restartTimer = setTimeout(() => {
          this.restartTimer = null;
          if (!this.shouldListen) return;
          this.restartListening();
        }, NETWORK_ERROR_RETRY_MS);
        return;
      }

      this.shouldListen = false;
      this.clearRestartTimer();
      this.setState("error");
      this.handlers.onError?.(
        formatSpeechError(event.error, event.message ?? ""),
      );
    };

    return recognition;
  }

  private restartListening(): void {
    if (!this.shouldListen) return;

    // Always use a fresh instance after a pause so results are not cumulative
    // across utterances (which prevented new lines in the transcript).
    this.recognition?.abort();
    this.recognition = null;

    try {
      this.recognition = this.attachRecognition();
      this.recognition.start();
    } catch (error) {
      this.shouldListen = false;
      this.setState("error");
      this.handlers.onError?.(
        error instanceof Error
          ? error.message
          : "Speech recognition stopped unexpectedly.",
      );
    }
  }

  async start(): Promise<void> {
    if (this.shouldListen) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      this.setState("error");
      this.handlers.onError?.(
        "Speech recognition is not supported. Try Chrome or the Android app.",
      );
      return;
    }

    this.clearRestartTimer();
    this.networkErrorRetries = 0;
    this.shouldListen = true;
    this.setState("starting");
    this.recognition?.abort();
    this.recognition = this.attachRecognition();

    try {
      this.recognition.start();
    } catch (error) {
      this.shouldListen = false;
      this.setState("error");
      this.handlers.onError?.(
        error instanceof Error ? error.message : "Failed to start listening.",
      );
    }
  }

  stop(): void {
    this.shouldListen = false;
    this.clearRestartTimer();
    this.setState("stopping");
    this.handlers.onInterim?.("");
    this.recognition?.abort();
    this.recognition = null;
    this.setState("idle");
  }

  destroy(): void {
    this.shouldListen = false;
    this.clearRestartTimer();
    this.recognition?.abort();
    this.recognition = null;
    this.setState("idle");
  }
}
