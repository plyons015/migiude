"use client";

import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor/platform";

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isNativePlatform()) return;

    void (async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        // Status bar plugin not available on all WebViews
      }

      try {
        await new Promise((r) => setTimeout(r, 500));
        await SplashScreen.hide();
      } catch {
        /* Splash may already be hidden */
      }

      await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
          return;
        }
        void App.exitApp();
      });
    })();
  }, []);

  return children;
}
