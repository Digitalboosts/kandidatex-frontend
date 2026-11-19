# Environment variables

Copy `.env.example` to `.env` if you need to change anything. `.env` files are ignored
by git.

The API's own settings (database, JWT secret, LiveKit keys, readiness threshold, admin registration code) live on the
Python API server, not in this repo. See [API.md](API.md).

## The app

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `BACKEND_URL` | No | `http://20.244.10.52:9090` | The API server that `/api/*` is proxied to. Read when `next build` runs, so rebuild after changing it |
| `SITE_URL` | No | `http://localhost:3000` | The public address of the site, used for absolute Open Graph and canonical URLs on the landing page |

## Tests

| Variable | Purpose |
| --- | --- |
| `DASHBOARD_URL` | Dashboard the e2e tests open. Defaults to `http://localhost:3000` |
| `PLAYWRIGHT_CHANNEL` | Browser for e2e tests. Defaults to the installed Chrome; empty uses Playwright's Chromium |
