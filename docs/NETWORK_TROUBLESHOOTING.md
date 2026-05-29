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

## Symptom: `ERR_NAME_NOT_RESOLVED` on `*.cloudfunctions.net` (admin / AI)

The browser cannot **resolve DNS** for Firebase Functions (e.g. `us-central1-PROJECT.cloudfunctions.net`). The functions are deployed; your **network or DNS server** is the problem.

### Fix (Windows)

1. **Settings → Network & Internet → Wi‑Fi/Ethernet → your network → DNS**
2. Set **Manual** DNS: **8.8.8.8** and **1.1.1.1** (or 8.8.4.4)
3. PowerShell: `ipconfig /flushdns`
4. Reload `/admin/`

### Also try

- Disable **VPN / proxy / Pi-hole / ad blocker**
- **Phone hotspot** (confirms home router DNS is broken)
- Starlink / mesh routers: some default DNS servers fail on `cloudfunctions.net` while Google DNS works

### Verify

```powershell
nslookup us-central1-Ude-app-plyons015.cloudfunctions.net 8.8.8.8
```

Should return an address (e.g. `216.239.36.54`). If that works but the browser still fails, flush DNS and restart the browser.

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
