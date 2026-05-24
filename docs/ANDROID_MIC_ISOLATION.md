# Android microphone isolation

## What was going wrong

While Listen is active, **other apps can still play audio** (music, podcasts, YouTube). The microphone often picks up that playback, and speech-to-text turns it into transcript lines — it can look like “a background app is being recorded as text.”

Web Speech and cloud STT both ultimately use the device microphone. They cannot fully “block every background app” without system-level privileges.

## What Migiude does now

When you tap the mic on Android:

1. **Audio focus** — requests exclusive playback focus so most music/video apps **pause or duck**.
2. **Voice communication mode** — routes audio for speech capture and turns off speakerphone when it was on (reduces speaker→mic bleed).
3. **Foreground service** — shows “Mic active” so Android is less likely to throttle the app.
4. **Cloud STT** — enables echo cancellation, noise suppression, and mono capture in `getUserMedia`.

If focus cannot be granted, Listen shows a warning to close other media apps.

## What you should still do

| Situation | Action |
|-----------|--------|
| Podcast/music in another app | Stop playback or close that app before Listen |
| Audio still bleeding | Use **wired/Bluetooth headphones** or lower speaker volume |
| Meeting quality | Settings → **Meeting mode (cloud STT)** — better isolation than browser speech on some phones |
| Live Caption / voice typing | Turn off system accessibility voice features while recording |

## Cloud STT: “phantom” transcript lines

If you use **Meeting mode (cloud STT)** and see long sentences you never said (e.g. story or podcast text) after short tests like “testing one two three”, that is usually **not** another app’s audio in the mic. Quiet ~8 second chunks were still sent to Gemini, which sometimes **invented** speech when the clip was mostly silence.

Migiude now **skips silent chunks** before calling the API and uses a stricter STT prompt. Rebuild the app and redeploy `transcribeAudio` functions after updating.

## Limits (normal apps cannot fix)

- Cannot force-quit other installed apps.
- Cannot block physical speaker bleed if volume is loud.
- Cannot guarantee the mic is 100% exclusive on all OEM skins (Samsung, Xiaomi, etc.).

## Code

- `android/.../RecordingAudioSession.java` — audio focus + mode
- `lib/capacitor/recording-foreground.ts` — `beginExclusiveCapture()` / `endExclusiveCapture()`
- `hooks/use-transcription.ts` — called before STT starts

Rebuild the APK after pulling: `npm run cap:sync` then build in Android Studio.
