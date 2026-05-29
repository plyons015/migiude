# Phase 2 — AI integration

## Architecture

| Provider | Server | Client |
|----------|--------|--------|
| **Gemini** | Genkit + `@genkit-ai/google-genai` in Cloud Functions | `aiService` → `aiProcess` callable |
| **Grok** | Vercel AI SDK + `@ai-sdk/xai` in Cloud Functions | Same callable, `provider: "grok"` |

Keys: `GEMINI_API_KEY` and `XAI_API_KEY` in `functions/.secret.local` (emulators) or Firebase secrets (prod). Do not put them in `functions/.env` — deploy fails if secret names overlap.

## Client API

```ts
import { aiService } from "@/lib/ai";

aiService.setPreferredProvider("grok"); // persisted in localStorage
await aiService.summarize(transcript);
await aiService.extractTodos(transcript);
await aiService.mindMap(transcript); // renders Mermaid on Listen page
```

## Tasks

- `summarize` — short summary
- `extract_todos` — markdown bullet list
- `mind_map` — Mermaid flowchart syntax (rendered in UI)
- `generic` — freeform (`aiService.ask`)

## Test

1. Emulators + `.env.local` (`NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true`)
2. `functions/.secret.local` with API keys (not `functions/.env`)
3. `npm run emulators` and `npm run dev`
4. Open `/listen/` → sign in → speak → pick **Gemini** or **Grok** → run an action

## Deploy secrets

`aiProcess` declares `GEMINI_API_KEY` and `XAI_API_KEY` as function secrets — set them, then deploy (a plain secret in Secret Manager is not enough without redeploy).

```bash
firebase login --reauth
firebase functions:secrets:set GEMINI_API_KEY --project Ude-app-plyons015
# optional:
firebase functions:secrets:set XAI_API_KEY --project Ude-app-plyons015
npm run functions:build
firebase deploy --only functions --project Ude-app-plyons015
```

Enable **Anonymous** auth in Firebase Console before testing AI on device.

## Billing (if AI fails with “credits” / “precondition”)

The function can work while **Gemini** or **Grok** refuses requests:

| Provider | Fix |
|----------|-----|
| **Gemini** | [Google AI Studio](https://aistudio.google.com/) → billing / prepay credits for the project tied to `GEMINI_API_KEY` |
| **Grok (xAI)** | [console.x.ai](https://console.x.ai/) → add credits or raise team spending limit |

Test from Setup → **Test AI (Functions)** after sign-in, or Listen → **Summarize**.

## Callable invoker (if AI shows “internal” / 403)

2nd gen callables must allow **public** Cloud Run invoke. The function sets `invoker: "public"`; if AI still fails after deploy, in [Cloud Run → aiprocess → Permissions](https://console.cloud.google.com/run/detail/us-central1/aiprocess/security?project=Ude-app-plyons015) grant **Cloud Run Invoker** to `allUsers`.
