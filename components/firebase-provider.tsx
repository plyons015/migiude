"use client";

import { initFirebaseClient } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/env/client";
import { useEffect } from "react";

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    initFirebaseClient();
  }, []);

  // Never block the UI (Listen/voice works without Firebase).
  return children;
}
