# Phase 1 — Voice & transcription

## Features

- **Web Speech API** — continuous listening with interim + final transcript chunks
- **Privacy** — `getUserMedia` used only to grant permission; tracks stopped immediately; no `MediaRecorder`, no audio files
- **Wake Lock** — screen stays on while listening (when supported)
- **Listen page** — `/listen/` with live transcript UI

## Try it

```bash
npm run dev
```

Open [http://localhost:3000/listen/](http://localhost:3000/listen/) in **Chrome** (desktop or Android).

On device:

```bash
npm run cap:sync
npm run cap:android
```

Grant microphone permission when prompted.

## “Network” error on Listen (Wi‑Fi is fine)

Web Speech sends audio to **Google’s servers** in the browser. Chrome reports `network` when that hop fails — not when `localhost` or Firebase is down.

| Likely cause | What to try |
|--------------|-------------|
| **VPN / corporate proxy** | Turn VPN **off** for the browser session (you may need VPN for other tools, but not for speech). |
| **Antivirus HTTPS scan** (e.g. Avast) | Pause web shield or allow Chrome; see [ANDROID_SSL.md](ANDROID_SSL.md) for similar TLS issues. |
| **Wrong browser** | Use **Google Chrome** at `http://localhost:3000/listen/` — Edge/Firefox often fail with `network`. |
| **Firewall** | Allow Chrome outbound HTTPS to Google. |

Quick check: open `chrome://version`, confirm Chrome (not Edge). Reload the page, allow microphone, tap Listen.

### Starlink Wi‑Fi (phone on cellular works, home Wi‑Fi does not)

Listen uses **Google Web Speech** in the browser. Starlink + some routers break **large HTTPS** or **IPv6** to Google while normal browsing still works. Cellular uses a different path, so the same phone works on data but not on your Wi‑Fi.

Try in order (PC on Starlink Wi‑Fi, Chrome, `/listen/`):

1. **Disable IPv6** on the Wi‑Fi adapter (Windows: Settings → Network → Wi‑Fi → your network → Edit → uncheck IPv6, or adapter Properties → uncheck “Internet Protocol Version 6”). Reload and test Listen. Many Starlink setups work again with IPv4-only.
2. **DNS** — set Wi‑Fi DNS to `8.8.8.8` and `8.8.4.4` (Starlink sometimes interferes with other resolvers).
3. **MTU** — on the Starlink router or a downstream router, lower WAN MTU to **1420** or enable **TCP MSS clamping** if you have that option (fixes silent drops on Google traffic).
4. **Bypass double NAT** — if you have another router behind the Starlink dish, put Starlink in bypass mode or use only the Starlink router for Wi‑Fi during testing.
5. **Dev workaround** — run `npm run dev` on the PC but open the app on the phone using **mobile data** and your PC’s LAN IP only if you configure Capacitor dev server; simpler: use **phone hotspot** for the PC’s internet while testing Listen, or test Listen only on the phone with **data** (as you already did).

If IPv6-off fixes the PC browser, re-enable IPv6 later and fix MTU/ICMP on the router for a permanent fix.

**Long-term in the app (not built yet):** server-side transcription (e.g. Cloud Speech or Gemini audio) does not depend on Web Speech and usually works wherever HTTPS to Google works — same as Summarize/AI.

## Android notes

- Web Speech works best in **Chrome WebView** / Capacitor on recent Android.
- `RECORD_AUDIO` is already in `AndroidManifest.xml`; the app requests it on launch.
- After changing Listen/voice code, run `npm run cap:sync` and reinstall — a WebView **refresh** loads static HTML; speech support is detected on the client only.
- Background listening is **not** supported in Phase 1 (Phase 5 if needed).

## Multiple speakers / voices

**Not in Phase 1.** Browser Web Speech API has **no speaker diarization** (it cannot label “Person A” vs “Person B”).

Planned approach when we add it (likely **Phase 5+** or a dedicated listen upgrade):

- Send audio to a backend STT with **speaker diarization** (e.g. Google Cloud Speech-to-Text, Deepgram, AssemblyAI), or
- Use a multimodal model on short audio segments.

That requires Blaze, mic capture beyond Web Speech, and privacy review — not a settings toggle on the current stack.

## Next (Phase 2)

Pipe finalized transcript chunks to `processWithAi()` (Firebase Functions + Genkit).
