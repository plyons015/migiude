# Freemium conversion (Free → Pro)

Design goal: **convert without nagging**. Every upgrade touchpoint should be contextual, dismissible where appropriate, and one tap away from Settings → Stripe checkout — never a multi-step modal funnel.

See also **`docs/PLANS.md`** for limits and pricing.

## Home screen (thumb UI)

The dashboard uses an **iPod-style display** (`IpodDisplay`) plus a bottom **mic remote**:

| Control | Action |
|---------|--------|
| **Tap** green mic | On-device quick listen → `/listen/?start=device&autostart=1` |
| **Hold 5s** | Cloud meeting session → `/listen/?start=cloud&meeting=1&autostart=1` |
| **Hold ≥2.5s** | Mic turns **purple** (cloud hint) |
| **Circular buttons** | Listen · Notes · Library |

**One message at a time** in the display (priority):

1. Mic hold hint (while pressing)
2. Quota nudge (color-coded)
3. Sponsored ad (**10s**, dismissible or auto-hide)
4. Rotating Pro benefit copy
5. Greeting + stats (Pro/Power)

Free-tier bottom bar nudges/ads on **web only** (`isNativePlatform()` → use AdMob later on Android). On the dashboard, **nudges stay in the iPod window**; the bottom bar shows **AdSense only** so you are not double-nudged.


| Touchpoint | When it appears | Dismissible? | Clicks to upgrade |
|------------|-----------------|--------------|-------------------|
| **Bottom bar nudge** (`FreeTierBottomBar`) | Free plan, ≥80% cloud or AI usage, or limit hit | Yes (7 days) for “approaching” only | 1 → Settings |
| **Bottom banner ads** (AdSense) | Free plan, env configured | N/A (disable via env) | 0 |
| **Quota errors** (`PlanQuotaMessage`) | AI / cloud STT blocked by server | No | 1 → Settings |
| **Settings billing** | User opens Settings | N/A | 1 → Stripe Checkout |
| **Usage card** | Settings, signed in | N/A | Already on upgrade page |

Hidden on `/admin`, `/setup`, `/onboarding` so first-run and ops flows stay clean.

## Bottom bar behavior

Implementation: `components/plan/free-tier-bottom-bar.tsx`, wired in `components/app-chrome.tsx`.

- **Approaching limit (80%+):** violet strip, single line + “View Pro”, **X dismisses for 7 days** (`localStorage`).
- **Limit reached:** amber strip, not dismissible — user needs to know on-device still works.
- **Ads:** optional horizontal AdSense strip below the nudge (or alone if no nudge). Fixed to bottom; content gets a spacer + `--free-tier-bottom-inset` so Help FAB and scroll area clear the bar.

### AdSense env (web)

Add to `.env.local` when approved for AdSense:

```bash
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxx
NEXT_PUBLIC_ADSENSE_SLOT=xxxxxxxx
# Set to true to hide ads but keep nudges
NEXT_PUBLIC_ADS_FREE_TIER_DISABLED=false
```

Leave client/slot empty during development — no ad placeholder UI, no extra network calls.

**Android:** use Google AdMob (banner) in the Capacitor shell later; AdSense is web-only. Same placement: bottom strip on free tier only.

## What we deliberately skip in v1

These are effective but add clicks, email infra, or product complexity — defer until you have baseline conversion data:

- 14-day Pro trial on first limit hit
- Email / push day 3–7–14 sequences (Resend removed; in-app support only)
- Locked/gray premium feature teasers that block core flows
- Interstitial or video ads
- Onboarding upgrade modal after first meeting

## Future (low-friction additions)

1. **Post-meeting toast** — after a successful AI summary on free: one line + link to Settings (no modal).
2. **Annual default** — already emphasized in billing UI (“Best value” on yearly Pro).
3. **Social proof** — single static line in Settings when you have real numbers.
4. **Play Billing restore** — when Android store billing ships alongside Stripe web.

## Measuring success

Track in admin / Firestore (already available):

- `usageMonthly` over-quota counts by plan
- Stripe webhook → `userProfiles.plan` changes
- Support tickets mentioning “limit” or “upgrade”

Tune `UPGRADE_NUDGE_THRESHOLD` in `lib/plan/upgrade-nudges.ts` (default **80%**) if 80% feels too early or too late.

## Copy principles

- Lead with what still works free: **unlimited on-device transcription**.
- Name the limit clearly (30 cloud min, 12 AI — or live values from `adminConfig/plans`).
- Pro = generous caps, not “unlimited” (see `docs/PLANS.md`).
