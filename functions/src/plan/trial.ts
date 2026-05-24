import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { normalizePlanId } from "./defaults";

export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

export const TRIAL_LIMITS = {
  meetingMinutes: 30,
  aiCalls: 10,
  onDeviceMinutes: 100,
} as const;

export type TrialUsage = {
  aiCalls: number;
  meetingMinutes: number;
  onDeviceMinutes: number;
};

export type UserProfilePlanFields = {
  plan?: string | null;
  trialEndsAt?: number | null;
  planOverride?: boolean | null;
  subscriptionStatus?: string | null;
};

export function isTrialActive(profile: UserProfilePlanFields): boolean {
  const ends = profile.trialEndsAt;
  return typeof ends === "number" && ends > Date.now();
}

export function hasPaidEntitlement(profile: UserProfilePlanFields): boolean {
  if (profile.planOverride === true) {
    return normalizePlanId(profile.plan ?? undefined) !== "free";
  }
  const plan = normalizePlanId(profile.plan ?? undefined);
  if (plan !== "free") return true;
  const status = profile.subscriptionStatus;
  return status === "active" || status === "trialing";
}

export function trialExpiredRequiresUpgrade(
  profile: UserProfilePlanFields,
): boolean {
  return !isTrialActive(profile) && !hasPaidEntitlement(profile);
}

export function shouldApplyTrialLimits(
  profile: UserProfilePlanFields,
): boolean {
  return isTrialActive(profile) && !hasPaidEntitlement(profile);
}

export function trialUpgradeMessage(): string {
  return "Your 7-day trial has ended. Choose Pro or Power in Settings to continue using Ude.";
}

export async function readUserProfile(
  uid: string,
): Promise<UserProfilePlanFields & { uid: string }> {
  const snap = await getFirestore().doc(`userProfiles/${uid}`).get();
  const data = snap.data() ?? {};
  return {
    uid,
    plan: (data.plan as string | undefined) ?? "free",
    trialEndsAt: (data.trialEndsAt as number | undefined) ?? null,
    planOverride: (data.planOverride as boolean | undefined) ?? false,
    subscriptionStatus: (data.subscriptionStatus as string | undefined) ?? null,
  };
}

export async function ensureNewUserTrial(
  uid: string,
  email?: string | null,
): Promise<UserProfilePlanFields> {
  const db = getFirestore();
  const ref = db.doc(`userProfiles/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) {
    const trialEndsAt = Date.now() + TRIAL_MS;
    await ref.set(
      {
        plan: "free",
        trialEndsAt,
        signedUpAt: FieldValue.serverTimestamp(),
        email: email ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return {
      plan: "free",
      trialEndsAt,
      planOverride: false,
      subscriptionStatus: null,
    };
  }
  const data = snap.data() ?? {};
  return {
    plan: (data.plan as string | undefined) ?? "free",
    trialEndsAt: (data.trialEndsAt as number | undefined) ?? null,
    planOverride: (data.planOverride as boolean | undefined) ?? false,
    subscriptionStatus: (data.subscriptionStatus as string | undefined) ?? null,
  };
}

export async function readTrialUsage(uid: string): Promise<TrialUsage> {
  const snap = await getFirestore().doc(`usageTrial/${uid}`).get();
  const d = snap.data() ?? {};
  return {
    aiCalls: (d.aiCalls as number) ?? 0,
    meetingMinutes: (d.meetingMinutes as number) ?? 0,
    onDeviceMinutes: (d.onDeviceMinutes as number) ?? 0,
  };
}

export async function incrementTrialUsage(
  uid: string,
  patch: Partial<TrialUsage>,
): Promise<void> {
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (patch.aiCalls != null && patch.aiCalls > 0) {
    updates.aiCalls = FieldValue.increment(patch.aiCalls);
  }
  if (patch.meetingMinutes != null && patch.meetingMinutes > 0) {
    updates.meetingMinutes = FieldValue.increment(patch.meetingMinutes);
  }
  if (patch.onDeviceMinutes != null && patch.onDeviceMinutes > 0) {
    updates.onDeviceMinutes = FieldValue.increment(patch.onDeviceMinutes);
  }
  if (Object.keys(updates).length <= 1) return;
  await getFirestore().doc(`usageTrial/${uid}`).set(updates, { merge: true });
}

export function assertTrialUpgradeRequired(
  profile: UserProfilePlanFields,
): void {
  if (trialExpiredRequiresUpgrade(profile)) {
    throw new HttpsError("resource-exhausted", trialUpgradeMessage());
  }
}

export async function assertTrialAiAllowed(uid: string): Promise<void> {
  const profile = await readUserProfile(uid);
  assertTrialUpgradeRequired(profile);
  if (!shouldApplyTrialLimits(profile)) return;
  const usage = await readTrialUsage(uid);
  if (usage.aiCalls >= TRIAL_LIMITS.aiCalls) {
    throw new HttpsError(
      "resource-exhausted",
      `Trial AI limit reached (${TRIAL_LIMITS.aiCalls} calls). Upgrade to Pro or Power to continue.`,
    );
  }
}

export async function assertTrialUsageRoom(
  uid: string,
  patch: Partial<TrialUsage>,
): Promise<void> {
  const profile = await readUserProfile(uid);
  assertTrialUpgradeRequired(profile);
  if (!shouldApplyTrialLimits(profile)) return;

  const usage = await readTrialUsage(uid);
  if (
    patch.meetingMinutes != null &&
    usage.meetingMinutes + patch.meetingMinutes > TRIAL_LIMITS.meetingMinutes
  ) {
    throw new HttpsError(
      "resource-exhausted",
      `Trial meeting limit reached (${TRIAL_LIMITS.meetingMinutes} minutes). Upgrade to continue.`,
    );
  }
  if (
    patch.onDeviceMinutes != null &&
    usage.onDeviceMinutes + patch.onDeviceMinutes >
      TRIAL_LIMITS.onDeviceMinutes
  ) {
    throw new HttpsError(
      "resource-exhausted",
      `Trial on-device limit reached (${TRIAL_LIMITS.onDeviceMinutes} minutes). Upgrade to continue.`,
    );
  }
}

export async function recordTrialAiUsage(uid: string): Promise<void> {
  const profile = await readUserProfile(uid);
  if (!shouldApplyTrialLimits(profile)) return;
  await incrementTrialUsage(uid, { aiCalls: 1 });
}

export function buildTrialStatus(
  profile: UserProfilePlanFields,
  usage: TrialUsage,
): {
  active: boolean;
  expired: boolean;
  requiresUpgrade: boolean;
  endsAt: number | null;
  daysRemaining: number | null;
  limits: typeof TRIAL_LIMITS;
  usage: TrialUsage;
} {
  const active = isTrialActive(profile);
  const requiresUpgrade = trialExpiredRequiresUpgrade(profile);
  const endsAt =
    typeof profile.trialEndsAt === "number" ? profile.trialEndsAt : null;
  let daysRemaining: number | null = null;
  if (endsAt != null && endsAt > Date.now()) {
    daysRemaining = Math.ceil((endsAt - Date.now()) / (24 * 60 * 60 * 1000));
  }
  return {
    active,
    expired: !active && endsAt != null && endsAt <= Date.now(),
    requiresUpgrade,
    endsAt,
    daysRemaining,
    limits: TRIAL_LIMITS,
    usage,
  };
}
