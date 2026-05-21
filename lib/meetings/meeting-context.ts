import { buildTranscriptFromSegments } from "@/lib/meetings/parse-transcript-segments";
import type {
  MeetingAppendRecord,
  MeetingRecord,
  TodoRecord,
} from "@/lib/data/types";

export function buildMeetingAiContext(
  meeting: MeetingRecord,
  appends: MeetingAppendRecord[],
  todos: TodoRecord[],
): string {
  const transcript =
    meeting.segments?.length && meeting.segments.length > 0
      ? buildTranscriptFromSegments(meeting.segments, meeting.speakers)
      : meeting.transcript;

  const parts: string[] = [
    `# Meeting: ${meeting.title}`,
    `Started: ${new Date(meeting.startedAt).toISOString()}`,
  ];

  if (meeting.agenda?.trim()) {
    parts.push(`\n## Agenda\n${meeting.agenda.trim()}`);
  }

  if (meeting.aiSummary?.trim()) {
    parts.push(`\n## Summary\n${meeting.aiSummary.trim()}`);
  }

  parts.push(`\n## Transcript\n${transcript.trim() || "(empty)"}`);

  if (meeting.topics?.length) {
    parts.push(
      `\n## Topics\n${meeting.topics.map((t) => `- ${t.title}`).join("\n")}`,
    );
  }

  if (appends.length) {
    parts.push(
      `\n## Linked notes (appends)\n${appends
        .map((a, i) => `${i + 1}. ${a.body}`)
        .join("\n\n")}`,
    );
  }

  const openTodos = todos.filter(
    (t) => (t.status ?? (t.completed ? "done" : "open")) !== "done",
  );
  if (openTodos.length) {
    parts.push(
      `\n## Open follow-ups\n${openTodos
        .map((t) => {
          const tags = [t.topicTag, t.assigneeLabel].filter(Boolean).join(", ");
          return tags ? `- [${tags}] ${t.text}` : `- ${t.text}`;
        })
        .join("\n")}`,
    );
  }

  return parts.join("\n");
}
