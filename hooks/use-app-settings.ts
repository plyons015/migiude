"use client";

import {
  areNotificationsEnabled,
  getSpeechLanguage,
  getThemePreference,
  areVoiceCommandsEnabled,
  getRollingSummaryMinutes,
  getMeetingTranscriptionMode,
  getQuickTranscriptionMode,
  getWhisperModelSize,
  isLocalOnlyMode,
  isRollingSummaryEnabled,
  isWhisperVadEnabled,
  isWhisperWifiOnlyDownload,
  isPreferNativeWhisper,
  getMeetingHoldSeconds,
  meetingHoldMs,
  meetingHoldPurpleMs,
  subscribeSettings,
  areLocalTodoHintsEnabled,
  setLocalTodoHintsEnabled,
  type SpeechLanguage,
  type ThemePreference,
  type TranscriptionMode,
  type WhisperModelSize,
  type MeetingHoldSeconds,
} from "@/lib/settings/preferences";
import { useSyncExternalStore } from "react";

function useSettingsSnapshot<T>(read: () => T, serverFallback: T): T {
  return useSyncExternalStore(
    subscribeSettings,
    read,
    () => serverFallback,
  );
}

export function useAppSettings() {
  const speechLang = useSettingsSnapshot(getSpeechLanguage, "en-US");
  const localOnly = useSettingsSnapshot(isLocalOnlyMode, false);
  const notifications = useSettingsSnapshot(areNotificationsEnabled, true);
  const theme = useSettingsSnapshot(getThemePreference, "system");
  const rollingSummary = useSettingsSnapshot(isRollingSummaryEnabled, false);
  const rollingSummaryMinutes = useSettingsSnapshot(
    getRollingSummaryMinutes,
    5,
  );
  const voiceCommands = useSettingsSnapshot(areVoiceCommandsEnabled, true);
  const meetingTranscriptionMode = useSettingsSnapshot(
    getMeetingTranscriptionMode,
    "cloud" as TranscriptionMode,
  );
  const quickTranscriptionMode = useSettingsSnapshot(
    getQuickTranscriptionMode,
    "browser" as TranscriptionMode,
  );
  const whisperModelSize = useSettingsSnapshot(
    getWhisperModelSize,
    "tiny" as WhisperModelSize,
  );
  const whisperVadEnabled = useSettingsSnapshot(isWhisperVadEnabled, true);
  const whisperWifiOnlyDownload = useSettingsSnapshot(
    isWhisperWifiOnlyDownload,
    false,
  );
  const localTodoHints = useSettingsSnapshot(areLocalTodoHintsEnabled, true);
  const preferNativeWhisper = useSettingsSnapshot(isPreferNativeWhisper, true);
  const meetingHoldSeconds = useSettingsSnapshot(getMeetingHoldSeconds, 5);

  return {
    speechLang: speechLang as SpeechLanguage,
    localOnly,
    notifications,
    theme: theme as ThemePreference,
    rollingSummary,
    rollingSummaryMinutes,
    voiceCommands,
    meetingTranscriptionMode:
      meetingTranscriptionMode as TranscriptionMode,
    quickTranscriptionMode: quickTranscriptionMode as TranscriptionMode,
    whisperModelSize: whisperModelSize as WhisperModelSize,
    whisperVadEnabled,
    whisperWifiOnlyDownload,
    localTodoHints,
    preferNativeWhisper,
    meetingHoldSeconds,
    meetingHoldMs: meetingHoldMs(meetingHoldSeconds),
    meetingHoldPurpleMs: meetingHoldPurpleMs(meetingHoldSeconds),
  };
}

export type { MeetingHoldSeconds };
