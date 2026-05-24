"use client";

import { AiActionsPanel } from "@/components/listen/ai-actions-panel";
import { StartMeetingPanel } from "@/components/listen/start-meeting-panel";
import { HighlightsList } from "@/components/listen/highlights-list";
import { RollingSummaryPanel } from "@/components/listen/rolling-summary-panel";
import { TagChipInput } from "@/components/listen/tag-chip-input";
import { TranscriptPanel } from "@/components/listen/transcript-panel";
import { useAiSettings } from "@/hooks/use-ai-settings";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useMeetings } from "@/hooks/use-meetings";
import { useTodos } from "@/hooks/use-todos";
import { useTranscription } from "@/hooks/use-transcription";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { copyToClipboard } from "@/lib/clipboard";
import { createId } from "@/lib/data/ids";
import { aiService } from "@/lib/ai/ai-service";
import { createMeetingId } from "@/lib/data/meetings-store";
import { saveNote } from "@/lib/data/notes-store";
import { saveTodo } from "@/lib/data/todos-store";
import type { TranscriptHighlight } from "@/lib/data/types";
import { getCapacitorPlatform, isAndroid } from "@/lib/capacitor/platform";
import { APP_NAME } from "@/lib/branding/app-name";
import { showImmediateLocalNotification } from "@/lib/notifications/native-reminders";
import { isFirebaseConfigured } from "@/lib/env/client";
import {
  clearActiveMeeting,
  loadActiveMeeting,
  saveActiveMeeting,
  type ActiveMeetingDraft,
} from "@/lib/meetings/active-meeting";
import { getSeriesForTag } from "@/lib/library/queries";
import { finalizeMeeting } from "@/lib/meetings/finalize-meeting";
import {
  applyTemplateTitle,
  buildTemplateMinutesScaffold,
} from "@/lib/meetings/templates";
import type { MeetingTemplate } from "@/lib/meetings/template-schema";
import { resolveMeetingTemplate } from "@/lib/meetings/custom-templates-store";
import {
  clearListenSession,
  loadListenSession,
  saveListenSession,
} from "@/lib/listen/session-persist";
import { parseListenLaunchParams } from "@/lib/listen/launch-url";
import { runVoiceCommand } from "@/lib/listen/voice-commands";
import type { TranscriptionMode } from "@/lib/speech/types";
import { format } from "date-fns";
import {
  AlertCircle,
  Copy,
  Mic,
  MicOff,
  RotateCcw,
  Save,
  Shield,
  Square,
  Star,
  Trash2,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function ListenMode() {
  const searchParams = useSearchParams();
  const launchHandledRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingSession, setPendingSession] = useState(
    () => loadListenSession(),
  );
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingDraft | null>(
    null,
  );
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingTags, setMeetingTags] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<TranscriptHighlight[]>([]);
  const [highlightNote, setHighlightNote] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const [saveBusy, setSaveBusy] = useState(false);
  const [endBusy, setEndBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [endResult, setEndResult] = useState<{
    meetingId: string;
    noteId: string;
  } | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [rollingSummaries, setRollingSummaries] = useState<
    { at: number; text: string }[]
  >([]);
  const [rollingBusy, setRollingBusy] = useState(false);
  const [commandMsg, setCommandMsg] = useState<string | null>(null);
  const lastCmdChunkId = useRef<string | null>(null);
  const lastRollingAt = useRef<number>(0);
  const meetingStartRef = useRef<number>(0);

  const {
    rollingSummary,
    rollingSummaryMinutes,
    voiceCommands,
    localOnly,
  } = useAppSettings();
  const { provider } = useAiSettings();

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    const draft = loadActiveMeeting();
    if (draft) {
      setActiveMeeting(draft);
      setMeetingTitle(draft.title);
      setMeetingTags(draft.tags);
    }
  }, [hydrated]);

  useEffect(() => {
    if (!activeMeeting) return;
    saveActiveMeeting({
      ...activeMeeting,
      title: meetingTitle,
      tags: meetingTags,
    });
  }, [activeMeeting, meetingTitle, meetingTags]);

  const inMeeting = activeMeeting !== null;

  const {
    supported,
    state,
    isListening,
    interimText,
    chunks,
    fullTranscript,
    error,
    startListening,
    stopListening,
    clearTranscript,
    restoreTranscript,
    transcriptionMode,
    meetingTranscriptionMode,
    quickTranscriptionMode,
    captureWarning,
    capturePhase,
  } = useTranscription(inMeeting ? "meeting" : "quick");

  const { supported: wakeLockSupported } = useWakeLock(isListening);
  const { uid, ensureSignedIn } = useAuthUser();
  const { meetings } = useMeetings(uid);
  const { todos } = useTodos(uid);
  const platform = getCapacitorPlatform();
  const transcriptText = fullTranscript;
  const hasTranscript = transcriptText.trim().length > 0;

  const seriesHint = useMemo(() => {
    if (!uid || meetings.length === 0) return null;
    for (const tag of ["1:1", "client", "standup"]) {
      const s = getSeriesForTag(meetings, tag, todos);
      if (s.openTodos.length > 0) return { tag, count: s.openTodos.length };
    }
    return null;
  }, [uid, meetings, todos]);

  useEffect(() => {
    if (!hasTranscript && !highlights.length) return;
    saveListenSession(chunks, highlights);
  }, [chunks, highlights, hasTranscript]);

  useEffect(() => {
    if (!saveTitle && hasTranscript && !inMeeting) {
      setSaveTitle(`Listen ${format(new Date(), "MMM d HH:mm")}`);
    }
  }, [hasTranscript, saveTitle, inMeeting]);

  const handleRestoreSession = useCallback(() => {
    const session = pendingSession ?? loadListenSession();
    if (!session) return;
    restoreTranscript(session.chunks);
    setHighlights(session.highlights);
    setPendingSession(null);
    clearListenSession();
  }, [pendingSession, restoreTranscript]);

  const handleDiscardSession = useCallback(() => {
    setPendingSession(null);
    clearListenSession();
  }, []);

  const handleClearAll = useCallback(() => {
    clearTranscript();
    setHighlights([]);
    setHighlightNote("");
    setSaveMsg(null);
    setEndResult(null);
    setPendingSession(null);
    clearListenSession();
  }, [clearTranscript]);

  const handleStartMeeting = useCallback(
    (
      template: MeetingTemplate | null,
      opts?: { mode?: TranscriptionMode },
    ) => {
    setEndResult(null);
    setSaveMsg(null);
    const id = createMeetingId();
    const now = new Date();
    const title = template
      ? applyTemplateTitle(template, now)
      : `Meeting ${format(now, "MMM d HH:mm")}`;
    const draft: ActiveMeetingDraft = {
      id,
      title,
      startedAt: Date.now(),
      tags: template?.tags ? [...template.tags] : [],
      agenda: template?.agenda,
      templateId: template?.id,
    };
    saveActiveMeeting(draft);
    setActiveMeeting(draft);
    setMeetingTitle(title);
    setMeetingTags(template?.tags ? [...template.tags] : []);
    meetingStartRef.current = draft.startedAt;
    lastRollingAt.current = Date.now();
    setRollingSummaries([]);
    clearTranscript();
    setHighlights([]);
    clearListenSession();
    void startListening({ context: "meeting", mode: opts?.mode });
  },
    [clearTranscript, startListening],
  );

  useEffect(() => {
    if (!hydrated || !supported || launchHandledRef.current) return;
    const launch = parseListenLaunchParams(searchParams);
    if (!launch.autostart || !launch.mode) return;
    launchHandledRef.current = true;
    const mode: TranscriptionMode =
      launch.mode === "cloud" ? "cloud" : "browser";
    if (launch.meeting) {
      const template = launch.templateId
        ? resolveMeetingTemplate(launch.templateId, uid) ?? null
        : null;
      const meetingMode: TranscriptionMode =
        template?.preferCloud || launch.mode === "cloud" ? "cloud" : "browser";
      handleStartMeeting(template, { mode: meetingMode });
      return;
    }
    void startListening({ context: "quick", mode });
  }, [hydrated, supported, searchParams, handleStartMeeting, startListening, uid]);

  const handleCancelMeeting = useCallback(() => {
    if (isListening) stopListening();
    clearActiveMeeting();
    setActiveMeeting(null);
    handleClearAll();
  }, [isListening, stopListening, handleClearAll]);

  const doFinalizeMeeting = useCallback(
    async (tags: string[]) => {
      if (!activeMeeting) return;
      setEndBusy(true);
      try {
        const userId = uid ?? (await ensureSignedIn()).uid;
        const result = await finalizeMeeting(userId, {
          meetingId: activeMeeting.id,
          title: meetingTitle,
          startedAt: activeMeeting.startedAt,
          transcript: transcriptText,
          tags: tags.length ? tags : undefined,
          highlights: highlights.length ? highlights : undefined,
          agenda: activeMeeting.agenda,
          templateId: activeMeeting.templateId,
        });
        clearActiveMeeting();
        setActiveMeeting(null);
        handleClearAll();
        setMeetingTitle("");
        setMeetingTags([]);
        setRollingSummaries([]);
        setEndResult({
          meetingId: result.meeting.id,
          noteId: result.noteId,
        });
        void showImmediateLocalNotification(
          "Meeting saved",
          "Transcript saved — use AI actions or the meeting room for summary",
        );
      } catch (e) {
        setSaveMsg(e instanceof Error ? e.message : "Could not end meeting.");
      } finally {
        setEndBusy(false);
      }
    },
    [
      activeMeeting,
      uid,
      ensureSignedIn,
      meetingTitle,
      transcriptText,
      highlights,
      handleClearAll,
    ],
  );

  const handleEndMeeting = useCallback(() => {
    if (!activeMeeting) return;
    setSaveMsg(null);
    setEndResult(null);
    if (isListening) stopListening();
    void doFinalizeMeeting(meetingTags);
  }, [
    activeMeeting,
    isListening,
    stopListening,
    meetingTags,
    doFinalizeMeeting,
  ]);

  const handleCopyTranscript = useCallback(async () => {
    const ok = await copyToClipboard(transcriptText);
    setCopyMsg(ok ? "Copied." : "Copy failed.");
    setTimeout(() => setCopyMsg(null), 2000);
  }, [transcriptText]);

  const handleAddHighlight = useCallback(() => {
    const line =
      chunks.length > 0
        ? chunks[chunks.length - 1].text
        : interimText.trim() ||
          (transcriptText.trim().split("\n").pop() ?? "");
    if (!line.trim()) return;
    setHighlights((prev) => [
      ...prev,
      {
        id: createId("hl"),
        text: line.trim(),
        note: highlightNote.trim() || undefined,
        createdAt: Date.now(),
      },
    ]);
    setHighlightNote("");
  }, [chunks, interimText, transcriptText, highlightNote]);

  useEffect(() => {
    if (!voiceCommands || chunks.length === 0) return;
    const last = chunks[chunks.length - 1];
    if (lastCmdChunkId.current === last.id) return;
    lastCmdChunkId.current = last.id;

    void runVoiceCommand(last.text, {
      onAddTodo: async (text) => {
        if (!isFirebaseConfigured()) return;
        const userId = uid ?? (await ensureSignedIn()).uid;
        await saveTodo(userId, {
          text,
          meetingId: activeMeeting?.id,
        });
        setCommandMsg(`Todo: ${text}`);
        setTimeout(() => setCommandMsg(null), 3000);
      },
      onHighlight: () => {
        handleAddHighlight();
        setCommandMsg("Highlighted");
        setTimeout(() => setCommandMsg(null), 3000);
      },
      onSummarizeSoFar: async () => {
        if (!transcriptText.trim() || !isFirebaseConfigured()) return;
        setRollingBusy(true);
        try {
          await ensureSignedIn();
          const out = await aiService.summarize(transcriptText, provider);
          setRollingSummaries((prev) => [
            ...prev,
            { at: Date.now(), text: out.result },
          ]);
          setCommandMsg("Summary updated");
        } catch {
          setCommandMsg("Summary failed");
        } finally {
          setRollingBusy(false);
          setTimeout(() => setCommandMsg(null), 3000);
        }
      },
    });
  }, [
    voiceCommands,
    chunks,
    uid,
    ensureSignedIn,
    activeMeeting?.id,
    handleAddHighlight,
    transcriptText,
    provider,
  ]);

  useEffect(() => {
    if (!rollingSummary || !isListening || !inMeeting) return;
    if (transcriptText.trim().length < 40) return;

    const intervalMs = rollingSummaryMinutes * 60_000;
    const tick = window.setInterval(() => {
      if (Date.now() - lastRollingAt.current < intervalMs) return;
      if (!isFirebaseConfigured() || rollingBusy) return;

      lastRollingAt.current = Date.now();
      setRollingBusy(true);
      void (async () => {
        try {
          await ensureSignedIn();
          const out = await aiService.summarize(transcriptText, provider);
          setRollingSummaries((prev) => [
            ...prev,
            { at: Date.now(), text: out.result },
          ]);
        } catch {
          /* ignore */
        } finally {
          setRollingBusy(false);
        }
      })();
    }, 30_000);

    return () => clearInterval(tick);
  }, [
    rollingSummary,
    rollingSummaryMinutes,
    isListening,
    inMeeting,
    transcriptText,
    provider,
    rollingBusy,
    ensureSignedIn,
  ]);

  const showRestoreBanner =
    hydrated &&
    !inMeeting &&
    pendingSession &&
    pendingSession.chunks.length > 0 &&
    chunks.length === 0 &&
    !isListening;

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const configuredMode = inMeeting
    ? meetingTranscriptionMode
    : quickTranscriptionMode;
  const displayMode = isListening ? transcriptionMode : configuredMode;
  const modeLabel = inMeeting ? "Meeting" : "Quick";

  if (!supported) {
    const cloudMode = configuredMode === "cloud" && !localOnly;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500" />
        <h1 className="text-lg font-semibold">
          {cloudMode ? "Cloud transcription unavailable" : "Speech recognition unavailable"}
        </h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          {cloudMode
            ? "Sign in, configure Firebase, deploy transcribeAudio, and allow microphone access. Or switch to Browser speech in Settings."
            : `Web Speech API is not supported here. Use Chrome on desktop, the ${APP_NAME} Android app (${platform}), or enable Meeting mode (cloud STT) in Settings.`}
        </p>
        {cloudMode ? (
          <Link
            href="/settings/"
            className="text-sm font-medium text-violet-600 underline dark:text-violet-400"
          >
            Open Settings
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="shrink-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {inMeeting ? "Meeting in progress" : "Listen mode"}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {inMeeting
                ? "Transcript saves to a canonical note when you end."
                : "Start a meeting or quick-listen without a session."}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${
              displayMode === "cloud" && !localOnly
                ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
            }`}
            title={
              displayMode === "cloud" && !localOnly
                ? "Short audio chunks are sent for transcription and not kept on the server"
                : "No audio files are written to disk"
            }
          >
            <Shield className="h-3 w-3" />
            {displayMode === "cloud" && !localOnly
              ? `${modeLabel} · cloud`
              : `${modeLabel} · on-device`}
          </span>
        </div>

        {hasTranscript ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyTranscript()}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-600"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy transcript
            </button>
            {copyMsg ? (
              <span className="self-center text-xs text-zinc-500">{copyMsg}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {!inMeeting && isFirebaseConfigured() ? (
        <StartMeetingPanel
          disabled={endBusy}
          onStart={handleStartMeeting}
          seriesTag={seriesHint?.tag ?? null}
          seriesOpenCount={seriesHint?.count ?? 0}
        />
      ) : null}

      {!inMeeting ? (
        <p className="text-center text-[11px] text-zinc-500">
          Inform participants where required before recording in shared spaces.
        </p>
      ) : null}

      {inMeeting ? (
        <div className="shrink-0 space-y-2 rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className="w-full rounded-lg border border-violet-200 bg-transparent px-3 py-2 text-sm font-medium dark:border-violet-800"
            placeholder="Meeting title"
          />
          <TagChipInput
            tags={meetingTags}
            onChange={setMeetingTags}
            disabled={endBusy}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={endBusy}
              onClick={() => void handleEndMeeting()}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              End meeting
            </button>
            <button
              type="button"
              disabled={endBusy}
              onClick={handleCancelMeeting}
              className="rounded-full border border-violet-300 px-4 py-2 text-sm dark:border-violet-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {voiceCommands && inMeeting ? (
        <p className="text-center text-[11px] text-zinc-500">
          Or say: &quot;add todo: …&quot;, &quot;highlight&quot;, &quot;summarize so
          far&quot;
        </p>
      ) : null}

      {commandMsg ? (
        <p className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {commandMsg}
        </p>
      ) : null}

      {endResult ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            Meeting saved
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link
              href={`/meetings/?id=${endResult.meetingId}&tab=summary`}
              className="font-medium text-emerald-700 underline dark:text-emerald-300"
            >
              View meeting
            </Link>
            <Link
              href={`/notes/?id=${endResult.noteId}`}
              className="font-medium text-emerald-700 underline dark:text-emerald-300"
            >
              Canonical note
            </Link>
          </div>
        </div>
      ) : null}

      {showRestoreBanner ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm dark:border-sky-900/50 dark:bg-sky-950/30">
          <span className="text-sky-900 dark:text-sky-100">
            Continue previous session ({pendingSession.chunks.length} lines)?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRestoreSession}
              className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </button>
            <button
              type="button"
              onClick={handleDiscardSession}
              className="rounded-full border border-sky-300 px-3 py-1 text-xs dark:border-sky-700"
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {captureWarning ? (
        <p className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {captureWarning}
        </p>
      ) : null}

      {isListening && isAndroid() ? (
        <p className="shrink-0 text-center text-[11px] text-zinc-500">
          Other apps&apos; audio is paused while the mic is on. Use headphones if
          you still hear bleed from the speaker.
        </p>
      ) : null}

      <TranscriptPanel
        chunks={chunks}
        interimText={interimText}
        isListening={isListening}
        transcriptionMode={transcriptionMode}
        capturePhase={
          transcriptionMode === "cloud" ? capturePhase : undefined
        }
      />

      <RollingSummaryPanel summaries={rollingSummaries} busy={rollingBusy} />

      <HighlightsList highlights={highlights} />

      {!isListening && hasTranscript ? (
        <div className="shrink-0 space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500">Highlight a moment</p>
          <input
            type="text"
            value={highlightNote}
            onChange={(e) => setHighlightNote(e.target.value)}
            placeholder="Optional note for next highlight…"
            className="w-full rounded-lg border border-zinc-200 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
          />
          <button
            type="button"
            onClick={handleAddHighlight}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <Star className="h-4 w-4" />
            Highlight latest line
          </button>
        </div>
      ) : null}

      <AiActionsPanel
        transcript={transcriptText}
        disabled={isListening}
        templateId={activeMeeting?.templateId}
      />

      <div className="shrink-0 space-y-3">
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() =>
              void (isListening
                ? stopListening()
                : startListening({
                    context: inMeeting ? "meeting" : "quick",
                  }))
            }
            aria-pressed={isListening}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            className={`flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 ${
              isListening
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            }`}
          >
            {isListening ? (
              <MicOff className="h-9 w-9" />
            ) : (
              <Mic className="h-9 w-9" />
            )}
          </button>
        </div>

        <p className="text-center text-xs text-zinc-500">
          {state === "starting"
            ? "Starting…"
            : isListening
              ? "Tap to stop mic"
              : inMeeting
                ? "Tap to listen again"
                : "Quick listen (no meeting)"}
          {wakeLockSupported && isListening ? " · Screen kept awake" : ""}
        </p>

        {!inMeeting && hasTranscript && isFirebaseConfigured() ? (
          <div className="space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500">Quick save (no meeting)</p>
            <input
              type="text"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              placeholder="Note title"
              className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm font-medium dark:border-zinc-700"
            />
            <TagChipInput
              tags={saveTags}
              onChange={setSaveTags}
              disabled={saveBusy || isListening}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-2">
          {!inMeeting && isFirebaseConfigured() ? (
            <button
              type="button"
              disabled={!hasTranscript || saveBusy || isListening}
              onClick={() => {
                setSaveBusy(true);
                setSaveMsg(null);
                void (async () => {
                  const id = uid ?? (await ensureSignedIn()).uid;
                  await saveNote(id, {
                    title:
                      saveTitle.trim() ||
                      `Listen ${format(new Date(), "MMM d HH:mm")}`,
                    body: transcriptText,
                    transcript: transcriptText,
                    source: "listen",
                    tags: saveTags.length ? saveTags : undefined,
                    highlights: highlights.length ? highlights : undefined,
                  });
                  setSaveMsg("Saved as note.");
                  handleClearAll();
                  setSaveTitle("");
                  setSaveTags([]);
                })()
                  .catch((e) =>
                    setSaveMsg(e instanceof Error ? e.message : "Save failed"),
                  )
                  .finally(() => setSaveBusy(false));
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              {saveBusy ? "Saving…" : "Save as note"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={
              (!hasTranscript && highlights.length === 0) || endBusy || inMeeting
            }
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-600"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
        {saveMsg ? (
          <p className="text-center text-xs text-zinc-500">{saveMsg}</p>
        ) : null}
      </div>
    </div>
  );
}
