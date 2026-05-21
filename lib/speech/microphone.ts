import { isAndroid, isNativePlatform } from "@/lib/capacitor/platform";

/**
 * Request microphone permission without retaining audio.
 * Stops all tracks immediately — no recording buffer is kept.
 *
 * On Capacitor Android, skip getUserMedia: releasing the stream right before
 * Web Speech starts often breaks recognition after refresh/navigation.
 */
export async function ensureMicrophonePermission(): Promise<void> {
  if (isNativePlatform() && isAndroid()) {
    return;
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not available in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
