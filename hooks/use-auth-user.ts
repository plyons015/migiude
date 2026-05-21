"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInAnonymousUser } from "@/lib/firebase/auth";
import { onAuthStateChanged, type User } from "firebase/auth";
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
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const ensureSignedIn = useCallback(async (): Promise<User> => {
    if (user) return user;
    return signInAnonymousUser();
  }, [user]);

  return { user, loading, uid: user?.uid ?? null, ensureSignedIn };
}
