"use client";

import {
  isOnboardingComplete,
  subscribeOnboarding,
} from "@/lib/onboarding/preferences";
import { isOnboardingRoute } from "@/lib/onboarding/routes";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  return subscribeOnboarding(onStoreChange);
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
    router.replace("/onboarding/");
  }, [complete, router]);

  return children;
}
