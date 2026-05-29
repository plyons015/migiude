# On-device phases — E: Native Android Whisper (whisper.cpp)

**Follows:** [Phase D](ON_DEVICE_PHASE_D.md)

**Goal:** Run Whisper on-device via **whisper.cpp** on arm64 Android (Capacitor), with automatic fallback to WASM in the WebView and Web Speech as last resort.

---

## What shipped

| Item | Path |
|------|------|
| JNI + CMake (whisper.cpp v1.7.4) | `android/app/src/main/cpp/` |
| Capacitor plugin | `android/.../whisper/WhisperNativePlugin.java` |
| Model download (GGML) | `WhisperModelDownloader.java` |
| AudioRecord + chunk loop | `WhisperNativeSession.java` |
| TS bridge | `lib/capacitor/whisper-native.ts` |
| STT hook (native → WASM) | `hooks/use-whisper-stt.ts` |
| Engine label `whisper-native` | `lib/speech/types.ts`, `use-local-transcription.ts` |
| GGML URLs | `lib/speech/whisper-models.ts` |
| Setting: prefer native | Settings → **Native Whisper (Android)** |

## Behavior

### When native runs

1. User taps mic with quick mode **on-device**.
2. On **Android** + **prefer native** enabled + **arm64-v8a** device + JNI library loaded → `WhisperNative.loadModel` then `start`.
3. Model file is downloaded once to app storage (same Wi‑Fi-only rule as WASM).
4. Transcripts arrive on the `transcript` plugin event; personalization still applies in JS.

### Fallback chain

```
Native whisper.cpp (arm64 APK)
  → WASM Whisper worker (browser / emulator / native failed)
    → Web Speech API
```

### Build notes

- **ABI:** `arm64-v8a` only in `android/app/build.gradle` (smaller APK; x86 emulators report `isAvailable: false`).
- **First native build:** CMake FetchContent downloads whisper.cpp — can take several minutes and needs network.
- **Sync:** `npm run cap:sync` then open Android Studio or `npx cap run android`.

### Web / hosting

Hosting deploy is unchanged. Native code is not used on `https://…web.app`; users get Phase A–D WASM behavior in the browser.

## Verify on device

1. Install debug/release APK on a physical arm64 phone.
2. Settings → enable **Native Whisper (Android)**.
3. Tap mic → status should show **Listening · native Whisper** (or **Loading native model…** first run).
4. On emulator: expect WASM or browser speech; native is intentionally unavailable.

## Out of scope (this phase)

- Gemini Nano on-device LLM
- iOS native Whisper
- x86 / 32-bit ABIs

## Next — Phase F

See [Phase F](ON_DEVICE_PHASE_F.md): in-app “why on-device” explainer, meeting hold duration setting, and updated feature docs.
