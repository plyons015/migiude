# Launch plans (Free · Pro · Power)

**Runtime source of truth:** Firestore `adminConfig/plans` (editable in Admin → **Plans**).  
**Code defaults:** `lib/plan/config-schema.ts` (seeded on first read). Legacy `business` → **power**.

## Pricing (profit-first, before ~12% Play fee)

| Plan | Monthly | Yearly (default at checkout) | Your take (approx.) |
|------|---------|------------------------------|---------------------|
| Free | $0 | — | — |
| Pro | **$14.99** | **$129** (~$10.75/mo) | ~$12–13/mo after fees |
| Power | **$22.99** | **$229** (~$19.08/mo) | ~$19–20/mo after fees |

Emphasize **annual** in checkout for upfront cash and better margin.

## Enforced quotas (UTC)

| Plan | Cloud STT / month | AI / month | Cloud STT / day |
|------|-------------------|------------|-----------------|
| Free | **30 min** | **12** | — |
| Pro | **1,000 min** | **200** | — |
| Power | **3,000 min** (fair use label) | **Fair use** (no hard cap) | **800** segments (warn 500) |

Do **not** market Pro/Power as “unlimited.” Use **generous monthly limits** (Pro) and **high-volume fair use** (Power). See `docs/FAIR_USE.md`.

## Language cheat sheet

| Avoid | Use instead |
|-------|-------------|
| Unlimited cloud transcription | 1,000 min/mo (Pro) or ~3,000 min/mo fair use (Power) |
| Unlimited AI | 200 AI actions/mo (Pro) or high-volume AI fair use (Power) |
| Unlimited on-device | OK — this is actually unlimited and low marginal cost |

## Stripe

See **`docs/STRIPE.md`** for Dashboard products, price IDs, and webhook setup.

| Env var | Maps to |
|---------|---------|
| `STRIPE_PRICE_PRO_MONTHLY` / `_YEARLY` | Pro ($14.99 / $129) |
| `STRIPE_PRICE_POWER_MONTHLY` / `_YEARLY` | Power ($22.99 / $229) |

Legacy `STRIPE_PRICE_BUSINESS_*` → Power.

## Cloud backup (Pro / Power — planned)

Paid tiers will include **optional cloud backup** of notes, meetings, and todos to Firebase Storage:

| Plan | Backup | Suggested storage cap |
|------|--------|------------------------|
| Free | Local vault only | — |
| Pro | Auto-backup + per-item “Share to cloud” | **2 GB** |
| Power | Auto-backup + per-item share | **10 GB** |

This is common in note apps (Notion, Evernote) — local-first by default, cloud as a paid convenience. Implementation is **not in v1**; the home screen already teases the benefit in rotating Pro messages.

See **`docs/CONVERSION.md`** for how upgrade nudges appear in the thumb home UI.

## Meeting templates

| Plan | Built-in (1:1, Client, Standup) | Custom templates |
|------|-----------------------------------|------------------|
| Free | Yes | — (creator greyed out in Settings) |
| Pro | Yes | Up to **10** |
| Power | Yes | Up to **25** |

Each template sets: **title pattern**, **Library tags**, **agenda**, **AI report sections** (structured summary), and **cloud meeting mode** (purple mic on home). Custom templates are stored locally per account (IndexedDB/localStorage).


- Tight free tier (30 min cloud + 12 AI).
- Pro is the main revenue tier with explicit caps.
- Power = higher caps + fair use on AI; monitor Gemini/Firebase budgets — see **`docs/BILLING_ALERTS.md`** ($50–100/mo alerts).
