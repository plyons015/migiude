"use client";

import { AuthScreen } from "@/components/auth/auth-screen";
import { APP_NAME } from "@/lib/branding/app-name";
import { adminVerify } from "@/lib/admin/client";
import { isCloudFunctionsNetworkFailure } from "@/lib/firebase/functions-network-error";
import { useAuthUser } from "@/hooks/use-auth-user";
import { signOutUser } from "@/lib/firebase/auth";
import { isAppSession } from "@/lib/firebase/session-policy";
import { isFirebaseConfigured } from "@/lib/env/client";
import { Loader2, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AdminGateProps = {
  children: React.ReactNode;
};

export function AdminGate({ children }: AdminGateProps) {
  const { user, loading } = useAuthUser();
  const [checking, setChecking] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [networkBlocked, setNetworkBlocked] = useState(false);

  const verify = useCallback(async () => {
    if (!isAppSession(user) || !user?.email) {
      setIsAdmin(false);
      setAdminEmail(null);
      return;
    }
    setChecking(true);
    setError(null);
    setNetworkBlocked(false);
    try {
      const res = await adminVerify();
      setIsAdmin(res.isAdmin);
      setAdminEmail(res.email);
    } catch (e) {
      setIsAdmin(false);
      setAdminEmail(null);
      setNetworkBlocked(isCloudFunctionsNetworkFailure(e));
      setError(e instanceof Error ? e.message : "Access denied.");
    } finally {
      setChecking(false);
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!isAppSession(user)) {
      setIsAdmin(null);
      return;
    }
    void verify();
  }, [loading, user, verify]);

  if (!isFirebaseConfigured()) {
    return (
      <p className="p-8 text-sm text-zinc-500">
        Configure Firebase in .env.local to use the admin dashboard.
      </p>
    );
  }

  if (loading || checking) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!isAppSession(user)) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="border-b border-violet-200 bg-violet-50 px-4 py-3 text-center dark:border-violet-900 dark:bg-violet-950/40">
          <Shield className="mx-auto mb-1 h-8 w-8 text-violet-700 dark:text-violet-300" />
          <h1 className="text-lg font-semibold">{APP_NAME} Admin</h1>
          <p className="mt-1 text-sm text-violet-900/80 dark:text-violet-200/80">
            Operator sign-in — same email/password as the app, allowlisted only.
          </p>
        </div>
        <AuthScreen />
      </div>
    );
  }

  if (!isAdmin && user && networkBlocked) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <Shield className="h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-semibold">Cannot reach admin server</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as <strong>{user.email}</strong>. Your network could not
          resolve <code className="text-xs">cloudfunctions.net</code> (DNS).
        </p>
        {error ? (
          <p className="text-left text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Quick fix (Windows)</p>
          <ol className="mt-1 list-inside list-decimal space-y-1">
            <li>
              Wi‑Fi/Ethernet → DNS → manual <strong>8.8.8.8</strong> +{" "}
              <strong>1.1.1.1</strong>
            </li>
            <li>
              PowerShell: <code className="text-[10px]">ipconfig /flushdns</code>
            </li>
            <li>Reload this page, or try phone hotspot</li>
          </ol>
        </div>
        <button
          type="button"
          onClick={() => void verify()}
          className="text-sm font-medium text-violet-600 underline dark:text-violet-400"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={() => void signOutUser().then(() => setIsAdmin(null))}
          className="text-sm text-muted-foreground underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (!isAdmin && user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <Shield className="h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as <strong>{user.email}</strong>. This account is not on
          the admin allowlist (<code className="text-xs">ADMIN_EMAILS</code>).
        </p>
        {error ? (
          <p className="text-left text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Use your operator email, or sign out and sign in with an allowlisted
          account.
        </p>
        <button
          type="button"
          onClick={() => void signOutUser().then(() => setIsAdmin(null))}
          className="text-sm font-medium text-violet-600 underline dark:text-violet-400"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        Admin · {adminEmail ?? user.email}
      </div>
      {children}
    </>
  );
}
