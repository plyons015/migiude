"use client";

import { APP_NAME } from "@/lib/branding/app-name";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { SplashScreen } from "@capacitor/splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";

const FADE_MS = 400;

type Props = {
  onComplete?: () => void;
};

/** Opening video → dashboard (no intermediate logo). */
export function AppLoadingScreen({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  const endSplash = useCallback(() => {
    if (completedRef.current || fading) return;
    setFading(true);
  }, [fading]);

  useEffect(() => {
    if (!fading) return;
    const timer = window.setTimeout(finish, FADE_MS);
    return () => window.clearTimeout(timer);
  }, [fading, finish]);

  useEffect(() => {
    if (isNativePlatform()) {
      void SplashScreen.hide().catch(() => undefined);
    }
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      void video.play().catch(() => {
        endSplash();
      });
    };

    if (video.readyState >= 2) tryPlay();
    else video.addEventListener("loadeddata", tryPlay, { once: true });

    const fallback = window.setTimeout(() => {
      if (!completedRef.current && !fading) endSplash();
    }, 12_000);

    return () => window.clearTimeout(fallback);
  }, [endSplash, fading]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-[400ms] ease-out ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-label={`Loading ${APP_NAME}`}
    >
      <video
        ref={videoRef}
        src="/branding/opening.mp4"
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="auto"
        onEnded={endSplash}
        onError={endSplash}
      />
    </div>
  );
}
