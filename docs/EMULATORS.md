# Local emulators (PC testing, Spark / no Blaze)

Run Auth, Firestore, and **AI Functions** on your machine. The Android APK always talks to **production** Firebase unless you use a dev server URL — this guide is for **Chrome at localhost**.

## Prerequisites

- **JDK 21+** (Firestore emulator). Firebase CLI rejects Java 17.
  - Install: `winget install EclipseAdoptium.Temurin.21.JDK`
  - Set **JAVA_HOME** to the JDK 21 folder (e.g. `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`), then open a **new** terminal.
  - Check: `java -version` should show `21` or higher.
- Node **22+** (`nvm use` in project root)
- Firebase CLI logged in: `firebase login`
- Project: `migiude-app-plyons015` (`.firebaserc`)
- **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey) (free tier is fine)

```bash
npm run functions:install
```

## 1. Functions AI keys (local only)

Use **`.secret.local`** only (not `functions/.env`). If `GEMINI_API_KEY` is in `.env`, `firebase deploy` fails with “secret overlaps non secret”.

```bash
cp functions/.secret.local.example functions/.secret.local
```

Edit `functions/.secret.local`:

```
GEMINI_API_KEY=AIza...your-key-from-ai-studio
XAI_API_KEY=
```

`XAI_API_KEY` is optional (only for Grok). Never commit `.secret.local`.

Production deploy uses Secret Manager:

```bash
firebase functions:secrets:set GEMINI_API_KEY --project migiude-app-plyons015
```

## 2. Point the web app at emulators

In **`.env.local`** set:

```
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=true
```

Keep your existing `NEXT_PUBLIC_FIREBASE_*` values (same Firebase project id).

## 3. Run (two terminals)

**Terminal A — emulators** (leave running):

```bash
npm run emulators
```

Wait until you see:

- Auth Emulator: `127.0.0.1:9099`
- Functions Emulator: `127.0.0.1:5001`
- Firestore Emulator: `127.0.0.1:8080`
- Emulator UI: http://127.0.0.1:4000

**Terminal B — Next.js**:

```bash
npm run dev
```

Open **http://localhost:3000**

## 4. Test AI

1. **http://localhost:3000/setup/** → **Sign in (anonymous)**  
   (Emulator Auth does not need Console “Anonymous” enabled, but it’s fine if it is.)
2. **Test AI (Functions)** on Setup, or  
3. **http://localhost:3000/listen/** → speak → **Summarize** (Gemini).

## 5. Turn off emulators (production / phone again)

In `.env.local`:

```
NEXT_PUBLIC_FIREBASE_USE_EMULATORS=false
```

Restart `npm run dev`. Use `npm run cap:sync` + Android Studio for the APK (cloud Functions need **Blaze** + secrets).

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `GEMINI_API_KEY is not set` | Add key to `functions/.secret.local`, restart emulators |
| Deploy: secret overlaps non secret | Remove `GEMINI_API_KEY` / `XAI_API_KEY` from `functions/.env`; use `.secret.local` + `functions:secrets:set` |
| `ECONNREFUSED` / network | Emulators not running — start Terminal A first |
| AI works on PC but not phone | Expected — phone uses cloud unless you configure Capacitor dev server URL |
| Emulator won’t start | `npm run functions:build` then retry `npm run emulators` |
| Port in use | Stop other emulator instances or change ports in `firebase.json` |

## What Spark (free) allows here

- **Emulators on your PC**: OK (no Blaze required for local testing)
- **Deployed Cloud Functions** (phone / production AI): requires **Blaze** plan
