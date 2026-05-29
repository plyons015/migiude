import {
  WHISPER_CHUNK_OVERLAP_SEC,
  WHISPER_CHUNK_SEC,
  WHISPER_SAMPLE_RATE,
} from "@/lib/speech/whisper-models";
import { EnergyVad } from "@/lib/speech/vad/energy-vad";
import { pcmLevel } from "@/lib/speech/vad/pcm-level";
import { WHISPER_VAD_PROFILE } from "@/lib/speech/vad/vad-config";

export type WhisperPcmChunkHandler = (payload: {
  samples: Float32Array;
  chunkId: string;
}) => void;

export type WhisperPcmCaptureOptions = {
  /** Skip transcription while silent (saves CPU/battery). Default true. */
  vadEnabled?: boolean;
  onVadSilentChange?: (silent: boolean) => void;
};

function resampleLinear(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const src = i * ratio;
    const idx = Math.floor(src);
    const frac = src - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    output[i] = a + (b - a) * frac;
  }
  return output;
}

function createChunkId(): string {
  return `pcm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isSpeechPhase(phase: ReturnType<EnergyVad["getPhase"]>): boolean {
  return phase === "speech" || phase === "ending";
}

/**
 * Captures mono PCM at 16 kHz and emits fixed-duration chunks for Whisper.
 * Optional energy VAD pauses chunk emission during silence.
 */
export class WhisperPcmCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private pending: Float32Array[] = [];
  private pendingLength = 0;
  private active = false;
  private vad: EnergyVad | null = null;
  private lastSilent = false;

  constructor(
    private readonly onChunk: WhisperPcmChunkHandler,
    private readonly options: WhisperPcmCaptureOptions = {},
  ) {}

  private get vadEnabled(): boolean {
    return this.options.vadEnabled !== false;
  }

  private notifySilent(silent: boolean): void {
    if (silent === this.lastSilent) return;
    this.lastSilent = silent;
    this.options.onVadSilentChange?.(silent);
  }

  private shouldCapture(): boolean {
    if (!this.vadEnabled || !this.vad) return true;
    return isSpeechPhase(this.vad.getPhase());
  }

  async start(): Promise<void> {
    if (this.active) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not available.");
    }

    this.vad = this.vadEnabled ? new EnergyVad(WHISPER_VAD_PROFILE) : null;
    this.vad?.begin();
    this.lastSilent = this.vadEnabled;
    if (this.vadEnabled) {
      this.options.onVadSilentChange?.(true);
    }

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
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    const inputRate = this.audioContext.sampleRate;

    this.processor.onaudioprocess = (event) => {
      if (!this.active) return;
      const channel = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(channel.length);
      copy.set(channel);
      const resampled = resampleLinear(copy, inputRate, WHISPER_SAMPLE_RATE);

      if (this.vad) {
        const result = this.vad.tick(pcmLevel(resampled));
        const silent = !isSpeechPhase(this.vad.getPhase());
        this.notifySilent(silent);
        if (result.type === "speech_end") {
          this.flushCompleteChunks(true);
        }
      }

      if (this.shouldCapture()) {
        this.pending.push(resampled);
        this.pendingLength += resampled.length;
        this.flushCompleteChunks(false);
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.active = true;
  }

  private flushCompleteChunks(final: boolean): void {
    const chunkSamples = Math.floor(WHISPER_CHUNK_SEC * WHISPER_SAMPLE_RATE);
    const overlapSamples = Math.floor(
      WHISPER_CHUNK_OVERLAP_SEC * WHISPER_SAMPLE_RATE,
    );

    while (this.pendingLength >= chunkSamples) {
      const merged = this.takeSamples(chunkSamples);
      if (merged.length === 0) break;
      this.onChunk({ samples: merged, chunkId: createChunkId() });
      if (overlapSamples > 0 && overlapSamples < merged.length) {
        const tail = merged.slice(merged.length - overlapSamples);
        this.pending.unshift(tail);
        this.pendingLength += tail.length;
      }
    }

    if (final && this.pendingLength > 0) {
      const merged = this.takeSamples(this.pendingLength);
      if (merged.length > 0) {
        this.onChunk({ samples: merged, chunkId: createChunkId() });
      }
    }
  }

  private takeSamples(count: number): Float32Array {
    const out = new Float32Array(Math.min(count, this.pendingLength));
    let offset = 0;
    while (offset < out.length && this.pending.length > 0) {
      const head = this.pending[0]!;
      const need = out.length - offset;
      if (head.length <= need) {
        out.set(head, offset);
        offset += head.length;
        this.pending.shift();
      } else {
        out.set(head.subarray(0, need), offset);
        this.pending[0] = head.subarray(need);
        offset += need;
      }
    }
    this.pendingLength -= out.length;
    return out;
  }

  async stop(): Promise<void> {
    if (!this.active) return;
    this.active = false;
    if (this.vad?.forceEnd()) {
      this.flushCompleteChunks(true);
    } else {
      this.flushCompleteChunks(true);
    }

    this.processor?.disconnect();
    this.processor = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.audioContext) {
      await this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
    this.pending = [];
    this.pendingLength = 0;
    this.vad = null;
    this.notifySilent(false);
  }
}
