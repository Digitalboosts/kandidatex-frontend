# Kandidatex

An interviewer watches a candidate's laptop screen live, through a camera the candidate points at it. The candidate
runs the whole session in the browser from the joining link; there is nothing to install.

This repository is a single Next.js app with two sides:

- for interviewers: live video, status cards, warnings, event timeline;
- for candidates, at `/join/<id>`: guides them to frame the screen with their camera, then streams it.

| Folder | What |
| --- | --- |
| `src/app`, `src/components`, `src/lib` | Pages, components and client logic |
| `src/detection` | The OpenCV screen detection engine, readiness score and calibration rules |
| `src/types` | Types matching the API's JSON |
| `test` | Unit tests for the detection engine |
| `e2e` | Playwright tests in a real browser |

The API (accounts, interviews, LiveKit tokens, the monitoring timeline) is a separate Python server at
`http://20.244.10.52:9090`, documented in [docs/API.md](docs/API.md). The dashboard proxies `/api/*` to it, so this
repo has no backend or database of its own.

The system does screen monitoring only. It has no face detection, recognition, tracking or analysis. The readiness
score says how well the camera can see the screen. It is not an accuracy figure or a cheating probability, and
nothing here verifies what is on the screen.

## Status

Working and tested: the dashboard, the detection engine and browser stream analysis. Candidates join and run
calibration in the browser.

**Not yet verified:**

- Video through a real LiveKit server. The test exists (`e2e/streaming.spec.ts`) but hasn't been run.
- The candidate's joining page with a real camera pointed at a real laptop, in phone and desktop browsers.
- Detection thresholds on real camera footage. They're tuned on rendered scenes.

See [docs/TESTING.md](docs/TESTING.md) for how to run these and the manual camera checklist.

## How it fits together

```
 Candidate (browser, /join/<id>)     LiveKit                         Interviewer (browser)
 calibration: camera + opencv.js     ┌─────────┐  live video         opencv.js analyzes the
 live: WebRTC camera ──────────────► │   SFU   │ ───────────────────► received video in a worker
                                     └────┬────┘                          │
        │ join, status, events            │ webhooks                      │ status, events
        ▼                                 ▼                               ▼
                     API server (Python, docs/API.md), through the dashboard's /api proxy
                            │ pushes events and status into the room
```

The same detection engine runs in both browsers. During calibration the candidate's browser runs it on its own camera
preview. Once streaming starts, the interviewer's dashboard runs it on the video it receives, so the live result can't
be faked by the candidate's side. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains this and its trade-offs.

## Quick start

You need Node 22.11 or newer (`nvm use` picks up `.nvmrc`). The API server and LiveKit are already running elsewhere,
so there's nothing else to start.

```sh
npm install
cp .env.example .env   # optional: BACKEND_URL defaults to the Python API server
npm run dev            # http://localhost:3000
```

Open http://localhost:3000/register and create an account. Candidates join from the link in the browser.

## Try the whole flow

1. On the dashboard, create an interview. You get an interview ID and a joining link.
2. Open the joining link in a browser (on a phone, or a computer with a webcam). The ID is filled in: enter the
   candidate's name and accept the monitoring notice.
3. Allow camera and microphone access when the browser asks, and pick a camera (the back camera is the default).
4. Point the camera at a laptop until the readiness score passes the threshold and Continue enables. Detection runs
   in the browser with opencv.js.
5. On the dashboard, select **Open live monitor**. The candidate's live video appears, with status and events updating.
6. Select **End session**. The candidate's page shows that the session ended.

Browsers only allow the camera on a secure page: `http://localhost` works for testing on the same computer, but a
phone on your network needs the dashboard served over https, and the API server must then hand out a `wss://`
LiveKit address.

## Documentation

| Topic | File |
| --- | --- |
| Design and trade-offs | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Detection engine, thresholds and tuning | [docs/SCREEN_DETECTION.md](docs/SCREEN_DETECTION.md) |
| REST API (the Python server) | [docs/API.md](docs/API.md) |
| Environment variables | [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) |
| Tests | [docs/TESTING.md](docs/TESTING.md) |
| Deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Security and privacy | [docs/SECURITY.md](docs/SECURITY.md) |
