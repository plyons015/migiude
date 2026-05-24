"use client";

import { useAppSettings } from "@/hooks/use-app-settings";
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
  saveListenSession,
} from "@/lib/listen/session-persist";
import type { TranscriptionMode } from "@/lib/speech/types";
import type { TranscriptChunk } from "@/lib/speech/types";
import { format } from "date-fns";
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

  const { localOnly } = useAppSettings();

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

  useEffect(() => {
    if (!hasTranscript && !highlights.length) return;
    saveListenSession(chunks, highlights);
  }, [chunks, highlights, hasTranscript]);

  const resetSession = useCallback(() => {
    clearTranscript();
    setHighlights([]);
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
    [userId, activeMeeting?.id, flashLineMsg],
  );

  const highlightAndTodoFromChunk = useCallback(
    async (chunk: TranscriptChunk) => {
      highlightChunk(chunk);
      await addTodoFromChunk(chunk);
    },
    [highlightChunk, addTodoFromChunk],
  );

  const saveAndClose = useCallback(async () => {
    if (!hasTranscript && highlights.length === 0) return;
    if (isListening) stopListening();
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
      setSaveBusy(false);
    }
  }, [
    hasTranscript,
    highlights,
    isListening,
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
    dismissSavedCapture,
  };
}
