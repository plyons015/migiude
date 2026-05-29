export type SpeechListenState = "idle" | "starting" | "listening" | "stopping" | "error";

export type TranscriptChunk = {
  id: string;
  text: string;
  timestamp: number;
  /** Cloud STT speaker label (1-based). */
  speakerId?: number;
};

export type TranscriptionMode = "browser" | "cloud";

/** Which on-device engine is active when mode is "browser". */
export type LocalSttEngine = "whisper" | "whisper-native" | "webspeech";

export type SpeechRecognitionHandlers = {
  onInterim?: (text: string) => void;
  onFinalChunk?: (chunk: TranscriptChunk) => void;
  /** Fired when the engine pauses (end of utterance) before continuous restart. */
  onUtteranceEnd?: () => void;
  onStateChange?: (state: SpeechListenState) => void;
  onError?: (message: string) => void;
};
