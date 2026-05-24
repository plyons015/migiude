"use client";

import type { AdminDashboard } from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, ExternalLink } from "lucide-react";
import { format } from "date-fns";

type Props = {
  billing: AdminDashboard["billing"];
};

export function AdminBillingPanel({ billing }: Props) {
  const counts = billing.planCounts;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Stripe billing
          </CardTitle>
          <CardDescription>{billing.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span>Status:</span>
            <Badge
              variant={billing.stripeConfigured ? "default" : "outline"}
            >
              {billing.stripeConfigured ? "Connected" : "Not connected"}
            </Badge>
            {billing.pastDueSubscriptions != null &&
            billing.pastDueSubscriptions > 0 ? (
              <Badge className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                {billing.pastDueSubscriptions} past due
              </Badge>
            ) : null}
          </div>

          {billing.stripeConfigured ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                  <p className="text-xs text-muted-foreground">MRR (est.)</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {billing.mrr != null ? `$${billing.mrr.toFixed(2)}` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                  <p className="text-xs text-muted-foreground">
                    Active subscriptions
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {billing.activeSubscriptions ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                  <p className="text-xs text-muted-foreground">
                    Profiles by plan
                  </p>
                  <p className="text-sm tabular-nums">
                    {counts
                      ? `Free ${counts.free} · Pro ${counts.pro} · Power ${counts.power}`
                      : "—"}
                  </p>
                </div>
              </div>

              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 underline dark:text-violet-400"
              >
                Open Stripe Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Set <code className="text-[10px]">STRIPE_SECRET_KEY</code>,{" "}
              <code className="text-[10px]">STRIPE_WEBHOOK_SECRET</code>, and
              price IDs on Functions, then deploy{" "}
              <code className="text-[10px]">stripeWebhook</code>.
            </p>
          )}
        </CardContent>
      </Card>

      {billing.recentEvents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent billing events</CardTitle>
            <CardDescription>From webhooks (Firestore mirror)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {billing.recentEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800"
                >
                  <span className="font-medium">{ev.type}</span>
                  <span className="text-xs text-muted-foreground">
                    {ev.email ?? ev.uid?.slice(0, 8) ?? "—"}
                    {ev.plan ? ` · ${ev.plan}` : ""}
                    {ev.createdAt
                      ? ` · ${format(ev.createdAt, "MMM d HH:mm")}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
