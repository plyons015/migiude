# Android app crashing — fixes & diagnosis

## Native fixes (Android Studio / Logcat)

These are already in the repo under `android/app/src/main/`:

| Issue | Fix |
|-------|-----|
| `ForegroundServiceDidNotStartInTimeException` | `RecordingForegroundService` calls `startForeground()` with `FOREGROUND_SERVICE_TYPE_MICROPHONE` on API 34+, `FOREGROUND_SERVICE_IMMEDIATE`, and `stopSelf()` on failure |
| Mic FGS without permission | `RecordingForegroundPlugin.start()` rejects if `RECORD_AUDIO` is not granted |
| `BLUETOOTH_CONNECT` | Declared in `AndroidManifest.xml`; requested at launch on API 31+ in `MainActivity` |
| `Default FirebaseApp is not initialized` | See [Firebase / push](#firebase--push-two-valid-setups) below |

**Listen:** Grant microphone when onboarding or system settings ask — then start Listen. The foreground notification should appear while recording.

---

## Firebase / push (two valid setups)

**Path A — No push yet (default, recommended until FCM is set up)**

1. Keep `FirebaseInitProvider` **removed** in `AndroidManifest.xml` (`tools:node="remove"`).
2. Keep `NEXT_PUBLIC_ENABLE_FCM=false` in `.env.local` (or omit it).
3. Rebuild: `npm run cap:sync` → Run in Studio.

Web Firebase (Auth, Firestore, Functions) still works in the WebView. **Do not** call `PushNotifications.register()` — the app already skips it when `ENABLE_FCM` is false.

**Path B — Enable push (FCM)**

1. Add `android/app/google-services.json` from Firebase Console (package `com.migiude.app`).
2. Remove the `<provider … FirebaseInitProvider … tools:node="remove" />` block from `AndroidManifest.xml`.
3. Set `NEXT_PUBLIC_ENABLE_FCM=true` in `.env.local`.
4. `npm run cap:sync` and rebuild.

Do **not** remove the `FirebaseInitProvider` removal **and** leave push enabled without `google-services.json` — that recreates the `IllegalStateException` crash on sign-in.

---

## Most common causes

### 1. Web assets not copied (very common)

The folder `android/app/src/main/assets/public` is **generated** by `cap sync`, not committed to git.

**Fix — every time you change the web app:**

```powershell
cd c:\Users\plyon\Documents\chapappteams\migiude-1
npm run cap:sync
```

Then in Android Studio: **Build → Clean Project**, then **Run** again.

---

### 2. Missing `google-services.json` (push / Firebase native)

The Push Notifications plugin pulls in Firebase Messaging. Without `android/app/google-services.json`, some phones **crash on launch**.

**Fix A (recommended for push):**

1. Firebase Console → Project settings → Your apps → Android  
2. Package name: `com.migiude.app`  
3. Download `google-services.json` → save as `android/app/google-services.json`  
4. Run `npm run cap:sync` and rebuild in Android Studio  

**Fix B (already in repo):** `AndroidManifest.xml` disables `FirebaseInitProvider` until you add that file. Push will not work until Fix A.

---

### 3. See the actual crash (Logcat)

In Android Studio:

1. **View → Tool Windows → Logcat**  
2. Select your phone  
3. Filter: `package:com.migiude.app` or level **Error**  
4. Reproduce the crash and read the red stack trace  

Or with platform tools on PATH:

```powershell
adb logcat -d | Select-String -Pattern "FATAL|AndroidRuntime|migiude"
```

---

## Rebuild checklist

```powershell
npm install
npm run cap:sync
npm run cap:android
```

In Android Studio:

1. **File → Sync Project with Gradle Files**  
2. **Build → Clean Project**  
3. **Run** on device (USB debugging on)  

On the phone: uninstall old **Migiude** first if the crash persists (Settings → Apps → Migiude → Uninstall), then install again from Studio.

---

## App stuck blinking / flashing white

Usually a **redirect loop** between `/` → dashboard → onboarding (fixed in `OnboardingGate` + home page). Rebuild after pulling fixes:

```powershell
npm run cap:sync
```

Then **Clean Project** and **Run** in Android Studio.

If you only see a **spinning loader** on Home, Firebase sign-in may be slow offline — tap **Sign in** or use **Listen** (works without Firebase).

---

## Crash right after Sign in (on dashboard)

Signing in starts **FCM push registration**. Without `android/app/google-services.json`, Android can **hard-crash** (not fixable with JavaScript try/catch).

**Fix (default):** Push is **off** unless you set in `.env.local`:

```env
NEXT_PUBLIC_ENABLE_FCM=false
```

Rebuild: `npm run cap:sync`, then reinstall from Studio.

**To enable push later:**

1. Add `google-services.json` under `android/app/`
2. Set `NEXT_PUBLIC_ENABLE_FCM=true` in `.env.local`
3. `npm run cap:sync` and rebuild

Also enable **Anonymous** sign-in: Firebase Console → Authentication → Sign-in method → Anonymous → Enable.

---

## `ErrnoException: access failed: ENOENT` in Logcat

**What it means:** Something called `access()` on a **file path that does not exist** (errno 2 = ENOENT). On Android this is often **not fatal**.

**Common sources in this app:**

| Source | Harmless? | What to do |
|--------|-----------|------------|
| **Chromium / WebView** | Usually yes | Probing optional cache/font paths; ignore if the app keeps running |
| **Firebase / FCM** (missing `google-services.json`) | Can precede a crash if push runs | Keep `FirebaseInitProvider` removed + `NEXT_PUBLIC_ENABLE_FCM=false` |
| **Missing `assets/public`** after build | No — blank/broken UI | Run `npm run cap:sync` before Studio **Run** |
| **Android Studio debugger** | Yes | `ErrnoException29949_DebugLabel` in the Variables pane is the debugger inspecting an object, not necessarily your crash line |

**Find the real cause:** In Logcat, do not rely on the Variables inspector alone. Filter **Error** and look for:

```
FATAL EXCEPTION
```

Copy 15–20 lines **above** that, including the line with `at com.migiude...` or `chromium` or `Firebase`.

**Quick checks:**

```powershell
Test-Path android\app\src\main\assets\public\index.html   # should be True
Test-Path android\app\google-services.json              # False until you add FCM
```

---

## If it still crashes

Note **when** it crashes:

| When | Likely cause |
|------|----------------|
| Immediately on icon tap | Missing `assets/public`, Firebase native, Gradle/SDK |
| After onboarding | Mic permission / Web Speech |
| When tapping Listen / Start meeting | Mic permission or foreground service — fixed: native mic prompt + FGS only after `listening` state |
| After sign-in | Firestore rules or push register |

Share the **Logcat** lines around `FATAL EXCEPTION` for a targeted fix.

---

## Env on device

`.env.local` is baked in at **build time** (`npm run build` inside `cap:sync`). If Firebase keys were empty when you built, sign-in/AI will fail (usually not a native crash).

After changing `.env.local`:

```powershell
npm run cap:sync
```

Then rebuild the APK.
