/** Energy VAD tuning for cloud STT segments (browser speech unchanged). */

export const VAD_POLL_MS = 50;

/** Ignore VAD right after mic open (AGC / device pop). */
export const WARMUP_MS = 300;

/** RMS frames above threshold to start a segment. */
export const SPEECH_START_FRAMES = 2;

/** Silence duration to end a segment. */
export const SPEECH_END_MS = 600;

/** Min duration unless user stops the mic (force flush). */
export const MIN_SEGMENT_SEC = 0.35;
export const MAX_SEGMENT_SEC = 25;

export const NOISE_FLOOR_MIN = 0.002;
export const SPEECH_START_MULTIPLIER = 2.5;
export const SPEECH_START_MIN = 0.004;
export const SPEECH_END_RATIO = 0.55;

/** Minimum MediaRecorder blob size to upload after VAD marked speech. */
export const MIN_UPLOAD_BYTES = 120;
