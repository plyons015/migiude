"use client";

import { initFirebaseClient } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/env/client";
import { useEffect } from "react";

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[Firebase] Not configured — auth, Firestore sync, and cloud STT are disabled.",
        );
      }
      return;
    }
    initFirebaseClient();
  }, []);

  // Never block the UI (Listen/voice works without Firebase).
  return children;
}
