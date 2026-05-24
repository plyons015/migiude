export const TRIAL_DAYS = 7;

export const TRIAL_LIMITS = {
  meetingMinutes: 30,
  aiCalls: 10,
  onDeviceMinutes: 100,
} as const;

export type TrialUsageSnapshot = {
  aiCalls: number;
  meetingMinutes: number;
  onDeviceMinutes: number;
};

export type TrialStatus = {
  active: boolean;
  expired: boolean;
  requiresUpgrade: boolean;
  endsAt: number | null;
  daysRemaining: number | null;
  limits: typeof TRIAL_LIMITS;
  usage: TrialUsageSnapshot;
};

export function welcomeTrialStorageKey(uid: string): string {
  return `ude-welcome-trial-v1-${uid}`;
}

export function isWelcomeTrialDismissed(uid: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(welcomeTrialStorageKey(uid)) === "1";
  } catch {
    return true;
  }
}

export function dismissWelcomeTrial(uid: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(welcomeTrialStorageKey(uid), "1");
  } catch {
    /* ignore */
  }
}

export function formatTrialDaysRemaining(endsAt: number | null): string | null {
  if (endsAt == null) return null;
  const ms = endsAt - Date.now();
  if (ms <= 0) return "0 days";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days === 1 ? "1 day" : `${days} days`;
}
