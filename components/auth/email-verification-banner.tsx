"use client";

import { sendVerificationEmail } from "@/lib/firebase/auth-email";
import { formatAuthError } from "@/lib/firebase/auth-errors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw } from "lucide-react";
import { useState } from "react";

export function EmailVerificationBanner() {
  const { user, reload } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!user?.email || user.emailVerified) return null;

  const isPasswordUser = user.providerData.some(
    (p) => p.providerId === "password",
  );
  if (!isPasswordUser) return null;

  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30"
      role="status"
    >
      <div className="flex gap-2">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-800 dark:text-amber-200" />
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            Email not verified yet
          </p>
          <p className="text-amber-900/90 dark:text-amber-200/90">
            You can use Listen, notes, and sync without verifying. Verification
            is only required before turning on <strong>2FA</strong> in Settings.
            If you never got a message, resend below — check spam/junk for mail
            from Firebase (noreply).
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
            Signed in as {user.email}
          </p>
          {error ? (
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          ) : null}
          {sent ? (
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Email sent. After you click the link, tap Refresh status.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              className="border-amber-300 bg-white dark:border-amber-800 dark:bg-amber-950"
              onClick={() => {
                setBusy(true);
                setError(null);
                void sendVerificationEmail(user)
                  .then(() => setSent(true))
                  .catch((e) => setError(formatAuthError(e)))
                  .finally(() => setBusy(false));
              }}
            >
              Resend email
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              className="gap-1.5 border-amber-300 bg-white dark:border-amber-800 dark:bg-amber-950"
              onClick={() => {
                setBusy(true);
                setError(null);
                void reload()
                  .then((verified) => {
                    if (!verified) {
                      setError(
                        "Still unverified — open the link in the email first, then try again.",
                      );
                    } else {
                      setError(null);
                      setSent(false);
                    }
                  })
                  .catch((e) =>
                    setError(
                      e instanceof Error ? e.message : "Could not refresh.",
                    ),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh status
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
