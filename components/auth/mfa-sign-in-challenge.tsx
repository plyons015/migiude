"use client";

import {
  createRecaptchaVerifier,
  isPhoneHint,
  isTotpHint,
  resolvePhoneMfaSignIn,
  resolveTotpMfaSignIn,
  startPhoneMfaSignIn,
} from "@/lib/firebase/auth-mfa";
import { formatAuthError } from "@/lib/firebase/auth-errors";
import type { MultiFactorResolver } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900";

type MfaSignInChallengeProps = {
  resolver: MultiFactorResolver;
  onCancel: () => void;
};

export function MfaSignInChallenge({
  resolver,
  onCancel,
}: MfaSignInChallengeProps) {
  const recaptchaId = useId().replace(/:/g, "");
  const [hintIndex, setHintIndex] = useState(0);
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);

  const hint = resolver.hints[hintIndex];
  const isTotp = hint && isTotpHint(hint);
  const isPhone = hint && isPhoneHint(hint);

  useEffect(() => {
    return () => {
      const el = document.getElementById(recaptchaId);
      if (el) el.innerHTML = "";
    };
  }, [recaptchaId]);

  const sendSms = async () => {
    setError(null);
    setBusy(true);
    try {
      const verifier = createRecaptchaVerifier(recaptchaId);
      const vid = await startPhoneMfaSignIn(resolver, hintIndex, verifier);
      setVerificationId(vid);
      setSmsSent(true);
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    setBusy(true);
    try {
      if (isTotp) {
        await resolveTotpMfaSignIn(resolver, hintIndex, code);
      } else if (isPhone && verificationId) {
        await resolvePhoneMfaSignIn(resolver, verificationId, code);
      } else if (isPhone && !verificationId) {
        await sendSms();
        return;
      } else {
        setError("Unsupported second factor.");
        return;
      }
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-8">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Two-factor verification</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {isTotp
            ? "Enter the 6-digit code from your authenticator app."
            : "Enter the code sent to your phone."}
        </p>
      </div>

      {resolver.hints.length > 1 ? (
        <select
          value={hintIndex}
          onChange={(e) => {
            setHintIndex(Number(e.target.value));
            setCode("");
            setVerificationId(null);
            setSmsSent(false);
          }}
          className={inputClass}
        >
          {resolver.hints.map((h, i) => (
            <option key={h.uid} value={i}>
              {h.displayName ?? (isTotpHint(h) ? "Authenticator" : "SMS")}
            </option>
          ))}
        </select>
      ) : null}

      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="6-digit code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={inputClass}
      />

      <div id={recaptchaId} />

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <Button
        type="button"
        disabled={busy || (!isPhone && code.length < 6)}
        className="w-full"
        onClick={() => void verify()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
      </Button>

      {isPhone && !smsSent ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="w-full"
          onClick={() => void sendSms()}
        >
          Send SMS code
        </Button>
      ) : null}

      <button
        type="button"
        className="text-xs text-zinc-500 underline"
        onClick={onCancel}
      >
        Back to sign in
      </button>
    </div>
  );
}
