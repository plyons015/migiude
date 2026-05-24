"use client";

import {
  HOLD_CLOUD_MS,
  HOLD_PURPLE_MS,
  useHoldGesture,
} from "@/hooks/use-hold-gesture";
import { Mic } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type MicHoldButtonProps = {
  onTap: () => void;
  onCloudHoldComplete: () => void;
  disabled?: boolean;
  hint?: string | null;
  onHoldChange?: (holding: boolean, cloudHint: boolean) => void;
  /** Idle purple when a cloud meeting template is selected */
  cloudTemplateMode?: boolean;
};

export function MicHoldButton({
  onTap,
  onCloudHoldComplete,
  disabled,
  hint,
  onHoldChange,
  cloudTemplateMode,
}: MicHoldButtonProps) {
  const { state, handlers } = useHoldGesture({
    onTap,
    onCloudHoldComplete,
    disabled,
  });

  const holding = state.phase === "holding" || state.phase === "cloud-ready";
  const purple =
    cloudTemplateMode ||
    state.cloudHint ||
    state.phase === "cloud-ready";

  useEffect(() => {
    onHoldChange?.(holding, purple);
  }, [holding, purple, onHoldChange]);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-label={
          holding
            ? purple
              ? "Keep holding for cloud session"
              : "Hold for cloud session"
            : cloudTemplateMode
              ? "Tap to start cloud meeting with template"
              : "Tap for on-device recording, hold five seconds for cloud"
        }
        className={cn(
          "relative flex h-[5.5rem] w-[5.5rem] touch-none select-none items-center justify-center rounded-full shadow-xl transition-[transform,background-color,box-shadow] duration-300 active:scale-[0.97] sm:h-24 sm:w-24",
          disabled && "opacity-40",
          purple
            ? "bg-violet-600 text-white shadow-violet-500/40"
            : "bg-emerald-600 text-white shadow-emerald-500/40",
          holding && "animate-mic-pulse",
        )}
        {...handlers}
      >
        <svg
          className="pointer-events-none absolute inset-0 -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="opacity-20"
          />
          {holding ? (
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset={`${2 * Math.PI * 46 * (1 - state.holdProgress)}`}
              className="opacity-90 transition-[stroke-dashoffset] duration-75"
            />
          ) : null}
        </svg>
        <Mic className="relative h-10 w-10 sm:h-11 sm:w-11" strokeWidth={2.25} />
      </button>
      <p className="max-w-[16rem] text-center text-[11px] leading-snug text-muted-foreground">
        {hint ??
          (holding
            ? purple
              ? "Cloud session — keep holding…"
              : `Hold ${Math.max(1, Math.ceil((HOLD_CLOUD_MS * (1 - state.holdProgress)) / 1000))}s more for cloud`
            : cloudTemplateMode
              ? "Tap · cloud meeting · Hold · cloud"
              : `Tap · on-device · Hold ${HOLD_CLOUD_MS / 1000}s · cloud (purple at ${HOLD_PURPLE_MS / 1000}s)`)}
      </p>
    </div>
  );
}
