# Migiude — Installed features (v1)

Privacy-first meeting and voice assistant: capture → transcribe → AI → organize and follow up.  
**Platforms:** Web (Next.js static export) + **Android** (Capacitor).  
**Status:** Phases 0–11 complete (v1).

---

## App screens

| Route | Purpose |
|-------|---------|
| `/` | Redirects to dashboard |
| `/dashboard/` | Home — quick actions, daily recap, open follow-ups, recent meetings & notes |
| `/listen/` | Voice capture, meetings, live transcript, AI actions |
| `/notes/` | Notes list, editor, todos tab, filter by tag |
| `/meetings/?id=` | **Meeting room** (7 tabs) |
| `/library/` | Find meetings by tag/topic; series follow-ups; follow-ups board |
| `/settings/` | AI, voice/STT, meetings, privacy, appearance, Android |
| `/setup/` | Firebase / env setup guide |
| `/onboarding/` | First-run on Android (privacy, mic, notifications) |

---

## Listen & voice capture

### Transcription modes (Settings)

| Mode | Behavior |
|------|----------|
| **Browser speech** (default) | Web Speech API — no audio leaves device; best for quick notes |
| **Meeting mode (cloud STT)** | ~8s audio chunks → Firebase `transcribeAudio` → Gemini; speaker labels; works on many networks where browser speech fails |

### Listen features

- Continuous listening with **interim + final** transcript lines
- Line breaks on natural pauses (merged transcript)
- **Wake lock** while listening (screen stays active)
- **Privacy badge** — browser: “Audio discarded”; cloud: “Cloud STT”
- **Copy transcript** to clipboard (markdown)
- **Quick listen** — save transcript as a note without a meeting
- **Continue last session** — restore transcript + highlights after refresh (`localStorage`)
- **Highlights** — bookmark lines during capture (optional note); saved on note/meeting
- Capacitor Android mic path (no redundant `getUserMedia` preflight)

### Meeting capture

- **Start meeting** with optional template (1:1, Client call, Standup) or no template
- **End meeting** → canonical note + meeting record (transcript never overwritten by appends later)
- In-meeting: title, tags, highlights
- Consent reminder copy for shared spaces
- **Commitment awareness** — detects “I will…” phrases → todos with due times + reminders
- **Voice commands** (when enabled): `add todo: …`, `highlight`, `summarize so far`
- **Rolling summary** (optional) — periodic AI summary during long meetings
- **Smart tags on end** — AI suggests tags before save (user confirms)

---

## AI (Firebase Functions)

API keys live in **Secret Manager** / `functions/.secret.local` — never in the client bundle.

### Callable: `aiProcess`

| Task | Use |
|------|-----|
| `summarize` | Meeting/note summary |
| `extract_todos` | Bullet list of action items |
| `mind_map` | Mermaid flowchart from text |
| `suggest_tags` | Tag suggestions on meeting end |
| `daily_recap` | Morning-brief style recap on dashboard |
| `detect_commitments` | First-person promises → JSON todos + due times |
| `suggest_topics` | Discussion topics for meeting room |
| `meeting_minutes` | Polished minutes from agenda + transcript |
| `generic` | Ask AI / meeting-scoped Q&A |

**Providers:** Gemini (default), Grok — selectable in Settings.

### Callable: `transcribeAudio`

- Cloud STT with **speaker diarization** (Speaker 1, 2, …)
- Uses `GEMINI_API_KEY`

---

## Notes & todos

### Notes

- Create, edit, delete notes
- Sources: manual, listen, meeting
- **Tags** (chip input), filter list by tag
- Optional transcript, mind map source, highlights
- Link to `meetingId` when from a meeting

### Todos

- Manual add, toggle complete, delete
- **Due date** + reminders (1h quick-set in UI)
- Status: **open** | **waiting** | **done** (meeting follow-ups)
- **topicTag**, **assigneeLabel** (e.g. Speaker 2)
- Link to `noteId` / `meetingId`
- Extract from AI markdown on Listen or auto on meeting end

### Storage

- **IndexedDB** local-first vault (notes, todos, meetings, appends)
- **Firestore** sync when signed in (unless **local-only mode**)
- Collections: `users/{uid}/notes`, `todos`, `meetings`, `meetingAppends`, `private/fcm`

---

## Meeting room (`/meetings/?id=&tab=`)

Canonical transcript is **read-only**; appends are separate linked notes.

| Tab | Features |
|-----|----------|
| **Transcript** | Parsed segments, rename speakers, reassign lines, view canonical block, highlights |
| **Summary** | Edit or AI-generate summary |
| **Your notes** | Linked **appends** with optional anchor (transcript line, topic, highlight); jump to line |
| **Script** | Agenda (before) + minutes/narrative (after); AI polish minutes |
| **Follow-ups** | Meeting todos — add, edit, status, topic, assignee |
| **Topics** | Add/edit topics; AI suggest from transcript |
| **Ask** | Chat scoped to transcript + summary + appends + open todos |

