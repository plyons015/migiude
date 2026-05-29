# Stripe setup (Pro & Power)

Ude uses **Stripe Checkout** for web subscriptions. Plan limits are enforced in Firebase; Stripe only handles payment and sets `userProfiles.plan` via webhook.

## Products in Stripe Dashboard

Create two products (you’ve done this). Suggested copy — **always lead with on-device**:

| Product | Description (Stripe) | Monthly | Yearly |
|---------|----------------------|---------|--------|
| **Pro** | Unlimited on-device transcription. 1,000 cloud minutes + 200 AI actions per month. | **$14.99** | **$129** |
| **Power** | Unlimited on-device transcription. High-volume fair use: ~3,000 cloud min + generous AI. | **$22.99** | **$229** |

Copy each price’s **`price_…` ID** from Stripe → Products → click price.

## Wire price IDs to Firebase Functions

### Price IDs (env vars — already in repo for your project)

| Variable | Your price ID |
|----------|----------------|
| `STRIPE_PRICE_PRO_MONTHLY` | `price_1TaOTtPf2NUElfiRRuGdN2KK` |
| `STRIPE_PRICE_PRO_YEARLY` | `price_1TaOTtPf2NUElfiRF3tBPEVb` |
| `STRIPE_PRICE_POWER_MONTHLY` | `price_1TaOVKPf2NUElfiRvgDGMAZA` |
| `STRIPE_PRICE_POWER_YEARLY` | `price_1TaOWoPf2NUElfiRblWy8e9E` |

- **Production deploy:** `functions/.env.Ude-app-plyons015`
- **Emulators:** `functions/.secret.local` (same four lines)

### Where to find the two Stripe *secrets*

| Firebase secret | Where in Stripe |
|-----------------|-----------------|
| **`STRIPE_SECRET_KEY`** | [Developers → API keys](https://dashboard.stripe.com/apikeys) → **Secret key** → Reveal → `sk_test_…` or `sk_live_…` |
| **`STRIPE_WEBHOOK_SECRET`** | [Developers → Webhooks](https://dashboard.stripe.com/webhooks) → your endpoint → **Signing secret** → Reveal → `whsec_…` (only after you create the webhook below) |

### Which Stripe key is which?

| You see | Prefix | Put it in Ude? |
|---------|--------|----------------|
| **Publishable key** | `pk_test_` / `pk_live_` | **No** — not used (Checkout runs on the server) |
| **Secret key** (click **Reveal**) | `sk_test_` / `sk_live_` | **Yes** → `STRIPE_SECRET_KEY` |
| **Signing secret** (Webhooks page only) | `whsec_` | **Yes** → `STRIPE_WEBHOOK_SECRET` |

The “hidden” key on **Developers → API keys** is almost always the **secret key** (`sk_…`), not the webhook secret.

Set in Firebase Secret Manager:

```powershell
# From repo root — prompts for paste
.\scripts\set-stripe-secrets.ps1
```

Or manually:

```powershell
"sk_test_YOUR_KEY" | npx firebase-tools functions:secrets:set STRIPE_SECRET_KEY --data-file -
"whsec_YOUR_SECRET" | npx firebase-tools functions:secrets:set STRIPE_WEBHOOK_SECRET --data-file -
```

Then redeploy: `firebase deploy --only functions`

For **emulators**, paste both keys into `functions/.secret.local` (do not put secret keys in `functions/.env` — deploy will fail).

## Webhook

### Bootstrap (first deploy)

`stripeWebhook` requires `STRIPE_WEBHOOK_SECRET` in Secret Manager, but you only get `whsec_…` **after** the endpoint URL exists in Stripe. Use a temporary placeholder for the first deploy:

```powershell
"whsec_pending_replace_after_stripe_setup" | npx firebase-tools functions:secrets:set STRIPE_WEBHOOK_SECRET --data-file -
npm run build --prefix functions
npx firebase-tools deploy --only functions
```

If deploy prompts for `STRIPE_WEBHOOK_SECRET` and you press Enter with nothing, you get **Secret Payload cannot be empty** — run the line above first.

Then create the destination in Stripe (below), copy the real `whsec_…`, set it, and redeploy:

```powershell
"whsec_YOUR_REAL_SECRET" | npx firebase-tools functions:secrets:set STRIPE_WEBHOOK_SECRET --data-file -
npx firebase-tools deploy --only functions:stripeWebhook
```

Or run `.\scripts\set-stripe-secrets.ps1` and answer **y** only on the webhook step.

### Create destination in Stripe

After deploy, add endpoint in Stripe → Developers → Webhooks:

```
https://us-central1-Ude-app-plyons015.cloudfunctions.net/stripeWebhook
```

Listen for:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Webhook sets `userProfiles.plan` to `pro` or `power` from the subscribed price ID.

## Customer portal

Stripe Dashboard → **Settings → Billing → Customer portal** → enable so **Manage subscription** in Settings works.

## In-app checkout

Settings → **Upgrade & billing**:

- Pro — $129/year or $14.99/month  
- Power — $229/year or $22.99/month  

Calls `createCheckoutSession` → Stripe Checkout → webhook syncs plan.

## Test checklist

1. All four `STRIPE_PRICE_*` env vars set on deployed functions  
2. Webhook signing secret matches `STRIPE_WEBHOOK_SECRET`  
3. Test mode checkout with [4242 card](https://docs.stripe.com/testing)  
4. Confirm `userProfiles.plan` updates to `pro` or `power`  
5. Admin → Billing shows active subscription / MRR  

## Play Store (later)

This Stripe flow is for **web** billing. Android Play subscriptions are separate; do not duplicate Stripe products in Play without a clear cross-platform policy.
