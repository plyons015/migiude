# Phase 3 — Data layer & dashboard

## Storage

| Layer | Path | Fallback |
|-------|------|----------|
| **Firestore** | `users/{uid}/notes`, `users/{uid}/todos` | — |
| **IndexedDB** | `migiude-offline` vault per user | Used offline + cache on sync |

Every write goes to **local first**, then Firestore when configured and signed in.

## Pages

- **`/dashboard/`** — quick actions, recent notes, due-soon todos
- **`/notes/`** — note editor, list, todos tab (`?tab=todos`)
- **`/listen/`** — save transcript / AI output to notes & todos

## Reminders

- Set **1-hour reminder** on a todo (bell icon on Notes → Todos tab)
- Uses **Web Notifications API** (not FCM yet — add `@capacitor/push-notifications` in Phase 5 for reliable Android background alerts)

## Deploy Firestore indexes

```bash
npx firebase-tools@latest deploy --only firestore:indexes
```
