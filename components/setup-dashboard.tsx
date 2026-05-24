"use client";

import { APP_NAME } from "@/lib/branding/app-name";
import { aiService } from "@/lib/ai/ai-service";
import { signInAnonymousUser, signOutUser } from "@/lib/firebase/auth";
import { getCapacitorPlatform, isNativePlatform } from "@/lib/capacitor/platform";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useFirebaseEmulators } from "@/lib/env/client";
import { CheckCircle2, Circle, Loader2, Mic, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type SetupDashboardProps = {
  firebaseConfigured: boolean;
};

function StatusRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
      )}
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{detail}</p>
      </div>
    </li>
  );
}

export function SetupDashboard({ firebaseConfigured }: SetupDashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const platform = getCapacitorPlatform();
  const native = isNativePlatform();
  const emulators = useFirebaseEmulators();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, [firebaseConfigured]);

  async function handleAnonymousSignIn() {
    setAuthBusy(true);
    setAiMessage(null);
    try {
      await signInAnonymousUser();
    } catch (error) {
      setAiMessage(
        error instanceof Error ? error.message : "Anonymous sign-in failed",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    try {
      await signOutUser();
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleTestAi() {
    setAiBusy(true);
    setAiMessage(null);
    try {
      const output = await aiService.extractTodos(
        "Buy milk and call the dentist tomorrow.",
        "gemini",
      );
      setAiMessage(output.result.slice(0, 280));
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : "AI test failed");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Phase 0
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {APP_NAME}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Privacy-first voice AI — base setup for web and Android.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        <StatusRow
          ok={firebaseConfigured}
          label="Firebase client"
          detail={
            firebaseConfigured
              ? "NEXT_PUBLIC_FIREBASE_* variables are set."
              : "Copy .env.example → .env.local and add your Firebase web app config."
          }
        />
        <StatusRow
          ok={native}
          label="Capacitor native shell"
          detail={
            native
              ? `Running on ${platform} via Capacitor.`
              : `Web preview (${platform}). Run npm run cap:android for the APK shell.`
          }
        />
        <StatusRow
          ok={emulators || firebaseConfigured}
          label="AI backend (Cloud Functions)"
          detail={
            emulators
              ? "Emulator mode — start with npm run emulators and set GEMINI_API_KEY in functions/.env."
              : "Gemini via Genkit in Firebase Functions. Keys never ship in the app bundle."
          }
        />
        <StatusRow
          ok={!!user}
          label="Authentication"
          detail={
            user
              ? `Signed in (${user.isAnonymous ? "anonymous" : user.email ?? user.uid}).`
              : "Anonymous sign-in enabled for dev. Required before AI calls."
          }
        />
      </ul>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Smartphone className="h-4 w-4" />
          Quick actions
        </div>
        <div className="flex flex-wrap gap-2">
          {!user ? (
            <button
              type="button"
              disabled={!firebaseConfigured || authBusy}
              onClick={() => void handleAnonymousSignIn()}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {authBusy ? "Signing in…" : "Sign in (anonymous)"}
            </button>
          ) : (
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignOut()}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
            >
              Sign out
            </button>
          )}
          <button
            type="button"
            disabled={!user || aiBusy}
            onClick={() => void handleTestAi()}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600 disabled:opacity-40"
          >
            {aiBusy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing AI…
              </span>
            ) : (
              "Test AI (Functions)"
            )}
          </button>
        </div>
        {aiMessage ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{aiMessage}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="/dashboard/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Open dashboard
        </a>
        <a
          href="/dashboard/"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium dark:border-zinc-600"
        >
          <Mic className="h-4 w-4" />
          Listen
        </a>
      </div>
    </div>
  );
}
