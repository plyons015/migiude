import { registerPlugin } from "@capacitor/core";
import { isAndroid } from "@/lib/capacitor/platform";

type RecordingForegroundPlugin = {
  ensureMicPermission(): Promise<void>;
  start(): Promise<{ audioFocusGranted?: boolean }>;
  stop(): Promise<void>;
};

export type ExclusiveCaptureResult = {
  audioFocusGranted: boolean;
};

const RecordingForeground = registerPlugin<RecordingForegroundPlugin>(
  "RecordingForeground",
);

/** Request Android RECORD_AUDIO before Web Speech / MediaRecorder. */
export async function ensureRecordingMicPermission(): Promise<void> {
  if (!isAndroid()) return;
  try {
    await RecordingForeground.ensureMicPermission();
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Microphone permission denied. Open Settings → Apps → Ude → Permissions.";
    throw new Error(message);
  }
}

/** Pause other apps' playback and show the recording notification (Android). */
export async function beginExclusiveCapture(): Promise<ExclusiveCaptureResult> {
  if (!isAndroid()) return { audioFocusGranted: true };
  try {
    const result = await RecordingForeground.start();
    return { audioFocusGranted: result?.audioFocusGranted !== false };
  } catch {
    return { audioFocusGranted: false };
  }
}

export async function endExclusiveCapture(): Promise<void> {
  if (!isAndroid()) return;
  try {
    await RecordingForeground.stop();
  } catch {
    /* ignore */
  }
}

/** @deprecated Use beginExclusiveCapture */
export async function startRecordingForeground(): Promise<void> {
  await beginExclusiveCapture();
}

/** @deprecated Use endExclusiveCapture */
export async function stopRecordingForeground(): Promise<void> {
  await endExclusiveCapture();
}
