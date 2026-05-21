import type { TranscriptHighlight } from "@/lib/data/types";

export type VoiceCommandAction =
  | { type: "add_todo"; text: string }
  | { type: "highlight" }
  | { type: "summarize_so_far" };

const ADD_TODO =
  /(?:^|\s)(?:add todo|add to-?do|todo)\s*[:\-]?\s*(.+)$/i;
const HIGHLIGHT = /(?:^|\s)(?:highlight|mark this|star this)(?:\s|$)/i;
const SUMMARIZE =
  /(?:^|\s)(?:summarize so far|summary so far|summarise so far)(?:\s|$)/i;

export function parseVoiceCommand(line: string): VoiceCommandAction | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const addMatch = trimmed.match(ADD_TODO);
  if (addMatch?.[1]?.trim()) {
    return { type: "add_todo", text: addMatch[1].trim() };
  }

  if (HIGHLIGHT.test(trimmed)) {
    return { type: "highlight" };
  }

  if (SUMMARIZE.test(trimmed)) {
    return { type: "summarize_so_far" };
  }

  return null;
}

export type VoiceCommandHandlers = {
  onAddTodo: (text: string) => void | Promise<void>;
  onHighlight: () => void;
  onSummarizeSoFar: () => void | Promise<void>;
};

/** Run command from a final transcript line; returns true if handled. */
export async function runVoiceCommand(
  line: string,
  handlers: VoiceCommandHandlers,
): Promise<boolean> {
  const cmd = parseVoiceCommand(line);
  if (!cmd) return false;

  switch (cmd.type) {
    case "add_todo":
      await handlers.onAddTodo(cmd.text);
      return true;
    case "highlight":
      handlers.onHighlight();
      return true;
    case "summarize_so_far":
      await handlers.onSummarizeSoFar();
      return true;
    default:
      return false;
  }
}

export function highlightFromLine(
  line: string,
  note?: string,
): Omit<TranscriptHighlight, "id" | "createdAt"> {
  return { text: line.trim(), note };
}
