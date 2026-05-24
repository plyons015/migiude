import { getFirestore } from "firebase-admin/firestore";
import { getStripe, isStripeConfigured } from "./stripe-client";

export type BillingEventRow = {
  id: string;
  type: string;
  createdAt: number;
  uid: string | null;
  email: string | null;
  plan: string | null;
};

export type StripeBillingSummary = {
  mrr: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  planCounts: { free: number; pro: number; power: number };
  recentEvents: BillingEventRow[];
};

export { isStripeConfigured };

function subscriptionMrrCents(sub: {
  items: { data: Array<{ price?: { unit_amount?: number | null; recurring?: { interval?: string } | null } | null }> };
}): number {
  let cents = 0;
  for (const item of sub.items.data) {
    const amount = item.price?.unit_amount ?? 0;
    const interval = item.price?.recurring?.interval;
    if (!amount) continue;
    if (interval === "month") cents += amount;
    else if (interval === "year") cents += Math.round(amount / 12);
  }
  return cents;
}

export async function fetchStripeBillingSummary(): Promise<StripeBillingSummary> {
  const stripe = getStripe();
  const [active, pastDue, profilesSnap, eventsSnap] = await Promise.all([
    stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.items.data.price"],
    }),
    stripe.subscriptions.list({ status: "past_due", limit: 20 }),
    getFirestore().collection("userProfiles").select("plan").get(),
    getFirestore()
      .collection("billingEvents")
      .orderBy("createdAt", "desc")
      .limit(15)
      .get()
      .catch(() => null),
  ]);

  let mrrCents = 0;
  for (const sub of active.data) {
    mrrCents += subscriptionMrrCents(sub);
  }

  const planCounts = { free: 0, pro: 0, power: 0 };
  for (const doc of profilesSnap.docs) {
    const plan = (doc.data().plan as string | undefined) ?? "free";
    if (plan === "pro") planCounts.pro++;
    else if (plan === "power" || plan === "business") planCounts.power++;
    else planCounts.free++;
  }

  const recentEvents: BillingEventRow[] = eventsSnap
    ? eventsSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          type: String(d.type ?? ""),
          createdAt: (d.createdAt as number) ?? 0,
          uid: (d.uid as string | undefined) ?? null,
          email: (d.email as string | undefined) ?? null,
          plan: (d.plan as string | undefined) ?? null,
        };
      })
    : [];

  return {
    mrr: Math.round((mrrCents / 100) * 100) / 100,
    activeSubscriptions: active.data.length,
    pastDueSubscriptions: pastDue.data.length,
    planCounts,
    recentEvents,
  };
}
