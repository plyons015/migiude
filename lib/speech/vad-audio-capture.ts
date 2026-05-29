import {
  isMediaRecorderSupported,
  pickMimeType,
} from "@/lib/speech/cloud-audio-capture";
import {
  MIN_SEGMENT_SEC,
  MIN_UPLOAD_BYTES,
  QUICK_VAD_PROFILE,
  VAD_POLL_MS,
  type VadTimingProfile,
} from "@/lib/speech/vad/vad-config";
import { EnergyVad, readAnalyserLevel } from "@/lib/speech/vad/energy-vad";

export type CloudCapturePhase = "idle" | "waiting" | "capturing";

export type VadSegmentPayload = {
  blob: Blob;
  mimeType: string;
  durationSec: number;
};

export type VadSegmentHandler = (payload: VadSegmentPayload) => void;

/**
 * Cloud STT: VAD decides when to record; each utterance uses one MediaRecorder
 * stop() blob (valid WebM on Android — concatenating timeslices often breaks decode).
 */
export class VadAudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private segmentRecorder: MediaRecorder | null = null;
  private segmentBlob: Blob | null = null;
  private mimeType = "audio/webm";
  private active = false;
  private segmentStartedAt = 0;
  private pollTimer: number | null = null;
  private phase: CloudCapturePhase = "idle";
  private endingSegment = false;

  private vad: EnergyVad;
  private maxSegmentSec: number;

  constructor(
    private readonly onSegment: VadSegmentHandler,
    private readonly onPhaseChange?: (phase: CloudCapturePhase) => void,
    timing: VadTimingProfile = QUICK_VAD_PROFILE,
  ) {
    this.vad = new EnergyVad(timing);
    this.maxSegmentSec = timing.maxSegmentSec;
  }

  getPhase(): CloudCapturePhase {
    return this.phase;
  }

  private setPhase(next: CloudCapturePhase): void {
    if (this.phase === next) return;
    this.phase = next;
    this.onPhaseChange?.(next);
  }

  async start(): Promise<void> {
    if (this.active) return;
    if (!isMediaRecorderSupported()) {
      throw new Error("Audio recording is not supported in this browser.");
    }

    this.mimeType = pickMimeType();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: { ideal: 1 },
      },
    });

    this.audioContext = new AudioContext();
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    this.active = true;
    this.segmentRecorder = null;
    this.segmentBlob = null;
    this.endingSegment = false;
    this.vad.begin();
    this.setPhase("waiting");

    this.pollTimer = window.setInterval(
      () => void this.pollVad(),
      VAD_POLL_MS,
    ) as unknown as number;
  }

  private async pollVad(): Promise<void> {
    if (!this.active || !this.analyser || this.endingSegment) return;
    const level = readAnalyserLevel(this.analyser);
    const result = this.vad.tick(level);

    if (result.type === "speech_start") {
      await this.beginSegmentRecorder();
      return;
    }

    if (result.type === "speech_end") {
      await this.finishSegment(false);
      this.setPhase("waiting");
      return;
    }

    if (
      this.segmentRecorder &&
      this.segmentStartedAt > 0 &&
      (Date.now() - this.segmentStartedAt) / 1000 >= this.maxSegmentSec
    ) {
      await this.finishSegment(true);
      if (this.active && this.vad.getPhase() === "speech") {
        await this.beginSegmentRecorder();
      } else {
        this.setPhase("waiting");
      }
    }
  }

  private async beginSegmentRecorder(): Promise<void> {
    if (!this.stream || this.segmentRecorder) return;
    this.segmentBlob = null;
    this.segmentStartedAt = Date.now();
    this.setPhase("capturing");

    const rec = new MediaRecorder(this.stream, { mimeType: this.mimeType });
    rec.ondataavailable = (event) => {
      if (event.data?.size > 0) {
        this.segmentBlob = event.data;
      }
    };
    rec.onerror = () => {
      this.segmentRecorder = null;
    };
    rec.start();
    this.segmentRecorder = rec;
  }

  private async finishSegment(force: boolean): Promise<void> {
    const rec = this.segmentRecorder;
    if (!rec) return;

    this.endingSegment = true;
    this.segmentRecorder = null;

    const blob = await new Promise<Blob | null>((resolve) => {
      const timeout = window.setTimeout(() => resolve(this.segmentBlob), 800);
      rec.onstop = () => {
        window.clearTimeout(timeout);
        resolve(this.segmentBlob);
      };
      if (rec.state === "recording") {
        rec.stop();
      } else {
        window.clearTimeout(timeout);
        resolve(this.segmentBlob);
      }
    });

    this.segmentBlob = null;
    this.endingSegment = false;

    const durationSec = this.segmentStartedAt
      ? (Date.now() - this.segmentStartedAt) / 1000
      : 0;
    this.segmentStartedAt = 0;

    if (!blob || blob.size < MIN_UPLOAD_BYTES) return;
    if (!force && durationSec < MIN_SEGMENT_SEC) return;

    const baseMime = this.mimeType.split(";")[0] ?? "audio/webm";
    this.onSegment({
      blob,
      mimeType: baseMime,
      durationSec: Math.max(durationSec, MIN_SEGMENT_SEC),
    });
  }

  async stop(): Promise<void> {
    this.active = false;
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.segmentRecorder || this.vad.forceEnd()) {
      await this.finishSegment(true);
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
    this.analyser = null;
    this.setPhase("idle");
  }

  destroy(): void {
    void this.stop();
  }
}

export { isMediaRecorderSupported } from "@/lib/speech/cloud-audio-capture";
