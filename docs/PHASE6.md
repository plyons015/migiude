# Phase 6 — Meeting sessions ✅

## Flow

1. **`/listen/`** → **Start meeting** (starts mic + session)
2. Edit **title** and **tags** while recording
3. **End meeting** → canonical note + meeting record
4. Optional AI on Listen: one **Summary, todos & mind map** button (single `meeting_insights` call)

**Quick listen** (no meeting): mic + **Save as note** still works when no meeting is active.

## Pages

| Route | Purpose |
|-------|---------|
| `/listen/` | Start / End meeting |
| `/meetings/?id=` | Meeting detail (transcript, summary, link to note) |
| `/dashboard/` | Recent meetings |
| `/settings/` | Smart tags, rolling summary, etc. (no auto AI on end) |

## Data

- `users/{uid}/meetings/{meetingId}`
- Canonical note: `source: "meeting"`, `meetingId` set
- Todos from Listen AI: save from panel; link `meetingId` when in a meeting

## Deploy index (if Firestore query fails)

```bash
firebase deploy --only firestore:indexes --project migiude-app-plyons015
```

## Next

[Phase 7 — Live AI & tags](PHASES.md#phase-7--live-ai-tags--voice-commands)
