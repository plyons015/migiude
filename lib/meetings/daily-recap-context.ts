import type { MeetingRecord, TodoRecord } from "@/lib/data/types";
import { endOfDay, format, startOfDay, subDays } from "date-fns";

export function getYesterdayWindow(): { start: number; end: number } {
  const day = subDays(new Date(), 1);
  return {
    start: startOfDay(day).getTime(),
    end: endOfDay(day).getTime(),
  };
}

export function meetingsYesterday(meetings: MeetingRecord[]): MeetingRecord[] {
  const { start, end } = getYesterdayWindow();
  return meetings.filter((m) => m.startedAt >= start && m.startedAt <= end);
}

export function buildDailyRecapPrompt(
  meetings: MeetingRecord[],
  openTodos: TodoRecord[],
): string {
  const dateLabel = format(subDays(new Date(), 1), "MMMM d, yyyy");
  const lines: string[] = [`Date: ${dateLabel}`, ""];

  if (meetings.length === 0) {
    lines.push("Meetings yesterday: none recorded.");
  } else {
    lines.push(`Meetings yesterday (${meetings.length}):`);
    for (const m of meetings) {
      lines.push(`- ${m.title}`);
      if (m.aiSummary) {
        lines.push(`  Summary: ${m.aiSummary.slice(0, 400)}`);
      } else if (m.transcript) {
        lines.push(`  Transcript excerpt: ${m.transcript.slice(0, 300)}…`);
      }
    }
  }

  lines.push("");
  if (openTodos.length === 0) {
    lines.push("Open follow-ups: none.");
  } else {
    lines.push(`Open follow-ups (${openTodos.length}):`);
    for (const t of openTodos.slice(0, 15)) {
      lines.push(`- ${t.text}`);
    }
    if (openTodos.length > 15) {
      lines.push(`- …and ${openTodos.length - 15} more`);
    }
  }

  return lines.join("\n");
}
