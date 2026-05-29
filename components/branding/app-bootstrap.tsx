"use client";

import { AppLoadingScreen } from "@/components/branding/app-loading-screen";
import {
  markDailyOpeningSplashShown,
  shouldShowDailyOpeningSplash,
} from "@/lib/branding/splash-daily";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { useCallback, useState, useSyncExternalStore } from "react";

function subscribeSplashStore() {
  return () => {};
}

/** Client-only splash decision; server snapshot must stay false to avoid hydration mismatch. */
function readSplashVisible(): boolean {
  if (isNativePlatform()) return false;
  return shouldShowDailyOpeningSplash();
}

/** Opening video splash, then the app. Web: once per local day; native: skipped. */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const shouldShow = useSyncExternalStore(
    subscribeSplashStore,
    readSplashVisible,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);
  const visible = shouldShow && !dismissed;

  const completeSplash = useCallback(() => {
    if (!isNativePlatform()) {
      markDailyOpeningSplashShown();
    }
    setDismissed(true);
  }, []);

  return (
    <>
      {visible ? <AppLoadingScreen onComplete={completeSplash} /> : null}
      {children}
    </>
  );
}
