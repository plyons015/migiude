import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { planFromStripePriceId, type BillingPlanId } from "./stripe-client";

async function profileAllowsStripePlanWrite(uid: string): Promise<boolean> {
  const snap = await getFirestore().doc(`userProfiles/${uid}`).get();
  return snap.data()?.planOverride !== true;
}

export async function logBillingEvent(input: {
  type: string;
  uid?: string | null;
  email?: string | null;
  plan?: string | null;
  stripeEventId?: string;
}): Promise<void> {
  const db = getFirestore();
  const id = input.stripeEventId ?? `${input.type}_${Date.now()}`;
  await db.doc(`billingEvents/${id}`).set(
    {
      type: input.type,
      uid: input.uid ?? null,
      email: input.email ?? null,
      plan: input.plan ?? null,
      createdAt: Date.now(),
    },
    { merge: true },
  );
}

export async function syncUserPlanFromSubscription(
  uid: string,
  subscription: Stripe.Subscription,
  email?: string | null,
): Promise<BillingPlanId | "free"> {
  const priceId = subscription.items.data[0]?.price?.id;
  const mapped = priceId ? planFromStripePriceId(priceId) : null;
  const status = subscription.status;
  const plan: BillingPlanId | "free" =
    status === "active" || status === "trialing"
      ? mapped ?? "pro"
      : "free";

  const db = getFirestore();
  const allowPlanWrite = await profileAllowsStripePlanWrite(uid);
  await db.doc(`userProfiles/${uid}`).set(
    {
      ...(allowPlanWrite ? { plan } : {}),
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id ?? null,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      updatedAt: FieldValue.serverTimestamp(),
      ...(email ? { email } : {}),
    },
    { merge: true },
  );

  await logBillingEvent({
    type: `subscription.${status}`,
    uid,
    email: email ?? null,
    plan,
    stripeEventId: `sub_${subscription.id}_${status}`,
  });

  return plan;
}

export async function clearSubscriptionForUid(
  uid: string,
  reason: string,
): Promise<void> {
  const db = getFirestore();
  const allowPlanWrite = await profileAllowsStripePlanWrite(uid);
  await db.doc(`userProfiles/${uid}`).set(
    {
      ...(allowPlanWrite ? { plan: "free" } : {}),
      subscriptionStatus: reason,
      stripeSubscriptionId: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await logBillingEvent({ type: reason, uid, plan: allowPlanWrite ? "free" : null });
}
