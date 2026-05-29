"use client";

import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";
import {
  getCapacitorPlatform,
  isNativePlatform,
} from "@/lib/capacitor/platform";
import { initFirebaseClient } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/env/client";
import { reportClientError } from "@/lib/telemetry/report-client-error";

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isNativePlatform()) return;

    if (isFirebaseConfigured()) {
      initFirebaseClient();
    }

    void SplashScreen.hide().catch(() => undefined);
    const splashFallback = window.setTimeout(() => {
      void SplashScreen.hide().catch(() => undefined);
    }, 5000);

    void (async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        // Status bar plugin not available on all WebViews
      }

      await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
          return;
        }
        void App.exitApp();
      });
    })();

    return () => window.clearTimeout(splashFallback);
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void reportClientError({
        message: event.message || "window.error",
        stack: event.error?.stack,
        platform: getCapacitorPlatform(),
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? `${event.reason.name}: ${event.reason.message}`
          : String(event.reason);
      void reportClientError({
        message: reason.slice(0, 1000),
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
        platform: getCapacitorPlatform(),
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return children;
}
