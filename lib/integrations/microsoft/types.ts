/** Microsoft Teams integration (calling bot path — Otter parity). */

export type TeamsBotJobStatus =
  | "queued"
  | "joining"
  | "in_meeting"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type MicrosoftIntegrationPublic = {
  connected: boolean;
  displayName?: string;
  email?: string;
  connectedAt?: number;
  /** Server reports whether bot worker is configured in this environment. */
  workerReady: boolean;
};

export type TeamsBotQuota = {
  enabled: boolean;
  minutesUsed: number;
  minutesLimit: number | null;
  joinsUsed: number;
  joinsLimit: number | null;
  calendarAutoJoin: boolean;
};

export type MicrosoftIntegrationStatus = {
  integration: MicrosoftIntegrationPublic;
  quota: TeamsBotQuota;
  planRequired: "pro" | "power";
};

export type TeamsBotJobPublic = {
  id: string;
  status: TeamsBotJobStatus;
  meetingUrl: string;
  meetingTitle?: string;
  migiudeMeetingId?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
