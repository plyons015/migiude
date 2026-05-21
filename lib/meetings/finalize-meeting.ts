import { aiService } from "@/lib/ai/ai-service";
import type { AiProvider } from "@/lib/ai/types";
import {
  parseTranscriptToSegments,
  speakersFromSegments,
} from "@/lib/meetings/parse-transcript-segments";
import { saveMeeting } from "@/lib/data/meetings-store";
import { saveNote } from "@/lib/data/notes-store";
import { saveTodosFromMarkdown } from "@/lib/data/todos-store";
import type { MeetingRecord, TranscriptHighlight } from "@/lib/data/types";

export type FinalizeMeetingInput = {
  meetingId: string;
  title: string;
  startedAt: number;
  transcript: string;
  tags?: string[];
  highlights?: TranscriptHighlight[];
  agenda?: string;
  autoAi: boolean;
  provider: AiProvider;
};

export type FinalizeMeetingResult = {
  meeting: MeetingRecord;
  noteId: string;
  todosCreated: number;
  aiSummary?: string;
};

export async function finalizeMeeting(
  userId: string,
  input: FinalizeMeetingInput,
): Promise<FinalizeMeetingResult> {
  const endedAt = Date.now();
  const transcript = input.transcript.trim();

  const note = await saveNote(userId, {
    title: input.title.trim() || "Meeting notes",
    body: transcript,
    transcript,
    source: "meeting",
    meetingId: input.meetingId,
    tags: input.tags?.length ? input.tags : undefined,
    highlights: input.highlights?.length ? input.highlights : undefined,
  });

  let aiSummary: string | undefined;
  let todosCreated = 0;

  if (input.autoAi && transcript.length > 0) {
    try {
      const summary = await aiService.summarize(transcript, input.provider);
      aiSummary = summary.result;
      const todos = await aiService.extractTodos(transcript, input.provider);
      const created = await saveTodosFromMarkdown(
        userId,
        todos.result,
        note.id,
        input.meetingId,
      );
      todosCreated = created.length;
    } catch {
      // Meeting still saved if AI fails (billing, network, etc.)
    }
  }

  const segments = parseTranscriptToSegments(transcript);
  const speakers =
    segments.length > 0 ? speakersFromSegments(segments) : undefined;

  const meeting: MeetingRecord = {
    id: input.meetingId,
    title: input.title.trim() || "Meeting",
    startedAt: input.startedAt,
    endedAt,
    transcript,
    canonicalNoteId: note.id,
    tags: input.tags?.length ? input.tags : undefined,
    highlights: input.highlights?.length ? input.highlights : undefined,
    aiSummary,
    segments: segments.length > 0 ? segments : undefined,
    speakers,
    agenda: input.agenda?.trim() || undefined,
  };

  await saveMeeting(userId, meeting);

  return {
    meeting,
    noteId: note.id,
    todosCreated,
    aiSummary,
  };
}
