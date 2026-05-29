import { APP_NAME } from "@/lib/branding/app-name";
import type { KnowledgeBaseArticle } from "@/lib/help/knowledge-base-types";

/** First knowledge-base article — optimize capture on Teams, Zoom, Google Meet. */
export const teamsZoomMeetArticle: KnowledgeBaseArticle = {
  slug: "teams-zoom-meet",
  title: "Teams, Zoom & Google Meet — best results",
  summary:
    "How to get clear transcripts and speaker labels when you record alongside a video call.",
  readMinutes: 6,
  sections: [
    {
      heading: `What ${APP_NAME} records`,
      paragraphs: [
        `On the web and in the app, Listen uses your microphone — not the meeting platform’s internal mixed audio. Teams, Zoom, and Meet hear everyone on their servers; ${APP_NAME} only hears what your mic picks up.`,
        `That is different from Otter or a meeting bot that joins the call. Those tools get a cleaner multi-participant feed. ${APP_NAME} is built for privacy-first capture on your device, with optional cloud transcription for speaker labels.`,
      ],
    },
    {
      heading: "Recommended setup (closest to Otter / Teams quality)",
      bullets: [
        "Settings → Meetings → Cloud STT — speakers (sign in; turn off local-only mode).",
        "Use wired or Bluetooth headphones for the call so remote voices do not blast into your mic.",
        "Each participant joins the call from their own device when you need everyone’s words captured.",
        "Turn on the platform’s own live transcript or recording as a backup for who said what.",
        "Speak in clear turns with a brief pause — helps both words and speaker labels.",
        "Pick English (US) or English (UK) in Settings; mixed accents are supported but not perfect per person.",
      ],
    },
    {
      heading: "Headphones: the tradeoff",
      paragraphs: [
        "Headphones greatly improve clarity and stop echo cancellation from stripping remote voices — but they also mean your mic may record mostly you, not the room.",
        `For a full three-person transcript on one laptop, combine ${APP_NAME} (your notes + highlights) with the platform transcript, or have each person capture on their device.`,
        "Open speakers without headphones often puts all voices in the mic (muddy) — you may see one speaker label or poor accuracy for remote accents.",
      ],
    },
    {
      heading: "Web browser + video call",
      bullets: [
        "Chrome or Edge on desktop usually work best for Cloud STT.",
        "Allow microphone permission for this site only.",
        "Close music or podcasts — Android pauses other apps while the mic is on; desktop can still bleed.",
        "Do not expect the browser to capture “system audio” unless you use a loopback device you chose as the mic (advanced; quality varies).",
      ],
    },
    {
      heading: "Mixed English accents",
      paragraphs: [
        "British, Nigerian, US Southern, and other English varieties are all one language to the model. Choose the closest language setting; Cloud STT is usually more accent-tolerant than browser speech.",
        "Rename Speaker 1 / 2 / 3 in the meeting Transcript tab after the call.",
      ],
    },
    {
      heading: "Speaker labels",
      paragraphs: [
        "Cloud STT assigns speaker IDs per short audio segment. Overlapping talk, speakerphone bleed, or heavy compression (typical on calls) makes “who said what” harder — not a separate dialect mode.",
        "Browser speech mode does not split speakers.",
      ],
    },
    {
      heading: "Workflow we suggest",
      bullets: [
        "Before: Cloud STT for meetings, headphones, notify participants if required.",
        "During: Start meeting in Listen; add highlights on key moments.",
        "After: End meeting → review in Meetings; fix speaker names; use AI summary on the transcript.",
        "Optional: Paste or compare with Teams / Zoom / Meet official transcript for missing lines.",
      ],
    },
    {
      heading: "Limits (honest)",
      bullets: [
        "No user search or meeting bot in v1 — invite links for groups, not Otter-style join.",
        "One mic cannot match three separate studio tracks.",
        "Very noisy rooms, crosstalk, or all three on one speakerphone will stay challenging.",
      ],
    },
  ],
};
