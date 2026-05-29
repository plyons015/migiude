# Debug Ude Android from Cursor

## Why you don’t see “Workspace Recommendations”

That banner only appears when:

1. You opened the **project root** folder: `Ude-1` (not only `android/`).
2. Cursor read `.vscode/extensions.json`.
3. At least one recommended extension exists in **Cursor’s** marketplace (many Android-only extensions do **not**).

To see recommendations manually:

- Extensions (**Ctrl+Shift+X**) → search: `@recommended`
- Or **Ctrl+Shift+P** → `Extensions: Show Recommended Extensions`

If the list is empty or tiny, that’s normal — Cursor does not ship most VS Code Android/logcat extensions.

---

## What actually works in Cursor (no special Android extension)

### A. Run the app on your phone

Terminal in Cursor:

```powershell
cd c:\Users\plyon\Documents\chapappteams\Ude-1
npm run cap:sync
npm run cap:run:android
```

Or **Ctrl+Shift+P** → **Tasks: Run Task** → **Android: run on device**

### B. Watch crashes (logcat)

Phone plugged in, USB debugging on. Terminal:

```powershell
adb devices
adb logcat -c
adb logcat *:E
```

Or run task: **Android: logcat (Ude errors)**

Reproduce the crash on the phone; copy lines with `FATAL EXCEPTION`.

### C. Debug the UI (Listen, sign-in, dashboard)

This is a **WebView** app — use **Chrome**, not a Cursor Android extension:

1. App running on phone.
2. PC Chrome → `chrome://inspect/#devices`
3. Click **inspect** under `com.Ude.app`
4. Use **Console** / **Network** like a website.

---

## Extensions that *may* install in Cursor

Search Extensions (**Ctrl+Shift+X**) for these exact names (availability varies):

| Search term | Publisher / ID | Purpose |
|-------------|----------------|---------|
| **Extension Pack for Java** | `vscjava.vscode-java-pack` | Edit Java under `android/` (installs via CLI on many machines) |
| **Gradle for Java** | `vscjava.vscode-gradle` | Gradle tasks in sidebar |

Install from terminal (if search fails):

```powershell
cursor --install-extension vscjava.vscode-java-pack
cursor --install-extension vscjava.vscode-gradle
```

**Not available in Cursor** (tested / common): Android Auto Logcat, Android Debug Bridge, Android iOS Emulator, VSC Logcat — they exist on [marketplace.visualstudio.com](https://marketplace.visualstudio.com) but Cursor’s store often returns “not found”.

---

## Use Android Studio when Cursor isn’t enough

- Broken run configuration (“no runners for app2”)
- Native Java crashes / `RecordingForegroundService`
- SDK / Gradle wizard

Keep Studio for the native shell; use **Cursor terminal + Chrome inspect** for everyday app debugging.

---

## “Npm task detection: failed to parse package.json”

Your `package.json` is **valid** (Node can read it). That message is usually from the **Java extension** misfiring on Windows — it is **safe to ignore**.

This repo sets `"npm.autoDetect": "off"` in `.vscode/settings.json` to stop the noise.

Use **Tasks: Run Task** (our `tasks.json` shell tasks) or the terminal — not the broken auto-detected npm list.

**Reload:** Ctrl+Shift+P → **Developer: Reload Window**

---

## Run / Debug buttons greyed out (“Module not specified”)

Studio will not enable ▶ or 🐛 until **all** of this is true:

1. **Open the right folder** — `Ude-1\android` (not the parent `Ude-1` folder).
2. **Gradle sync finished** — bottom status bar: no “Sync failed”; elephant icon done.
   - **File → Sync Project with Gradle Files**
   - First time can take several minutes; needs internet.
3. **Run configuration**
   - **Run → Edit Configurations** → **app** (delete **app2** if it exists).
   - **Module:** pick **`app`** from the dropdown (if empty, sync failed — fix step 2).
   - **Launch:** Default Activity.
4. **Device selected** — toolbar device dropdown: your **phone** (USB debugging on) or an **emulator**.  
   If empty: plug in phone → `adb devices` → or **Device Manager** → create/start a virtual device.

When the module and device are set, ▶ and 🐛 turn green.

**Bypass Studio:** from repo root:

```powershell
npm run cap:run:android
```

---

## Fix Android Studio run config (`app2`)

If you only see **app2** or get “no runners for Android App”:

1. **Close Android Studio**
2. In File Explorer, delete (if present):  
   `android\.idea\workspace.xml`  
   (Studio recreates it; this clears broken local configs.)
3. **Reopen** the `android` folder:  
   `npm run cap:android`  
   or **File → Open** → `Ude-1\android`
4. **Run → Edit Configurations** → select **app2** → click **−** to delete
5. You should see **app** (from `android/.idea/runConfigurations/app.xml`).  
   Module: **android.app**, Launch: **Default Activity**
6. Toolbar dropdown → **app** → green **Run** ▶

**Skip Studio entirely:** `npm run cap:run:android` from the project root.

---

## Quick checklist

| Step | Tool |
|------|------|
| Build web into APK | `npm run cap:sync` |
| Install on phone | `npm run cap:run:android` or Studio **Run** |
| JS errors | Chrome `chrome://inspect` |
| Native crash | `adb logcat` or task **Android: logcat** |
| Java/Gradle in editor | Extension Pack for Java (optional) |
