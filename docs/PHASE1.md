# Phase 1 — Voice & transcription

## Features

- **On-device Whisper (default tap mic)** — `@huggingface/transformers` runs in a Web Worker; 16 kHz PCM captured in ~3s chunks; audio stays on device
- **Web Speech fallback** — if Whisper fails to start, browser speech is used automatically with a banner
- **Meeting mode (cloud STT)** — hold mic on dashboard → ~8s chunks → Firebase `transcribeAudio` (unchanged; Phase 1+ cloud path)
- **Privacy** — tap path: mic → PCM → local WASM; no audio files stored; cloud path only when meeting mode is selected
- **Wake Lock** — screen stays on while listening (when supported)
- **Dashboard mic** — primary UX at `/dashboard/` (iPod recording display); `/listen/` still works for deep links
- **Tap vs hold** — tap = on-device Whisper; hold = meeting mode (cloud STT when allowed; duration 3/5/7s in Settings). See [ON_DEVICE_PHASE_B.md](ON_DEVICE_PHASE_B.md)
- **VAD & autosave** — pause Whisper on silence; transcript backup every 12s. See [ON_DEVICE_PHASE_C.md](ON_DEVICE_PHASE_C.md)
- **Personalization** — custom terms, corrections, todo hints, multilingual Whisper. See [ON_DEVICE_PHASE_D.md](ON_DEVICE_PHASE_D.md)
- **Native Android** — whisper.cpp on arm64. See [ON_DEVICE_PHASE_E.md](ON_DEVICE_PHASE_E.md)
- **Explainers** — comparison guide + hold tuning. See [ON_DEVICE_PHASE_F.md](ON_DEVICE_PHASE_F.md)

## Architecture (paths)

| Layer | Path |
|-------|------|
| Orchestration | `hooks/use-transcription.ts` → `hooks/use-local-transcription.ts` |
| Whisper hook | `hooks/use-whisper-stt.ts` |
| Web Speech hook | `hooks/use-speech-recognition.ts` |
| Worker | `lib/speech/whisper-stt.worker.ts` |
| Worker client | `lib/speech/whisper-worker-client.ts` |
| PCM capture | `lib/speech/whisper-pcm-capture.ts` |
| Model presets | `lib/speech/whisper-models.ts` |
| Settings | `lib/settings/preferences.ts` — `whisperModelSize` (tiny / base) |
| UI status | `components/dashboard/ipod-recording-display.tsx` |
| Session wiring | `hooks/use-listen-session.ts` → `components/dashboard/dashboard-view.tsx` |

## Try it

```bash
npm run dev
```

Open [http://localhost:3000/dashboard/](http://localhost:3000/dashboard/) in **Chrome** (desktop or Android).

First tap on the mic downloads the Whisper model (cached in the browser). Expect ~3s chunk latency — not true streaming.

On device:

```bash
npm run cap:sync
npm run cap:android
```

Grant microphone permission when prompted.

## Settings

**Settings → Voice & transcription**

- **On-device model** — Tiny (faster, less accurate) or Base (slower, better)
- **Quick transcription mode** — On-device Whisper vs cloud (when not in local-only mode)

## “Network” error (Web Speech fallback only)

If Whisper fails and the app falls back to Web Speech, Chrome may report `network` when Google’s speech servers are unreachable — not when `localhost` or Firebase is down.

| Likely cause | What to try |
|--------------|-------------|
| **VPN / corporate proxy** | Turn VPN **off** for the browser session. |
| **Wrong browser** | Use **Google Chrome** — Edge/Firefox often fail with `network`. |
| **Prefer Whisper** | Ensure on-device Whisper starts (check model download progress on iPod display). |

With Whisper as the default tap path, most users should not hit Web Speech network errors for quick notes.

## Android notes

- Whisper + Web Speech work in **Chrome WebView** / Capacitor on recent Android.
- `RECORD_AUDIO` is in `AndroidManifest.xml`; the app requests it on launch.
- After changing voice code, run `npm run cap:sync` and reinstall.
- Background listening is **not** supported in Phase 1 (Phase 5 if needed).

## Build notes

`next.config.ts` aliases `onnxruntime-node` and `sharp` to an empty stub in the browser bundle (Transformers.js pulls them optionally). Production static export builds with Turbopack.

## Multiple speakers / voices

**Not in Phase 1.** On-device Whisper and Web Speech have **no speaker diarization**.

Meeting mode cloud STT may add speaker labels when configured (see cloud transcription path).

## Next (Phase 2)

Pipe finalized transcript chunks to `processWithAi()` (Firebase Functions + Genkit).
