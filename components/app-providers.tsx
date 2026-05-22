"use client";

import { AppBootstrap } from "@/components/branding/app-bootstrap";
import { CapacitorProvider } from "@/components/capacitor-provider";
import { FirebaseProvider } from "@/components/firebase-provider";
import { OnboardingGate } from "@/components/onboarding-gate";
import { PushBootstrap } from "@/components/push-bootstrap";
import { RemindersBootstrap } from "@/components/reminders-bootstrap";
import { ThemeProvider } from "@/components/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <CapacitorProvider>
      <AppBootstrap>
        <ThemeProvider>
          <FirebaseProvider>
            <OnboardingGate>
              <PushBootstrap>
                <RemindersBootstrap>{children}</RemindersBootstrap>
              </PushBootstrap>
            </OnboardingGate>
          </FirebaseProvider>
        </ThemeProvider>
      </AppBootstrap>
    </CapacitorProvider>
  );
}
