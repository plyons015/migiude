import { registerPlugin } from "@capacitor/core";
import { isAndroid } from "@/lib/capacitor/platform";

type RecordingForegroundPlugin = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

const RecordingForeground = registerPlugin<RecordingForegroundPlugin>(
  "RecordingForeground",
);

export async function startRecordingForeground(): Promise<void> {
  if (!isAndroid()) return;
  try {
    await RecordingForeground.start();
  } catch {
    /* Plugin unavailable on web or older builds */
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
