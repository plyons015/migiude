/** RMS + peak level from mono PCM (matches energy VAD analyser path). */
export function pcmLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    sumSq += s * s;
    const abs = Math.abs(s);
    if (abs > peak) peak = abs;
  }
  const rms = Math.sqrt(sumSq / samples.length);
  return Math.max(rms, peak);
}
