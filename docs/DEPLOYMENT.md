# Deployment

This repo is one Next.js app, deployed from the repository root. It serves both the interviewer pages and the
candidate's joining page. The API server and LiveKit are run separately (see [API.md](API.md)).

## Dashboard

Any Node 22+ host works. On Vercel, import the repository as is: the root directory is the app, and the framework is
detected as Next.js. Elsewhere:

```sh
npm ci
npm run build
npm run start
```

Set `BACKEND_URL` to the API server's address **at build time** if it isn't the default.

`npm run start` listens on the `PORT` environment variable (3000 if unset), so it works on hosts that pick the port.

### Azure App Service (Linux, Node)

- **General settings → Stack:** Node 22 LTS or newer.
- **Environment variables:** `SCM_DO_BUILD_DURING_DEPLOYMENT` = `true`, so `npm install` and `npm run build` run on
  every deployment. `.next/` isn't in git, so the build has to happen there.
- **Startup command:** `npm run start`. Never `npm run dev`.

If the log says the build output is missing, the deployment didn't build. Turn on the setting above and deploy again.

The dashboard must be served over HTTPS: the candidate's browser only allows the camera on a secure page, and the
API's session cookie is `Secure` in production. A candidate page on https can then only connect to a `wss://` LiveKit
address, so the API server must hand one out.

## Checklist

- [ ] Dashboard on HTTPS, and the API server handing out a `wss://` LiveKit address
- [ ] The API server's LiveKit webhook points at its own `/api/livekit/webhook`
- [ ] `npm run test:e2e` passed against the API server you're deploying with
- [ ] The manual camera checklist in [TESTING.md](TESTING.md) passed in phone and desktop browsers
- [ ] Detection thresholds tuned on real footage ([SCREEN_DETECTION.md](SCREEN_DETECTION.md))
- [ ] Legal review of monitoring notices for the places your candidates are

## Limits to know about

- Recording isn't implemented, on purpose. Adding it needs explicit authorization and its own consent step first.
- Screen status needs the interviewer's dashboard open ([ARCHITECTURE.md](ARCHITECTURE.md)).
- The interview ID and the candidate's name are the candidate's only credentials, so treat links as private.
- The API server's rate limits are per IP. Every request reaches it through the dashboard's proxy, so check that it
  sees each visitor's real address (see *Rate limits* in [API.md](API.md)).
