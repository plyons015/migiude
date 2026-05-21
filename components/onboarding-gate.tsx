"use client";

import {
  isOnboardingComplete,
  subscribeOnboarding,
} from "@/lib/onboarding/preferences";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  return subscribeOnboarding(onStoreChange);
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const complete = useSyncExternalStore(
    subscribe,
    () => isOnboardingComplete(),
    () => true,
  );

  useEffect(() => {
    if (!isNativePlatform() || complete) return;
    if (pathname.startsWith("/onboarding") || pathname.startsWith("/setup")) {
      return;
    }
    router.replace("/onboarding/");
  }, [complete, pathname, router]);

  return children;
}
