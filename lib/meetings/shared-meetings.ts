import type { MeetingRecord } from "@/lib/data/types";

/** Placeholder until friend-list + cloud shared workspace ships. */
export type SharedMeetingStub = MeetingRecord & {
  sharedByDisplayName: string;
  permission: "view_append" | "view";
};

export function listSharedMeetingStubs(): SharedMeetingStub[] {
  return [];
}
