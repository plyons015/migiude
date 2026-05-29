/** Bookmark from Listen — stored on note when saved (Phase 5). */
export type TranscriptHighlight = {
  id: string;
  text: string;
  note?: string;
  createdAt: number;
  /** Links highlight to a transcript segment in the meeting room. */
  segmentId?: string;
};

/** Where capture was processed — Notepad (local) vs Meetings (cloud) lanes. */
export type ProcessingScope = "local" | "cloud";

export type NoteRecord = {
  id: string;
  title: string;
  body: string;
  transcript?: string;
  mindMapSource?: string;
  source: "manual" | "listen" | "meeting";
  meetingId?: string;
  /** Relates note to a theme across meetings (v1 topic series). */
  seriesTag?: string;
  /** Future: shared group workspace. */
  groupId?: string;
  processingScope?: ProcessingScope;
  /** Placeholder for collaboration + share metadata. */
  cloudSyncMeta?: import("@/lib/collaboration/types").CloudSyncMeta;
  tags?: string[];
  highlights?: TranscriptHighlight[];
  createdAt: number;
  updatedAt: number;
};

export type TodoStatus = "open" | "waiting" | "done";

export type TodoRecord = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  dueAt?: number;
  noteId?: string;
  meetingId?: string;
  /** Future: group-shared follow-up. */
  groupId?: string;
  processingScope?: ProcessingScope;
  reminderNotified?: boolean;
  /** Phase 9 — kanban-style status (falls back from completed if unset). */
  status?: TodoStatus;
  topicTag?: string;
  assigneeLabel?: string;
};

export type MeetingSpeaker = {
  id: number;
  displayName: string;
  color?: string;
};

export type TranscriptSegment = {
  id: string;
  speakerId: number;
  text: string;
  timestamp?: number;
};

export type MeetingTopic = {
  id: string;
  title: string;
  segmentIds?: string[];
};

export type MeetingAnchor =
  | { type: "segment"; id: string }
  | { type: "topic"; id: string }
  | { type: "highlight"; id: string };

/** Linked note — never merged into canonical transcript (Phase 9). */
export type MeetingAppendRecord = {
  id: string;
  parentMeetingId: string;
  body: string;
  anchor?: MeetingAnchor;
  createdAt: number;
};

/** Completed meeting session (Phase 6+9). */
export type MeetingRecord = {
  id: string;
  title: string;
  startedAt: number;
  endedAt: number;
  /** Canonical capture — not overwritten by appends. */
  transcript: string;
  canonicalNoteId: string;
  tags?: string[];
  highlights?: TranscriptHighlight[];
  aiSummary?: string;
  /** Editable parsed lines (speaker labels). */
  segments?: TranscriptSegment[];
  speakers?: MeetingSpeaker[];
  topics?: MeetingTopic[];
  /** Pre-meeting agenda (Script tab). */
  agenda?: string;
  /** Template used when meeting started — drives Library tags & AI report shape. */
  templateId?: string;
  /** Polished minutes / narrative (Script tab). */
  minutes?: string;
  /** Topic series — link related meetings (v1 tag; groups later). */
  seriesTag?: string;
  /** Future: primary group this meeting is shared with. */
  groupId?: string;
  /** Placeholder for collaboration + share metadata. */
  cloudSyncMeta?: import("@/lib/collaboration/types").CloudSyncMeta;
};

import type { FriendRecord } from "@/lib/groups/types";
import type { GroupRecord } from "@/lib/groups/types";

export type LocalVault = {
  notes: NoteRecord[];
  todos: TodoRecord[];
  meetings: MeetingRecord[];
  appends: MeetingAppendRecord[];
  friends: FriendRecord[];
  groups: GroupRecord[];
};
