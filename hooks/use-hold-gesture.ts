"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const HOLD_CLOUD_MS = 5_000;
export const HOLD_PURPLE_MS = 2_500;
export const TAP_MAX_MS = 400;

export type HoldGesturePhase = "idle" | "holding" | "cloud-ready";

export type HoldGestureState = {
  phase: HoldGesturePhase;
  /** 0–1 progress toward cloud threshold while holding */
  holdProgress: number;
  /** Button should show purple cloud indicator */
  cloudHint: boolean;
};

type UseHoldGestureOptions = {
  onTap: () => void;
  onCloudHoldComplete: () => void;
  disabled?: boolean;
};

export function useHoldGesture({
  onTap,
  onCloudHoldComplete,
  disabled = false,
}: UseHoldGestureOptions) {
  const [state, setState] = useState<HoldGestureState>({
    phase: "idle",
    holdProgress: 0,
    cloudHint: false,
  });

  const downAtRef = useRef<number | null>(null);
  const firedCloudRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const clearRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearRaf();
    downAtRef.current = null;
    firedCloudRef.current = false;
    setState({ phase: "idle", holdProgress: 0, cloudHint: false });
  }, [clearRaf]);

  const scheduleTick = useCallback(() => {
    const loop = () => {
      const downAt = downAtRef.current;
      if (downAt == null) return;

      const elapsed = Date.now() - downAt;
      const progress = Math.min(1, elapsed / HOLD_CLOUD_MS);
      const cloudHint = elapsed >= HOLD_PURPLE_MS;

      setState({
        phase: progress >= 1 ? "cloud-ready" : "holding",
        holdProgress: progress,
        cloudHint,
      });

      if (elapsed >= HOLD_CLOUD_MS && !firedCloudRef.current) {
        firedCloudRef.current = true;
        onCloudHoldComplete();
        reset();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [onCloudHoldComplete, reset]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      downAtRef.current = Date.now();
      firedCloudRef.current = false;
      setState({ phase: "holding", holdProgress: 0, cloudHint: false });
      scheduleTick();
    },
    [disabled, scheduleTick],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }

      const downAt = downAtRef.current;
      if (downAt == null) {
        reset();
        return;
      }

      const elapsed = Date.now() - downAt;
      clearRaf();

      if (!firedCloudRef.current && elapsed < TAP_MAX_MS) {
        onTap();
      }

      reset();
    },
    [clearRaf, disabled, onTap, reset],
  );

  const onPointerCancel = useCallback(() => {
    reset();
  }, [reset]);

  useEffect(() => () => clearRaf(), [clearRaf]);

  return {
    state,
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}
