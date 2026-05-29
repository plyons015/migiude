"use client";

import { useMicrosoftIntegration } from "@/hooks/use-microsoft-integration";
import { TEAMS_BOT_INTEGRATION_LAUNCHED } from "@/lib/integrations/microsoft/feature";
import type { TeamsBotJobPublic } from "@/lib/integrations/microsoft/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
  meetingTitle?: string;
  migiudeMeetingId?: string;
  disabled?: boolean;
  showTitle?: boolean;
  className?: string;
  /** When set (e.g. from Settings), avoids a second status fetch. */
  quotaEnabled?: boolean;
  connected?: boolean;
  busy?: boolean;
  sendBotToMeeting?: (input: {
    meetingUrl: string;
    meetingTitle?: string;
    migiudeMeetingId?: string;
    estimatedMinutes?: number;
  }) => Promise<TeamsBotJobPublic>;
};

function isTeamsMeetingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("teams.microsoft.com") ||
      u.hostname.includes("teams.live.com")
    );
  } catch {
    return false;
  }
}

export function TeamsBotJoinPanel(props: Props) {
  if (!TEAMS_BOT_INTEGRATION_LAUNCHED) {
    return null;
  }
  return <TeamsBotJoinPanelInner {...props} />;
}

function TeamsBotJoinPanelInner({
  meetingTitle,
  migiudeMeetingId,
  disabled,
  showTitle = true,
  className,
  quotaEnabled: quotaEnabledProp,
  connected: connectedProp,
  busy: busyProp,
  sendBotToMeeting: sendProp,
}: Props) {
  const hook = useMicrosoftIntegration();
  const sendBotToMeeting = sendProp ?? hook.sendBotToMeeting;
  const busy = busyProp ?? hook.busy;
  const quotaEnabled = quotaEnabledProp ?? hook.status?.quota.enabled ?? false;
  const connected = connectedProp ?? hook.status?.integration.connected ?? false;
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (!quotaEnabled || !connected) {
    return null;
  }

  const submit = async () => {
    setMessage(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setMessage("Paste a Teams meeting link.");
      return;
    }
    if (!isTeamsMeetingUrl(trimmed)) {
      setMessage("Use a Teams meeting join link (teams.microsoft.com or teams.live.com).");
      return;
    }
    try {
      const job = await sendBotToMeeting({
        meetingUrl: trimmed,
        meetingTitle,
        migiudeMeetingId,
        estimatedMinutes: 60,
      });
      setMessage(
        job.error
          ? job.error
          : `Bot join queued (${job.status}). Attendees should see a disclosed participant.`,
      );
      setUrl("");
    } catch {
      /* error surfaced by hook */
    }
  };

  return (
    <div
      className={
        className ??
        "rounded-xl border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/50 dark:bg-violet-950/30"
      }
    >
      {showTitle ? (
        <p className="text-xs font-semibold text-violet-950 dark:text-violet-100">
          Send Teams bot (Pro / Power)
        </p>
      ) : null}
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Best for multi-speaker Teams calls. The bot joins as a participant — tell
        attendees a transcription bot is present.
      </p>
      <div className="mt-2 space-y-2">
        <Label htmlFor="teams-meeting-url" className="text-xs">
          Teams meeting link
        </Label>
        <input
          id="teams-meeting-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://teams.microsoft.com/l/meetup-join/…"
          className="w-full rounded-lg border border-violet-200 bg-transparent px-3 py-2 text-xs dark:border-violet-800"
          disabled={disabled || busy}
        />
        <Button
          type="button"
          size="sm"
          disabled={disabled || busy}
          onClick={() => void submit()}
        >
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Send bot to meeting
        </Button>
      </div>
      {message ? (
        <p className="mt-2 text-[11px] text-violet-800 dark:text-violet-200">
          {message}
        </p>
      ) : null}
    </div>
  );
}
