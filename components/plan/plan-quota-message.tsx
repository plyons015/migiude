"use client";

import { isPlanQuotaError } from "@/lib/plan/upgrade-nudges";
import Link from "next/link";

type PlanQuotaMessageProps = {
  message: string;
  className?: string;
};

/** Inline quota / plan-limit error with one-tap path to proxy (Settings → billing). */
export function PlanQuotaMessage({ message, className }: PlanQuotaMessageProps) {
  const showUpgrade = isPlanQuotaError(message);

  return (
    <p className={className ?? "text-xs text-amber-700 dark:text-amber-300"}>
      {message}
      {showUpgrade ? (
        <>
          {" "}
          <Link
            href="/settings/"
            className="font-medium underline underline-offset-2"
          >
            Upgrade in Settings
          </Link>
        </>
      ) : null}
    </p>
  );
}
