"use client";

import { AppLoadingScreen } from "@/components/branding/app-loading-screen";
import { useState } from "react";

/** Shows opening video splash, then the app. */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);

  return (
    <>
      {visible ? <AppLoadingScreen onComplete={() => setVisible(false)} /> : null}
      {children}
    </>
  );
}
