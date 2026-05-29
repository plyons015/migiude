"use client";

import { getFirebaseAuth, initFirebaseClient } from "@/lib/firebase/client";
import { signInAnonymousUser } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/env/client";
import { onAuthStateChanged, reload, type User } from "firebase/auth";
import { allowAnonymousSignIn } from "@/lib/env/auth-flags";
import { useCallback, useEffect, useState } from "react";

const AUTH_READY_MS = 4_000;

function readAuthSnapshot(): { user: User | null; loading: boolean } {
  if (!isFirebaseConfigured()) {
    return { user: null, loading: false };
  }
  initFirebaseClient();
  const auth = getFirebaseAuth();
  if (!auth) {
    return { user: null, loading: false };
  }
  const current = auth.currentUser;
  return { user: current, loading: true };
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(() => readAuthSnapshot().user);
  const [loading, setLoading] = useState(() => readAuthSnapshot().loading);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      setLoading(false);
      return;
    }

    initFirebaseClient();
    const auth = getFirebaseAuth();
    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => setLoading(false), AUTH_READY_MS);
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
