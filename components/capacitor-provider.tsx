"use client";

import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { reportClientError } from "@/lib/telemetry/report-client-error";

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isNativePlatform()) return;

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
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void reportClientError({
        message: event.message || "window.error",
        stack: event.error?.stack,
        platform: "android",
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
        platform: "android",
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
