"use client";

import { AppLoadingScreen } from "@/components/branding/app-loading-screen";
import { useEffect, useState } from "react";

const MIN_MS = 400;

/** Shows branded loading art until the client has mounted (and briefly after). */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const done = () => setVisible(false);
    const timer = window.setTimeout(done, MIN_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      {visible ? <AppLoadingScreen /> : null}
      {children}
    </>
  );
}
