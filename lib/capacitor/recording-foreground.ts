import { registerPlugin } from "@capacitor/core";
import { isAndroid } from "@/lib/capacitor/platform";

type RecordingForegroundPlugin = {
  ensureMicPermission(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
};

const RecordingForeground = registerPlugin<RecordingForegroundPlugin>(
  "RecordingForeground",
);

/** Request Android RECORD_AUDIO before Web Speech / MediaRecorder. */
export async function ensureRecordingMicPermission(): Promise<void> {
  if (!isAndroid()) return;
  await RecordingForeground.ensureMicPermission();
}

export async function startRecordingForeground(): Promise<void> {
  if (!isAndroid()) return;
  try {
    await RecordingForeground.start();
  } catch {
    /* FGS unavailable, permission denied, or older build — Listen still works */
  }
}

export async function stopRecordingForeground(): Promise<void> {
  if (!isAndroid()) return;
  try {
    await RecordingForeground.stop();
  } catch {
    /* ignore */
  }
}
