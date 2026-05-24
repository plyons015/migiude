"use client";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/branding/app-name";
import { formatTrialDaysRemaining, TRIAL_LIMITS } from "@/lib/plan/trial";
import type { TrialStatus } from "@/lib/plan/types";
import Link from "next/link";
import { Sparkles } from "lucide-react";

type WelcomeTrialDialogProps = {
  open: boolean;
  trial: TrialStatus;
  onDismiss: () => void;
};

export function WelcomeTrialDialog({
  open,
  trial,
  onDismiss,
}: WelcomeTrialDialogProps) {
  if (!open) return null;

  const daysLabel = formatTrialDaysRemaining(trial.endsAt);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close welcome"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-trial-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-background p-6 shadow-xl dark:border-zinc-700"
      >
        <div className="mb-4 flex items-center gap-2 text-violet-600 dark:text-violet-400">
          <Sparkles className="h-5 w-5" />
          <p className="text-xs font-semibold uppercase tracking-wide">
            Welcome to {APP_NAME}
          </p>
        </div>
        <h2 id="welcome-trial-title" className="text-xl font-semibold">
          Your 7-day trial is active
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {daysLabel
            ? `${daysLabel} left to explore. After day 7, choose Pro or Power to keep using cloud AI and recording features.`
            : "Explore everything free for 7 days. After that, choose Pro or Power to continue."}
        </p>

        <ul className="mt-4 space-y-2 rounded-xl border border-violet-200/80 bg-violet-50/60 p-4 text-sm dark:border-violet-900/40 dark:bg-violet-950/20">
          <li>
            <span className="font-medium">Meeting recording:</span>{" "}
            {TRIAL_LIMITS.meetingMinutes} minutes total
          </li>
          <li>
            <span className="font-medium">AI actions:</span>{" "}
            {TRIAL_LIMITS.aiCalls} calls
          </li>
          <li>
            <span className="font-medium">On-device transcription:</span>{" "}
            {TRIAL_LIMITS.onDeviceMinutes} minutes total
          </li>
        </ul>

        <p className="mt-3 text-xs text-muted-foreground">
          On-device transcription stays on your machine. Cloud features count
          toward your trial limits.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={onDismiss}>
            Get started
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/settings/?tab=billing" onClick={onDismiss}>
              View plans
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
