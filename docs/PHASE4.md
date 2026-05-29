# Phase 4 — Polish & settings

## UI (shadcn/ui)

- `components/ui/` — Button, Card, Switch, Select, Label, Badge, Separator
- Design tokens in `app/globals.css` (light/dark via `.dark` on `<html>`)

## Settings (`/settings/`)

| Section | Controls |
|---------|----------|
| **AI** | Gemini / Grok default provider |
| **Voice** | Web Speech language (en-US, es-ES, …) |
| **Privacy** | Local-only mode, todo reminders, clear IndexedDB |
| **Appearance** | System / light / dark theme |
| **Android** | Signed APK build notes |

## Local-only mode

When enabled, notes and todos are stored only in **IndexedDB** on the device — no Firestore sync.

## Release APK (Android Studio)

1. `npm run cap:sync`
2. `npm run cap:android`
3. **Build → Generate Signed Bundle / APK**
4. Create or use a keystore; keep passwords safe

Optional: add `android/app/google-services.json` when using FCM (Phase 5).

## Capacitor branding

- App name: `Ude` in `capacitor.config.ts` and `android/app/src/main/res/values/strings.xml`
- Replace default launcher icons in `android/app/src/main/res/mipmap-*` before store release
