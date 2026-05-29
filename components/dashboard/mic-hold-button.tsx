"use client";

import { useAppSettings } from "@/hooks/use-app-settings";
import { useHoldGesture } from "@/hooks/use-hold-gesture";
import { Mic } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type MicHoldButtonProps = {
  onTap: () => void;
  onCloudHoldComplete: () => void;
  disabled?: boolean;
  hint?: string | null;
  onHoldChange?: (holding: boolean, meetingHint: boolean) => void;
  /** Idle purple when a cloud meeting template is selected */
  cloudTemplateMode?: boolean;
  /** Local-only: hold starts on-device meeting, not cloud STT */
  localOnly?: boolean;
};

export function MicHoldButton({
  onTap,
  onCloudHoldComplete,
  disabled,
  hint,
  onHoldChange,
  cloudTemplateMode,
  localOnly = false,
}: MicHoldButtonProps) {
  const { meetingHoldMs, meetingHoldPurpleMs } = useAppSettings();
  const holdSec = meetingHoldMs / 1000;
  const purpleSec = meetingHoldPurpleMs / 1000;

  const { state, handlers } = useHoldGesture({
    onTap,
    onCloudHoldComplete,
    disabled,
    meetingHoldEnabled: true,
    holdCloudMs: meetingHoldMs,
    holdPurpleMs: meetingHoldPurpleMs,
  });

  const holding = state.phase === "holding" || state.phase === "cloud-ready";
  const meetingMode =
    cloudTemplateMode ||
    state.cloudHint ||
    state.phase === "cloud-ready";

  useEffect(() => {
    onHoldChange?.(holding, meetingMode);
  }, [holding, meetingMode, onHoldChange]);

  const idleLabel = cloudTemplateMode
    ? "Tap to start meeting with template"
    : localOnly
      ? `Tap for on-device note, hold ${holdSec}s for meeting mode`
      : `Tap for on-device Whisper, hold ${holdSec}s for meeting mode`;

  const holdLabel = meetingMode
    ? localOnly
      ? "Meeting mode — keep holding…"
      : "Hold for Meeting Mode — keep holding…"
    : `Hold for Meeting Mode · ${Math.max(1, Math.ceil((meetingHoldMs * (1 - state.holdProgress)) / 1000))}s`;

  const idleHint = cloudTemplateMode
    ? "Tap · meeting · Hold · meeting mode"
    : localOnly
      ? `Tap · on-device · Hold ${holdSec}s · meeting`
      : `Tap · on-device · Hold ${holdSec}s · meeting (purple at ${purpleSec}s)`;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-label={holding ? holdLabel : idleLabel}
        className={cn(
          "relative flex h-[5.5rem] w-[5.5rem] touch-none select-none items-center justify-center rounded-full shadow-xl transition-[transform,background-color,box-shadow] duration-300 active:scale-[0.97] sm:h-24 sm:w-24",
          disabled && "opacity-40",
          meetingMode
            ? "bg-violet-600 text-white shadow-violet-500/40"
            : "bg-teal-600 text-white shadow-teal-500/40",
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
        {hint ?? (holding ? holdLabel : idleHint)}
      </p>
    </div>
  );
}
