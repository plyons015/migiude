export type WakeLockHandle = {
  release: () => Promise<void>;
};

/**
 * Keeps the screen awake during listen sessions (Screen Wake Lock API).
 */
export async function acquireWakeLock(): Promise<WakeLockHandle | null> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
    return null;
  }

  try {
    const sentinel = await navigator.wakeLock.request("screen");
    return {
      release: async () => {
        try {
          await sentinel.release();
        } catch {
          // Already released
        }
      },
    };
  } catch {
    return null;
  }
}
