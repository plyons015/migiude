import { ensureRecordingMicPermission } from "@/lib/capacitor/recording-foreground";
import { isAndroid, isNativePlatform } from "@/lib/capacitor/platform";

/**
 * Request microphone permission without retaining audio.
 * Stops all tracks immediately on web — no recording buffer is kept.
 *
 * On Capacitor Android we use the native permission dialog (not getUserMedia)
 * so Web Speech is not broken by releasing a stream right before start().
 */
export async function ensureMicrophonePermission(): Promise<void> {
  if (isNativePlatform() && isAndroid()) {
    await ensureRecordingMicPermission();
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
