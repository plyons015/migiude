# Knowledge base (in-app + repo)

Articles live in `lib/help/articles/` and render in the app under `/help/<slug>/`.

| Article | App URL | Source |
|---------|---------|--------|
| Teams, Zoom & Google Meet | `/help/teams-zoom-meet/` | `lib/help/articles/teams-zoom-meet.ts` |
| Android mic isolation | `/help/android-mic-isolation/` | `lib/help/articles/android-mic-isolation.ts` |

When editing an article, update the TypeScript source (used in Help hub and static pages). Optionally mirror long-form notes in `docs/knowledge-base/*.md` for reviewers who prefer markdown in the repo.
