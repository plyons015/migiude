"use client";

import { APP_NAME } from "@/lib/branding/app-name";
import { setOnboardingComplete } from "@/lib/onboarding/preferences";
import { ensureMicrophonePermission } from "@/lib/speech/microphone";
import { requestNativeNotificationPermission } from "@/lib/notifications/native-reminders";
import {
  requestNotificationPermission,
} from "@/lib/notifications/reminders";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { APP_HOME_PATH } from "@/lib/navigation/go-home";
import { hardReplace } from "@/lib/navigation/hard-navigate";
import { Bell, Mic, Shield } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STEPS = [
  {
    title: `Welcome to ${APP_NAME}`,
    body: "Capture meetings, get AI summaries, and track follow-ups — with privacy-first defaults.",
    icon: null,
  },
  {
    title: "Privacy",
    body: "Browser mode keeps audio on-device. Cloud STT sends short chunks for transcription only — not stored on our servers. You control local-only mode in Settings.",
    icon: Shield,
  },
  {
    title: "Microphone",
    body: `${APP_NAME} needs the mic for Listen and meetings. Grant permission when prompted.`,
    icon: Mic,
  },
  {
    title: "Notifications",
    body: "Get todo reminders and meeting updates. On Android we use system notifications (and push when FCM is configured).",
    icon: Bell,
  },
] as const;

export function OnboardingView() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  const current = STEPS[step];
  const Icon = current.icon;
  const showLogo = step === 0;
  const isLast = step === STEPS.length - 1;

  const goToDashboard = () => {
    if (isNativePlatform()) {
      hardReplace(APP_HOME_PATH);
      return;
    }
    router.replace(APP_HOME_PATH);
  };

  const handleNext = async () => {
    setMsg(null);

    if (step === 2) {
      try {
        await ensureMicrophonePermission();
        setMsg("Microphone ready (or already granted).");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Mic permission needed in system settings.");
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (isNativePlatform()) {
        const ok = await requestNativeNotificationPermission();
        setMsg(ok ? "Notifications enabled." : "Enable notifications in system settings for reminders.");
      } else {
        const ok = await requestNotificationPermission();
        setMsg(ok ? "Notifications enabled." : "Skipped — enable later in Settings.");
      }
      setOnboardingComplete();
      goToDashboard();
      return;
    }

    if (isLast) return;
    setStep((s) => s + 1);
  };

  const handleSkip = () => {
    setOnboardingComplete();
    goToDashboard();
  };

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col gap-6 p-6 pb-10">
      <div className="flex flex-1 flex-col justify-center gap-4">
        {showLogo ? (
          <Image
            src="/branding/logo.png"
            alt={APP_NAME}
            width={160}
            height={48}
            unoptimized
            className="h-12 w-auto object-contain object-left"
            priority
          />
        ) : Icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-950/50">
            <Icon className="h-6 w-6 text-violet-700 dark:text-violet-300" />
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{current.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{current.body}</p>
        <p className="text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        {msg ? <p className="text-xs text-violet-600 dark:text-violet-400">{msg}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleNext()}
          className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500"
        >
          {step === 2 ? "Allow microphone" : step === 3 ? "Allow notifications" : "Continue"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="w-full py-2 text-sm text-muted-foreground underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
