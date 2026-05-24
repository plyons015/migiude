"use client";

import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type RecordingMicButtonProps = {
  isListening: boolean;
  starting?: boolean;
  onPress: () => void;
  disabled?: boolean;
};

/** Red mic while recording — tap to pause. */
export function RecordingMicButton({
  isListening,
  starting,
  onPress,
  disabled,
}: RecordingMicButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled || starting}
        onClick={onPress}
        aria-pressed={isListening}
        aria-label={isListening ? "Pause recording" : "Resume recording"}
        className={cn(
          "flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full shadow-xl transition-transform active:scale-[0.97] sm:h-24 sm:w-24",
          isListening
            ? "animate-mic-pulse bg-red-600 text-white shadow-red-500/40 hover:bg-red-500"
            : "bg-zinc-700 text-white shadow-zinc-500/30 hover:bg-zinc-600 dark:bg-zinc-200 dark:text-zinc-900",
          (disabled || starting) && "opacity-40",
        )}
      >
        {isListening ? (
          <MicOff className="h-10 w-10 sm:h-11 sm:w-11" strokeWidth={2.25} />
        ) : (
          <Mic className="h-10 w-10 sm:h-11 sm:w-11" strokeWidth={2.25} />
        )}
      </button>
      <p className="max-w-[16rem] text-center text-[11px] leading-snug text-muted-foreground">
        {starting
          ? "Starting…"
          : isListening
            ? "Tap to pause"
            : "Tap to resume · use iPod controls to save"}
      </p>
    </div>
  );
}
