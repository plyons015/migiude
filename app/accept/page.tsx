"use client";

import { AuthGate } from "@/components/auth-gate";
import { FriendAcceptFlow } from "@/components/people/friend-accept-flow";
import { Button } from "@/components/ui/button";
import { acceptGroupInvite } from "@/lib/collaboration/group-invites";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

function GroupAcceptBody({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<
    "idle" | "busy" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!token) {
      setState("error");
      setError("Missing invite token.");
      return;
    }
    setState("busy");
    setError(null);
    try {
      await acceptGroupInvite({ token, userId });
      setState("done");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Could not accept invite.");
    }
  }, [token, userId]);

  useEffect(() => {
    void run();
  }, [run]);

  if (state === "busy") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        <p className="mt-3 text-sm text-muted-foreground">
          Accepting invite…
        </p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <ShieldCheck className="h-7 w-7 text-emerald-600" />
        <h1 className="mt-3 text-lg font-semibold">Invite accepted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Shared meetings should now appear under Meetings → Shared.
        </p>
        <div className="mt-5 flex gap-2">
          <Button asChild>
            <Link href="/meetings/?scope=shared">Go to Shared</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-destructive">{error ?? "Error"}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          If this token was already used or expired, ask the group owner to
          generate a new invite.
        </p>
        <div className="mt-5">
          <Button onClick={() => void run()}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function AcceptPageInner() {
  const searchParams = useSearchParams();
  const kind = searchParams.get("kind");

  if (kind === "friend") {
    return <FriendAcceptFlow />;
  }

  return (
    <AuthGate>{(uid) => <GroupAcceptBody userId={uid} />}</AuthGate>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <AcceptPageInner />
      </Suspense>
    </main>
  );
}
