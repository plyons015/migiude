# On-device phases — F: Polish, explainers & settings

**Follows:** [Phase E](ON_DEVICE_PHASE_E.md)

**Goal:** Make the on-device story obvious in-product — comparison explainer, configurable meeting hold, and updated feature docs.

---

## What shipped

| Item | Path |
|------|------|
| Meeting hold duration (3 / 5 / 7s) | `lib/settings/preferences.ts`, Settings UI |
| Dynamic hold ring + copy | `hooks/use-hold-gesture.ts`, `components/dashboard/mic-hold-button.tsx` |
| Settings comparison card | `components/settings/on-device-modes-card.tsx` |
| Knowledge-base guide | `lib/help/articles/on-device-modes.ts` |
| Help route | `/help/on-device-modes/` |
| Feature catalog update | `docs/FEATURES.md` |
| README on-device section | `README.md` |

## Behavior

### Meeting hold duration

**Settings → Voice & transcription → Meeting hold duration**

- **3s** — faster entry to cloud meeting mode
- **5s** — default (matches original UX)
- **7s** — fewer accidental meeting starts

The violet “meeting hint” ring appears at **half** the chosen duration (e.g. 2.5s when hold is 5s).

### Why on-device?

Settings includes a **comparison table** (Ude vs typical cloud recorders) and a link to the full guide in Help.

Help → **On-device vs meeting mode** covers:

- Tap (teal) vs hold (violet)
- WASM / native / Web Speech fallback chain
- When to use meeting mode for speakers
- Settings reference

## Planned later — optional cloud polish on save

**Product intent (confirmed):** After someone captures a **private on-device note** and saves it locally, they may **opt in** to have the **saved transcript text** sent to cloud AI (Gemini/Grok) once — to re-read and polish wording (grammar, punctuation, clarity). Audio stays on-device; only text leaves the device, only if the user asks.

**Not the same as:** hold-to-meeting cloud STT (audio during capture) or the post-save summary/todos dialog (insights, not transcript rewrite).

**When we build it, include:**

| Requirement | Why |
|-------------|-----|
| **Opt-in only** | Settings default off + per-save prompt (“Polish this note with cloud AI?”) |
| **Local-only mode** | Hard block — no polish calls |
| **Quota / plan** | Same `aiProcess` billing as summarize; show `PlanQuotaMessage` on limit |
| **Privacy copy** | “Transcript text is sent to [provider] for wording only; audio is not uploaded.” |
| **Undo / compare** | Show before/after or let user keep original transcript |

**Suggested task name:** `polish_transcript` on `aiProcess` (or extend `generic` with a strict polish prompt).

## Deferred (per original Phase F plan)

| Item | Notes |
|------|--------|
| Formal device benchmarks | Run manually on reference phones; log in release notes |
| Marketing demo video | Out of repo scope |

## On-device phase index

| Phase | Topic | Doc |
|-------|--------|-----|
| A | WASM Whisper default | [PHASE1.md](PHASE1.md) |
| B | Tap vs hold mic UX | [ON_DEVICE_PHASE_B.md](ON_DEVICE_PHASE_B.md) |
| C | VAD, autosave, Wi‑Fi-only | [ON_DEVICE_PHASE_C.md](ON_DEVICE_PHASE_C.md) |
| D | Vocabulary, hints, multilingual | [ON_DEVICE_PHASE_D.md](ON_DEVICE_PHASE_D.md) |
| E | Android native whisper.cpp | [ON_DEVICE_PHASE_E.md](ON_DEVICE_PHASE_E.md) |
| F | Explainers & hold tuning | This doc |
