# Migiude roadmap — meeting app vision

**Master checklist (what’s left to build):** [PHASES.md](PHASES.md)

This doc aligns **what you built (Phases 0–4)** with a **meeting assistant** like Pocket AI, based on your phased plan and the Grok thread [*AetherMind Repo vs Pocket AI Voice Substitute*](https://grok.com/share/bGVnYWN5LWNvcHk_f99dbc47-1e48-455a-bd8b-a29dfbf45b8f).

## What you have today (Phases 0–4) ✅

| Phase | Delivered | Meeting value |
|-------|-----------|---------------|
| **0** | Next.js static export, Firebase, Capacitor Android, env/secrets | Foundation for phone + cloud |
| **1** | Listen, Web Speech, wake lock, live transcript, line breaks on pause | **Demo-quality** capture in quiet 1:1; not meeting-grade |
| **2** | `aiProcess` (Gemini/Grok): summarize, todos, mind map | **Strong** post-meeting intelligence |
| **3** | Notes, todos, dashboard, IndexedDB, reminders | **Strong** storage & follow-up |
| **4** | Settings, theme, local-only mode, APK notes | Privacy & polish |

**Bottom line:** Migiude is already a good **“listen → transcribe → AI → notes/todos”** app. It is **not yet** a reliable **multi-speaker meeting recorder** (Pocket AI class).

---

## Meeting app requirements vs current gaps

| Meeting need (Pocket AI–class) | Today | Gap |
|--------------------------------|-------|-----|
| Long session (30–90 min) | Web Speech restarts on pause; ~60s limits in some browsers | Needs **server STT** or native streaming |
| **Who said what** (diarization) | Not supported | Needs Cloud STT / Deepgram / AssemblyAI |
| Room / multiple speakers | Single text stream | Same as diarization + better mic |
| Works on **Starlink / flaky Wi‑Fi** | Web Speech often fails on your home Wi‑Fi | Server STT over HTTPS (same path as AI) |
| **Background** listen (screen off) | Foreground only; Web Speech stops | Native capture + upload (Phase 6) |
| Meeting entity | Notes only | **Sessions**: title, start/end, attendees |
| Auto summary when meeting ends | Manual Summarize | Auto-run AI on `session.end` |
| Export / share | Save note | PDF/Markdown/share sheet (optional) |
| Privacy | No audio stored ✅ | Keep policy when adding STT upload |

---

## Recommended phases (revised for meetings)

Keep Phases 0–4 as **done**. Add meeting-focused work as **Phase 5+** (order matters).

### Phase 5 — Meeting sessions (no new STT yet) — ~1–2 days

**Goal:** Use the app in a real meeting for **one combined transcript + AI**, even without speaker labels.

- **Meeting session** model: `MeetingSession` (title, startedAt, endedAt, transcript, linked note id).
- Listen UI: **“Start meeting”** / **“End meeting”** (one note per session).
- On end: optional **auto-summarize + extract todos** (settings toggle).
- Dashboard: **Recent meetings** card.
- Docs: consent reminder (“inform participants where required”).

*Still Web Speech — acceptable for solo notes or 2-person if mic is near phone.*

### Phase 6 — Meeting-grade transcription — ~3–5 days

**Goal:** Replace Web Speech for Listen/meetings with **server-side STT** (Grok/AetherMind-style upgrade).

- Capture audio in short chunks (`MediaRecorder` or Capacitor plugin) → Firebase Function → **Google Cloud Speech-to-Text** or **Deepgram** (streaming + **speaker diarization**).
- Transcript lines: `Speaker 1: …` / `Speaker 2: …` (or “You” / “Other” on phone mic).
- Feature flag: **Browser speech** vs **Meeting mode (cloud STT)** in Settings.
- Requires **Blaze**, API billing, clear privacy copy (“audio sent to Google for transcription”).

*Fixes Starlink/Web Speech issues for transcription; same network path as Gemini.*

### Phase 7 — Meeting intelligence — ~2–3 days

**Goal:** AI that understands **meetings**, not generic text.

- Prompts: meeting summary, decisions, action items **with owners**, follow-up email draft.
- Pass diarized transcript to `aiProcess` (structured JSON optional).
- Optional: link todos to “Speaker 2” as assignee hint.

### Phase 8 — Reliability & Android — ~2–4 days

**Goal:** Pocket AI–like **device** behavior.

- Foreground service + notification while recording (Android).
- Optional background segment upload (Phase 5+ stretch).
- FCM for “meeting summary ready” (replace Web Notifications for todos).
- Signed release APK, onboarding for mic + notifications.

---

## How this maps to the Grok thread (AetherMind vs Pocket AI)

Typical advice in that conversation class:

| Direction | Meaning for Migiude |
|-----------|---------------------|
| **Pocket AI** | Product reference: live meeting capture, summaries, action items, mobile-first. |
| **AetherMind / roll-your-own** | You’re building the substitute on **Firebase + Capacitor + Gemini** — correct for privacy and control. |
| **Don’t clone Web Speech only** | Pocket AI–class apps use **real STT + diarization**, not browser speech alone. |
| **Privacy** | Your “no audio stored” Phase 1 rule **conflicts** with server STT — Phase 6 should say: *audio chunks sent for transcription, not retained* (or optional local-only mode stays on Web Speech). |

You are on the **substitute** path; Phases 5–6 are what make it **meeting-capable**.

---

## What to change in the old Phase 5 list

| Original Phase 5 | Recommendation |
|------------------|----------------|
| Test on Android | **Ongoing** — already done partially |
| Auto-processing while listening | Move to **Phase 5** (session end) and **Phase 7** (rolling summary optional) |
| Deeper Capacitor plugins for background mic | **Phase 6–8**, not optional — required for meetings with screen off |

---

## Practical “use in meetings this week”

**With current build (Phases 0–4):**

1. Phone on **mobile data** (you verified speech works).
2. Open app → **Listen** → start before meeting → phone on table near speakers.
3. **End** → **Summarize** → **Extract todos** → **Save as note**.
4. Accept: **no speaker names**, one transcript block, foreground only.

**When Phase 6 lands:** same flow with **Meeting mode** + speaker lines + reliable Wi‑Fi.

---

## Suggested next implementation step

If you want to proceed in code, start **Phase 5** (sessions + end-of-meeting AI) — small diff, immediate meeting workflow — then plan **Phase 6** STT provider (Gemini multimodal audio vs Cloud Speech-to-Text cost/latency comparison).

See also: [PHASE1.md](PHASE1.md) (speech limits), [PHASE2.md](PHASE2.md) (AI), [CAPACITOR.md](CAPACITOR.md) (device).

---

## Grok plan vs this repo (file map)

Your Grok spec used different paths; functionally most of Phase 1–4 is done under other names:

| Grok plan | This repo (built) |
|-----------|-------------------|
| `lib/speech.ts` | `lib/speech/web-speech.ts`, `transcript-merge.ts` |
| `useContinuousSpeech.ts` | `hooks/use-speech-recognition.ts` |
| `LiveTranscript.tsx` / `MicControl.tsx` | `components/listen/transcript-panel.tsx`, `listen-mode.tsx` |
| `wake-lock.ts` | `hooks/use-wake-lock.ts` |
| `lib/ai.ts` + Genkit in app | `lib/ai/ai-service.ts` → Firebase **`aiProcess`** (keys server-side) |
| Chunk every 5–10s → AI | **Not built** — manual Summarize / Extract on Listen (→ Phase 5b below) |
| PWA + Service Worker | **Skipped** (you chose Capacitor-only, no PWA) |
| Bottom nav: Home \| Listen \| Notes \| Todos \| Maps | **Home \| Listen \| Notes** + todos tab on Notes; mind map on Listen |
| FCM push | Web Notifications only (→ Phase 8) |

---

## Competitors (Android) — positioning

| App | Overlap with Migiude | Your edge |
|-----|----------------------|-----------|
| [Otter.ai](https://otter.ai/) | Live transcript, summaries, action items | Lighter, privacy-first, no long audio archive (when STT policy is clear) |
| Talknotes / Audionotes | Voice → tasks, summaries, mind maps | Model choice (Gemini/Grok), Firebase + local-only mode |
| Google Recorder | On-device transcript | **AI todos + mind maps + unified dashboard** |
| Wave, Read AI, Summary | Meeting/call capture | Personal + ambient assistant, not enterprise meeting suite |

**Niche (from your Grok thread):** privacy + immediate discard + **one app** for todos, mind maps, reminders from casual talk — not team meeting SaaS.

**Honest gap vs Otter/Talknotes:** real **speaker diarization** and **background** recording need Phase 6–8, not prompt-only “Speaker 1/2” labels.

---

## Grok “easy wins” — fit and order

| Feature | Effort | Fit | When |
|---------|--------|-----|------|
| **⭐ Highlight** on Listen | Very low | High | Phase 5a |
| **Continue last session** | Very low | High | Phase 5a |
| **Privacy badge** on Listen | &lt;1 h | High | Anytime |
| **Meeting session** + auto-summary on end | Low | High | Phase 5 |
| **Smart tags** on save | Low | Medium | Phase 5b |
| **Daily recap** card on home | Low | High | Phase 5b |
| **Ask anything** on note | Low | High | Phase 7 |
| **Speaker labels via AI only** | Low | **Weak** without real STT — use only until Phase 6 |
| **Voice commands** (“add todo: …”) | Low–medium | High | Phase 5c |
| **Stream chunks to AI while listening** | Medium | High | Phase 5 (your old Phase 5) |
| **Waveform / listening UI** | Low | Polish | Phase 4+ |
| **Export PDF/Markdown** | Medium | Medium | Phase 7 |
| **Calendar read-only** | Medium | Meetings | Phase 7 |
| **Real diarization** | Medium–high | **Required for meetings** | Phase 6 |

### Phase 5 split (recommended)

- **5a** — Sessions, End meeting → auto AI, Highlight, Continue session, privacy badge  
- **5b** — Rolling summary every N min (optional), smart tags, daily recap  
- **5c** — Voice command phrases → create todo / highlight / summarize so far  

Then **Phase 6** STT + true speakers (don’t rely on Gemini guessing diarization from plain text).

---

## Post-meeting workspace (your follow-up vision)

**Goal:** After a meeting, one place to **refine, organize, and act** — without becoming Notion or Monday.

### Product line (what to build vs avoid)

| Build (Migiude sweet spot) | Stop short of (full PM) |
|----------------------------|-------------------------|
| **Meeting** as first-class object (not only a note) | Workspaces, permissions, guest users |
| Append **your** notes + **agenda/script** beside AI output | Block editor with 50 block types |
| **Edit speakers** + reassign lines in transcript | CRM, time tracking, capacity planning |
| **Follow-ups** linked to meeting (todos + optional “check-in” date) | Gantt, dependencies, automations |
| **Topics / tags** filter meetings & notes | Multi-board portfolio management |
| **Script** = agenda before + polished narrative after | Wiki / knowledge base at scale |
| Export Markdown / copy for email | Two-way Notion sync (v1) |

**Positioning:** *“Otter’s meeting artifact + a light action layer”* — not *“Monday for individuals.”*

### Suggested data model (Phase 5 → 7)

```text
Meeting
  ├── metadata: title, startedAt, endedAt, calendarTitle?
  ├── speakers: [{ id, displayName, color }]     # user-editable
  ├── transcript: { segments: [{ speakerId, text, t, highlight? }] }
  ├── original (immutable by default):
  │     ├── transcript       # capture + AI — do not overwrite on append
  │     ├── aiSummary
  │     └── agendaScript     # optional pre-meeting script
  ├── appends[]              # separate records, never replace original
  │     └── MeetingAppend { body, createdAt, anchor? }
  │           anchor → segmentId | topicId | highlightId (scroll/jump in transcript)
  └── decisions[]            # AI + manual bullets (can be append or inline edit later)
  ├── tags: string[]         # "Q3-planning", "Client-XYZ"
  ├── topics: [{ id, title, segmentIds? }]       # group by theme
  └── followUps: ref → TodoRecord[] (meetingId, topicId?, speakerId?)

TodoRecord (extend)
  + meetingId?, topicTag?, assigneeLabel?, status: open | waiting | done
```

Notes can remain for **non-meeting** capture. A meeting keeps one **canonical** note/record; **appends** are child items (`parentMeetingId` + optional `anchor`) shown in a timeline under the original — tap an append’s anchor to jump to that part of the transcript.

```text
Meeting (id: m1)
  └── canonicalNote / snapshot (transcript + first AI summary — preserved)
  └── appendNotes[]
        ├── { id, body: "Budget agreed at 2:15", anchor: { segmentId: "s42" } }
        └── { id, body: "Send deck to Alex", anchor: { topicId: "pricing" } }
```

### UI: “Meeting room” (one screen, tabs)

| Tab | Purpose |
|-----|---------|
| **Transcript** | Edit speaker labels; tap line → reassign speaker; highlights |
| **Summary** | AI summary + editable |
| **Your notes** | **Linked appends** — each addition is its own note linked to the meeting; optional anchor to a transcript section (not merged into original body) |
| **Script** | Agenda before; “narrative export” after (readable minutes) |
| **Follow-ups** | Todos from meeting; add manual; light status |
| **Topics** | Chips / sections — drag lines or tag follow-ups |
| **Ask** | Chat over this meeting only (RAG-style) |

Home: filter **By tag** | **By topic** | **Open follow-ups** — not a full project board.

### Notion-ish tools (light)

- **Tagged library** — all meetings/notes with shared tags
- **Templates** — “1:1”, “Client call”, “Standup” → default agenda script + AI prompts
- **Duplicate meeting series** — same tags, link previous meeting’s open follow-ups
- **Export** — Markdown bundle: transcript + summary + follow-ups (paste into Notion if user wants)

### Monday-ish tools (minimal)

- Follow-up **status**: `open` | `waiting` | `done` (no custom workflows)
- **Group by topic tag** on dashboard (single column list, not drag-drop board v1)
- **Due / remind** — already have todo due; tie to `meetingId`
- Optional v2: **one** kanban view *only for follow-ups from meetings* (3 columns max)

### Phase mapping

| Phase | Post-meeting features |
|-------|------------------------|
| **5a** | `Meeting` entity, end meeting → note + auto AI, basic tags |
| **6** | Transcript segments + real speakers → speaker editor becomes useful |
| **7** | Meeting room tabs: your notes, script, topics, follow-ups, Ask meeting |
| **7b** | Templates, export, filter home by tag/topic |
| **8+** | Calendar title import, “check-in” reminder for meeting series |

### AI assists (high value, low PM creep)

- “Turn highlights into follow-ups”
- “Suggest topics from transcript”
- “Rewrite as minutes / email to attendees”
- “What’s still open from last meeting with this tag?”

---

**Verdict:** Push **lightly** into Notion/Monday space via **meetings + tags + follow-ups + editable speakers + linked appends + script** — one object, one screen, mobile-first. Defer boards, integrations, and multi-user until usage proves need.

---

## Low-hanging fruit (value, little bloat)

Add **before** the full Meeting room — each is independent and shippable in under ~1–2 hours.

| Feature | Value | Bloat risk | Notes |
|---------|-------|------------|-------|
| **Privacy badge** on Listen | Trust | None | One line of copy |
| **Copy transcript** (markdown) | Share / paste to Notion | None | Clipboard on Listen |
| **Continue last session** | Resume after crash | Low | `localStorage` transcript snapshot |
| **⭐ Highlight** + short note | Anchors for future appends | Low | `{ t, text, note? }` on session |
| **Tags on save** (chips) | Topic library later | Low | `string[]` on note; filter on Notes |
| **“Open follow-ups”** on home | Post-meeting focus | Low | Filter todos where `completed === false` |
| **Meeting title** on save | Find conversations | Low | Editable title field when saving from Listen |
| **Copy AI result** button | Email/minutes | None | Already have AI panel — one button |

**Defer (looks small, grows scope):** full Meeting entity UI, speaker editor, kanban, calendar sync, Ask chat, auto chunk-AI.

**Avoid for now:** separate Notes vs Meetings nav, wiki templates, Notion sync, custom fields per todo.
