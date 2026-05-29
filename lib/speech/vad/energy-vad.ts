import {
  NOISE_FLOOR_MIN,
  QUICK_VAD_PROFILE,
  SPEECH_END_RATIO,
  SPEECH_START_FRAMES,
  SPEECH_START_MIN,
  SPEECH_START_MULTIPLIER,
  WARMUP_MS,
  type VadTimingProfile,
} from "./vad-config";

export type VadPhase = "warmup" | "waiting" | "speech" | "ending";

export type VadTickResult =
  | { type: "none" }
  | { type: "speech_start" }
  | { type: "speech_end" };

export class EnergyVad {
  private phase: VadPhase = "warmup";
  private warmupUntil = 0;
  private speechFrames = 0;
  private silenceSince = 0;
  private noiseFloor = NOISE_FLOOR_MIN;
  private noiseSamples: number[] = [];

  constructor(private readonly timing: VadTimingProfile = QUICK_VAD_PROFILE) {}

  begin(now = Date.now()): void {
    this.phase = "warmup";
    this.warmupUntil = now + WARMUP_MS;
    this.speechFrames = 0;
    this.silenceSince = 0;
    this.noiseFloor = NOISE_FLOOR_MIN;
    this.noiseSamples = [];
  }

  getPhase(): VadPhase {
    return this.phase;
  }

  private startThreshold(): number {
    return Math.max(SPEECH_START_MIN, this.noiseFloor * SPEECH_START_MULTIPLIER);
  }

  private endThreshold(): number {
    return this.startThreshold() * SPEECH_END_RATIO;
  }

  private calibrate(rms: number): void {
    this.noiseSamples.push(rms);
    if (this.noiseSamples.length > 12) {
      this.noiseSamples.shift();
    }
    const sorted = [...this.noiseSamples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? NOISE_FLOOR_MIN;
    this.noiseFloor = Math.max(NOISE_FLOOR_MIN, median);
  }

  /** Use max(rms, peak) — mobile AGC often lowers RMS while peaks remain. */
  tick(level: number, now = Date.now()): VadTickResult {
    const rms = level;
    if (this.phase === "warmup") {
      this.calibrate(rms);
      if (now >= this.warmupUntil) {
        this.phase = "waiting";
      }
      return { type: "none" };
    }

    if (this.phase === "waiting") {
      this.calibrate(rms);
      if (rms >= this.startThreshold()) {
        this.speechFrames += 1;
        if (this.speechFrames >= SPEECH_START_FRAMES) {
          this.phase = "speech";
          this.silenceSince = 0;
          return { type: "speech_start" };
        }
      } else {
        this.speechFrames = 0;
      }
      return { type: "none" };
    }

    if (this.phase === "speech" || this.phase === "ending") {
      if (rms < this.endThreshold()) {
        if (this.silenceSince === 0) {
          this.silenceSince = now;
          this.phase = "ending";
        } else if (now - this.silenceSince >= this.timing.speechEndMs) {
          this.phase = "waiting";
          this.speechFrames = 0;
          this.silenceSince = 0;
          return { type: "speech_end" };
        }
      } else {
        this.silenceSince = 0;
        this.phase = "speech";
      }
      return { type: "none" };
    }

    return { type: "none" };
  }

  forceEnd(): boolean {
    if (this.phase === "speech" || this.phase === "ending") {
      this.phase = "waiting";
      this.speechFrames = 0;
      this.silenceSince = 0;
      return true;
    }
    return false;
  }
}

export function readAnalyserLevel(analyser: AnalyserNode): number {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const s = data[i]!;
    sumSq += s * s;
    const abs = Math.abs(s);
    if (abs > peak) peak = abs;
  }
  const rms = Math.sqrt(sumSq / data.length);
  return Math.max(rms, peak);
}
