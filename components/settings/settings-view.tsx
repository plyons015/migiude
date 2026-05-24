"use client";

import { SecuritySettings } from "@/components/auth/security-settings";
import { MeetingTemplatesSettings } from "@/components/settings/meeting-templates-settings";
import { BillingSettings } from "@/components/settings/billing-settings";
import { APP_NAME } from "@/lib/branding/app-name";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { useAppSettings } from "@/hooks/use-app-settings";
import { clearAllLocalData } from "@/lib/data/local-db";
import { aiService } from "@/lib/ai/ai-service";
import type { AiProvider } from "@/lib/ai/types";
import { requestNotificationPermission } from "@/lib/notifications/reminders";
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
  SPEECH_LANGUAGES,
  type TranscriptionMode,
  type SpeechLanguage,
  type ThemePreference,
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
import Link from "next/link";
import { useState } from "react";

export function SettingsView() {
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
                <SelectItem value="browser">Browser speech — fastest</SelectItem>
                <SelectItem value="cloud">Cloud STT — speakers</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localOnly
                ? "Local-only: browser speech only."
                : quickTranscriptionMode === "cloud"
                  ? "Cloud chunks for the big mic button. Uses AI billing."
                  : "Default for counseling on the fly — no audio upload."}
            </p>
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
                <SelectItem value="browser">Browser speech</SelectItem>
                <SelectItem value="cloud">
                  Cloud STT — speakers (recommended)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localOnly
                ? "Local-only: browser speech only."
                : meetingTranscriptionMode === "cloud"
                  ? "Speaker labels in the meeting room. Works when browser speech fails."
                  : "Browser speech for full meetings — no speaker split."}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Android: while the mic is on, {APP_NAME} pauses most other apps&apos;
            audio. Close music or video apps if you still see foreign text in the
            transcript.
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
              void clearAllLocalData()
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
