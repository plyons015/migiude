# Admin dashboard

Web-only ops console at **`/admin/`** (not shipped in the Android APK workflow by default).

Architecture: **static Next.js UI** + **Firebase Callable Functions** with **Firebase Admin SDK** (no Next.js API routes — the app uses `output: "export"` for Capacitor).

## Phase 1 + 2 (implemented)

| Area | Status |
|------|--------|
| Users | List/search, suspend, plan override, **user detail** (7-day usage, admin notes, trial extension) |
| Usage | Daily AI + cloud STT counters, top cloud users, auto-flags |
| Billing | Stripe placeholder (set `STRIPE_SECRET_KEY` when ready) |
| Abuse | Flags list + resolve |
| Support | In-app submit (Settings), **admin inbox**, resolve/reopen |
| Export | **CSV** export of visible user list |

## Phase 3 (implemented)

| Area | Status |
|------|--------|
| Overview | **Recent open support** queue with quick link to inbox |
| Users | **Month-to-date quotas** vs plan (free: 20 AI / 60 min cloud STT) in list + detail |
| Usage rollup | `usageMonthly/{yyyy-mm}/users/{uid}` updated on each AI/STT call |
| Overview | **Free over quota (MTD)** stat |
| Support | **Search** inbox; **View user** jumps to user detail; **Reply** focuses ticket |

## Phase 4 (implemented)

| Area | Status |
|------|--------|
| Stripe Checkout | `createCheckoutSession` — Settings → **Plan & billing** |
| Customer portal | `createBillingPortalSession` — manage subscription |
| Webhook | `stripeWebhook` HTTP function → sync `userProfiles.plan` |
| Admin **Billing** tab | MRR estimate, active subs, past due, plan counts, recent events |
| Events | `billingEvents` collection (admin read via Functions only) |

## Setup (one-time)

### 1. Sign-in providers (Console)

- **Email/Password** — required (same as the app).
- Admin uses **email/password + allowlist** (`ADMIN_EMAILS`).

### 2. Allowlist your admin email(s)

**Emulators** — add to `functions/.secret.local`:

```bash
ADMIN_EMAILS=you@gmail.com
```

**Production** — set on Cloud Functions (comma-separated):

```bash
npx -y firebase-tools@latest functions:secrets:set ADMIN_EMAILS
```

Or store extra emails in Firestore `adminConfig/config` (field `adminEmails: string[]`) — merged with `ADMIN_EMAILS`.

### 3. Stripe (Phase 4)

See **`docs/STRIPE.md`** for full setup. Summary:

**Products (Stripe Dashboard)**

| Product | Description | Monthly | Yearly |
|---------|-------------|---------|--------|
| Pro | 1,000 cloud min + 200 AI/mo (+ unlimited on-device) | $14.99 | $129 |
| Power | High-volume fair use ~3,000 min + generous AI | $22.99 | $229 |

1. Copy each price **`price_…` ID** into Functions env (see below).
2. Set secrets:

```bash
npx -y firebase-tools@latest functions:secrets:set STRIPE_SECRET_KEY
npx -y firebase-tools@latest functions:secrets:set STRIPE_WEBHOOK_SECRET
```

3. Set price IDs (Firebase Console → Functions → environment variables, or `functions/.secret.local` for emulators):

- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_PRICE_POWER_MONTHLY`
- `STRIPE_PRICE_POWER_YEARLY`

4. Webhook endpoint (after deploy):

`https://us-central1-<project-id>.cloudfunctions.net/stripeWebhook`

Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`

5. Enable **Customer portal** in Stripe Dashboard → Settings → Billing.

### 4. Deploy

```bash
npm run functions:build
npx -y firebase-tools@latest deploy --only functions,firestore:rules,firestore:indexes
npm run build:web
npx -y firebase-tools@latest deploy --only hosting
```

### 5. Sign in

1. Open `/admin/`
2. Sign in with **email/password** (must be on `ADMIN_EMAILS`)
3. Dashboard tabs: Overview, Users, Support, **Plans**, **Billing**, Flags

## Plans & quotas (runtime config)

Launch limits and pricing copy live in Firestore **`adminConfig/plans`**, not only in code.

| Where | What |
|-------|------|
| Admin → **Plans** | Edit Free / Pro / Power limits, prices, labels, fair-use text |
| Settings (signed-in) | Live usage bars + tier copy from `getPlanAndUsage` |
| Enforcement | `aiProcess` / `transcribeAudio` read config (~60s cache) |

Use **Reset to defaults** to restore `lib/plan/config-schema.ts` launch values.

## Callable functions

| Function | Purpose |
|----------|---------|
| `getPlanAndUsage` | User: live config + MTD usage |
| `adminGetPlanConfig` | Admin: read plan config |
| `adminUpdatePlanConfig` | Admin: save plan config |
| `adminResetPlanConfig` | Admin: restore defaults |
| `adminVerify` | Auth check |
| `adminGetDashboard` | Overview stats + billing summary |
| `adminListUsers` | Paginated Auth users + MTD usage |
| `adminGetUser` | Single user + 7-day usage + MTD quotas |
| `adminUpdateUser` | Plan, suspend, role, trial, admin notes |
| `adminListSupportTickets` | Support inbox |
| `adminUpdateSupportTicket` | Resolve / reopen + optional reply note |
| `adminListFlags` | Abuse / high-usage flags |
| `adminResolveFlag` | Close a flag |
| `createCheckoutSession` | User upgrade (Settings) |
| `createBillingPortalSession` | User subscription management |

HTTP: `stripeWebhook` — Stripe → Firestore profile sync.

Usage is recorded automatically on `aiProcess` and `transcribeAudio` (daily + monthly rollups).

## Support tickets (users)

Users submit from **Settings → Contact support**. Firestore rules allow `create` only (uid must match auth). Admins read/update via Functions.

### User replies (in-app)

Counselors see support threads in the app via the **?** Help button (Messages tab). When you resolve a ticket and add a reply in the admin inbox, that note is stored as `adminReply` and appears in their Help inbox.

## Security notes

- Admin requires **signed-in email** on `ADMIN_EMAILS`.
- Admin Firestore paths are **denied** to clients; only Functions use Admin SDK.
- Do not add admin emails to `NEXT_PUBLIC_*`.
- For production: restrict Hosting to your IP or use a separate admin subdomain.
- Stripe webhook secret must match the endpoint in Stripe Dashboard.
