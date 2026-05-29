import { APP_NAME } from "@/lib/branding/app-name";
import type { KnowledgeBaseArticle } from "@/lib/help/knowledge-base-types";

/** Second knowledge-base article — Android mic bleed and cloud STT quirks. */
export const androidMicIsolationArticle: KnowledgeBaseArticle = {
  slug: "android-mic-isolation",
  title: "Android — mic isolation & clean transcripts",
  summary:
    "Stop other apps, speaker bleed, and phantom lines from polluting Listen on Android.",
  readMinutes: 4,
  sections: [
    {
      heading: "What goes wrong",
      paragraphs: [
        "While Listen is active, music, podcasts, or YouTube can still affect capture. The microphone may pick up playback, and speech-to-text turns it into transcript lines — it can look like a random app is being recorded.",
        "Web Speech and Cloud STT both use the device microphone. Normal apps cannot fully block every other app without system privileges.",
      ],
    },
    {
      heading: `What ${APP_NAME} does on Android`,
      bullets: [
        "Audio focus — most music/video apps pause or duck when you start the mic.",
        "Voice communication mode — better routing for speech; reduces speakerphone bleed when possible.",
        "Foreground service — “Mic active” so Android is less likely to throttle the app.",
        "Cloud STT — echo cancellation, noise suppression, and mono capture in the browser layer.",
      ],
      paragraphs: [
        "If focus cannot be granted, Listen shows a warning — close other media apps and try again.",
      ],
    },
    {
      heading: "What you should do",
      bullets: [
        "Stop podcasts/music or close those apps before Listen.",
        "Use wired or Bluetooth headphones, or lower speaker volume if you hear bleed.",
        "Settings → Meetings → Cloud STT — speakers for meeting capture (not browser speech on noisy phones).",
        "Turn off Live Caption / system voice typing while recording.",
        "On video calls, read the Teams/Zoom/Meet guide (headphones + Cloud STT).",
      ],
    },
    {
      heading: "“Phantom” lines with Cloud STT",
      paragraphs: [
        "Long sentences you never said after a quiet test (e.g. “testing one two three”) are usually not another app in the mic. Very quiet chunks were sent to the cloud model, which sometimes invented speech on near-silence.",
        `${APP_NAME} skips silent chunks before upload and uses a strict STT prompt. If you still see this after an app update, retry on a louder test or redeployed cloud functions.`,
      ],
    },
    {
      heading: "Limits",
      bullets: [
        "Cannot force-quit other installed apps.",
        "Cannot block loud physical speaker bleed.",
        "Some phone brands (Samsung, Xiaomi, etc.) handle audio focus differently.",
      ],
    },
    {
      heading: "Developers",
      paragraphs: [
        "After pulling mic-isolation changes: npm run cap:sync, then rebuild the APK in Android Studio. Cloud STT changes also require deploying the transcribeAudio function.",
      ],
    },
  ],
};
