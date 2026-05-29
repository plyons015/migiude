# Integrations roadmap (Otter parity)

Ude closes the gap with Otter through **capture path** + **STT quality**, not mic-only tricks.

## Capture paths by platform

| Platform | v1 (shipped / in progress) | Later (power users) |
|----------|----------------------------|---------------------|
| **Any** | Mic + Cloud STT meeting mode, KB guides | Tab/system audio where browser allows |
| **Teams** | **Option 2:** Calling bot (Pro/Power) | Calendar auto-join (Power), org admin deploy |
| **Zoom** | Mic + guide | RTMS / Meeting SDK partner flow |
| **Google Meet** | Mic + guide | Post-meeting Workspace artifacts API |

## Option 2 (Teams bot) — current focus

- User signs in with **their** Microsoft account (delegated OAuth).
- Pro/Power quotas on bot minutes and joins.
- Separate **Azure worker** joins as a participant; Functions only orchestrate.
- Documented in `docs/TEAMS_CALLING_BOT.md`.

## Tiering philosophy

- **Free:** On-device + guides; no bot.
- **Pro:** Bot enabled at moderate monthly caps (Otter-like for regular users).
- **Power:** Higher caps + calendar auto-join (beta) for heavy users.

Advanced paths (org-wide bot, compliance recording, custom vocabulary at scale) stay **Power** or enterprise later.

## What mic-only cannot fix

Room bleed, single dominant speaker on Teams web, and mixed accents without diarization-friendly audio are expected with **laptop mic capture**. The bot path exists to get **meeting mix** legally via participant join.
