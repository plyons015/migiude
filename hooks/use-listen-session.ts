"use client";

import { useAppSettings } from "@/hooks/use-app-settings";
import { useSpeechPersonalization } from "@/hooks/use-speech-personalization";
import { useTranscription } from "@/hooks/use-transcription";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { createId } from "@/lib/data/ids";
import { createMeetingId } from "@/lib/data/meetings-store";
import { saveNote } from "@/lib/data/notes-store";
import { saveTodo } from "@/lib/data/todos-store";
import type { TranscriptHighlight } from "@/lib/data/types";
import { isFirebaseConfigured } from "@/lib/env/client";
import { showImmediateLocalNotification } from "@/lib/notifications/native-reminders";
import {
  clearActiveMeeting,
  loadActiveMeeting,
  saveActiveMeeting,
  type ActiveMeetingDraft,
} from "@/lib/meetings/active-meeting";
import { finalizeMeeting } from "@/lib/meetings/finalize-meeting";
import { applyTemplateTitle } from "@/lib/meetings/templates";
import type { MeetingTemplate } from "@/lib/meetings/template-schema";
import {
  clearListenSession,
  LISTEN_AUTOSAVE_MS,
  loadListenSession,
  saveListenSession,
} from "@/lib/listen/session-persist";
import { runVoiceCommand } from "@/lib/listen/voice-commands";
import {
  detectLocalTodoHints,
  mergeTodoHints,
  type LocalTodoHint,
} from "@/lib/speech/local-todo-hints";
import type { TranscriptionMode } from "@/lib/speech/types";
import type { TranscriptChunk } from "@/lib/speech/types";
import { format } from "date-fns";
import {
  minutesFromMs,
  reportTrialUsage,
} from "@/lib/plan/report-trial-usage";
import { useCallback, useEffect, useRef, useState } from "react";

export type SavedCapture = {
  kind: "note" | "meeting";
  noteId: string;
  meetingId?: string;
  title: string;
  transcript: string;
  templateId?: string | null;
};

