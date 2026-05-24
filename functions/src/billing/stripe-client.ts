import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";

export const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
export const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

export function bindStripeEnv(): void {
  if (process.env.FUNCTIONS_EMULATOR) return;
  try {
    const key = stripeSecretKey.value().trim();
    if (key) process.env.STRIPE_SECRET_KEY = key;
  } catch {
    /* secret not mounted */
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(key);
}

export type BillingPlanId = "pro" | "power";

function readPriceEnv(primary: string, legacy?: string): string | null {
  const id = process.env[primary]?.trim();
  if (id) return id;
  if (legacy) {
    const legacyId = process.env[legacy]?.trim();
    if (legacyId) return legacyId;
  }
  return null;
}

export function priceIdForPlan(
  plan: BillingPlanId,
  interval: "month" | "year",
): string | null {
  if (plan === "pro") {
    return interval === "year"
      ? readPriceEnv("STRIPE_PRICE_PRO_YEARLY")
      : readPriceEnv("STRIPE_PRICE_PRO_MONTHLY");
  }
  return interval === "year"
    ? readPriceEnv("STRIPE_PRICE_POWER_YEARLY", "STRIPE_PRICE_BUSINESS_YEARLY")
    : readPriceEnv("STRIPE_PRICE_POWER_MONTHLY", "STRIPE_PRICE_BUSINESS_MONTHLY");
}

export function planFromStripePriceId(priceId: string): BillingPlanId | null {
  const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  const proYearly = process.env.STRIPE_PRICE_PRO_YEARLY?.trim();
  const powerMonthly =
    readPriceEnv("STRIPE_PRICE_POWER_MONTHLY", "STRIPE_PRICE_BUSINESS_MONTHLY") ??
    undefined;
  const powerYearly =
    readPriceEnv("STRIPE_PRICE_POWER_YEARLY", "STRIPE_PRICE_BUSINESS_YEARLY") ??
    undefined;
  if (priceId === proMonthly || priceId === proYearly) return "pro";
  if (priceId === powerMonthly || priceId === powerYearly) return "power";
  return null;
}
