"use client";

import { LogoutHeaderButton } from "@/components/auth/logout-header-button";
import { HelpHeaderButton } from "@/components/help/help-header-button";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import { IpodDisplay } from "@/components/dashboard/ipod-display";
import {
  IpodRecordingDisplay,
  type LineAction,
} from "@/components/dashboard/ipod-recording-display";
import { MicHoldButton } from "@/components/dashboard/mic-hold-button";
import { PostSaveAiDialog } from "@/components/dashboard/post-save-ai-dialog";
import { RecordingMicButton } from "@/components/dashboard/recording-mic-button";
import { TemplateSelector } from "@/components/dashboard/template-selector";
import { ThumbRemote } from "@/components/dashboard/thumb-remote";
import { useListenSession } from "@/hooks/use-listen-session";
import { useMeetingTemplates } from "@/hooks/use-meeting-templates";
import { useMeetings } from "@/hooks/use-meetings";
import { useNotes } from "@/hooks/use-notes";
import { useTodos } from "@/hooks/use-todos";
import { useAuthUser } from "@/hooks/use-auth-user";
import { APP_NAME } from "@/lib/branding/app-name";
import type { TranscriptChunk } from "@/lib/speech/types";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

type DashboardViewProps = {
  userId: string;
};

export function DashboardView({ userId }: DashboardViewProps) {
  const { user } = useAuthUser();
  const session = useListenSession(userId);
  const { notes } = useNotes(userId);
  const { meetings } = useMeetings(userId);
  const { openTodos } = useTodos(userId);
  const { templates, selectedId } = useMeetingTemplates(userId);
  const [holdCloudHint, setHoldCloudHint] = useState(false);
  const [isHoldingMic, setIsHoldingMic] = useState(false);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const displayName =
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    "there";

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (openTodos.length > 0) {
      parts.push(
        `${openTodos.length} open follow-up${openTodos.length === 1 ? "" : "s"}`,
      );
    }
    if (meetings.length > 0) {
      parts.push(
        `${meetings.length} meeting${meetings.length === 1 ? "" : "s"}`,
      );
    }
    if (notes.length > 0) {
      parts.push(`${notes.length} note${notes.length === 1 ? "" : "s"}`);
    }
    return parts.length > 0 ? parts.join(" · ") : "Tap the mic to capture";
  }, [openTodos.length, meetings.length, notes.length]);

  const holdHint = useMemo(() => {
    if (session.sessionVisible) return null;
    if (!isHoldingMic) return null;
    if (activeTemplate) {
      return `${activeTemplate.label} — starting cloud meeting…`;
    }
    if (holdCloudHint) {
      return "Cloud session — almost there. Keep holding…";
    }
    return "On-device if you release now. Hold for cloud.";
  }, [isHoldingMic, holdCloudHint, activeTemplate, session.sessionVisible]);

  const onHoldChange = useCallback((holding: boolean, cloudHint: boolean) => {
    setIsHoldingMic(holding);
    setHoldCloudHint(cloudHint);
  }, []);

  const goDevice = useCallback(() => {
    if (activeTemplate) {
      session.startMeeting(activeTemplate, "cloud");
      return;
    }
    session.startQuickListen("browser");
  }, [activeTemplate, session]);

  const goCloud = useCallback(() => {
    session.startMeeting(activeTemplate, "cloud");
  }, [activeTemplate, session]);

  const handleLineAction = useCallback(
    (chunk: TranscriptChunk, action: LineAction) => {
      if (action === "highlight") session.highlightChunk(chunk);
      else if (action === "todo") void session.addTodoFromChunk(chunk);
      else void session.highlightAndTodoFromChunk(chunk);
    },
    [session],
  );

  const recordingTitle = session.inMeeting
    ? session.meetingTitle || "Meeting"
    : activeTemplate?.label ?? "Quick capture";

  const recordingSubtitle = session.inMeeting
    ? session.transcriptionMode === "cloud"
      ? "Cloud meeting · saves to Library"
      : "On-device meeting"
    : session.transcriptionMode === "cloud"
      ? "Cloud capture"
      : "On-device capture";

  if (!session.hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!session.supported) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <h1 className="text-lg font-semibold">Speech recognition unavailable</h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          Use Chrome on desktop, the {APP_NAME} Android app, or enable cloud STT in
          Settings.
        </p>
        <Link
          href="/settings/"
          className="text-sm font-medium text-violet-600 underline dark:text-violet-400"
        >
          Open Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 pt-2">
        <Link
          href="/dashboard/"
          className="flex shrink-0 items-center"
          aria-label={`${APP_NAME} home`}
        >
          <Image
            src="/branding/logo.png"
            alt={APP_NAME}
            width={96}
            height={28}
            unoptimized
            className="h-7 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-0.5">
          <HelpHeaderButton />
          <Link
            href="/settings/"
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <LogoutHeaderButton />
        </div>
      </div>

      <div
        className={
          session.sessionVisible
            ? "flex min-h-0 flex-1 flex-col gap-3 px-4 pb-2 pt-2"
            : "flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-4 pt-2"
        }
      >
        {!session.sessionVisible ? <EmailVerificationBanner /> : null}

        {session.sessionVisible ? (
          <IpodRecordingDisplay
            title={recordingTitle}
            subtitle={recordingSubtitle}
            chunks={session.chunks}
            interimText={session.interimText}
            isListening={session.isListening}
            isPaused={session.isPaused}
            transcriptionMode={session.transcriptionMode}
            capturePhase={
              session.transcriptionMode === "cloud"
                ? session.capturePhase
                : undefined
            }
            highlights={session.highlights}
            lineActionMsg={session.lineActionMsg}
            saveBusy={session.saveBusy}
            error={session.error ?? session.saveError}
            onLineAction={handleLineAction}
            onDiscard={session.discard}
            onContinue={session.resume}
            onSave={() => void session.saveAndClose()}
          />
        ) : (
          <>
            <IpodDisplay
              greeting={`Hello, ${displayName}`}
              subtitle={subtitle}
              holdHint={holdHint}
            />
            <TemplateSelector
              templates={templates}
              selectedId={selectedId}
              onSelect={() => {}}
            />
          </>
        )}

        {session.captureWarning ? (
          <p className="max-w-sm text-center text-[11px] text-amber-800 dark:text-amber-200">
            {session.captureWarning}
          </p>
        ) : null}
      </div>

      <div className="sticky bottom-0 shrink-0 space-y-5 border-t border-border/60 bg-background/95 px-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+var(--free-tier-bottom-inset,0px)))] pt-4 backdrop-blur-sm">
        {session.sessionVisible ? (
          <RecordingMicButton
            isListening={session.isListening}
            starting={session.state === "starting"}
            onPress={() => {
              if (session.isListening) session.pause();
              else session.resume();
            }}
          />
        ) : (
          <>
            <MicHoldButton
              onTap={goDevice}
              onCloudHoldComplete={goCloud}
              onHoldChange={onHoldChange}
              cloudTemplateMode={Boolean(activeTemplate)}
            />
            <ThumbRemote />
          </>
        )}
      </div>

      {session.savedCapture ? (
        <PostSaveAiDialog
          capture={session.savedCapture}
          userId={userId}
          onClose={session.dismissSavedCapture}
        />
      ) : null}
    </div>
  );
}
