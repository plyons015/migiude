# Phase 10 — Library, templates & export

**Goal:** Find past meetings, reuse templates, carry series follow-ups forward, and paste full minutes elsewhere.

## Library (`/library/`)

- **Filters:** tag, topic, “open follow-ups only”
- **Series panel:** when a tag is selected, lists open todos from earlier meetings with the same tag
- **Follow-ups board** (`/library/?view=board`): three columns — open / waiting / done (meeting-linked todos only)

## Meeting templates (Listen)

Before starting a meeting, pick:

| Template | Tags | Pre-filled agenda |
|----------|------|-------------------|
| **1:1** | `1:1` | Check-in outline |
| **Client call** | `client` | Call structure |
| **Standup** | `standup`, `team` | Yesterday / today / blockers |

Agenda is saved on the meeting at end and appears in the **Script** tab.

## Export

In the meeting room header: **Export Markdown** copies a bundle:

- Title, tags, agenda, summary, minutes
- Canonical transcript
- Topics, highlights, follow-ups, linked appends

Paste into email, Notion, or docs.

## Series

Meetings that share a tag form a **series**. Library shows open follow-ups from prior meetings in that series. Listen warns when starting if common series tags still have open items.

## Next

[Phase 11 — Android production](PHASES.md#phase-11--android-production--reliability)
