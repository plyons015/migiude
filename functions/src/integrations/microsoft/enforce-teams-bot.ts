import { HttpsError } from "firebase-functions/v2/https";
import { getPlanLimitsFor } from "../../admin/plan-limits";
import { normalizePlanId } from "../../plan/defaults";
import { hasPaidEntitlement, readUserProfile } from "../../plan/trial";
import { readMicrosoftIntegration } from "./store";
import { readTeamsBotUsage } from "./store";

export async function assertTeamsBotPlan(uid: string): Promise<{
  plan: "pro" | "power";
}> {
  const profile = await readUserProfile(uid);
  if (!hasPaidEntitlement(profile)) {
    throw new HttpsError(
      "permission-denied",
      "Teams meeting bot requires a Pro or Power subscription.",
    );
  }
  const plan = normalizePlanId(profile.plan ?? undefined);
  if (plan !== "pro" && plan !== "power") {
    throw new HttpsError(
      "permission-denied",
      "Teams meeting bot requires Pro or Power. Upgrade in Settings → Plan.",
    );
  }
  const limits = await getPlanLimitsFor(plan);
  if (!limits.teamsBotEnabled) {
    throw new HttpsError(
      "permission-denied",
      "Teams meeting bot is not included on your plan.",
    );
  }
  return { plan };
}

export async function assertTeamsBotQuota(
  uid: string,
  estimatedMinutes: number,
): Promise<void> {
  const profile = await readUserProfile(uid);
  const plan = normalizePlanId(profile.plan ?? undefined);
  const limits = await getPlanLimitsFor(plan);
  const usage = await readTeamsBotUsage(uid);

  if (
    limits.teamsBotJoinsPerMonth != null &&
    usage.teamsBotJoins >= limits.teamsBotJoinsPerMonth
  ) {
    throw new HttpsError(
      "resource-exhausted",
      `Monthly Teams bot join limit reached (${limits.teamsBotJoinsPerMonth}). ${
        plan === "pro" ? "Upgrade to Power for higher limits." : ""
      }`.trim(),
    );
  }

  if (limits.teamsBotMinutesPerMonth != null) {
    const projected = usage.teamsBotMinutes + estimatedMinutes;
    if (projected > limits.teamsBotMinutesPerMonth) {
      throw new HttpsError(
        "resource-exhausted",
        `Not enough Teams bot minutes remaining this month (need ~${estimatedMinutes} min). ${
          plan === "pro" ? "Upgrade to Power for ~2,400 bot-min/month." : ""
        }`.trim(),
      );
    }
  }
}

export async function assertMicrosoftConnected(uid: string): Promise<void> {
  const integration = await readMicrosoftIntegration(uid);
  if (!integration) {
    throw new HttpsError(
      "failed-precondition",
      "Connect your Microsoft work or school account in Settings first.",
    );
  }
}
