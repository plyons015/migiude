# Phase 5 — Quick wins ✅

## Listen (`/listen/`)

- **Privacy badge** — “Audio discarded” (no files stored)
- **Copy transcript** — markdown lines to clipboard
- **Continue session** — restores transcript + highlights from `localStorage` after refresh
- **Highlight** — bookmark latest line (+ optional note); saved on note
- **Save as note** — editable **title**, **tags** (chips), highlights attached

## AI panel

- **Copy result** after Summarize / Todos / Mind map

## Notes (`/notes/`)

- **Tag filter** — chip bar (All + each tag); URL `?tag=Client-XYZ`
- **Tags** on any note (editor)
- **Highlights** section on notes saved from Listen

## Dashboard

- **Open follow-ups** card → `/notes/?tab=todos`

## Data

- `NoteRecord.tags?: string[]`
- `NoteRecord.highlights?: TranscriptHighlight[]`
- Firestore sync includes `tags` and `highlights`

## Try it

```bash
npm run dev
```

1. `/listen/` → speak → Highlight → set title/tags → Save as note  
2. `/notes/` → filter by tag → open note → see highlights  
3. `/dashboard/` → Open follow-ups  

**Next:** [Phase 6 — Meeting sessions](PHASES.md#phase-6--meeting-sessions)
