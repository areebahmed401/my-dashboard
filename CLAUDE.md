# my-dashboard

Personal work dashboard: domains Study, Job Search, German, Claude (+ Calendar tab). Domain → Project → Task.

## Stack
Vite + React 19 + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite`, no config file; `@import 'tailwindcss'` in `src/index.css`).
Deployed to GitHub Pages by `.github/workflows/deploy.yml` on push to `main`: https://areebahmed401.github.io/my-dashboard/

## Commands
- `npm run dev`: local dev server
- `npm run build`: typecheck + build (use as the main check)
- `npm run lint`: oxlint

## Gotchas
- `base: '/my-dashboard/'` in `vite.config.ts`; reference public assets via `import.meta.env.BASE_URL`.
- Tabs use hash routing (`#study`, `#claude`, ...), so no server rewrites are needed on Pages.
- Data (planned): private repo `my-dashboard-data` holding `data.json`, read/written via GitHub API with a fine-grained token kept in the browser. Never commit tokens or task data to this public repo.
- Calendar (planned): Google Calendar API via Google Identity Services OAuth in the browser.
