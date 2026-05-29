"use client";

import { SecuritySettings } from "@/components/auth/security-settings";
import { MeetingTemplatesSettings } from "@/components/settings/meeting-templates-settings";
import { BillingSettings } from "@/components/settings/billing-settings";
import { MicrosoftTeamsIntegration } from "@/components/settings/microsoft-teams-integration";
import { OnDeviceModesCard } from "@/components/settings/on-device-modes-card";
import { SpeechPersonalizationSettings } from "@/components/settings/speech-personalization-settings";
import { APP_NAME } from "@/lib/branding/app-name";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuthUser } from "@/hooks/use-auth-user";
import { clearAllLocalData } from "@/lib/data/local-db";
import { clearSpeechPersonalizationDb } from "@/lib/speech/personalization-store";
import { aiService } from "@/lib/ai/ai-service";
import type { AiProvider } from "@/lib/ai/types";
import { requestNotificationPermission } from "@/lib/notifications/reminders";
import { WHISPER_MODEL_OPTIONS, whisperModelApproxMb } from "@/lib/speech/whisper-models";
import {
  setLocalOnlyMode,
  setNotificationsEnabled,
  setRollingSummaryEnabled,
  setRollingSummaryMinutes,
  setSpeechLanguage,
  setThemePreference,
  setVoiceCommandsEnabled,
  setMeetingTranscriptionMode,
  setQuickTranscriptionMode,
  setWhisperModelSize,
  setWhisperVadEnabled,
  setWhisperWifiOnlyDownload,
  setPreferNativeWhisper,
  setMeetingHoldSeconds,
  MEETING_HOLD_OPTIONS,
  setLocalTodoHintsEnabled,
  SPEECH_LANGUAGES,
  type TranscriptionMode,
  type WhisperModelSize,
  type SpeechLanguage,
  type ThemePreference,
  type MeetingHoldSeconds,
} from "@/lib/settings/preferences";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { knowledgeBaseArticlePath } from "@/lib/help/knowledge-base";
import Link from "next/link";
import { useState } from "react";

