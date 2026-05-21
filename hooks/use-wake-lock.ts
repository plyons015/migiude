"use client";

import { acquireWakeLock, type WakeLockHandle } from "@/lib/speech/wake-lock";
import { useCallback, useEffect, useRef } from "react";

export function useWakeLock(active: boolean) {
  const handleRef = useRef<WakeLockHandle | null>(null);

  const release = useCallback(async () => {
    if (handleRef.current) {
      await handleRef.current.release();
      handleRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      void release();
      return;
    }

    let cancelled = false;

    void (async () => {
      const handle = await acquireWakeLock();
      if (!cancelled) {
        handleRef.current = handle;
      } else if (handle) {
        await handle.release();
      }
    })();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && active) {
        void (async () => {
          await release();
          const handle = await acquireWakeLock();
          if (!cancelled) handleRef.current = handle;
        })();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void release();
    };
  }, [active, release]);

  return { supported: typeof navigator !== "undefined" && "wakeLock" in navigator };
}
