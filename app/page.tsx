"use client";

import { isNativePlatform } from "@/lib/capacitor/platform";
import { isOnboardingComplete } from "@/lib/onboarding/preferences";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Static-export friendly redirect to dashboard (or onboarding on first native launch). */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (isNativePlatform() && !isOnboardingComplete()) {
      router.replace("/onboarding/");
      return;
    }
    router.replace("/dashboard/");
  }, [router]);

  return null;
}
