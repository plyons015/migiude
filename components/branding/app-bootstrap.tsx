"use client";

import { AppLoadingScreen } from "@/components/branding/app-loading-screen";
import {
  markDailyOpeningSplashShown,
  shouldShowDailyOpeningSplash,
} from "@/lib/branding/splash-daily";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { useState } from "react";

function shouldShowSplashOnLaunch(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativePlatform()) return true;
  return shouldShowDailyOpeningSplash();
}

/** Opening video splash, then the app. Web: once per local day; native: every launch. */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(shouldShowSplashOnLaunch);

  const completeSplash = () => {
    if (!isNativePlatform()) {
      markDailyOpeningSplashShown();
    }
    setVisible(false);
  };

  return (
    <>
      {visible ? <AppLoadingScreen onComplete={completeSplash} /> : null}
      {children}
    </>
  );
}