**Export Markdown** — full bundle to clipboard (transcript, summary, minutes, topics, follow-ups, appends).

---

## Library (`/library/`)

- Filter meetings by **tag**, **topic**, or **open follow-ups only**
- **Series** — open todos from earlier meetings sharing the same tag
- **Follow-ups board** (`?view=board`) — three columns: open / waiting / done

---

## Meeting templates

| Template | Tags | Includes |
|----------|------|----------|
| **1:1** | `1:1` | Check-in agenda |
| **Client call** | `client` | Call structure agenda |
| **Standup** | `standup`, `team` | Yesterday / today / blockers |

Sets default title, tags, and agenda on **Start meeting**.

---

## Dashboard

- Quick links: Listen, Notes, Todos, Library
- **Daily recap** — AI brief from yesterday’s meetings + open todos
- **Open follow-ups** card
- **Recent meetings** → meeting room
- **Recent notes**
- **Due soon** todos

---

## Settings

| Section | Options |
|---------|---------|
| **AI model** | Gemini / Grok |
| **Voice & transcription** | Browser vs cloud STT; speech language (en-US, en-GB, es, fr, de, ja) |
| **Meetings** | Auto AI on end; smart tags on end; rolling summary interval; commitment awareness; voice commands |
| **Privacy** | Local-only mode; todo reminders; clear local data |
| **Appearance** | System / light / dark theme |
| **Android** | Release notes; FCM setup hint; replay onboarding |

---

## Android (Capacitor)

| Feature | Details |
|---------|---------|
| **Static web in APK** | `out/` bundled; AI/STT via HTTPS to Firebase |
| **Foreground service** | Persistent notification while Listen is active |
| **Local notifications** | Scheduled todo due reminders on device |
| **FCM registration** | Token saved when `android/app/google-services.json` is present |
| **Onboarding** | First launch: privacy, microphone, notifications |
| **Permissions** | Internet, mic, wake lock, notifications, foreground service (microphone type) |
| **Back button** | History back or exit app |

Build: `npm run cap:sync` → `npm run cap:android` → signed APK. See [ANDROID_RELEASE.md](ANDROID_RELEASE.md).

---

## Notifications & reminders

- **Web:** polling + Web Notifications API (browser)
- **Android:** `@capacitor/local-notifications` for due times; optional FCM push when configured
- **Meeting saved** local notification after End meeting (Android)
- Toggle in Settings; permission requested in onboarding

---

## Privacy & security

- No long-term **audio storage** in browser mode
- Cloud STT: short chunks sent for transcription, not retained server-side (per product copy)
- **Local-only mode** — IndexedDB only, no Firestore sync; forces browser speech
- AI keys only on **Firebase Functions** (Blaze + billing)
- **Email/password** sign-in with optional **2FA** (authenticator TOTP + SMS backup) — see [AUTH.md](AUTH.md)
- Anonymous sign-in dev-only (`NEXT_PUBLIC_ALLOW_ANONYMOUS=true`)

---

## Tech stack (installed)

| Layer | Packages / services |
|-------|---------------------|
| **UI** | Next.js 16, React 19, Tailwind, shadcn/ui, Lucide |
| **Mobile** | Capacitor 8 (App, Splash, Status Bar, Local Notifications, Push Notifications) |
| **Backend** | Firebase Auth, Firestore, Cloud Functions (Node 22) |
| **AI** | Gemini via Generative Language API; Grok via Vercel AI SDK |
| **Speech** | Web Speech API; cloud: MediaRecorder + Gemini multimodal |
| **Charts** | Mermaid (mind maps) |
| **Offline** | IndexedDB vault (custom, v2 schema with appends) |

---

## Not included (v1 / out of scope)

- Team workspaces, sharing, permissions
- Notion / Monday two-way sync
- Full project management (Gantt, capacity, CRM)
- Calendar integration (planned v2)
- Always-on ambient background listening - Never to be included due to HIPAA COncerns
- iOS app (Android-focused v1)
- PWA install prompt (by design) - Never to be included

---

## Admin (operators)

- Web dashboard: **`/admin/`** — Google sign-in + email allowlist
- See **[ADMIN.md](ADMIN.md)** for setup, callables, and Stripe roadmap

---

## Related docs

| Doc | Topic |
|-----|--------|
| [ADMIN.md](ADMIN.md) | Admin dashboard setup & security |
| [PHASES.md](PHASES.md) | Master phase checklist |
| [ROADMAP.md](ROADMAP.md) | Vision & competitors |
| [PHASE0.md](PHASE0.md)–[PHASE11.md](PHASE11.md) | Per-phase implementation notes |
| [CAPACITOR.md](CAPACITOR.md) | Android dev commands |
| [NETWORK_TROUBLESHOOTING.md](NETWORK_TROUBLESHOOTING.md) | Starlink, Web Speech, cloud STT |
| [ANDROID_RELEASE.md](ANDROID_RELEASE.md) | Signed APK & Play checklist |

---

*Last updated: Migiude v1 (Phases 0–11).*
