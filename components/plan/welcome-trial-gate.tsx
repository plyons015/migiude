"use client";

import { WelcomeTrialDialog } from "@/components/plan/welcome-trial-dialog";
import { useAuthUser } from "@/hooks/use-auth-user";
import { usePlanAndUsage } from "@/hooks/use-plan-and-usage";
import {
  dismissWelcomeTrial,
  isWelcomeTrialDismissed,
} from "@/lib/plan/trial";
import { useEffect, useState } from "react";

/** One-time welcome for new trial users (per account). */
export function WelcomeTrialGate({ children }: { children: React.ReactNode }) {
  const { uid, loading: authLoading } = useAuthUser();
  const { data, loading: planLoading } = usePlanAndUsage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (authLoading || planLoading || !uid || !data?.trial) {
      setOpen(false);
      return;
    }
    if (!data.trial.active || data.trial.requiresUpgrade) {
      setOpen(false);
      return;
    }
    if (isWelcomeTrialDismissed(uid)) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [authLoading, planLoading, uid, data?.trial]);

  const dismiss = () => {
    if (uid) dismissWelcomeTrial(uid);
    setOpen(false);
  };

  return (
    <>
      {children}
      {data?.trial ? (
        <WelcomeTrialDialog open={open} trial={data.trial} onDismiss={dismiss} />
      ) : null}
    </>
  );
}
