"use client";

import {
  consumeStoredMicrosoftOAuthState,
} from "@/hooks/use-microsoft-integration";
import { useAuthUser } from "@/hooks/use-auth-user";
import { completeMicrosoftOAuth } from "@/lib/integrations/microsoft/client";
import { TEAMS_BOT_INTEGRATION_LAUNCHED } from "@/lib/integrations/microsoft/feature";
import { microsoftOAuthRedirectUri } from "@/lib/integrations/microsoft/redirect";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function MicrosoftOAuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, ensureSignedIn } = useAuthUser();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || authLoading) return;

    if (!TEAMS_BOT_INTEGRATION_LAUNCHED) {
      setError("Microsoft Teams integration is not enabled yet.");
      return;
    }

    const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
    if (oauthError) {
      setError(oauthError);
      return;
    }

    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    if (!code || !stateParam) {
      setError("Missing authorization code from Microsoft.");
      return;
    }

    started.current = true;

    void (async () => {
      try {
        if (!user) {
          await ensureSignedIn();
        }
        const storedState = consumeStoredMicrosoftOAuthState();
        if (!storedState || storedState !== stateParam) {
          setError("OAuth session expired. Connect again from Settings.");
          return;
        }
        await completeMicrosoftOAuth({
          code,
          state: stateParam,
          redirectUri: microsoftOAuthRedirectUri(),
        });
        router.replace("/settings/#teams-bot");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Microsoft sign-in failed.");
      }
    })();
  }, [authLoading, ensureSignedIn, router, searchParams, user]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      {error ? (
        <>
          <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
          <Link href="/settings/#teams-bot" className="text-sm font-medium underline">
            Back to Settings
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Finishing Microsoft sign-in…</p>
        </>
      )}
    </main>
  );
}

export default function MicrosoftOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <MicrosoftOAuthCallbackInner />
    </Suspense>
  );
}
