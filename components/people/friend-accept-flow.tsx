"use client";

import { AuthScreen } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { acceptFriendInvite } from "@/lib/collaboration/friend-invites";
import { useAuthUser } from "@/hooks/use-auth-user";
import { isAppSession } from "@/lib/firebase/session-policy";
import { peopleUrl } from "@/lib/people/routes";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function FriendAcceptFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const inviteEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";

  const { user, loading: authLoading } = useAuthUser();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const runAccept = useCallback(async () => {
    if (!token) {
      setState("error");
      setError("Missing invite token.");
      return;
    }
    if (!user || !isAppSession(user)) return;

    setState("busy");
    setError(null);
    try {
      await acceptFriendInvite({
        token,
        userId: user.uid,
        userEmail: user.email,
        displayName: user.displayName,
      });
      setState("done");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Could not accept invite.");
    }
  }, [token, user]);

  useEffect(() => {
    if (authLoading || !user || !isAppSession(user)) return;
    if (state !== "idle") return;
    void runAccept();
  }, [authLoading, user, state, runAccept]);

  if (authLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (!user || !isAppSession(user)) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-center dark:border-violet-900 dark:bg-violet-950/30">
          <UserPlus className="mx-auto h-7 w-7 text-violet-600" />
          <h1 className="mt-2 text-lg font-semibold">Friend invite</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join me as a friend on Ude. Sign in or create an account
            {inviteEmail ? ` with ${inviteEmail}` : ""} to accept.
          </p>
        </div>
        <AuthScreen defaultEmail={inviteEmail || undefined} />
      </div>
    );
  }

  if (state === "busy" || state === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        <p className="mt-3 text-sm text-muted-foreground">Adding you as a friend…</p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <ShieldCheck className="h-7 w-7 text-emerald-600" />
        <h1 className="mt-3 text-lg font-semibold">You&apos;re connected</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You were added to your friend&apos;s list on Ude.
        </p>
        <Button asChild className="mt-5">
          <Link href={peopleUrl()}>Go to Friends</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <p className="text-sm text-destructive">{error ?? "Error"}</p>
      <p className="mt-3 text-xs text-muted-foreground">
        Sign in with the email that received the invite, or ask for a new link.
      </p>
      <Button className="mt-5" onClick={() => void runAccept()}>
        Try again
      </Button>
    </div>
  );
}
