export { ensureMicrophonePermission } from "@/lib/speech/microphone";
export { acquireWakeLock, type WakeLockHandle } from "@/lib/speech/wake-lock";
export type {
  SpeechListenState,
  TranscriptChunk,
} from "@/lib/speech/types";
export { isWebSpeechSupported, WebSpeechRecognizer } from "@/lib/speech/web-speech";
