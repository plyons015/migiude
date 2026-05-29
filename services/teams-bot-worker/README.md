# Teams bot worker (Azure)

Deploy this service **outside** Firebase Hosting. It implements Microsoft Graph **cloud communications** so Ude can join Teams meetings as a disclosed bot.

## Status

**Scaffold only** — production worker not implemented in this repo yet. Firebase Functions queue jobs in `teamsBotJobs/{id}` and POST to:

```
POST {TEAMS_BOT_WORKER_BASE_URL}/jobs/{jobId}/dispatch
```

## Recommended stack

- **.NET** + [Graph communications calling samples](https://github.com/microsoftgraph/microsoft-graph-comms-samples)
- **Azure Bot Service** registration
- App Service or Container Apps with TLS

## Worker responsibilities (v1)

1. Authenticate with app-only Graph credentials (separate from user delegated tokens).
2. On dispatch: load job (meeting URL, user id), join meeting, subscribe to audio.
3. Stream audio to Ude STT (same pipeline as cloud meeting STT).
4. Update job status in Firestore (via Admin SDK or secured HTTP callback).

## Security

- Do not expose user refresh tokens to the worker.
- Validate dispatch requests (shared secret header from Functions).
- Log minimal PII; follow retention policy.

## Local dev

Until the worker exists, the app shows “Bot worker is not deployed yet” and keeps jobs in `queued` status.
