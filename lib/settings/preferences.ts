export type TranscriptionMode = "browser" | "cloud";
export type TranscriptionContext = "meeting" | "quick";

export type SpeechLanguage =
  | "en-US"
  | "en-GB"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "ja-JP";

export const SPEECH_LANGUAGES: { value: SpeechLanguage; label: string }[] = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "ja-JP", label: "Japanese" },
];

const KEYS = {
  speechLang: "migiude-speech-lang",
  localOnly: "migiude-local-only",
  notifications: "migiude-notifications",
  theme: "migiude-theme",
  autoAiOnMeetingEnd: "migiude-auto-ai-meeting-end",
  rollingSummary: "migiude-rolling-summary",
  rollingSummaryMinutes: "migiude-rolling-summary-min",
  smartTagsOnEnd: "migiude-smart-tags-end",
  voiceCommands: "migiude-voice-commands",
  commitmentAwareness: "migiude-commitment-awareness",
  transcriptionMode: "migiude-transcription-mode",
  meetingTranscription: "migiude-meeting-transcription-mode",
  quickTranscription: "migiude-quick-transcription-mode",
} as const;

function migrateTranscriptionPrefs(): void {
  if (typeof window === "undefined") return;
  const hasMeeting = localStorage.getItem(KEYS.meetingTranscription);
  const hasQuick = localStorage.getItem(KEYS.quickTranscription);
  if (hasMeeting && hasQuick) return;
  const legacy = localStorage.getItem(KEYS.transcriptionMode);
  if (!hasMeeting) {
    const mode =
      legacy === "cloud" || legacy === "browser" ? legacy : "cloud";
    localStorage.setItem(KEYS.meetingTranscription, mode);
  }
  if (!hasQuick) {
    const mode =
      legacy === "cloud" || legacy === "browser" ? legacy : "browser";
    localStorage.setItem(KEYS.quickTranscription, mode);
  }
}

export type ThemePreference = "system" | "light" | "dark";

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "true";
}

export function getSpeechLanguage(): SpeechLanguage {
  if (typeof window === "undefined") return "en-US";
  const v = localStorage.getItem(KEYS.speechLang) as SpeechLanguage | null;
  return SPEECH_LANGUAGES.some((l) => l.value === v) ? v! : "en-US";
}

export function setSpeechLanguage(lang: SpeechLanguage): void {
  localStorage.setItem(KEYS.speechLang, lang);
  window.dispatchEvent(new Event("migiude-settings"));
}

export function isLocalOnlyMode(): boolean {
  return readBool(KEYS.localOnly, false);
}

export function setLocalOnlyMode(enabled: boolean): void {
  localStorage.setItem(KEYS.localOnly, String(enabled));
  window.dispatchEvent(new Event("migiude-settings"));
}

export function areNotificationsEnabled(): boolean {
  return readBool(KEYS.notifications, true);
}

export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(KEYS.notifications, String(enabled));
  window.dispatchEvent(new Event("migiude-settings"));
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(KEYS.theme) as ThemePreference | null;
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function setThemePreference(theme: ThemePreference): void {
  localStorage.setItem(KEYS.theme, theme);
  window.dispatchEvent(new Event("migiude-settings"));
}

export function isAutoAiOnMeetingEnd(): boolean {
  return readBool(KEYS.autoAiOnMeetingEnd, true);
}

export function setAutoAiOnMeetingEnd(enabled: boolean): void {
  localStorage.setItem(KEYS.autoAiOnMeetingEnd, String(enabled));
  window.dispatchEvent(new Event("migiude-settings"));
}

export function isRollingSummaryEnabled(): boolean {
  return readBool(KEYS.rollingSummary, false);
}

export function setRollingSummaryEnabled(enabled: boolean): void {
  localStorage.setItem(KEYS.rollingSummary, String(enabled));
  window.dispatchEvent(new Event("migiude-settings"));
}

export function getRollingSummaryMinutes(): number {
  if (typeof window === "undefined") return 5;
  const v = Number(localStorage.getItem(KEYS.rollingSummaryMinutes));
  if (!Number.isFinite(v) || v < 2 || v > 30) return 5;
  return Math.round(v);
}

export function setRollingSummaryMinutes(minutes: number): void {
  localStorage.setItem(
    KEYS.rollingSummaryMinutes,
    String(Math.min(30, Math.max(2, Math.round(minutes)))),
  );
  window.dispatchEvent(new Event("migiude-settings"));
}

export function isSmartTagsOnEnd(): boolean {
  return readBool(KEYS.smartTagsOnEnd, true);
}

export function setSmartTagsOnEnd(enabled: boolean): void {
  localStorage.setItem(KEYS.smartTagsOnEnd, String(enabled));
  window.dispatchEvent(new Event("migiude-settings"));
}

export function areVoiceCommandsEnabled(): boolean {
  return readBool(KEYS.voiceCommands, true);
}

export function setVoiceCommandsEnabled(enabled: boolean): void {
  localStorage.setItem(KEYS.voiceCommands, String(enabled));
  window.dispatchEvent(new Event("migiude-settings"));
}

export function isCommitmentAwarenessEnabled(): boolean {
  return readBool(KEYS.commitmentAwareness, true);
}

export function setCommitmentAwarenessEnabled(enabled: boolean): void {
  localStorage.setItem(KEYS.commitmentAwareness, String(enabled));
  window.dispatchEvent(new Event("migiude-settings"));
}

/** @deprecated Use getMeetingTranscriptionMode / getQuickTranscriptionMode */
export function getTranscriptionMode(): TranscriptionMode {
  return getMeetingTranscriptionMode();
}

/** @deprecated Use setMeetingTranscriptionMode / setQuickTranscriptionMode */
export function setTranscriptionMode(mode: TranscriptionMode): void {
  setMeetingTranscriptionMode(mode);
  setQuickTranscriptionMode(mode);
}

export function getMeetingTranscriptionMode(): TranscriptionMode {
  if (typeof window === "undefined") return "cloud";
  migrateTranscriptionPrefs();
  const v = localStorage.getItem(KEYS.meetingTranscription);
  if (v === "cloud" && !isLocalOnlyMode()) return "cloud";
  if (v === "browser") return "browser";
  return "cloud";
}

export function getQuickTranscriptionMode(): TranscriptionMode {
  if (typeof window === "undefined") return "browser";
  migrateTranscriptionPrefs();
  const v = localStorage.getItem(KEYS.quickTranscription);
  if (v === "cloud" && !isLocalOnlyMode()) return "cloud";
  return "browser";
}

export function setMeetingTranscriptionMode(mode: TranscriptionMode): void {
  const effective = isLocalOnlyMode() ? "browser" : mode;
  localStorage.setItem(KEYS.meetingTranscription, effective);
  localStorage.setItem(KEYS.transcriptionMode, effective);
  window.dispatchEvent(new Event("migiude-settings"));
}

export function setQuickTranscriptionMode(mode: TranscriptionMode): void {
  const effective = isLocalOnlyMode() ? "browser" : mode;
  localStorage.setItem(KEYS.quickTranscription, effective);
  window.dispatchEvent(new Event("migiude-settings"));
}

export function getTranscriptionModeForContext(
  context: TranscriptionContext,
): TranscriptionMode {
  return context === "meeting"
    ? getMeetingTranscriptionMode()
    : getQuickTranscriptionMode();
}

export function subscribeSettings(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener("migiude-settings", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("migiude-settings", handler);
    window.removeEventListener("storage", handler);
  };
}
