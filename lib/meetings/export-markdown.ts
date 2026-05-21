import { buildTranscriptFromSegments } from "@/lib/meetings/parse-transcript-segments";
import { todoStatusOf } from "@/lib/data/todos-store";
import type {
  MeetingAppendRecord,
  MeetingRecord,
  TodoRecord,
} from "@/lib/data/types";
import { format } from "date-fns";

export function buildMeetingMarkdownExport(
  meeting: MeetingRecord,
  appends: MeetingAppendRecord[],
  todos: TodoRecord[],
): string {
  const lines: string[] = [];
  const durationMin = Math.max(
    1,
    Math.round((meeting.endedAt - meeting.startedAt) / 60_000),
  );

  lines.push(`# ${meeting.title}`);
  lines.push("");
  lines.push(
    `**When:** ${format(meeting.startedAt, "MMM d, yyyy HH:mm")} · **Duration:** ~${durationMin} min`,
  );
  if (meeting.tags?.length) {
    lines.push(`**Tags:** ${meeting.tags.join(", ")}`);
  }
  lines.push("");

  if (meeting.agenda?.trim()) {
    lines.push("## Agenda");
    lines.push("");
    lines.push(meeting.agenda.trim());
    lines.push("");
  }

  if (meeting.aiSummary?.trim()) {
    lines.push("## Summary");
    lines.push("");
    lines.push(meeting.aiSummary.trim());
    lines.push("");
  }

  if (meeting.minutes?.trim()) {
    lines.push("## Minutes");
    lines.push("");
    lines.push(meeting.minutes.trim());
    lines.push("");
  }

  const transcript =
    meeting.segments?.length && meeting.segments.length > 0
      ? buildTranscriptFromSegments(meeting.segments, meeting.speakers)
      : meeting.transcript;

  lines.push("## Transcript (canonical)");
  lines.push("");
  lines.push(transcript.trim() || "_(empty)_");
  lines.push("");

  if (meeting.topics?.length) {
    lines.push("## Topics");
    lines.push("");
    for (const t of meeting.topics) {
      lines.push(`- ${t.title}`);
    }
    lines.push("");
  }

  if (meeting.highlights?.length) {
    lines.push("## Highlights");
    lines.push("");
    for (const h of meeting.highlights) {
      lines.push(`- ${h.text}${h.note ? ` — _${h.note}_` : ""}`);
    }
    lines.push("");
  }

  const meetingTodos = todos.filter((t) => t.meetingId === meeting.id);
  if (meetingTodos.length) {
    lines.push("## Follow-ups");
    lines.push("");
    for (const t of meetingTodos) {
      const status = todoStatusOf(t);
      const meta = [status, t.topicTag, t.assigneeLabel, t.dueAt ? format(t.dueAt, "MMM d") : null]
        .filter(Boolean)
        .join(" · ");
      lines.push(`- [${status === "done" ? "x" : " "}] ${t.text}${meta ? ` (${meta})` : ""}`);
    }
    lines.push("");
  }

  if (appends.length) {
    lines.push("## Linked notes (appends)");
    lines.push("");
    for (const a of appends) {
      lines.push(`### ${format(a.createdAt, "MMM d, HH:mm")}`);
      if (a.anchor) {
        lines.push(`_Anchor: ${a.anchor.type} ${a.anchor.id}_`);
      }
      lines.push("");
      lines.push(a.body.trim());
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(`_Exported from Migiude · ${format(Date.now(), "MMM d, yyyy HH:mm")}_`);

  return lines.join("\n");
}
