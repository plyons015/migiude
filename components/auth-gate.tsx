"use client";

import { useAuthUser } from "@/hooks/use-auth-user";
import { isFirebaseConfigured } from "@/lib/env/client";
import { Loader2 } from "lucide-react";

type AuthGateProps = {
  children: (uid: string) => React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading, ensureSignedIn } = useAuthUser();
  const firebaseReady = isFirebaseConfigured();

  if (!firebaseReady) {
    return (
      <p className="p-6 text-sm text-zinc-500">
        Configure Firebase in .env.local to use notes and todos.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to sync notes and todos (anonymous is fine for dev).
        </p>
        <button
          type="button"
          onClick={() => void ensureSignedIn()}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Sign in
        </button>
      </div>
    );
  }

  return <>{children(user.uid)}</>;
}
