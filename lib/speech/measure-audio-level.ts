export type AudioLevel = {
  /** Root-mean-square amplitude 0–1 */
  rms: number;
  /** Peak absolute sample 0–1 */
  peak: number;
  durationSec: number;
};

/** Skip cloud STT when the chunk is effectively silence (avoids model hallucination). */
export const SILENT_CHUNK_PEAK = 0.014;
export const SILENT_CHUNK_RMS = 0.005;

export function isSilentChunk(level: AudioLevel): boolean {
  if (level.durationSec < 0.25) return true;
  return level.peak < SILENT_CHUNK_PEAK && level.rms < SILENT_CHUNK_RMS;
}

/**
 * Decode a recorded chunk and measure loudness. On decode failure, returns high
 * levels so we still attempt transcription rather than dropping speech.
 */
export async function measureAudioLevel(blob: Blob): Promise<AudioLevel> {
  if (typeof window === "undefined" || !window.AudioContext) {
    return { rms: 1, peak: 1, durationSec: 1 };
  }

  const ctx = new AudioContext();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    if (channel.length === 0) {
      return { rms: 0, peak: 0, durationSec: 0 };
    }

    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < channel.length; i++) {
      const sample = channel[i]!;
      sumSq += sample * sample;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
    }

    return {
      rms: Math.sqrt(sumSq / channel.length),
      peak,
      durationSec: audioBuffer.duration,
    };
  } catch {
    return { rms: 1, peak: 1, durationSec: 1 };
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
