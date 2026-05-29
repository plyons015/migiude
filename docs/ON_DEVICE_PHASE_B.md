# On-device phases — B: Mic gesture polish

**Follows:** [Phase A in PHASE1.md](PHASE1.md) (Whisper-first tap path)

**Goal:** Make the dashboard mic duality obvious — **tap = on-device**, **hold = meeting mode** — with haptics on native and copy aligned to Whisper.

---

## What shipped

| Item | Path |
|------|------|
| Hold gesture + progress ring | `hooks/use-hold-gesture.ts` (5s hold, purple at 2.5s) |
| Mic button UI | `components/dashboard/mic-hold-button.tsx` |
| Dashboard wiring | `components/dashboard/dashboard-view.tsx` |
| Haptics (Android/iOS native) | `lib/capacitor/haptics.ts` + `@capacitor/haptics` |
| Local-only guard | `hooks/use-transcription.ts` — explicit `cloud` mode forced to `browser` when local-only |

## Behavior

| Gesture | Action |
|---------|--------|
| **Tap** (< 400ms) | Quick capture — on-device Whisper (Web Speech fallback) |
| **Hold 2.5s** | Purple ring + medium haptic — “Hold for Meeting Mode” |
| **Hold 5s** | Start meeting session + success haptic |
| **Template selected + tap** | Start meeting with template (cloud STT when allowed; on-device when local-only) |

## Visual tokens

- **Teal** — on-device / quick capture (was emerald)
- **Violet** — meeting mode (hold threshold or template selected)

## Local-only mode

Hold still starts a **meeting** (title, tags, end flow) but transcription stays **on-device** — cloud STT is never used even if the caller passes `mode: "cloud"`.

## Capacitor

Haptics no-op on web. After `npm run cap:sync`, Android gets vibration on tap, mid-hold, and meeting start.

---

## Next — Phase D

See [ON_DEVICE_PHASE_D.md](ON_DEVICE_PHASE_D.md) — vocabulary, corrections, todo hints, multilingual models.

---

## Next — Phase C (performance & reliability)

- Voice Activity Detection (pause on silence)
- Partial transcript auto-save every 10–15s
- Throttled UI updates
- Optional Wi‑Fi-only model download

See master on-device plan in conversation / ROADMAP updates.
