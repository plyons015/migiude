import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import type Stripe from "stripe";
import {
  clearSubscriptionForUid,
  logBillingEvent,
  syncUserPlanFromSubscription,
} from "./profile-sync";
import {
  bindStripeEnv,
  getStripe,
  stripeSecretKey,
  stripeWebhookSecret,
} from "./stripe-client";

async function uidFromSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metaUid = subscription.metadata?.uid;
  if (metaUid) return metaUid;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const snap = await getFirestore()
    .collection("userProfiles")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  return snap.docs[0]?.id ?? null;
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid =
        session.client_reference_id ??
        session.metadata?.uid ??
        null;
      if (!uid) break;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) break;
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncUserPlanFromSubscription(
        uid,
        subscription,
        session.customer_details?.email ?? session.customer_email,
      );
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const uid = await uidFromSubscription(subscription);
      if (!uid) break;
      await syncUserPlanFromSubscription(uid, subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const uid = await uidFromSubscription(subscription);
      if (!uid) break;
      await clearSubscriptionForUid(uid, "subscription.deleted");
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
      if (!customerId) break;
      const snap = await getFirestore()
        .collection("userProfiles")
        .where("stripeCustomerId", "==", customerId)
        .limit(1)
        .get();
      const uid = snap.docs[0]?.id;
      if (uid) {
        await logBillingEvent({
          type: "invoice.payment_failed",
          uid,
          stripeEventId: event.id,
        });
      }
      break;
    }
    default:
      break;
  }
}

export const stripeWebhook = onRequest(
  {
    invoker: "public",
    secrets: [stripeSecretKey, stripeWebhookSecret],
    cors: false,
  },
  async (req, res) => {
    bindStripeEnv();
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      res.status(400).send("Missing Stripe signature.");
      return;
    }

    let webhookSecret: string;
    try {
      webhookSecret = stripeWebhookSecret.value().trim();
    } catch {
      res.status(500).send("Webhook secret not configured.");
      return;
    }

    let event: Stripe.Event;
    try {
      const rawBody = (req as { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        res.status(400).send("Missing raw body.");
        return;
      }
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid payload.";
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    try {
      await handleStripeEvent(event);
      res.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Handler failed.";
      res.status(500).send(message);
    }
  },
);
