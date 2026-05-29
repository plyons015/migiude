type NetworkInformation = {
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
};

function getConnection(): NetworkInformation | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { connection?: NetworkInformation };
  return nav.connection ?? null;
}

/** Best-effort: true when the browser reports cellular or data-saver. */
export function isLikelyMeteredConnection(): boolean {
  const c = getConnection();
  if (!c) return false;
  if (c.saveData) return true;
  const type = (c.type ?? "").toLowerCase();
  if (type === "cellular" || type === "wimax") return true;
  return false;
}

export function assertWhisperModelDownloadAllowed(wifiOnly: boolean): void {
  if (!wifiOnly) return;
  if (isLikelyMeteredConnection()) {
    throw new Error(
      "Whisper model download is Wi‑Fi only. Connect to Wi‑Fi or turn off that setting under Voice & transcription.",
    );
  }
}
