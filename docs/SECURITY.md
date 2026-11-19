# Security and privacy

## The API server

Accounts, sessions, interviews, LiveKit tokens and the timeline are handled by the Python API server. What it
guarantees is described in [API.md](API.md); in summary:

- Interviewer sessions are JWTs lasting 8 hours, set as an `httpOnly` cookie. Logging out invalidates every session of
  that user. A wrong password and an unknown email get the same response.
- Joining needs the interview ID, the matching name and acceptance of the monitoring notice. A wrong name and a wrong
  ID get identical responses. A candidate token works for 4 hours, for one interview only, and stops working once the
  interview ends.
- Roles can't be self-assigned. Admin needs the server's registration code.
- Login, registration and joining are rate limited.
- Candidates can publish camera and microphone only. Interviewers can't publish at all. Neither may publish data, so
  all realtime messages come from the API server.
- Clients can't write event text: they name an allowlisted type and the server supplies the wording.

## The dashboard (this repo)

- The browser only talks to the dashboard's origin. `/api/*` is proxied to the API server, so the session cookie stays
  first-party and no CORS is needed.
- Interviewer pages may not use the camera or microphone (`Permissions-Policy`). Only the candidate's joining page
  (`/join/*`) may.
- The candidate's token is sent as a bearer header, never as a cookie, and is held in memory only: closing the tab
  leaves no credential behind.
- Pages can't be framed (`X-Frame-Options: DENY`).

## Privacy

- Candidates are told about live monitoring and must accept before joining.
- Camera and microphone access are explained before the browser asks for them.
- **Payments go through Razorpay Checkout.** Card and UPI details are entered in Razorpay's own window; the dashboard
  only receives the payment ID, subscription ID and signature, which the API verifies.
- **Recording is opt-in, per session.** Video and audio go through LiveKit to viewers. They are stored only when the
  interviewer selects **Record** on the live monitor: the interviewer's browser then records the candidate's video and
  microphone with `MediaRecorder` and uploads it in chunks to the API, which keeps it in Azure Blob Storage. Only the
  interview's interviewer (or an admin) can list or play recordings. The candidate is told the session may be recorded
  before they consent.
- **Screen application analysis sends frames to the API.** Every 5 seconds the owning interviewer's dashboard sends one
  JPEG of the candidate's video to `POST /api/monitoring/screen-analysis`, where an AI vision model names the
  application on screen. The candidate is told about this before they consent. When a reading is HIGH (review
  recommended) the server stores that frame in the private Azure container `interviews-images`; the dashboard shows it
  only through `/api/screen-alerts/{id}/image`, which needs the interviewer's (or an admin's) session, never through the
  blob URL.
- **AI summaries see text only.** The per-interview summary is written from the stored alerts' text; screenshots and
  blob URLs are never sent to the model. Summaries and alerts are labelled as prompts for review, not verdicts. Calibration frames still stay in the
  candidate's browser, and the camera-framing analysis still runs locally and sends only measurements.
- Status readings describe camera framing only. They don't verify screen contents and aren't evidence of cheating, and
  the UI says so. A screen-application "Review recommended" flag is likewise a prompt to look, never labelled as
  cheating.
- There is no face detection, recognition, tracking or analysis anywhere in the system.

## Before production

Monitoring candidates is regulated in many places, so get legal review of your notice, retention of timeline data and
any employment-law requirements, recording consent rules (some places require every party's consent) and how long
recordings are retained.