export function SettingsView() {
  const { user } = useAuthUser();
  const userId = user?.uid ?? "";
  const { provider, setProvider } = useAiSettings();
  const {
    speechLang,
    localOnly,
    notifications,
    theme,
    rollingSummary,
    rollingSummaryMinutes,
    voiceCommands,
    meetingTranscriptionMode,
    quickTranscriptionMode,
    whisperModelSize,
    whisperVadEnabled,
    whisperWifiOnlyDownload,
    preferNativeWhisper,
    meetingHoldSeconds,
    localTodoHints,
  } = useAppSettings();
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 pb-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Model, voice, privacy, and appearance
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI model</CardTitle>
          <CardDescription>
            Processed on Firebase Functions — keys never stored on device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {(["gemini", "grok"] as AiProvider[]).map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={provider === p ? "default" : "outline"}
                onClick={() => {
                  aiService.setPreferredProvider(p);
                  setProvider(p);
                }}
                className="capitalize"
              >
                {p}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Default: {aiService.getTaskLabel("generic")} via {provider}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice & transcription</CardTitle>
          <CardDescription>
            Set once — mic and Start meeting use different modes (no switching
            mid-session)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-transcription-mode">Quick record (mic)</Label>
            <Select
              value={localOnly ? "browser" : quickTranscriptionMode}
              disabled={localOnly}
              onValueChange={(v) =>
                setQuickTranscriptionMode(v as TranscriptionMode)
              }
            >
              <SelectTrigger id="quick-transcription-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">
                  On-device — Whisper (private)
                </SelectItem>
                <SelectItem value="cloud">Cloud STT — speakers</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localOnly
                ? "Local-only: on-device Whisper or browser speech fallback."
                : quickTranscriptionMode === "cloud"
                  ? "Cloud chunks for the big mic button. Uses AI billing."
                  : "Tap mic: Whisper runs in your browser. Audio stays on device."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whisper-model-size">On-device model</Label>
            <Select
              value={whisperModelSize}
              onValueChange={(v) => setWhisperModelSize(v as WhisperModelSize)}
            >
              <SelectTrigger id="whisper-model-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WHISPER_MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Downloaded once and cached in your browser (~
              {whisperModelApproxMb(whisperModelSize, speechLang)} MB). Non-English
              languages use multilingual Whisper models.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="local-todo-hints">On-device todo hints</Label>
              <p className="text-xs text-muted-foreground">
                Suggest follow-ups from phrases like &quot;I will…&quot; (no cloud AI)
              </p>
            </div>
            <Switch
              id="local-todo-hints"
              checked={localTodoHints}
              onCheckedChange={setLocalTodoHintsEnabled}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="whisper-vad">Pause on silence</Label>
              <p className="text-xs text-muted-foreground">
                Skip Whisper while quiet — saves battery on long sessions
              </p>
            </div>
            <Switch
              id="whisper-vad"
              checked={whisperVadEnabled}
              onCheckedChange={setWhisperVadEnabled}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="whisper-wifi">Wi‑Fi only model download</Label>
              <p className="text-xs text-muted-foreground">
                Block first-time model download on cellular data
              </p>
            </div>
            <Switch
              id="whisper-wifi"
              checked={whisperWifiOnlyDownload}
              onCheckedChange={setWhisperWifiOnlyDownload}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-hold-seconds">Meeting hold duration</Label>
            <Select
              value={String(meetingHoldSeconds)}
              onValueChange={(v) =>
                setMeetingHoldSeconds(Number(v) as MeetingHoldSeconds)
              }
            >
              <SelectTrigger id="meeting-hold-seconds">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEETING_HOLD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How long to hold the home mic before cloud meeting mode starts.
              Violet ring appears halfway.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="prefer-native-whisper">
                Native Whisper (Android)
              </Label>
              <p className="text-xs text-muted-foreground">
                Use whisper.cpp on arm64 phones for faster capture. Emulators and
                web use browser WASM instead.
              </p>
            </div>
            <Switch
              id="prefer-native-whisper"
              checked={preferNativeWhisper}
              onCheckedChange={setPreferNativeWhisper}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-transcription-mode">
              Meetings (Start meeting)
            </Label>
            <Select
              value={localOnly ? "browser" : meetingTranscriptionMode}
              disabled={localOnly}
              onValueChange={(v) =>
                setMeetingTranscriptionMode(v as TranscriptionMode)
              }
            >
              <SelectTrigger id="meeting-transcription-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">On-device Whisper</SelectItem>
                <SelectItem value="cloud">
                  Cloud STT — speakers (recommended)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localOnly
                ? "Local-only: on-device speech only."
                : meetingTranscriptionMode === "cloud"
                  ? "Speaker labels in the meeting room. Works when on-device fails."
                  : `Hold mic ${meetingHoldSeconds}s or use cloud meeting mode for speaker labels.`}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Android: while the mic is on, {APP_NAME} pauses most other apps&apos;
            audio. Close music or video apps if you still see foreign text in the
            transcript.
          </p>
          <p className="text-xs text-muted-foreground">
            Recording alongside Teams, Zoom, or Meet?{" "}
            <Link
              href={knowledgeBaseArticlePath("teams-zoom-meet")}
              className="font-medium text-violet-600 underline dark:text-violet-400"
            >
              Read the video-call guide
            </Link>{" "}
            (headphones, Cloud STT, mixed accents).
          </p>
          <Label htmlFor="speech-lang">Recognition language</Label>
          <Select
            value={speechLang}
            onValueChange={(v) => setSpeechLanguage(v as SpeechLanguage)}
          >
            <SelectTrigger id="speech-lang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEECH_LANGUAGES.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <OnDeviceModesCard />

      {userId ? <SpeechPersonalizationSettings userId={userId} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meetings</CardTitle>
          <CardDescription>
            During recording on Listen. Use AI actions after the meeting for
            summary, todos, and commitments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="rolling-summary">Rolling summary</Label>
              <p className="text-xs text-muted-foreground">
                Periodic AI summary while a meeting is recording
              </p>
            </div>
            <Switch
              id="rolling-summary"
              checked={rollingSummary}
              onCheckedChange={setRollingSummaryEnabled}
            />
          </div>
          {rollingSummary ? (
            <div className="space-y-2">
              <Label htmlFor="rolling-min">Interval (minutes)</Label>
              <Select
                value={String(rollingSummaryMinutes)}
                onValueChange={(v) => setRollingSummaryMinutes(Number(v))}
              >
                <SelectTrigger id="rolling-min">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 5, 10, 15].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="voice-cmd">Voice commands</Label>
              <p className="text-xs text-muted-foreground">
                &quot;add todo: …&quot;, &quot;highlight&quot;, &quot;summarize
                so far&quot;
              </p>
            </div>
            <Switch
              id="voice-cmd"
              checked={voiceCommands}
              onCheckedChange={setVoiceCommandsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <SecuritySettings />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Help & support</CardTitle>
          <CardDescription>
            Use the <strong>?</strong> button at the bottom-right of the screen
            for guides, how-tos (coming soon), and support messages.
          </CardDescription>
        </CardHeader>
      </Card>

      <MeetingTemplatesSettings />

      <MicrosoftTeamsIntegration />

      <BillingSettings />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy</CardTitle>
          <CardDescription>
            Browser mode: no audio saved. Cloud STT: chunks sent for transcription,
            not retained on server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="local-only">Local-only mode</Label>
              <p className="text-xs text-muted-foreground">
                Notes and todos stay on this device (IndexedDB)
              </p>
            </div>
            <Switch
              id="local-only"
              checked={localOnly}
              onCheckedChange={setLocalOnlyMode}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Todo reminders</Label>
              <p className="text-xs text-muted-foreground">
                System notifications when todos are due
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notifications}
              onCheckedChange={(on) => {
                setNotificationsEnabled(on);
                if (on) void requestNotificationPermission();
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              void Promise.all([
                clearAllLocalData(),
                clearSpeechPersonalizationDb(),
              ])
                .then(() => setStatus("Local notes, todos, and meetings cleared."))
                .catch((e) => setStatus(String(e)));
            }}
          >
            Clear local data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="theme">Theme</Label>
          <Select
            value={theme}
            onValueChange={(v) => setThemePreference(v as ThemePreference)}
          >
            <SelectTrigger id="theme" className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Android</CardTitle>
          <CardDescription>Release APK, FCM, onboarding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <code className="text-xs">npm run cap:android</code> → signed APK — see{" "}
            <Link href="/setup/" className="underline">Setup</Link>
          </p>
          <p className="text-xs">
            FCM: add <code className="text-xs">android/app/google-services.json</code>{" "}
            from Firebase Console.
          </p>
          <Link href="/onboarding/" className="text-xs font-medium underline">
            Replay onboarding
          </Link>
        </CardContent>
      </Card>

      {status ? (
        <p className="text-center text-xs text-muted-foreground">{status}</p>
      ) : null}
    </div>
  );
}
