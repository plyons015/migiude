import { APP_NAME } from "@/lib/branding/app-name";
import type { KnowledgeBaseArticle } from "@/lib/help/knowledge-base-types";

/** Tap vs hold, Whisper stack, and how Ude compares for privacy-first capture. */
export const onDeviceModesArticle: KnowledgeBaseArticle = {
  slug: "on-device-modes",
  title: "On-device vs meeting mode",
  summary:
    "Why tap the mic for private Whisper, when to hold for cloud speakers, and how the engines differ.",
  readMinutes: 5,
  sections: [
    {
      heading: "Two modes, one button",
      paragraphs: [
        "The home mic is designed for daily capture without digging through settings.",
      ],
      bullets: [
        "Tap (teal) — quick, private transcription on your phone. Audio is processed locally; nothing is uploaded for speech-to-text.",
        "Hold until the ring completes (violet) — meeting mode. Audio chunks go to cloud STT with speaker labels when your plan and network allow.",
        "Purple hint halfway through the hold — you are entering meeting territory; release early to cancel.",
      ],
    },
    {
      heading: "On-device engines (tap)",
      bullets: [
        "Android arm64 — native whisper.cpp when enabled in Settings (fastest on supported phones).",
        "Browser / emulator — Transformers.js WASM Whisper in a Web Worker (~3s chunks).",
        "Fallback — Web Speech API if Whisper cannot start (limited; may use Google servers).",
        "Personalization — custom vocabulary, saved line corrections, and optional todo hints apply to all on-device paths.",
      ],
      paragraphs: [
        "First use downloads a model (tiny or base). Wi‑Fi-only download can be enforced in Settings. Pause-on-silence skips work while you are quiet to save battery.",
      ],
    },
    {
      heading: "Meeting mode (hold)",
      bullets: [
        "Cloud STT via Firebase — better for multiple speakers and noisy rooms.",
        "Speaker lines (Speaker 1, 2, …) when diarization is available.",
        "Uses AI/STT quota on paid tiers; disabled in local-only mode.",
        "Foreground notification on Android while recording.",
      ],
    },
    {
      heading: `How ${APP_NAME} compares`,
      paragraphs: [
        "Typical meeting recorders (Otter, Fireflies, etc.) optimize for cloud bots and shared transcripts. Ude optimizes for private quick capture first, with meeting-grade cloud as a deliberate gesture.",
      ],
      bullets: [
        "Quick notes — Ude: on-device Whisper by default. Others: often cloud or browser speech only.",
        "Privacy — Ude: tap path keeps audio on device; cloud only when you hold. Others: audio or streams often leave the device by default.",
        "Speaker labels — Ude: meeting hold + cloud. Others: strong when a bot joins the call.",
        "Offline — Ude: cached Whisper models + local-only mode. Others: usually require network.",
        "Android native — Ude: optional whisper.cpp on arm64. Others: vary; many are cloud-only mobile wrappers.",
      ],
    },
    {
      heading: "Settings worth knowing",
      bullets: [
        "On-device model — Tiny (faster) vs Base (more accurate).",
        "Native Whisper (Android) — prefer whisper.cpp on arm64; WASM on emulators.",
        "Meeting hold duration — 3s, 5s, or 7s before cloud mode starts.",
        "Quick vs meeting transcription — defaults for tap vs Start meeting (when not local-only).",
        "Recognition language — picks English-only or multilingual Whisper models.",
      ],
    },
    {
      heading: "Expectations",
      bullets: [
        "On-device Whisper is chunked (~3s), not word-by-word like some cloud streamers.",
        "No speaker diarization on the tap path — use meeting mode for who said what.",
        "Local-only mode forces on-device paths only; no cloud STT or friend sync.",
      ],
    },
  ],
};
