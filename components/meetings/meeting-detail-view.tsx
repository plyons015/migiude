"use client";

import { MeetingRoomView } from "@/components/meetings/meeting-room-view";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type MeetingDetailViewProps = {
  userId: string;
};

export function MeetingDetailView({ userId }: MeetingDetailViewProps) {
  const searchParams = useSearchParams();
  const meetingId = searchParams.get("id");

  if (!meetingId) {
    return (
      <div className="p-4 space-y-2">
        <p className="text-sm text-muted-foreground">
          Select a meeting from the dashboard.
        </p>
        <Link href="/dashboard/" className="text-sm font-medium underline">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return <MeetingRoomView userId={userId} meetingId={meetingId} />;
}
