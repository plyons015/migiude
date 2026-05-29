# On-device phases — C: Performance & reliability

**Follows:** [Phase B](ON_DEVICE_PHASE_B.md) · [Phase A / Whisper](PHASE1.md)

**Goal:** Make on-device Whisper feel reliable on long sessions — less CPU when idle, smoother UI, recoverable transcripts.

---

## What shipped

| Item | Path |
|------|------|
| Energy VAD on Whisper PCM | `lib/speech/whisper-pcm-capture.ts` + `lib/speech/vad/pcm-level.ts` |
| VAD profile | `lib/speech/vad/vad-config.ts` — `WHISPER_VAD_PROFILE` (800ms silence hang) |
| Throttled interim UI | `lib/hooks/use-throttled-value.ts` → `hooks/use-whisper-stt.ts` (300ms) |
| Transcribe queue | Serial chunk processing in `use-whisper-stt.ts` |
| Session autosave | `lib/listen/session-persist.ts` — debounced + every 12s |
| Refresh recovery | `hooks/use-listen-session.ts` restores `captureActive` snapshots |
| Wi‑Fi only downloads | `lib/speech/whisper-network.ts` + Settings toggle |
| Pause on silence toggle | Settings → Voice & transcription |

## Behavior

### Voice activity detection (default on)

While listening with Whisper, energy VAD watches PCM levels. During silence:

- No PCM chunks are sent to the worker (saves WASM CPU / battery)
- iPod status shows **“Paused · silence”**
- Speech resumes automatically when you talk again

Turn off in **Settings → Pause on silence** for always-on chunking (noisier rooms).

### Session continuity

During an active capture:

- Transcript + highlights save to `localStorage` after changes (800ms debounce)
- Backup every **12 seconds** while the session UI is visible
- After refresh, if the last snapshot was mid-capture, transcript restores on dashboard load

### Wi‑Fi only model download

When enabled, first-time Whisper model fetch is blocked if the browser reports cellular / data-saver. Cached models still work offline.

---

## Adjustments vs original proposal

| Original | Shipped |
|----------|---------|
| WebGPU preference | **Deferred** — Android WebView unreliable; WASM CPU remains default |
| Battery / thermal auto model downgrade | **Deferred** to Phase E (native) or later |
| IndexedDB model cache in `public/models/` | **Not used** — Transformers.js browser cache (Phase A) |
| Cloud polish on save | **Not in Phase C** — needs quota + consent UX |

---

## Next — Phase D (differentiation)

- Local vocabulary / correction memory (IndexedDB)
- Rule-based todo hints from transcript patterns
- Multi-language model selection

## Next — Phase E (Android native)

- Capacitor whisper.cpp plugin if WASM benchmarks disappoint on WebView
