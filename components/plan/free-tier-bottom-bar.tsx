"use client";

import {
  computeUpgradeNudge,
  dismissUpgradeNudge,
  isUpgradeNudgeDismissed,
} from "@/lib/plan/upgrade-nudges";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { ADSENSE_CLIENT } from "@/lib/ads/adsense";
import { usePlanAndUsage } from "@/hooks/use-plan-and-usage";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

function AdBannerStrip() {
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

  if (!slot) return null;

  return (
    <div className="flex min-h-[50px] items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-900/80">
      <ins
        className="adsbygoogle block"
        style={{ display: "block", minHeight: 50, width: "100%" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}

export function FreeTierBottomBar() {
  const pathname = usePathname();
  const { plan, data, loading } = usePlanAndUsage();
  const [dismissed, setDismissed] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(0);

  useEffect(() => {
    setDismissed(isUpgradeNudgeDismissed());
  }, []);

  const isDashboard =
    pathname === "/" || pathname?.startsWith("/dashboard");

  const hiddenPath =
    isNativePlatform() ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/setup");

  const visible = !hiddenPath && !loading && plan === "free";
  const nudge = visible ? computeUpgradeNudge(data) : { show: false as const };
  /** Nudges live in the dashboard iPod display — bottom bar is ads-only there. */
  const showNudge = nudge.show && !dismissed && !isDashboard;
  const adsEnabled = process.env.NEXT_PUBLIC_ADS_FREE_TIER_DISABLED !== "true";
  const hasAds =
    adsEnabled && Boolean(process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim());

  const showBar = visible && (showNudge || hasAds);

  useEffect(() => {
    const el = barRef.current;
    if (!el || !showBar) {
      setBarHeight(0);
      document.documentElement.style.removeProperty("--free-tier-bottom-inset");
      return;
    }
    const sync = () => {
      const h = el.getBoundingClientRect().height;
      setBarHeight(h);
      document.documentElement.style.setProperty(
        "--free-tier-bottom-inset",
        `${h}px`,
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--free-tier-bottom-inset");
    };
  }, [showBar, showNudge, hasAds]);

  if (!showBar) return null;

  return (
    <>
      <div aria-hidden style={{ height: barHeight }} className="shrink-0" />
      <div
        ref={barRef}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm dark:border-zinc-800"
        role="region"
        aria-label={showNudge ? "Free plan" : "Sponsored"}
      >
        {showNudge ? (
          <div
            className={`flex items-start gap-2 px-3 py-2 text-xs ${
              nudge.severity === "limit"
                ? "bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                : "bg-violet-50 text-violet-950 dark:bg-violet-950/40 dark:text-violet-100"
            }`}
          >
            <p className="min-w-0 flex-1 leading-snug">
              {nudge.message}{" "}
              <Link
                href="/settings/"
                className="font-medium underline underline-offset-2"
              >
                View Pro
              </Link>
            </p>
            {nudge.severity === "approaching" ? (
              <button
                type="button"
                className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
                aria-label="Dismiss for 7 days"
                onClick={() => {
                  dismissUpgradeNudge(7);
                  setDismissed(true);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
        {adsEnabled ? <AdBannerStrip /> : null}
      </div>
    </>
  );
}
