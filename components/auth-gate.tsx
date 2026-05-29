"use client";

import { AuthScreen } from "@/components/auth/auth-screen";
import { useAuthUser } from "@/hooks/use-auth-user";
import { signOutUser } from "@/lib/firebase/auth";
import { isAppSession } from "@/lib/firebase/session-policy";
import { allowAnonymousSignIn } from "@/lib/env/auth-flags";
import { isFirebaseConfigured } from "@/lib/env/client";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AuthGateProps = {
  children: (uid: string) => React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuthUser();
  const firebaseReady = isFirebaseConfigured();
  const clearedAnonymous = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Drop legacy anonymous sessions so email/password sign-in is required.
  useEffect(() => {
    if (loading || !user || clearedAnonymous.current) return;
    if (user.isAnonymous && !allowAnonymousSignIn()) {
      clearedAnonymous.current = true;
      void signOutUser();
    }
  }, [loading, user]);

  if (!mounted) {
    return null;
  }

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

  if (!isAppSession(user)) {
    return <AuthScreen />;
  }

  return <>{children(user!.uid)}</>;
}
