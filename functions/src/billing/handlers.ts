import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import {
  bindStripeEnv,
  getStripe,
  isStripeConfigured,
  priceIdForPlan,
  stripeSecretKey,
  type BillingPlanId,
} from "./stripe-client";

const billingCallOptions = {
  invoker: "public" as const,
  secrets: [stripeSecretKey],
};

export const createCheckoutSession = onCall(
  billingCallOptions,
  async (request) => {
    bindStripeEnv();
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to upgrade.");
    }
    if (!isStripeConfigured()) {
      throw new HttpsError(
        "failed-precondition",
        "Billing is not configured yet.",
      );
    }

    const schema = z.object({
      plan: z.enum(["pro", "power", "business"]).default("pro"),
      interval: z.enum(["month", "year"]).default("month"),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    });
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const { plan: rawPlan, interval, successUrl, cancelUrl } = parsed.data;
    const plan: BillingPlanId =
      rawPlan === "business" ? "power" : rawPlan;
    const priceId = priceIdForPlan(plan, interval);
    if (!priceId) {
      throw new HttpsError(
        "failed-precondition",
        `Stripe price not configured for ${plan} (${interval}).`,
      );
    }

    const uid = request.auth.uid;
    const email =
      request.auth.token.email ??
      (await getAuth().getUser(uid).catch(() => null))?.email ??
      undefined;

    const db = getFirestore();
    const profile = (await db.doc(`userProfiles/${uid}`).get()).data() ?? {};
    const stripe = getStripe();

    let customerId = profile.stripeCustomerId as string | undefined;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = undefined;
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { uid },
      });
      customerId = customer.id;
      await db.doc(`userProfiles/${uid}`).set(
        { stripeCustomerId: customerId },
        { merge: true },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: uid,
      metadata: { uid, plan },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new HttpsError("internal", "Could not create checkout session.");
    }

    return { url: session.url };
  },
);

export const createBillingPortalSession = onCall(
  billingCallOptions,
  async (request) => {
    bindStripeEnv();
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to manage billing.");
    }
    if (!isStripeConfigured()) {
      throw new HttpsError(
        "failed-precondition",
        "Billing is not configured yet.",
      );
    }

    const schema = z.object({ returnUrl: z.string().url() });
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const uid = request.auth.uid;
    const profile = (
      await getFirestore().doc(`userProfiles/${uid}`).get()
    ).data();
    const customerId = profile?.stripeCustomerId as string | undefined;
    if (!customerId) {
      throw new HttpsError(
        "failed-precondition",
        "No Stripe customer on file. Upgrade first.",
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: parsed.data.returnUrl,
    });

    return { url: session.url };
  },
);
