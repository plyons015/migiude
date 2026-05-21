# Phase 9 — Post-meeting workspace

**Goal:** Follow up after a meeting without overwriting the canonical capture — linked appends, topics, follow-ups, and meeting-scoped AI.

## Meeting room

Open any meeting from the dashboard: `/meetings/?id={meetingId}`

| Tab | Purpose |
|-----|---------|
| **Transcript** | Segment list, rename speakers, reassign lines, jump from highlights |
| **Summary** | Edit or AI-generate meeting summary |
| **Your notes** | **Linked appends** (separate records, optional anchor to line/topic/highlight) |
| **Script** | Agenda (before) + polished minutes (AI) |
| **Follow-ups** | Todos for this meeting — status `open` / `waiting` / `done`, topic tag, assignee |
| **Topics** | User + AI-suggested topics; tag follow-ups on Follow-ups tab |
| **Ask** | Q&A scoped to transcript + summary + appends + open todos |

## Data model

- `MeetingRecord`: optional `segments`, `speakers`, `topics`, `agenda`, `minutes` (canonical `transcript` unchanged)
- `MeetingAppendRecord`: `users/{uid}/meetingAppends` + IndexedDB `vault.appends`
- `TodoRecord`: `status`, `topicTag`, `assigneeLabel` (plus existing `meetingId`)

## Rules

- **Canonical transcript** on the meeting is never replaced by appends.
- Speaker edits apply to **segments** only; raw transcript is viewable read-only under Transcript.
- On meeting end, segments are parsed from `Speaker N:` lines when present.

## AI tasks (Functions)

- `suggest_topics` — Topics tab
- `meeting_minutes` — Script tab polish
- Summary / Ask reuse `summarize` and `generic` with full meeting context

Deploy after pulling Phase 9:

```bash
cd functions && firebase deploy --only functions
```

## Next

[Phase 10 — Library & export](PHASES.md#phase-10--library-templates--export)
