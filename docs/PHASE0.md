# Phase 0 — Base setup

## 1. Firebase project

1. Create or open a project at [Firebase Console](https://console.firebase.google.com/).
2. Add a **Web app** and copy the config into `.env.local` (from `.env.example`).
3. Enable sign-in providers: **Email/Password** (required), **Google** (admin), **Anonymous** (dev only). See **[AUTH.md](AUTH.md)** for 2FA (authenticator + SMS).
4. Create **Firestore** database (production mode; rules in `firestore.rules`).
5. `.firebaserc` default project: **`Ude-app-plyons015`** (display name: Ude).

### CLI login (required for deploy/emulators)

```bash
npx firebase-tools@latest login --reauth
npx firebase-tools@latest use --add YOUR_FIREBASE_PROJECT_ID
```

## 2. Cloud Functions + AI keys

```bash
npm run functions:install
cp functions/.secret.local.example functions/.secret.local
# Add GEMINI_API_KEY to functions/.secret.local (not .env — breaks deploy)
```

Production secret:

```bash
npx firebase-tools@latest functions:secrets:set GEMINI_API_KEY
```

## 3. Local emulators

Full steps: **[docs/EMULATORS.md](EMULATORS.md)** (Spark-friendly, PC browser only).

## 4. Android (Capacitor)

```bash
npm run cap:sync
npm run cap:android
```

## 5. Node.js

- App: Node 20+ works today.
- Capacitor CLI 8 + Functions: **Node 22** recommended (`nvm install 22`).

## Architecture

| Layer | Location |
|-------|----------|
| UI | Next.js static export → Capacitor WebView |
| Data | Firestore (`users/{uid}/…`) |
| AI | `aiProcess` callable — Gemini (Genkit) + Grok (Vercel AI SDK) |

API keys never go in `NEXT_PUBLIC_*` or the APK bundle.
