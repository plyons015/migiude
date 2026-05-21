const CHUNK_MS = 8000;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "audio/webm";
}

export function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export type AudioChunkHandler = (blob: Blob, mimeType: string) => void | Promise<void>;

/**
 * Records short audio chunks for cloud STT. Blobs are passed to the handler
 * and not retained by this class.
 */
export class CloudAudioCapture {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private mimeType = "audio/webm";
  private active = false;

  constructor(private readonly onChunk: AudioChunkHandler) {}

  async start(): Promise<void> {
    if (this.active) return;
    if (!isMediaRecorderSupported()) {
      throw new Error("Audio recording is not supported in this browser.");
    }

    this.mimeType = pickMimeType();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    this.active = true;

    this.recorder.ondataavailable = (event) => {
      if (!this.active || !event.data || event.data.size < 200) return;
      void this.onChunk(event.data, this.mimeType.split(";")[0] ?? "audio/webm");
    };

    this.recorder.onerror = () => {
      this.active = false;
    };

    this.recorder.start(CHUNK_MS);
  }

  async stop(): Promise<void> {
    this.active = false;
    const recorder = this.recorder;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
    }
    this.recorder = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
  }

  destroy(): void {
    void this.stop();
  }
}
