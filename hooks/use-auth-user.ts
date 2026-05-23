"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInAnonymousUser } from "@/lib/firebase/auth";
import { onAuthStateChanged, reload, type User } from "firebase/auth";
import { allowAnonymousSignIn } from "@/lib/env/auth-flags";
import { useCallback, useEffect, useState } from "react";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const timeout = window.setTimeout(() => setLoading(false), 12_000);
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
      window.clearTimeout(timeout);
    });
    return () => {
      unsub();
      window.clearTimeout(timeout);
    };
  }, []);

  const ensureSignedIn = useCallback(async (): Promise<User> => {
    if (user) return user;
    if (allowAnonymousSignIn()) {
      return signInAnonymousUser();
    }
    throw new Error("Sign in with email and password to continue.");
  }, [user]);

  const reloadUser = useCallback(async (): Promise<boolean> => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return false;
    await reload(auth.currentUser);
    setUser(auth.currentUser);
    return auth.currentUser.emailVerified;
  }, []);

  return {
    user,
    loading,
    uid: user?.uid ?? null,
    ensureSignedIn,
    reload: reloadUser,
  };
}
