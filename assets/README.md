# Native asset sources

| File | Source in `docs/` | Used for |
|------|-------------------|----------|
| `icon.png` | `icon.png` | Android launcher icon |
| `splash.jpg` | `P6SY6.jpg` | Android launch splash |

Regenerate Android mipmaps after changing these:

```bash
npm run assets:android
npm run cap:sync
```

Web copies live in `public/branding/` (logo, icon, loading.jpg).
