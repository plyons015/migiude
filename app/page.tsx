"use client";

import { hardReplace } from "@/lib/navigation/hard-navigate";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { isOnboardingComplete } from "@/lib/onboarding/preferences";
import { useEffect, useRef } from "react";

/** Static-export friendly redirect to dashboard (or onboarding on first native launch). */
export default function RootPage() {
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;

    if (isNativePlatform() && !isOnboardingComplete()) {
      hardReplace("/onboarding/");
      return;
    }
    hardReplace("/dashboard/");
  }, []);

  return null;
}
