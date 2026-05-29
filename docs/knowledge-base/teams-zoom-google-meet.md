# Teams, Zoom & Google Meet — best results

> In-app: **Help → Guide** or [/help/teams-zoom-meet/](/help/teams-zoom-meet/).  
> Source of truth for the product UI: `lib/help/articles/teams-zoom-meet.ts`.

## What Ude records

On web and mobile, **Listen uses your microphone** — not the meeting platform’s internal mixed audio. Teams/Zoom/Meet process everyone on their servers; Ude only hears what your mic picks up.

Otter-style bots join the call and get a cleaner feed. Ude is **privacy-first on your device**, with optional **Cloud STT** for speaker labels.

## Recommended setup

1. **Settings → Meetings → Cloud STT — speakers** (sign in; not local-only).
2. **Headphones** for the call (less echo; see tradeoff below).
3. **Each person on their own device** when you need everyone’s words.
4. Use **Teams/Zoom/Meet live transcript** as backup for “who said what.”
5. **Clear turns**, brief pauses.
6. **English (US)** or **English (UK)** — best hint for mixed accents; rename speakers after.

## Headphones tradeoff

| Setup | Typical mic content |
|--------|---------------------|
| Open speakers | You + remote voices (muddy); echo cancel fights bleed; often one speaker label |
| Headphones | Mostly **you**, clearer; remote lines may be missing unless platform transcript or multi-device |

## Web + video call

- Prefer Chrome/Edge on desktop for Cloud STT.
- No automatic “system audio” capture in v1.
- Close other media apps.

## Mixed accents

One language setting for the session. Cloud STT is usually more accent-tolerant than browser speech. Fix names in **Meetings → Transcript** after the call.

## Suggested workflow

**Before:** Cloud STT, headphones, consent if needed.  
**During:** Start meeting in Listen; highlights on key moments.  
**After:** End → Meetings room; rename speakers; AI summary.  
**Optional:** Compare with the platform’s official transcript.

## Limits

- Not a meeting bot / no user search in v1.
- One mic ≠ three studio tracks.
- Speakerphone + crosstalk stays hard.

See also: `docs/ANDROID_MIC_ISOLATION.md` for Android bleed from other apps.
