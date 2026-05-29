"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a value that updates at most once per `intervalMs` (trailing edge).
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastEmitRef = useRef(0);
  const pendingRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pendingRef.current = value;
    const now = Date.now();
    const elapsed = now - lastEmitRef.current;

    const flush = () => {
      lastEmitRef.current = Date.now();
      setThrottled(pendingRef.current);
      timerRef.current = null;
    };

    if (elapsed >= intervalMs) {
      flush();
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, intervalMs - elapsed);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, intervalMs]);

  return throttled;
}
