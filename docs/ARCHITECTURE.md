# Architecture

This repo is the web front end: the interviewer dashboard and the candidate's joining page, both in this one
Next.js app. The API is a separate Python server ([API.md](API.md)), reached through the dashboard's `/api/*`
proxy so that the browser only talks to one origin and the session cookie stays first-party.

## Monitoring during a live session

The candidate's whole session runs in the browser, on the joining page (`src/app/join/[id]`). It works
on a phone's browser or on a computer with a webcam pointed at the laptop.

| Phase | Camera | Where detection runs | Reported as |
| --- | --- | --- | --- |
| Calibration | A `getUserMedia` preview on the joining page | In the candidate's browser, opencv.js in a Web Worker | `source: calibration` |
| Live | Published through LiveKit (WebRTC) | In the interviewer's browser, opencv.js in a Web Worker | `source: stream_analysis` |

Both run the same engine (`src/detection`) through the same worker (`src/lib/analyzer.worker.ts`), with the
same thresholds and the same result shape. Calibration samples every 250 ms with no smoothing; the live analysis
samples once a second and smooths over three results. The preview is stopped before LiveKit opens the camera.

The candidate's browser could keep analyzing during the live phase too, but its reports would be the candidate's
word about their own stream. Analyzing the received video on the interviewer's side is what makes the result
trustworthy.

**What this gives us**

- It measures the video the interviewer actually receives, including any loss from compression or a poor network.
- A modified candidate page can't report a good status for a stream that doesn't show one. The server enforces this: a
  candidate token can't post `stream_analysis` status.
- Nothing has to be installed on either side.

**What it costs**

- Screen status and its events only exist while the interviewer's dashboard is open. Connection and camera events
  still come from LiveKit webhooks either way.
- Each browser loads about 14 MB of opencv.js, once: the candidate's on the calibration step, the interviewer's when
  the live page opens.
- Browsers only allow the camera on a secure page (https, or `localhost`), so the dashboard must be served over https
  for candidates on other devices.

## Sources of truth

| Information | Source | Why |
| --- | --- | --- |
| Candidate connected or left, camera published or unpublished | LiveKit webhooks | Independent of any client |
| Screen visibility, clarity, lighting, stability | Dashboard stream analysis | Measures the received video |
| Calibration result | Candidate's browser | Happens before any stream exists |
| Video stalled | Dashboard, from the decoded-frame counter | Stalls raise no track event |
| Network quality | Dashboard, from LiveKit's connection quality | |
| Tab hidden (`app_backgrounded`), reconnecting | Candidate's browser | Only the candidate's browser knows |

Timeline events aren't written by clients. A client names an allowlisted event type, and the API server supplies the
wording and severity. Status changes become events on the API server too ([API.md](API.md#post-apimonitoringstatus-)).

## Real-time delivery

The API server pushes messages into the LiveKit room. Neither participant's token may publish data, so every message
in the room comes from the API server and can't be forged by a participant.

Delivery is best effort, so both clients also poll (dashboard every 5 s, candidate page every 10 s). The database is the record.

## Session lifecycle

```
SCHEDULED ──candidate requests a LiveKit token──► ACTIVE ──end, or room empty 15 min──► COMPLETED
    └────────────end before it started────────────────────────────────────────────────► CANCELLED
```

A candidate joining and calibrating doesn't start the interview. Requesting a LiveKit token does, because that happens
only after calibration passes.

Ending a session updates the database, tells the room, then deletes the room, which disconnects everyone with the
`ROOM_DELETED` reason. The candidate's page can learn about the end three ways: the message, the disconnect, or polling.
