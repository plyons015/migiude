import type { MeetingRecord } from "@/lib/data/types";

export type MeetingRoomProps = {
  userId: string;
  meeting: MeetingRecord;
  onSave: (meeting: MeetingRecord) => Promise<void>;
  highlightSegmentId?: string | null;
};
