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

### 3. Deploy

```bash
npm run functions:build
npx -y firebase-tools@latest deploy --only functions,firestore:rules,firestore:indexes
npm run build:web
npx -y firebase-tools@latest deploy --only hosting
```

### 4. Sign in

1. Open `/admin/`
2. Sign in with **email/password** (must be on `ADMIN_EMAILS`)
3. Dashboard tabs: Overview, Users, Support, Flags

## Callable functions

| Function | Purpose |
|----------|---------|
| `adminVerify` | Auth check |
| `adminGetDashboard` | Overview stats |
| `adminListUsers` | Paginated Auth users + profiles + today usage |
| `adminGetUser` | Single user + 7-day usage + admin notes |
| `adminUpdateUser` | Plan, suspend, role, trial, admin notes |
| `adminListSupportTickets` | Support inbox |
| `adminUpdateSupportTicket` | Resolve / reopen + optional reply note |
| `adminListFlags` | Abuse / high-usage flags |
| `adminResolveFlag` | Close a flag |

Usage is recorded automatically on `aiProcess` and `transcribeAudio`.

## Support tickets (users)

Users submit from **Settings → Contact support**. Firestore rules allow `create` only (uid must match auth). Admins read/update via Functions.

## Security notes

- Admin requires **signed-in email** on `ADMIN_EMAILS`.
- Admin Firestore paths are **denied** to clients; only Functions use Admin SDK.
- Do not add admin emails to `NEXT_PUBLIC_*`.
- For production: restrict Hosting to your IP or use a separate admin subdomain.

## Stripe (next)

1. Create Stripe products (Free / Pro / Business).
2. Set `STRIPE_SECRET_KEY` on Functions.
3. Webhook → update `userProfiles/{uid}.plan` and dashboard MRR fields.
