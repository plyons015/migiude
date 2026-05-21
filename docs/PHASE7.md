# Phase 7 — Live AI, tags & voice commands ✅

## Settings (`/settings/` → Meetings)

| Toggle | Default | Effect |
|--------|---------|--------|
| **Smart tags on end** | on | After End meeting, AI suggests tags to add before save |
| **Rolling summary** | off | Every N minutes during a meeting, AI summarizes transcript so far |
| **Interval** | 5 min | When rolling summary is on |
| **Voice commands** | on | Parse finals for spoken commands |

## Commitment awareness (default on)

When you say first-person commitments (e.g. *"I will drop a book off to you this afternoon"*), Migiude:

1. Spots likely commitment phrases locally (fast)
2. Asks AI to extract a short todo + due time
3. Saves a **todo with `dueAt`** and shows it under **Detected commitments**
4. Fires a **system reminder** when due (if notifications enabled)

Toggle in Settings → Meetings → **Commitment awareness**.

Requires **functions deploy** (`detect_commitments` task).

## Voice commands (during meeting)

Say clearly after a pause (final line):

- `add todo: call Sarah tomorrow`
- `highlight` or `mark this`
- `summarize so far`

## Listen

- **Rolling summary** panel appears when enabled and meeting is active
- **End meeting** → tag picker (if smart tags on) → save + auto AI

## Dashboard

- **Daily recap** — uses yesterday’s meetings + open todos (cached per day)

## Backend (redeploy required)

New `aiProcess` tasks: `suggest_tags`, `daily_recap`

```bash
npm run functions:build
firebase deploy --only functions --project migiude-app-plyons015
```

## Next

[Phase 8 — Meeting-grade STT](PHASES.md#phase-8--meeting-grade-transcription)
