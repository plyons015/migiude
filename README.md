# migiude

Privacy-first voice AI assistant.

Built as web app (Next.js) for easy development, wrapped as Android app via Capacitor.

No PWA features — focused on native Android experience.

## Android (Capacitor)

```bash
npm run cap:sync      # build static site + sync to android/
npm run cap:android   # open Android Studio
```

See [docs/CAPACITOR.md](docs/CAPACITOR.md).

## Phase 0 setup

1. Copy `.env.example` → `.env.local` and add Firebase web config.
2. Copy `functions/.env.example` → `functions/.env` and add `GEMINI_API_KEY`.
3. Enable **Anonymous** auth in Firebase Console.
4. `npm run emulators` + `npm run dev` (set `NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true`).

Full checklist: [docs/PHASE0.md](docs/PHASE0.md).

## Phase 1 — Listen mode

Voice transcription at [/listen/](http://localhost:3000/listen/). See [docs/PHASE1.md](docs/PHASE1.md).

## Phase 2 — AI (Gemini + Grok)

Unified `aiService` via Firebase Functions. See [docs/PHASE2.md](docs/PHASE2.md).

## Phase 3 — Notes, todos, dashboard

Dashboard at `/dashboard/`. Firestore + IndexedDB. See [docs/PHASE3.md](docs/PHASE3.md).

## Phase 4 — Settings & UI polish

shadcn/ui, `/settings/` (AI, voice, privacy, theme). See [docs/PHASE4.md](docs/PHASE4.md).

## Phase 5 — Quick wins ✅

Tags, highlights, copy, session restore, open follow-ups. See [docs/PHASE5.md](docs/PHASE5.md).

## Phase 6 — Meeting sessions ✅

Start/End meeting, canonical note, auto AI on end, recent meetings. See [docs/PHASE6.md](docs/PHASE6.md).

## Phase 7 — Live AI & voice commands ✅

Rolling summary, smart tags, voice commands, daily recap. See [docs/PHASE7.md](docs/PHASE7.md). **Redeploy functions** for new AI tasks.

## Full feature list

**[docs/FEATURES.md](docs/FEATURES.md)** — everything installed in v1.

## Phases 0–11 (complete)

**[docs/PHASES.md](docs/PHASES.md)** — master plan · [docs/ROADMAP.md](docs/ROADMAP.md) — vision & competitors