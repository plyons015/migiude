import type { PlanAndUsageResponse } from "@/lib/plan/types";
import { usagePercent } from "@/lib/plan/limits";

/** Show soft nudge at this % of monthly limit (avoid nagging below this). */
export const UPGRADE_NUDGE_THRESHOLD = 80;

export type UpgradeNudge =
  | { show: false }
  | {
      show: true;
      severity: "approaching" | "limit";
      resource: "cloud" | "ai";
      message: string;
    };

export function computeUpgradeNudge(
  data: PlanAndUsageResponse | null,
): UpgradeNudge {
  if (!data || data.plan !== "free") return { show: false };

  const { usage, limits } = data;
  const cloudPct = usagePercent(
    usage.cloudSttMinutes,
    limits.cloudSttMinutesPerMonth,
  );
  const aiPct = usagePercent(usage.aiCalls, limits.aiCallsPerMonth);

  if (
    limits.cloudSttMinutesPerMonth != null &&
    usage.cloudSttMinutes >= limits.cloudSttMinutesPerMonth
  ) {
    return {
      show: true,
      severity: "limit",
      resource: "cloud",
      message:
        "Free cloud transcription for this month is used up. On-device speech still works — or upgrade to Pro for 1,000 cloud minutes.",
    };
  }

  if (
    limits.aiCallsPerMonth != null &&
    usage.aiCalls >= limits.aiCallsPerMonth
  ) {
    return {
      show: true,
      severity: "limit",
      resource: "ai",
      message:
        "Free AI actions for this month are used up. Upgrade to Pro for 200 AI actions per month.",
    };
  }

  if (cloudPct != null && cloudPct >= UPGRADE_NUDGE_THRESHOLD) {
    return {
      show: true,
      severity: "approaching",
      resource: "cloud",
      message: `You've used ${cloudPct}% of free cloud transcription this month.`,
    };
  }

  if (aiPct != null && aiPct >= UPGRADE_NUDGE_THRESHOLD) {
    return {
      show: true,
      severity: "approaching",
      resource: "ai",
      message: `You've used ${aiPct}% of free AI actions this month.`,
    };
  }

  return { show: false };
}

const DISMISS_KEY = "ude-upgrade-nudge-dismissed-until";

export function dismissUpgradeNudge(days = 7): void {
  if (typeof localStorage === "undefined") return;
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem(DISMISS_KEY, String(until));
}

export function isUpgradeNudgeDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until) || until < Date.now()) {
    localStorage.removeItem(DISMISS_KEY);
    return false;
  }
  return true;
}

export function isPlanQuotaError(message: string): boolean {
  return (
    /upgrade to (pro|power)/i.test(message) ||
    /usage limit reached/i.test(message) ||
    /AI actions per month/i.test(message) ||
    /cloud transcription minutes per month/i.test(message) ||
    /resource-exhausted/i.test(message)
  );
}
