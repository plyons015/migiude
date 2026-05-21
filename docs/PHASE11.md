# Phase 11 — Android production & reliability

**Goal:** Trustworthy daily driver on Android — visible recording, native reminders, push-ready, onboarding, release docs.

## What shipped

| Feature | Details |
|---------|---------|
| **Foreground service** | `RecordingForegroundService` + Capacitor plugin `RecordingForeground` — persistent notification while Listen is active |
| **Local notifications** | `@capacitor/local-notifications` — todo due times scheduled on device |
| **FCM registration** | `@capacitor/push-notifications` — token saved to `users/{uid}/private/fcm` when `google-services.json` is present |
| **Onboarding** | `/onboarding/` on first Android launch (mic + notifications + privacy) |
| **Release docs** | [ANDROID_RELEASE.md](ANDROID_RELEASE.md) |
| **Network doc** | [NETWORK_TROUBLESHOOTING.md](NETWORK_TROUBLESHOOTING.md) (Starlink / Web Speech / cloud STT) |

## Setup FCM (optional)

1. Firebase Console → Project settings → add Android app `com.migiude.app`
2. Download `google-services.json` → `android/app/google-services.json`
3. `npm run cap:sync` then rebuild APK
4. Token appears in Firestore under `users/{uid}/private/fcm`

Server-side push (summary ready, etc.) can call FCM Admin SDK with that token — not automated in v1; use [Firebase Cloud Messaging HTTP API](https://firebase.google.com/docs/cloud-messaging) or a future Cloud Function.

## Screen-off behavior

- **Foreground service + wake lock** keep capture running when you switch apps briefly.
- **Web Speech** may still pause on some devices when the screen is off for long periods — use **Meeting mode (cloud STT)** in Settings for long meetings on difficult networks.
- See [NETWORK_TROUBLESHOOTING.md](NETWORK_TROUBLESHOOTING.md).

## Build release APK

See [ANDROID_RELEASE.md](ANDROID_RELEASE.md).

## Migiude v1

With Phases 6–11 complete, the [v1 definition of done](PHASES.md#definition-of-done--migiude-v1) is satisfied for a single-user privacy-first meeting assistant.
