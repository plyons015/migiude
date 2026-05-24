"use client";

import { AppSessionGate } from "@/components/app-session-gate";
import { AppBootstrap } from "@/components/branding/app-bootstrap";
import { CapacitorProvider } from "@/components/capacitor-provider";
import { FirebaseProvider } from "@/components/firebase-provider";
import { OnboardingGate } from "@/components/onboarding-gate";
import { PlanAndUsageProvider } from "@/components/plan/plan-and-usage-provider";
import { PushBootstrap } from "@/components/push-bootstrap";
import { RemindersBootstrap } from "@/components/reminders-bootstrap";
import { ThemeProvider } from "@/components/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <CapacitorProvider>
      <AppBootstrap>
        <ThemeProvider>
          <FirebaseProvider>
            <PlanAndUsageProvider>
              <OnboardingGate>
                <AppSessionGate>
                  <PushBootstrap>
                    <RemindersBootstrap>{children}</RemindersBootstrap>
                  </PushBootstrap>
                </AppSessionGate>
              </OnboardingGate>
            </PlanAndUsageProvider>
          </FirebaseProvider>
        </ThemeProvider>
      </AppBootstrap>
    </CapacitorProvider>
  );
}
