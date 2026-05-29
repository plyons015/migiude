# Authentication — email/password + 2FA

Ude uses **Firebase Authentication** with:

- **Email / password** (primary app sign-in)
- **Two-factor authentication (2FA)** — **authenticator app (TOTP)** preferred, **SMS** optional backup
- **Google** — optional in Console; **not shown in the app UI**. Admin uses email/password + `ADMIN_EMAILS` allowlist at `/admin/`
- **Anonymous** — dev only when `NEXT_PUBLIC_ALLOW_ANONYMOUS=true`

Firebase does **not** support email OTP as a second factor. Use an authenticator app (Google Authenticator, Authy, 1Password, etc.) or SMS.

---

## Firebase Console setup (required)

Project: **Ude-app-plyons015**

### 1. Sign-in providers

[Authentication → Sign-in method](https://console.firebase.google.com/project/Ude-app-plyons015/authentication/providers)

| Provider | Enable |
|----------|--------|
| **Email/Password** | On |
| **Google** | On (for `/admin/`) |
| **Anonymous** | On only for dev/testing |

### 2. Multi-factor authentication

Same page → **Advanced** → **SMS multi-factor authentication** → **Enable**

Enable **TOTP (authenticator app)** if shown as a separate toggle (Firebase console UI varies; both TOTP and SMS require a **Blaze** plan on most projects).

### 3. Authorized domains

Authentication → **Settings** → **Authorized domains**

Add:

- `localhost` (dev)
- Your Firebase Hosting domain (`*.web.app`)
- Any custom domain you use for desk web

### 4. reCAPTCHA (SMS)

Phone/SMS MFA uses invisible reCAPTCHA in the browser. If SMS fails on Android WebView, use **authenticator-only** 2FA or test desk web in Chrome first.

---

## User flows

### Sign up

1. **Sign up** tab → email + password  
2. Verification email sent (optional for daily use — **only required for 2FA**)  
3. **Settings → Two-factor authentication** → scan QR → enter 6-digit code (after verified)

### Never got the verification email?

1. Dashboard → **Resend email** / **Refresh status** (after clicking the link).  
2. Try **Forgot password** on sign-in — if that email arrives, your address works; fix templates in Console.  
3. **Firebase Console** → Authentication → **Users** → your user → **⋮** → verify email manually (for your own admin account).  
4. Check **Google Cloud → Credentials** → API key not blocking `identitytoolkit.googleapis.com` from localhost.

### Sign in

1. Email + password  
2. If 2FA enrolled → enter authenticator or SMS code  

### Password reset

**Forgot password?** on sign-in screen.

---

## Enforcing 2FA (optional, later)

Today 2FA is **optional** per user. To require it org-wide:

- Cloud Function on sign-in checking `multiFactor(user).enrolledFactors.length`, or  
- Firebase Identity Platform policies (paid tier)

---

## Admin vs app accounts

| Area | Sign-in |
|------|---------|
| App (notes, listen, settings) | Email/password + optional 2FA |
| `/admin/` | Same email/password + `ADMIN_EMAILS` allowlist (no separate Google UI) |

Use separate Google accounts for admin ops vs counseling accounts if you prefer.

---

## Local dev

```bash
# Optional dev anonymous bypass
# NEXT_PUBLIC_ALLOW_ANONYMOUS=true in .env.local

npm run dev
```

If you previously used **anonymous** sign-in, sign out once (Settings) or clear site data — the app now requires email/password unless `NEXT_PUBLIC_ALLOW_ANONYMOUS=true`.

With emulators, enable Auth emulator in Console or use production Auth for MFA testing (MFA is easiest to test against real Firebase Auth, not always fully supported in emulators).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `operation-not-allowed` | Enable Email/Password in Console |
| `unverified-email` | Resend verification in Settings |
| MFA not offered | Enable MFA + Blaze; enroll TOTP in Settings first |
| SMS never arrives | Check phone E.164 format (`+1…`); reCAPTCHA/domain |
| `invalid-continue-uri` / 400 on send email | Add `localhost` and your Hosting domain under **Authorized domains**; check API key is not HTTP-referrer blocked |
| 400 on `sendOobCode` | Often rate limit, already verified, or API key restrictions — see below |

### 400 on `accounts:sendOobCode`

Used for **verification** and **password-reset** emails. Check:

1. **Authorized domains** — Authentication → Settings → `localhost`, `Ude-app-plyons015.web.app`, `Ude-app-plyons015.firebaseapp.com`
2. **API key restrictions** — Google Cloud → Credentials → Browser key → allow `http://localhost:3000/*` or no referrer restriction for dev
3. **Already verified** — no resend needed; refresh Settings after clicking the email link
4. **Rate limit** — wait if you sent many test emails
5. **Templates** — Authentication → Templates → verification / reset enabled
