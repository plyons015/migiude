"use client";

import { MeetingRoomView } from "@/components/meetings/meeting-room-view";
import { MeetingsHubView } from "@/components/meetings/meetings-hub-view";
import { useSearchParams } from "next/navigation";

type MeetingDetailViewProps = {
  userId: string;
};

export function MeetingDetailView({ userId }: MeetingDetailViewProps) {
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("id");
  const fullRoom = searchParams.get("room") === "1";

  if (meetingId && fullRoom) {
    return <MeetingRoomView userId={userId} meetingId={meetingId} />;
  }

  return <MeetingsHubView userId={userId} />;
}
