"use client";

import { PlanUsageCard } from "@/components/settings/plan-usage-card";
import { useAuthUser } from "@/hooks/use-auth-user";
import { usePlanAndUsage } from "@/hooks/use-plan-and-usage";
import { createBillingPortalSession, createCheckoutSession } from "@/lib/billing/client";
import { TEAMS_BOT_INTEGRATION_LAUNCHED } from "@/lib/integrations/microsoft/feature";
import { isFirebaseConfigured } from "@/lib/env/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";

type CheckoutKey = "pro-month" | "pro-year" | "power-month" | "power-year" | "portal";

function billingReturnBase(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/settings/`;
}

function TierCard({
  name,
  tagline,
  cloudLabel,
  aiLabel,
  teamsBotLabel,
  priceMonthly,
  priceYearly,
  highlighted,
  isCurrent,
  badge,
}: {
  name: string;
  tagline: string;
  cloudLabel: string;
  aiLabel: string;
  teamsBotLabel?: string;
  priceMonthly: number | null;
  priceYearly: number | null;
  highlighted?: boolean;
  isCurrent?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlighted
          ? "border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{name}</p>
        <div className="flex items-center gap-1.5">
          {badge ? <Badge>{badge}</Badge> : null}
          {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{tagline}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Unlimited on-device transcription
      </p>
      <p className="text-xs text-muted-foreground">{cloudLabel}</p>
      <p className="text-xs text-muted-foreground">{aiLabel}</p>
      {teamsBotLabel ? (
        <p className="text-xs text-muted-foreground">{teamsBotLabel}</p>
      ) : null}
      <p className="mt-2 tabular-nums text-xs">
        ${priceMonthly}/mo · ${priceYearly}/yr
      </p>
    </div>
  );
}

export function BillingSettings() {
  const { user, ensureSignedIn } = useAuthUser();
  const { data, loading, error, refresh, config, plan: currentPlan } =
    usePlanAndUsage();
  const [busy, setBusy] = useState<CheckoutKey | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!isFirebaseConfigured()) return null;

  const pro = config.tiers.pro.display;
  const power = config.tiers.power.display;

  const startCheckout = async (
    plan: "pro" | "power",
    interval: "month" | "year",
  ) => {
    const key: CheckoutKey = `${plan}-${interval}`;
    setBusy(key);
    setCheckoutError(null);
    try {
      await ensureSignedIn();
      const base = billingReturnBase();
      const { url } = await createCheckoutSession({
        plan,
        interval,
        successUrl: `${base}?billing=success`,
        cancelUrl: `${base}?billing=cancel`,
      });
      window.location.href = url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Checkout failed.");
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy("portal");
    setCheckoutError(null);
    try {
      await ensureSignedIn();
      const { url } = await createBillingPortalSession(billingReturnBase());
      window.location.href = url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Could not open billing portal.");
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {user ? (
        <PlanUsageCard
          data={data}
          loading={loading}
          error={error}
          onRetry={() => void refresh()}
        />
      ) : null}

      <Card id="billing">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Upgrade & billing
          </CardTitle>
          <CardDescription>
            All plans include unlimited on-device (browser) transcription. Paid
            plans add cloud transcription and AI — billed via Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <TierCard
              name={pro.name}
              tagline={pro.tagline}
              cloudLabel={pro.cloudSttLabel}
              aiLabel={pro.aiLabel}
              teamsBotLabel={
                TEAMS_BOT_INTEGRATION_LAUNCHED
                  ? pro.teamsBotLabel
                  : "Teams meeting bot — coming soon"
              }
              priceMonthly={pro.priceMonthlyUsd}
              priceYearly={pro.priceYearlyUsd}
              highlighted
              badge="Most popular"
              isCurrent={currentPlan === "pro"}
            />
            <TierCard
              name={power.name}
              tagline={power.tagline}
              cloudLabel={power.cloudSttLabel}
              aiLabel={power.aiLabel}
              teamsBotLabel={
                TEAMS_BOT_INTEGRATION_LAUNCHED
                  ? power.teamsBotLabel
                  : "Teams meeting bot — coming soon"
              }
              priceMonthly={power.priceMonthlyUsd}
              priceYearly={power.priceYearlyUsd}
              isCurrent={currentPlan === "power"}
            />
          </div>

          {!user ? (
            <p className="text-sm text-muted-foreground">
              Sign in to upgrade or manage your subscription.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Pro
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy !== null || currentPlan === "pro"}
                    onClick={() => void startCheckout("pro", "year")}
                  >
                    {busy === "pro-year" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : null}
                    ${pro.priceYearlyUsd}/year
                    <Badge className="ml-1.5 text-[10px] font-normal" variant="secondary">
                      Best value
                    </Badge>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy !== null || currentPlan === "pro"}
                    onClick={() => void startCheckout("pro", "month")}
                  >
                    {busy === "pro-month" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : null}
                    ${pro.priceMonthlyUsd}/month
                  </Button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Power
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy !== null || currentPlan === "power"}
                    onClick={() => void startCheckout("power", "year")}
                  >
                    {busy === "power-year" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : null}
                    ${power.priceYearlyUsd}/year
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy !== null || currentPlan === "power"}
                    onClick={() => void startCheckout("power", "month")}
                  >
                    {busy === "power-month" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : null}
                    ${power.priceMonthlyUsd}/month
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy !== null}
                onClick={() => void openPortal()}
              >
                {busy === "portal" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Manage subscription
              </Button>
            </div>
          )}
          {checkoutError ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {checkoutError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
