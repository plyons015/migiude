"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  hapticMeetingHint,
  hapticMeetingStart,
  hapticTap,
} from "@/lib/capacitor/haptics";

/** Default hold thresholds (overridden via Settings → meeting hold duration). */
export const HOLD_CLOUD_MS_DEFAULT = 5_000;
export const HOLD_PURPLE_MS_DEFAULT = 2_500;
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
  /** When false, hold never completes (local-only or cloud STT unavailable). */
  meetingHoldEnabled?: boolean;
  holdCloudMs?: number;
  holdPurpleMs?: number;
};

export function useHoldGesture({
  onTap,
  onCloudHoldComplete,
  disabled = false,
  meetingHoldEnabled = true,
  holdCloudMs = HOLD_CLOUD_MS_DEFAULT,
  holdPurpleMs = HOLD_PURPLE_MS_DEFAULT,
}: UseHoldGestureOptions) {
  const [state, setState] = useState<HoldGestureState>({
    phase: "idle",
    holdProgress: 0,
    cloudHint: false,
  });

  const downAtRef = useRef<number | null>(null);
  const firedCloudRef = useRef(false);
  const firedHintRef = useRef(false);
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
    firedHintRef.current = false;
    setState({ phase: "idle", holdProgress: 0, cloudHint: false });
  }, [clearRaf]);

  const scheduleTick = useCallback(() => {
    const loop = () => {
      const downAt = downAtRef.current;
      if (downAt == null) return;

      const elapsed = Date.now() - downAt;
      const progress = Math.min(1, elapsed / holdCloudMs);
      const cloudHint =
        meetingHoldEnabled && elapsed >= holdPurpleMs;

      if (cloudHint && !firedHintRef.current) {
        firedHintRef.current = true;
        void hapticMeetingHint();
      }

      setState({
        phase:
          meetingHoldEnabled && progress >= 1 ? "cloud-ready" : "holding",
        holdProgress: meetingHoldEnabled ? progress : Math.min(progress, 0.49),
        cloudHint,
      });

      if (
        meetingHoldEnabled &&
        elapsed >= holdCloudMs &&
        !firedCloudRef.current
      ) {
        firedCloudRef.current = true;
        void hapticMeetingStart();
        onCloudHoldComplete();
        reset();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [
    holdCloudMs,
    holdPurpleMs,
    meetingHoldEnabled,
    onCloudHoldComplete,
    reset,
  ]);

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
        void hapticTap();
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
