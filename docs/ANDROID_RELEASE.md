# Android release checklist

## Prerequisites

- Node.js **22+** (see `.nvmrc`)
- Android Studio with SDK 34+
- JDK **21+** for Firebase emulators; **17+** for Gradle builds
- Firebase web config in `.env.local` (see `/setup/`)

## Build steps

```bash
npm run cap:sync
npm run cap:android
```

In Android Studio:

1. **Build → Generate Signed Bundle / APK**
2. Create or use a keystore (store passwords offline)
3. Choose **release** variant
4. Install APK on a physical device and test:
   - Onboarding (first launch)
   - Start meeting → notification “Migiude is listening”
   - End meeting → “Meeting saved” notification
   - Todo due reminder (set due 2 min ahead)
   - Cloud STT if using Meeting mode

## `google-services.json` (push)

Optional for FCM:

1. Firebase Console → Add Android app → package `com.migiude.app`
2. Place `google-services.json` in `android/app/`
3. `npm run cap:sync` and rebuild

Without this file, local notifications and the recording foreground service still work.

## Versioning

Edit `android/app/build.gradle`:

- `versionCode` — increment each Play upload
- `versionName` — user-visible string (e.g. `1.0.0`)

## Play Store (when ready)

- [ ] Privacy policy URL (describe audio/transcript/AI processing)
- [ ] Screenshots (Listen, Meeting room, Library)
- [ ] Data safety form (mic, notifications, optional cloud STT upload)
- [ ] Content rating questionnaire

## Icons

Replace default Capacitor launcher icons under `android/app/src/main/res/mipmap-*` before store submission.

## SSL / corporate network

If Gradle fails with PKIX errors, see [ANDROID_SSL.md](ANDROID_SSL.md).
