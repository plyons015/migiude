# Ude — Installed features (v1)

Privacy-first meeting and voice assistant: capture → transcribe → AI → organize and follow up.  
**Platforms:** Web (Next.js static export) + **Android** (Capacitor).  
**Status:** Phases 0–11 complete (v1) · **On-device voice stack** Phases A–F (Whisper-first).

---

## App screens

| Route | Purpose |
|-------|---------|
| `/` | Redirects to dashboard |
| `/dashboard/` | **Home** — tap/hold mic, iPod transcript, quick todos, daily recap |
| `/listen/` | Deep-link / legacy listen launch (redirects to dashboard patterns) |
| `/archive/` | **Notepad** — saved notes list and editor |
| `/meetings/?id=` | **Meeting room** (7 tabs) |
| `/library/` | Find meetings by tag/topic; series follow-ups; follow-ups board |
| `/people/` | **Friends & Groups** — invite friends, manage groups, generate group invites |
| `/accept/?token=...` | Invite acceptance (group links) |
| `/accept/?kind=friend&token=...&email=...` | Friend invite acceptance (auth-aware) |
| `/settings/` | AI, voice/STT, meetings, privacy, appearance, Android |
| `/help/on-device-modes/` | Guide: tap vs hold, Whisper engines, comparison |
| `/setup/` | Firebase / env setup guide |
| `/onboarding/` | First-run on Android (privacy, mic, notifications) |

---

## On-device voice (Phases A–F)

**Primary UX:** `/dashboard/` mic — **tap = private**, **hold = meeting (cloud)**.

### Tap — on-device (teal mic)

| Engine | When |
|--------|------|
| **Native Whisper** (whisper.cpp) | Android arm64, setting on, JNI built |
| **WASM Whisper** (Transformers.js) | Web, emulator, or native fallback |
| **Web Speech** | Automatic fallback if Whisper cannot start |

- ~3s PCM chunks, ~16 kHz; not word-by-word streaming
- **VAD** — pause transcription on silence (toggle in Settings)
- **Personalization** — custom vocabulary + learned line corrections (IndexedDB)
- **Todo hints** — rule-based “I will…” / “remind me…” banners (no cloud)
- **Multilingual** — recognition language picks `.en` vs multilingual models
- **Session autosave** — transcript backup while capturing (refresh recovery)
- **Wi‑Fi-only** — optional block on first model download

### Hold — meeting mode (violet mic)

- Configurable hold: **3s / 5s / 7s** (Settings → Meeting hold duration)
- Purple ring at **half** the hold time → cloud meeting STT when released after full hold
- **Cloud STT** — Firebase `transcribeAudio`, speaker labels, 8s chunks
- **Haptics** on Android (tap, halfway, meeting start)
- **Local-only mode** — hold starts on-device meeting only; no cloud upload

### Docs

| Phase | Topic |
|-------|--------|
| A | WASM Whisper default — [PHASE1.md](PHASE1.md) |
| B | Tap vs hold UX — [ON_DEVICE_PHASE_B.md](ON_DEVICE_PHASE_B.md) |
| C | VAD, autosave, Wi‑Fi-only — [ON_DEVICE_PHASE_C.md](ON_DEVICE_PHASE_C.md) |
| D | Vocabulary, hints, multilingual — [ON_DEVICE_PHASE_D.md](ON_DEVICE_PHASE_D.md) |
| E | Android native whisper.cpp — [ON_DEVICE_PHASE_E.md](ON_DEVICE_PHASE_E.md) |
| F | Explainers & hold tuning — [ON_DEVICE_PHASE_F.md](ON_DEVICE_PHASE_F.md) |

---

## Listen & voice capture

### Transcription modes (Settings)

| Mode | Behavior |
|------|----------|
| **On-device Whisper** (default tap) | Native (Android) or WASM; VAD; personalization; multilingual |
| **Browser speech** (fallback) | Web Speech API when Whisper cannot start |
| **Meeting mode (cloud STT)** | Hold mic → cloud chunks → Firebase; speaker labels |

### Listen / dashboard features

- Continuous listening with **interim + final** transcript lines
- Line breaks on natural pauses (merged transcript)
- **Wake lock** while listening (screen stays active)
- **Privacy badge** — on-device vs cloud STT
- **Copy transcript** to clipboard (markdown)
- **Quick listen** — save transcript as a note without a meeting
- **Continue last session** — restore transcript + highlights after refresh
- **Highlights** — bookmark lines during capture
- **Fix text** on a line → saves correction for future transcripts
- Capacitor Android mic path + foreground service while recording

### Meeting capture

- **Start meeting** with optional template (1:1, Client call, Standup) or no template
- **End meeting** → canonical note + meeting record
- In-meeting: title, tags, highlights
- Consent reminder copy for shared spaces
- **Commitment awareness** — “I will…” → todos with due times + reminders
- **Voice commands** (when enabled): `add todo: …`, `highlight`, `summarize so far`
- **Rolling summary** (optional) — periodic AI summary during long meetings
- **Smart tags on end** — AI suggests tags before save

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
- **Notepad** label in navigation (Archive)
- **Tags** (chip input), filter list by tag
- Optional transcript, mind map source, highlights
- Link to `meetingId` when from a meeting
- Saved note editor tabs: **Transcript**, **Summary**, **Mind map**

### Todos

- Manual add, toggle complete, delete
- **Due date** + reminders (1h quick-set in UI)
- Status: **open** | **waiting** | **done**
- **topicTag**, **assigneeLabel**
- Link to `noteId` / `meetingId`
- Extract from AI markdown or auto on meeting end
- AI todo extraction dedupe

### Storage

