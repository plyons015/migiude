"use client";

import {
  getThemePreference,
  subscribeSettings,
  type ThemePreference,
} from "@/lib/settings/preferences";
import { useEffect } from "react";

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(getThemePreference());
    const unsub = subscribeSettings(() => applyTheme(getThemePreference()));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => {
      if (getThemePreference() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onMq);
    return () => {
      unsub();
      mq.removeEventListener("change", onMq);
    };
  }, []);

  return children;
}
