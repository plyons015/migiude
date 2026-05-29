"use client";

import {
  resetPassword,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/firebase/auth-email";
import { formatAuthError, isMfaRequiredError } from "@/lib/firebase/auth-errors";
import { getMfaResolver } from "@/lib/firebase/auth-mfa";
import { signInAnonymousUser } from "@/lib/firebase/auth";
import { allowAnonymousSignIn } from "@/lib/env/auth-flags";
import { MfaSignInChallenge } from "@/components/auth/mfa-sign-in-challenge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "signin" | "signup" | "reset";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900";

export function AuthScreen({ defaultEmail }: { defaultEmail?: string } = {}) {
  const [mode, setMode] = useState<Mode>(defaultEmail ? "signup" : "signin");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mfaResolver, setMfaResolver] = useState<ReturnType<
    typeof getMfaResolver
  > | null>(null);

  useEffect(() => {
    if (defaultEmail) {
      setEmail(defaultEmail);
      setMode("signup");
    }
  }, [defaultEmail]);

  const clearStatus = () => {
    setError(null);
    setMessage(null);
  };

  const handleSignIn = async () => {
    if (!password) {
      setError("Enter your password.");
      return;
    }
    clearStatus();
    setBusy(true);
    try {
      await signInWithEmail(email, password);
    } catch (e) {
      if (isMfaRequiredError(e)) {
        const resolver = getMfaResolver(e);
        if (resolver) {
          setMfaResolver(() => resolver);
          return;
        }
      }
      setError(formatAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    clearStatus();
    setBusy(true);
    try {
      await signUpWithEmail(email, password, displayName);
      setMessage(
        "Account created. Check your email to verify, or use password reset if you need to sign in.",
      );
      setMode("signin");
      setPassword("");
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    clearStatus();
    setBusy(true);
    try {
      await resetPassword(email);
      setMessage(
        "If an account exists for this email, a reset link was sent. Check spam/junk.",
      );
      setMode("signin");
      setPassword("");
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !email.trim()) return;
    if (mode === "reset") {
      void handleReset();
      return;
    }
    if (mode === "signup") {
      void handleSignUp();
      return;
    }
    void handleSignIn();
  };

  const goToReset = () => {
    setMode("reset");
    setPassword("");
    clearStatus();
  };

  if (mfaResolver) {
    return (
      <MfaSignInChallenge
        resolver={mfaResolver}
        onCancel={() => setMfaResolver(null)}
      />
    );
  }

  const primaryLabel =
    mode === "reset"
      ? "Send reset email"
      : mode === "signup"
        ? "Create account"
        : "Sign in";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-8">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {mode === "signup"
            ? "Create account"
            : mode === "reset"
              ? "Reset password"
              : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "reset"
            ? "We will email you a link to choose a new password."
            : "Email and password with optional authenticator 2FA"}
        </p>
      </div>

      {mode !== "reset" ? (
        <div className="flex gap-2">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                clearStatus();
              }}
              className={`flex-1 rounded-full py-1.5 text-xs font-medium ${
                mode === m
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 dark:border-zinc-600"
              }`}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>
      ) : null}

      <form className="space-y-3" onSubmit={handleSubmit} noValidate>
        {mode === "signup" ? (
          <input
            type="text"
            autoComplete="name"
            placeholder="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
        ) : null}
        <input
          type="email"
          name="email"
          autoComplete={mode === "reset" ? "username" : "email"}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          required
        />
        {mode !== "reset" ? (
          <input
            type="password"
            name="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
            minLength={mode === "signup" ? 6 : undefined}
          />
        ) : null}

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        {message ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {message}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={busy || !email.trim()}
          className="w-full"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            primaryLabel
          )}
        </Button>
      </form>

      {mode === "signin" ? (
        <button
          type="button"
          className="w-full text-center text-xs text-violet-600 underline dark:text-violet-400"
          onClick={goToReset}
        >
          Forgot password?
        </button>
      ) : mode === "reset" ? (
        <button
          type="button"
          className="w-full text-center text-xs text-violet-600 underline dark:text-violet-400"
          onClick={() => {
            setMode("signin");
            clearStatus();
          }}
        >
          Back to sign in
        </button>
      ) : null}

      {allowAnonymousSignIn() ? (
        <button
          type="button"
          disabled={busy}
          className="w-full text-center text-xs text-zinc-500 underline"
          onClick={() => {
            setBusy(true);
            void signInAnonymousUser()
              .catch((e: unknown) => setError(formatAuthError(e)))
              .finally(() => setBusy(false));
          }}
        >
          Continue without account (dev only)
        </button>
      ) : null}
    </div>
  );
}
