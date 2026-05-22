# Capacitor (Android)

Migiude ships as a static Next.js export in `out/`, wrapped by Capacitor for Android.

## Gradle SSL error (PKIX / certification path)

See **[docs/ANDROID_SSL.md](ANDROID_SSL.md)**. Do **not** use `Windows-ROOT` if your JDK reports `Windows-ROOT not found` — import the company CA with `keytool` or use an unrestricted network.

## AGP version

This project uses **Android Gradle Plugin 8.10.1** to match Android Studio’s supported range. If Studio reports a newer AGP is unsupported, do not upgrade `com.android.tools.build:gradle` past 8.10.1 until you update Android Studio.

## Prerequisites

- **Node.js 22+** (required by Capacitor CLI 8). With nvm: `nvm use` in the project root (see `.nvmrc`).
- [Android Studio](https://developer.android.com/studio) with SDK 34+
- JDK 17+

## Commands

| Script | What it does |
|--------|----------------|
| `npm run build:web` | `next build` → writes `out/` |
| `npm run cap:sync` | Build web + `cap sync` (copy + update native deps) |
| `npm run cap:android` | Sync + open Android Studio |
| `npm run cap:run:android` | Sync + run on device/emulator |

## First-time / after web changes

```bash
npm run cap:sync
npm run cap:android
```

**App crashes on open?** See [ANDROID_CRASH_FIX.md](ANDROID_CRASH_FIX.md) (usually need `cap:sync` or `google-services.json`).

**Debug from Cursor?** See [ANDROID_DEBUG_CURSOR.md](ANDROID_DEBUG_CURSOR.md) (extensions + logcat + Chrome inspect).

Build APK in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Live reload (optional dev)

1. `npm run dev`
2. Uncomment `server.url` in `capacitor.config.ts` with your machine's LAN IP.
3. `npx cap run android`

## Microphone (Phase 1)

`RECORD_AUDIO` is declared in `android/app/src/main/AndroidManifest.xml`. Grant the permission at runtime before starting Web Speech / mic capture.

## Architecture note

`output: 'export'` means **no Next.js server** inside the APK. Genkit, `GEMINI_API_KEY`, and `XAI_API_KEY` must run on a backend (Firebase Functions, hosted API routes on Vercel/Firebase App Hosting, etc.), not in the static bundle.
