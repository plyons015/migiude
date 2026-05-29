# Firebase & Gemini budget alerts

Set billing alerts on project **`Ude-app-plyons015`** so cloud STT and AI usage do not surprise you. Target **$50–100/month** for early launch (adjust in `docs/PLANS.md`).

## 1. Google Cloud billing budget (recommended)

Covers **Firebase, Cloud Functions, Firestore, Secret Manager, and Gemini API** on the linked billing account.

1. Open [Google Cloud Console → Billing → Budgets & alerts](https://console.cloud.google.com/billing/budgets)
2. Select the billing account linked to `Ude-app-plyons015`
3. **Create budget**
4. **Scope:** filter to project `Ude-app-plyons015` (optional but clearer)
5. **Amount:** e.g. **$75/month** (or $50 / $100)
6. **Alert thresholds:** 50%, 90%, 100% of budget
7. **Email notifications:** your ops email

Repeat with a **second budget** at **$150** or **$200** if you want a hard “investigate now” ceiling.

## 2. Firebase usage (console)

1. [Firebase Console](https://console.firebase.google.com/project/Ude-app-plyons015/usage) → **Usage and billing**
2. Review **Blaze** plan usage: Functions invocations, Firestore reads/writes, Hosting
3. Enable email alerts if offered under **Billing settings** for the linked GCP account

Firebase does not replace GCP budgets — use both.

## 3. Google AI Studio / Gemini API (direct)

If you also use the same API key outside Functions:

1. [Google AI Studio](https://aistudio.google.com/) → Settings / API key usage (or Cloud Console → **APIs & Services → Enabled APIs → Generative Language API** → quotas)
2. Set **quota alerts** where available
3. Prefer **one key for Functions only** (`GEMINI_API_KEY` secret) so GCP billing budget covers production

## 4. What drives cost in Ude

| Source | When it runs |
|--------|----------------|
| **Gemini STT** | Meeting mode, cloud transcription |
| **Gemini/Grok AI** | Summarize, Ask, rolling summary, etc. |
| **Cloud Functions** | Every callable + webhook |
| **Firestore** | Sync, usage rollups, admin |
| **Stripe** | Per transaction (not GCP) |

Free-tier users with **browser speech only** cost little on STT; **Power** cloud STT + AI dominates spend.

## 5. Quick checks

```powershell
# Functions logs — STT/AI volume
npx firebase-tools functions:log --only aiProcess,transcribeAudio

# Admin → Overview — over-quota / usage stats
```

## 6. After alerts fire

1. Admin → **Users** / **Billing** — heavy users or failed payments  
2. Admin → **Plans** — tighten free tier if needed  
3. Cloud Console → **Billing → Reports** — filter by service (Cloud Run, Firestore, etc.)
