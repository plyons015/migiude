"use client";

import {
  computeUpgradeNudge,
  dismissUpgradeNudge,
  isUpgradeNudgeDismissed,
} from "@/lib/plan/upgrade-nudges";
import {
  nudgeToIpodContent,
  pickRotatingBenefit,
  toneClasses,
  type IpodDisplayContent,
} from "@/lib/plan/upgrade-display-messages";
import { APP_NAME } from "@/lib/branding/app-name";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { ADSENSE_CLIENT } from "@/lib/ads/adsense";
import { usePlanAndUsage } from "@/hooks/use-plan-and-usage";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const AD_DURATION_MS = 10_000;
const ROTATE_BENEFIT_MS = 12_000;
const AD_DISMISS_KEY = "ude-ipod-ad-dismissed-until";

function AdSenseInDisplay() {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim();

  useEffect(() => {
    if (!slot) return;
    try {
      (
        window as unknown as { adsbygoogle?: unknown[] }
      ).adsbygoogle?.push({});
    } catch {
      /* ad blockers */
    }
  }, [slot]);

  if (!slot) {
    return (
      <p className="text-[11px] leading-snug opacity-80">
        Upgrade to Pro for cloud backup, AI, and no ads.
      </p>
    );
  }

  return (
    <ins
      className="adsbygoogle block max-h-16 w-full overflow-hidden"
      style={{ display: "block" }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format="horizontal"
      data-full-width-responsive="true"
    />
  );
}

function isAdDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(AD_DISMISS_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until) || until < Date.now()) {
    localStorage.removeItem(AD_DISMISS_KEY);
    return false;
  }
  return true;
}

function dismissAd(hours = 24): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    AD_DISMISS_KEY,
    String(Date.now() + hours * 60 * 60 * 1000),
  );
}

type IpodDisplayProps = {
  greeting: string;
  subtitle?: string;
  holdHint?: string | null;
};

export function IpodDisplay({ greeting, subtitle, holdHint }: IpodDisplayProps) {
  const { plan, data, loading } = usePlanAndUsage();
  const [nudgeDismissed, setNudgeDismissed] = useState(() =>
    isUpgradeNudgeDismissed(),
  );
  const [adDismissed, setAdDismissed] = useState(() => isAdDismissed());
  const [adVisible, setAdVisible] = useState(false);
  const [benefitIndex, setBenefitIndex] = useState(0);

  const adsEnabled =
    plan === "free" &&
    process.env.NEXT_PUBLIC_ADS_FREE_TIER_DISABLED !== "true";

  /** Web: AdSense runs in the fixed bottom bar; skip duplicate in-display ads. */
  const adsInDisplay = adsEnabled && isNativePlatform();

  useEffect(() => {
    if (!adsInDisplay || adDismissed || loading) {
      setAdVisible(false);
      return;
    }
    setAdVisible(true);
    const t = window.setTimeout(() => setAdVisible(false), AD_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [adsInDisplay, adDismissed, loading]);

  useEffect(() => {
    if (plan !== "free") return;
    const t = window.setInterval(
      () => setBenefitIndex((i) => i + 1),
      ROTATE_BENEFIT_MS,
    );
    return () => window.clearInterval(t);
  }, [plan]);

  const nudge = useMemo(
    () =>
      plan === "free" ? computeUpgradeNudge(data) : { show: false as const },
    [plan, data],
  );

  const content: IpodDisplayContent = useMemo(() => {
    if (holdHint) {
      return { id: "hold-hint", tone: "neutral", line1: holdHint };
    }

    if (plan === "free" && nudge.show && !nudgeDismissed) {
      return nudgeToIpodContent(nudge);
    }

    if (plan === "free" && adsInDisplay && adVisible && !adDismissed) {
      return {
        id: "ad",
        tone: "ad",
        line1: "Free plan",
        line2: "Sponsored message",
        dismissible: true,
      };
    }

    if (plan === "free") {
      const benefit = pickRotatingBenefit(benefitIndex);
      return { id: `benefits-${benefitIndex}`, ...benefit };
    }

    return {
      id: "home",
      tone: "neutral",
      line1: greeting,
      line2: subtitle,
    };
  }, [
    holdHint,
    plan,
    nudge,
    nudgeDismissed,
    adsInDisplay,
    adVisible,
    adDismissed,
    benefitIndex,
    greeting,
    subtitle,
  ]);

  const tones = toneClasses(content.tone);

  const handleDismiss = useCallback(() => {
    if (content.id === "ad") {
      dismissAd(24);
      setAdDismissed(true);
      setAdVisible(false);
      return;
    }
    if (content.id.startsWith("nudge-")) {
      dismissUpgradeNudge(7);
      setNudgeDismissed(true);
    }
  }, [content.id]);

  const headerLabel =
    plan === "free" && content.id === "ad" ? "Sponsored" : APP_NAME;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-300/80 shadow-inner dark:border-zinc-700",
        tones.shell,
        "transition-colors duration-500",
      )}
    >
      <div className="border-b border-black/5 px-3 py-1.5 dark:border-white/10">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {headerLabel}
        </p>
      </div>
      <div className="relative min-h-30 px-4 py-4">
        {(content.dismissible || content.id === "ad") && !holdHint ? (
          <button
            type="button"
            className="absolute right-2 top-2 rounded p-1 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
            onClick={handleDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        <div
          key={content.id}
          className={cn("animate-ipod-fade-in space-y-1 pr-6", tones.text)}
        >
          <p className="text-sm font-semibold leading-snug">{content.line1}</p>
          {content.line2 ? (
            <p className={cn("text-xs leading-relaxed", tones.sub)}>
              {content.line2}
            </p>
          ) : null}
          {content.linkHref && content.linkLabel ? (
            <Link
              href={content.linkHref}
              className="inline-block pt-1 text-xs font-medium underline underline-offset-2"
            >
              {content.linkLabel}
            </Link>
          ) : null}
          {content.id === "ad" ? (
            <div className="pt-2">
              <AdSenseInDisplay />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
