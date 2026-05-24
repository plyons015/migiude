"use client";

import { sendVerificationEmail } from "@/lib/firebase/auth-email";
import { formatAuthError } from "@/lib/firebase/auth-errors";
import {
  createRecaptchaVerifier,
  finishPhoneMfaEnrollment,
  finishTotpEnrollment,
  listEnrolledFactors,
  startPhoneMfaEnrollment,
  startTotpEnrollment,
  unenrollMfaFactor,
  userHasMfa,
  type TotpEnrollmentSession,
} from "@/lib/firebase/auth-mfa";
import { signOutUser } from "@/lib/firebase/auth";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useCallback, useId, useState } from "react";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900";

export function SecuritySettings() {
  const { user, reload } = useAuthUser();
  const recaptchaId = useId().replace(/:/g, "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [totpSession, setTotpSession] = useState<TotpEnrollmentSession | null>(
    null,
  );
  const [totpCode, setTotpCode] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerificationId, setPhoneVerificationId] = useState<string | null>(
    null,
  );

  const isPasswordUser =
    user?.providerData.some((p) => p.providerId === "password") ?? false;

  const factors = user ? listEnrolledFactors(user) : [];
  const hasMfa = user ? userHasMfa(user) : false;

  const refresh = useCallback(async () => {
    await reload();
    setTotpSession(null);
    setPhoneVerificationId(null);
  }, [reload]);

  if (!user || !isPasswordUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Account security
          </CardTitle>
          <CardDescription>
            Sign in with email and password to manage two-factor authentication.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Two-factor authentication (2FA)
        </CardTitle>
        <CardDescription>
          Authenticator app (recommended) or SMS backup. Email codes are not
          supported — use an app like Google Authenticator or Authy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!user.emailVerified ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-amber-900 dark:text-amber-100">
              2FA requires a verified email. The rest of the app works without
              it. If you never received a message, resend or use password reset
              (that also confirms your address works).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void sendVerificationEmail(user)
                    .then(() =>
                      setStatus(
                        "Verification email sent. Check spam, then Refresh.",
                      ),
                    )
                    .catch((e) => setError(formatAuthError(e)))
                    .finally(() => setBusy(false));
                }}
              >
                Resend verification email
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void reload()
                    .then((verified) => {
                      if (verified) {
                        setStatus("Email verified. You can set up 2FA now.");
                        setError(null);
                      } else {
                        setError(
                          "Still unverified — click the link in your email first.",
                        );
                      }
                    })
                    .catch((e) => setError(formatAuthError(e)))
                    .finally(() => setBusy(false));
                }}
              >
                Refresh status
              </Button>
            </div>
          </div>
        ) : null}

        {hasMfa ? (
          <ul className="space-y-2 text-sm">
            {factors.map((f) => (
              <li
                key={f.uid}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span>
                  {f.displayName ?? f.factorId}{" "}
                  <span className="text-xs text-muted-foreground">
                    (enrolled)
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void unenrollMfaFactor(user, f.uid)
                      .then(() => refresh())
                      .then(() => setStatus("Factor removed."))
                      .catch((e) => setError(formatAuthError(e)))
                      .finally(() => setBusy(false));
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            2FA is not enabled on this account.
          </p>
        )}

        {user.emailVerified && !totpSession ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              setError(null);
              setBusy(true);
              void startTotpEnrollment(user)
                .then(setTotpSession)
                .catch((e) => setError(formatAuthError(e)))
                .finally(() => setBusy(false));
            }}
          >
            Set up authenticator app
          </Button>
        ) : null}

        {totpSession ? (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">Scan in your authenticator</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={totpSession.qrCodeUrl}
              alt="Authenticator QR code"
              className="mx-auto h-40 w-40"
            />
            <p className="break-all font-mono text-xs text-muted-foreground">
              Manual key: {totpSession.secretKey}
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              className={inputClass}
            />
            <Button
              type="button"
              size="sm"
              disabled={busy || totpCode.length < 6}
              onClick={() => {
                setBusy(true);
                void finishTotpEnrollment(user, totpSession.totpSecret, totpCode)
                  .then(() => refresh())
                  .then(() => setStatus("Authenticator enrolled."))
                  .catch((e) => setError(formatAuthError(e)))
                  .finally(() => setBusy(false));
              }}
            >
              Confirm authenticator
            </Button>
          </div>
        ) : null}

        {user.emailVerified ? (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">SMS backup (optional)</p>
            <input
              type="tel"
              placeholder="+1 555 555 5555"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
            <div id={recaptchaId} />
            {!phoneVerificationId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || phone.length < 8}
                onClick={() => {
                  setBusy(true);
                  const verifier = createRecaptchaVerifier(recaptchaId);
                  void startPhoneMfaEnrollment(user, phone, verifier)
                    .then((vid) => {
                      setPhoneVerificationId(vid);
                      setStatus("SMS sent.");
                    })
                    .catch((e) => setError(formatAuthError(e)))
                    .finally(() => setBusy(false));
                }}
              >
                Send SMS code
              </Button>
            ) : (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="SMS code"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  className={inputClass}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || phoneCode.length < 6}
                  onClick={() => {
                    setBusy(true);
                    void finishPhoneMfaEnrollment(
                      user,
                      phoneVerificationId,
                      phoneCode,
                    )
                      .then(() => refresh())
                      .then(() => setStatus("SMS factor enrolled."))
                      .catch((e) => setError(formatAuthError(e)))
                      .finally(() => setBusy(false));
                  }}
                >
                  Confirm SMS
                </Button>
              </>
            )}
          </div>
        ) : null}

        {status ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void signOutUser()}
        >
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
