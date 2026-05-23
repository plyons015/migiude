"use client";

import {
  areNotificationsEnabled,
  getSpeechLanguage,
  getThemePreference,
  areVoiceCommandsEnabled,
  getRollingSummaryMinutes,
  isAutoAiOnMeetingEnd,
  isCommitmentAwarenessEnabled,
  getMeetingTranscriptionMode,
  getQuickTranscriptionMode,
  isLocalOnlyMode,
  isRollingSummaryEnabled,
  isSmartTagsOnEnd,
  subscribeSettings,
  type SpeechLanguage,
  type ThemePreference,
  type TranscriptionMode,
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
  const autoAiOnMeetingEnd = useSettingsSnapshot(isAutoAiOnMeetingEnd, true);
  const rollingSummary = useSettingsSnapshot(isRollingSummaryEnabled, false);
  const rollingSummaryMinutes = useSettingsSnapshot(
    getRollingSummaryMinutes,
    5,
  );
  const smartTagsOnEnd = useSettingsSnapshot(isSmartTagsOnEnd, true);
  const voiceCommands = useSettingsSnapshot(areVoiceCommandsEnabled, true);
  const commitmentAwareness = useSettingsSnapshot(
    isCommitmentAwarenessEnabled,
    true,
  );
  const meetingTranscriptionMode = useSettingsSnapshot(
    getMeetingTranscriptionMode,
    "cloud" as TranscriptionMode,
  );
  const quickTranscriptionMode = useSettingsSnapshot(
    getQuickTranscriptionMode,
    "browser" as TranscriptionMode,
  );

  return {
    speechLang: speechLang as SpeechLanguage,
    localOnly,
    notifications,
    theme: theme as ThemePreference,
    autoAiOnMeetingEnd,
    rollingSummary,
    rollingSummaryMinutes,
    smartTagsOnEnd,
    voiceCommands,
    commitmentAwareness,
    meetingTranscriptionMode:
      meetingTranscriptionMode as TranscriptionMode,
    quickTranscriptionMode: quickTranscriptionMode as TranscriptionMode,
  };
}
