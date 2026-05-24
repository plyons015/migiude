"use client";

import {
  isOnboardingComplete,
  subscribeOnboarding,
} from "@/lib/onboarding/preferences";
import { isOnboardingRoute } from "@/lib/onboarding/routes";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { hardReplace } from "@/lib/navigation/hard-navigate";
import { useEffect, useRef, useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  return subscribeOnboarding(onStoreChange);
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const redirecting = useRef(false);
  const complete = useSyncExternalStore(
    subscribe,
    () => isOnboardingComplete(),
    () => true,
  );

  useEffect(() => {
    if (!isNativePlatform() || complete) return;
    if (isOnboardingRoute()) return;
    if (redirecting.current) return;
    redirecting.current = true;
    hardReplace("/onboarding/");
  }, [complete]);

  return children;
}
