# Phase 8 — Meeting-grade transcription

**Goal:** Reliable capture on flaky networks (e.g. Starlink) with **speaker labels**, without storing audio long-term.

## What shipped

| Piece | Location |
|-------|----------|
| Settings: Browser vs **Meeting mode (cloud STT)** | Settings → Voice & transcription |
| VAD speech segments + `MediaRecorder` | `lib/speech/vad-audio-capture.ts` |
| Callable `transcribeAudio` | `functions/src/index.ts`, `functions/src/stt/` |
| Gemini multimodal STT + diarization JSON | `functions/src/stt/gemini-stt.ts` |
| Unified hook | `hooks/use-transcription.ts` |
| Speaker chips in transcript | `components/listen/transcript-panel.tsx` |
| Display lines `Speaker N: …` for AI/save | `lib/speech/transcript-merge.ts` |

## How to use

1. Deploy functions (includes `transcribeAudio`):
   ```bash
   cd functions && firebase deploy --only functions
   ```
2. Settings → **Meeting mode — cloud STT** (requires sign-in; disabled in **local-only** mode).
3. Listen → start mic → speak → lines appear per phrase with **S1**, **S2**, … labels.
4. End meeting / save as usual — transcript includes `Speaker N:` prefixes for AI.

## Privacy

- **Browser speech:** no audio leaves the device (unchanged).
- **Cloud STT:** short WebM chunks are sent to your Firebase Function → Gemini API for transcription only; chunks are not written to Firestore or disk on the server.

## Billing

Uses the same **GEMINI_API_KEY** as other AI tasks. Blaze + Generative Language API billing applies per **speech segment** sent (not while silent).

## Limitations (v1)

- Latency until you pause speaking (~0.5s hangover), not true streaming.
- Diarization quality depends on Gemini; not a dedicated Deepgram/Cloud STT pipeline yet.
- Silent chunks are skipped client-side to reduce hallucinated lines; very quiet speech may need you to speak louder.
- Foreground only (background capture = Phase 11).
- Voice commands and commitment awareness still read text chunks — they work once lines land.

## Next

[Phase 9 — Post-meeting workspace](PHASES.md#phase-9--post-meeting-workspace): Meeting room, linked appends, speaker editor.