- **IndexedDB** local-first vault
- **Firestore** sync when signed in (unless **local-only mode**)
- Speech personalization DB (vocabulary + corrections)

---

## Meeting room (`/meetings/?id=&tab=`)

Canonical transcript is **read-only**; appends are separate linked notes.

| Tab | Features |
|-----|----------|
| **Transcript** | Segments, rename speakers, reassign lines, highlights |
| **Summary** | Edit or AI-generate summary |
| **Your notes** | Linked appends; jump to line |
| **Script** | Agenda + minutes; AI polish |
| **Follow-ups** | Meeting todos |
| **Topics** | Add/edit; AI suggest |
| **Ask** | Chat scoped to meeting context |

**Export Markdown** — full bundle to clipboard.

---

## Library (`/library/`)

- Filter meetings by **tag**, **topic**, or **open follow-ups only**
- **Series** — open todos from earlier meetings sharing the same tag
- **Follow-ups board** (`?view=board`) — open / waiting / done

---

## Friends, groups, and invites (`/people/`)

- **Friends** — email invite links, accept flow, Firestore sync
- **Groups** — create/edit, assign friends, group invite links
- **Share workspace** — assign `groupId` on notes/meetings (metadata)

---

## Meeting templates

| Template | Tags | Includes |
|----------|------|----------|
| **1:1** | `1:1` | Check-in agenda |
| **Client call** | `client` | Call structure agenda |
| **Standup** | `standup`, `team` | Yesterday / today / blockers |

---

## Dashboard

- **Home mic** — tap/hold capture (primary)
- Quick links: Listen, Notes, Todos, Library
- **Daily recap** — AI brief
- **Open follow-ups**, recent meetings & notes, **due soon**
- iPod carousel (Free plan): greeting + upgrade nudges; swipe todos

---

## Settings

| Section | Options |
|---------|---------|
| **AI model** | Gemini / Grok |
| **Voice & transcription** | Quick vs meeting mode; Whisper tiny/base; pause on silence; Wi‑Fi-only download; **native Whisper (Android)**; **meeting hold 3/5/7s**; on-device todo hints; speech language |
| **Why on-device?** | Comparison table + link to full guide |
| **Speech vocabulary** | Custom terms + learned corrections |
| **Meetings** | Auto AI on end; smart tags; rolling summary; commitments; voice commands |
| **Privacy** | Local-only mode; notifications; clear local data |
| **Appearance** | System / light / dark |
| **Android** | Release notes; FCM hint; replay onboarding |

---

## Android (Capacitor)

| Feature | Details |
|---------|---------|
| **Static web in APK** | `out/` bundled; AI/STT via HTTPS to Firebase |
| **Native Whisper** | whisper.cpp JNI, **arm64-v8a**; GGML download to app storage |
| **Foreground service** | Notification while Listen is active |
| **Local notifications** | Todo due reminders |
| **FCM** | When `google-services.json` present |
| **Onboarding** | Privacy, microphone, notifications |
| **Permissions** | Internet, mic, wake lock, notifications, foreground service |

Build: `npm run cap:sync` → `npm run cap:android`. See [ANDROID_RELEASE.md](ANDROID_RELEASE.md).

---

## Notifications & reminders

- **Web:** polling + Web Notifications API
- **Android:** local notifications for due times; optional FCM
- **Meeting saved** notification after End meeting (Android)

---

## Privacy & security

- Tap path: audio processed **on device** (native or WASM)
- Cloud STT only in **meeting mode** (hold or explicit cloud setting)
- **Local-only mode** — no Firestore sync; cloud STT disabled
- AI keys on **Firebase Functions** only
- **Email/password** + optional **2FA** — [AUTH.md](AUTH.md)

---

## Tech stack (installed)

| Layer | Packages / services |
|-------|---------------------|
| **UI** | Next.js 16, React 19, Tailwind, shadcn/ui |
| **Mobile** | Capacitor 8 |
| **On-device STT** | Transformers.js; whisper.cpp (Android JNI) |
| **Backend** | Firebase Auth, Firestore, Cloud Functions |
| **AI** | Gemini; Grok via Vercel AI SDK |
| **Cloud speech** | MediaRecorder + Gemini multimodal STT |
| **Offline** | IndexedDB vault + personalization store |

---

## Not included (v1 / out of scope)

- Gemini Nano on-device LLM
- iOS native app
- x86 Android native Whisper (use WASM on emulators)
- **Cloud polish on save** (planned) — optional one-time transcript cleanup after saving an on-device note; opt-in + quota; see [ON_DEVICE_PHASE_F.md](ON_DEVICE_PHASE_F.md#planned-later--optional-cloud-polish-on-save)
- Always-on ambient listening
- PWA install prompt (by design)

---

## Integrations

- **Microsoft Teams bot** — scaffold behind `NEXT_PUBLIC_TEAMS_BOT_INTEGRATION_ENABLED`

---

## Admin (operators)

- **`/admin/`** — allowlist operators · [ADMIN.md](ADMIN.md)

---

## Related docs

| Doc | Topic |
|-----|--------|
| [FEATURES.md](FEATURES.md) | This file |
| [PHASES.md](PHASES.md) | Master phase checklist |
| [ROADMAP.md](ROADMAP.md) | Vision & competitors |
| [ON_DEVICE_PHASE_A–F](ON_DEVICE_PHASE_F.md) | Whisper-first rollout |
| [CAPACITOR.md](CAPACITOR.md) | Android dev commands |
| [ANDROID_RELEASE.md](ANDROID_RELEASE.md) | Signed APK |

---

*Last updated: Ude v1 + on-device Phases A–F (Whisper WASM, native Android, explainers).*
