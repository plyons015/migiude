# Android — mic isolation & clean transcripts

> In-app: **Help → Guide** or [/help/android-mic-isolation/](/help/android-mic-isolation/).  
> Source of truth: `lib/help/articles/android-mic-isolation.ts`.

See also `docs/ANDROID_MIC_ISOLATION.md` for engineering notes.

## Summary

- Close other media apps before Listen.
- Use headphones on calls; prefer **Cloud STT** for meetings.
- Phantom long lines on silence = cloud hallucination; silent chunks are skipped in current builds.

Rebuild Android after native audio changes: `npm run cap:sync` → Android Studio.