export function useListenSession(userId: string) {
  const [hydrated, setHydrated] = useState(false);
  const [captureActive, setCaptureActive] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingDraft | null>(
    null,
  );
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingTags, setMeetingTags] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<TranscriptHighlight[]>([]);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedCapture, setSavedCapture] = useState<SavedCapture | null>(null);
  const [lineActionMsg, setLineActionMsg] = useState<string | null>(null);

  const { localOnly, localTodoHints, voiceCommands } = useAppSettings();
  const { personalize, saveCorrection } = useSpeechPersonalization(userId);
  const [todoHints, setTodoHints] = useState<LocalTodoHint[]>([]);
  const lastHintChunkRef = useRef<string | null>(null);
  const lastCmdChunkRef = useRef<string | null>(null);

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
    localEngine,
    localSttFallbackNotice,
    whisperModelLoadProgress,
    whisperModelLoadLabel,
    whisperVadSilent,
    updateChunkText,
  } = useTranscription(inMeeting ? "meeting" : "quick", undefined, {
    personalize,
  });

  useWakeLock(isListening);

  const transcriptText = fullTranscript;
  const hasTranscript = transcriptText.trim().length > 0;
  const isPaused = captureActive && !isListening;
  const sessionVisible = captureActive || isListening;

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    const draft = loadActiveMeeting();
    if (draft) {
      setActiveMeeting(draft);
      setMeetingTitle(draft.title);
      setMeetingTags(draft.tags);
      setCaptureActive(true);
      return;
    }
    const saved = loadListenSession();
    if (saved?.captureActive) {
      if (saved.chunks.length > 0) {
        restoreTranscript(saved.chunks);
      }
      setHighlights(saved.highlights ?? []);
      setCaptureActive(true);
    }
  }, [hydrated, restoreTranscript]);

  const persistSession = useCallback(() => {
    if (!sessionVisible) return;
    saveListenSession(chunks, highlights, {
      captureActive: true,
      inMeeting,
    });
  }, [chunks, highlights, sessionVisible, inMeeting]);

  useEffect(() => {
    if (!sessionVisible) return;
    const debounce = window.setTimeout(persistSession, 800);
    return () => clearTimeout(debounce);
  }, [sessionVisible, persistSession]);

  useEffect(() => {
    if (!sessionVisible) return;
    const interval = window.setInterval(persistSession, LISTEN_AUTOSAVE_MS);
    return () => clearInterval(interval);
  }, [sessionVisible, persistSession]);

  useEffect(() => {
    if (!activeMeeting) return;
    saveActiveMeeting({
      ...activeMeeting,
      title: meetingTitle,
      tags: meetingTags,
    });
  }, [activeMeeting, meetingTitle, meetingTags]);

  const resetSession = useCallback(() => {
    clearTranscript();
    setHighlights([]);
    setTodoHints([]);
    lastHintChunkRef.current = null;
    lastCmdChunkRef.current = null;
    setCaptureActive(false);
    setActiveMeeting(null);
    setMeetingTitle("");
    setMeetingTags([]);
    clearActiveMeeting();
    clearListenSession();
    setSaveError(null);
  }, [clearTranscript]);

  const handleStartMeeting = useCallback(
    (template: MeetingTemplate | null, mode: TranscriptionMode) => {
      setSavedCapture(null);
      setSaveError(null);
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
      clearTranscript();
      setHighlights([]);
      clearListenSession();
      setCaptureActive(true);
      void startListening({ context: "meeting", mode });
    },
    [clearTranscript, startListening],
  );

  const startQuickListen = useCallback(
    (mode: TranscriptionMode) => {
      setSavedCapture(null);
      setSaveError(null);
      clearActiveMeeting();
      setActiveMeeting(null);
      setMeetingTitle("");
      setMeetingTags([]);
      setCaptureActive(true);
      void startListening({ context: "quick", mode });
    },
    [startListening],
  );

  const pause = useCallback(() => {
    if (isListening) stopListening();
  }, [isListening, stopListening]);

  const resume = useCallback(() => {
    void startListening({ context: inMeeting ? "meeting" : "quick" });
  }, [inMeeting, startListening]);

  const discard = useCallback(() => {
    if (isListening) stopListening();
    resetSession();
  }, [isListening, stopListening, resetSession]);

  const flashLineMsg = useCallback((msg: string) => {
    setLineActionMsg(msg);
    window.setTimeout(() => setLineActionMsg(null), 2500);
  }, []);

  const highlightChunk = useCallback(
    (chunk: TranscriptChunk) => {
      if (!chunk.text.trim()) return;
      setHighlights((prev) => [
        ...prev,
        {
          id: createId("hl"),
          text: chunk.text.trim(),
          segmentId: chunk.id,
          createdAt: Date.now(),
        },
      ]);
      flashLineMsg("Highlighted");
    },
    [flashLineMsg],
  );

  const addTodoFromChunk = useCallback(
    async (chunk: TranscriptChunk) => {
      if (!chunk.text.trim() || !isFirebaseConfigured()) return;
      try {
        await saveTodo(userId, {
          text: chunk.text.trim(),
          meetingId: activeMeeting?.id,
        });
        flashLineMsg("Todo added");
      } catch (e) {
        flashLineMsg(e instanceof Error ? e.message : "Could not add todo");
      }
    },
    [userId, activeMeeting, flashLineMsg],
  );

  const highlightAndTodoFromChunk = useCallback(
    async (chunk: TranscriptChunk) => {
      highlightChunk(chunk);
      await addTodoFromChunk(chunk);
    },
    [highlightChunk, addTodoFromChunk],
  );

  const dismissTodoHint = useCallback((hintId: string) => {
    setTodoHints((prev) => prev.filter((h) => h.id !== hintId));
  }, []);

  const addTodoFromHint = useCallback(
    async (hint: LocalTodoHint) => {
      if (!isFirebaseConfigured()) return;
      try {
        await saveTodo(userId, {
          text: hint.text,
          meetingId: activeMeeting?.id,
          dueAt: hint.dueAt,
        });
        dismissTodoHint(hint.id);
        flashLineMsg("Todo added");
      } catch (e) {
        flashLineMsg(e instanceof Error ? e.message : "Could not add todo");
      }
    },
    [userId, activeMeeting?.id, dismissTodoHint, flashLineMsg],
  );

  const correctChunkText = useCallback(
    async (chunk: TranscriptChunk, newText: string) => {
      const trimmed = newText.trim();
      if (!trimmed || trimmed === chunk.text.trim()) return;
      await saveCorrection(chunk.text, trimmed);
      updateChunkText(chunk.id, trimmed);
      flashLineMsg("Correction saved");
    },
    [saveCorrection, updateChunkText, flashLineMsg],
  );

  useEffect(() => {
    if (!localTodoHints || chunks.length === 0) return;
    const last = chunks[chunks.length - 1];
    if (!last || lastHintChunkRef.current === last.id) return;
    lastHintChunkRef.current = last.id;
    const found = detectLocalTodoHints(last.text, last.id);
    if (found.length > 0) {
      setTodoHints((prev) => mergeTodoHints(prev, found));
    }
  }, [chunks, localTodoHints]);

  useEffect(() => {
    if (!voiceCommands || chunks.length === 0) return;
    const last = chunks[chunks.length - 1];
    if (!last || lastCmdChunkRef.current === last.id) return;
    lastCmdChunkRef.current = last.id;

    void runVoiceCommand(last.text, {
      onAddTodo: async (text) => {
        if (!isFirebaseConfigured()) return;
        try {
          await saveTodo(userId, {
            text,
            meetingId: activeMeeting?.id,
          });
          flashLineMsg(`Todo: ${text}`);
        } catch (e) {
          flashLineMsg(
            e instanceof Error ? e.message : "Could not add todo",
          );
        }
      },
      onHighlight: () => {
        highlightChunk(last);
      },
      onSummarizeSoFar: async () => {
        flashLineMsg("Summarize after you save the capture");
      },
    });
  }, [
    voiceCommands,
    chunks,
    userId,
    activeMeeting?.id,
    highlightChunk,
    flashLineMsg,
  ]);

  const savingRef = useRef(false);

  const saveAndClose = useCallback(async () => {
    if (!hasTranscript && highlights.length === 0) return;
    if (savingRef.current || saveBusy) return;
    if (isListening) stopListening();
    savingRef.current = true;
    setSaveBusy(true);
    setSaveError(null);
    try {
      if (inMeeting && activeMeeting) {
        const result = await finalizeMeeting(userId, {
          meetingId: activeMeeting.id,
          title: meetingTitle,
          startedAt: activeMeeting.startedAt,
          transcript: transcriptText,
          tags: meetingTags.length ? meetingTags : undefined,
          highlights: highlights.length ? highlights : undefined,
          agenda: activeMeeting.agenda,
          templateId: activeMeeting.templateId,
        });
        const meetingMinutes = minutesFromMs(
          Date.now() - activeMeeting.startedAt,
        );
        if (meetingMinutes > 0) {
          void reportTrialUsage({ meetingMinutes }).catch(() => undefined);
        }
        setSavedCapture({
          kind: "meeting",
          noteId: result.noteId,
          meetingId: result.meeting.id,
          title: meetingTitle,
          transcript: transcriptText,
          templateId: activeMeeting.templateId,
        });
        void showImmediateLocalNotification(
          "Meeting saved",
          "Run AI for summary, todos & mind map?",
        );
      } else {
        const title = `Capture ${format(new Date(), "MMM d HH:mm")}`;
        const note = await saveNote(userId, {
          title,
          body: transcriptText,
          transcript: transcriptText,
          source: "listen",
          highlights: highlights.length ? highlights : undefined,
        });
        setSavedCapture({
          kind: "note",
          noteId: note.id,
          title,
          transcript: transcriptText,
        });
      }
      resetSession();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      savingRef.current = false;
      setSaveBusy(false);
    }
  }, [
    hasTranscript,
    highlights,
    isListening,
    saveBusy,
    stopListening,
    inMeeting,
    activeMeeting,
    userId,
    meetingTitle,
    transcriptText,
    meetingTags,
    resetSession,
  ]);

  const dismissSavedCapture = useCallback(() => {
    setSavedCapture(null);
  }, []);

  const configuredMode = inMeeting
    ? meetingTranscriptionMode
    : quickTranscriptionMode;
  const displayMode = isListening ? transcriptionMode : configuredMode;

  return {
    hydrated,
    supported,
    localOnly,
    state,
    isListening,
    isPaused,
    sessionVisible,
    captureActive,
    inMeeting,
    activeMeeting,
    meetingTitle,
    chunks,
    interimText,
    highlights,
    error,
    captureWarning,
    capturePhase,
    localEngine,
    localSttFallbackNotice,
    whisperModelLoadProgress,
    whisperModelLoadLabel,
    whisperVadSilent,
    transcriptionMode: displayMode,
    saveBusy,
    saveError,
    savedCapture,
    lineActionMsg,
    startQuickListen,
    startMeeting: handleStartMeeting,
    pause,
    resume,
    discard,
    saveAndClose,
    highlightChunk,
    addTodoFromChunk,
    highlightAndTodoFromChunk,
    correctChunkText,
    todoHints,
    dismissTodoHint,
    addTodoFromHint,
    dismissSavedCapture,
  };
}
