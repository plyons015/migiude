# Network troubleshooting (Starlink, VPN, speech)

## Symptom: “Network” error on Listen (browser speech)

Chrome’s Web Speech API talks to **Google’s speech servers**, not your Wi‑Fi router. A “network” error often means that path is blocked, even when websites load fine.

### Try

1. **Mobile data** instead of Starlink Wi‑Fi (many users confirm speech works on cellular).
2. **Disable VPN / proxy** on the phone and PC.
3. **Firewall / antivirus** — allow Chrome or the WebView used by the Android app.
4. **Google Chrome** on desktop (not all browsers support Web Speech).
5. **Meeting mode (cloud STT)** in Settings — audio chunks go to Firebase → Gemini over HTTPS (same path as AI summarize).

## Symptom: AI works but speech does not

| Works | Fails | Likely cause |
|-------|-------|----------------|
| Summarize / AI | Listen | Web Speech blocked; switch to cloud STT |
| Cloud STT | Browser speech | Inverse — use cloud STT on Starlink |
| Everything on cellular | Fails on home Wi‑Fi | Router/DNS/firewall on Starlink |

## Symptom: IPv6 / flaky HTTPS

- Ensure `cloudfunctions.net` and `googleapis.com` are reachable.
- Starlink CGNAT rarely blocks outbound HTTPS; focus on client-side filters first.
- Try another DNS (e.g. 1.1.1.1) on the device.

## Long meetings

- **Browser speech**: may stop after pauses or screen-off on some devices.
- **Cloud STT**: ~8s latency per line; more reliable on difficult networks.
- **Foreground notification** while listening helps Android keep the app alive when switching apps; screen-off for 30+ minutes may still pause Web Speech.

## Still stuck?

1. Settings → copy transcript after a test phrase on **mobile data**.
2. If cloud STT works, keep **Meeting mode** enabled for home Wi‑Fi.
3. Check Firebase Functions logs if AI/STT callables return `unavailable` or `internal`.
