# On-device phases — D: Personalization & smart hints

**Follows:** [Phase C](ON_DEVICE_PHASE_C.md)

**Goal:** Differentiate with private vocabulary, learned corrections, on-device todo hints, and multilingual Whisper — without cloud AI during capture.

---

## What shipped

| Item | Path |
|------|------|
| Personalization store (IndexedDB) | `lib/speech/personalization-store.ts` |
| Apply terms + corrections | `lib/speech/apply-personalization.ts` |
| Hook | `hooks/use-speech-personalization.ts` |
| Rule-based todo hints | `lib/speech/local-todo-hints.ts` |
| Hints UI | `components/dashboard/local-todo-hints-panel.tsx` |
| Vocabulary settings | `components/settings/speech-personalization-settings.tsx` |
| Line “Fix text” + correction memory | `components/dashboard/ipod-recording-display.tsx` |
| Multilingual Whisper models | `lib/speech/whisper-models.ts` + worker language arg |
| Voice commands on dashboard | `hooks/use-listen-session.ts` |

## Behavior

### Custom vocabulary

Settings → **Speech vocabulary**: map heard phrase → preferred spelling (e.g. `migiude` → `Migiude`). Applied to every new transcript line (Whisper + Web Speech fallback).

### Learned corrections

During capture, tap a line → **Fix text** → edit → **Save correction**. Future transcripts replace the old phrase (word-boundary match). Stored locally per user.

### On-device todo hints

When enabled (Settings → **On-device todo hints**), lines matching patterns like “I will…”, “I need to…”, “remind me to…” show a teal banner with **Add** / dismiss. No cloud call.

### Multilingual Whisper

**Recognition language** in Settings selects the Whisper model:

- English → `whisper-tiny.en` / `whisper-base.en` (smaller download)
- Other languages → multilingual `whisper-tiny` / `whisper-base`

Worker passes language to Transformers.js on each chunk.

### Voice commands (dashboard)

With **Voice commands** on, final lines can trigger: `add todo: …`, `highlight`, `summarize so far` (summarize deferred until after save on dashboard).

---

## Deferred (per plan)

- Gemini Nano on-device
- Full accent adaptation (beyond correction memory)
- Cloud polish on save

---

## Next — Phase E

See [Phase E](ON_DEVICE_PHASE_E.md): native Android `whisper.cpp` via Capacitor (arm64), with WASM fallback.
