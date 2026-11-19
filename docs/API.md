# Interview Monitoring API

**Base URL: `http://20.244.10.52:9090`**. Every route is under `/api`.

The API is a separate Python server. This repo has no backend of its own: the dashboard proxies `/api/*` to this
server (`BACKEND_URL`, see [ENVIRONMENT.md](ENVIRONMENT.md)), so the browser only ever talks to the dashboard's origin.

Health check (to confirm the server is up): <http://20.244.10.52:9090/api/health> → `{"status":"ok"}`

The server also generates live, interactive documentation from its code:

| URL | What |
| --- | --- |
| <http://20.244.10.52:9090/docs> | Swagger UI. Try every endpoint, with an **Authorize** button |
| <http://20.244.10.52:9090/redoc> | ReDoc reference |
| <http://20.244.10.52:9090/openapi.json> | Machine-readable schema. Import it into Postman or Insomnia, or generate a typed client |

This file is the written guide. The API is **identical to the Next.js backend it replaced** (same paths, same JSON,
same status codes), so the dashboard needed no code changes, only the new address.

---

## Conventions

* Requests with a body: `Content-Type: application/json`, at most **64 KB** (`415` / `413` otherwise).
* JSON field names are **camelCase**.
* Timestamps: ISO 8601 UTC with milliseconds, e.g. `2030-01-02T10:00:00.000Z`.
* Every `/api` response carries `Cache-Control: no-store`.
* Errors always have this shape:

```json
{ "error": { "code": "validation_error", "message": "Invalid request", "details": [ { "code": "string_too_short", "path": ["password"], "message": "Password must be at least 10 characters" } ] } }
```

`details` is only present for `validation_error`. Each issue has `code`, `path` and a human-readable `message`.

| Status | `error.code` | Meaning |
| --- | --- | --- |
| 400 | `validation_error`, `invalid_json` | Bad input or malformed JSON |
| 401 | `unauthorized`, `invalid_credentials` | Not signed in, token invalid, expired or logged out, or a wrong login |
| 403 | `forbidden`, `invalid_admin_code` | Signed in but not allowed |
| 404 | `not_found` | Unknown interview. Also returned for a **wrong candidate name** on `join` |
| 409 | `email_taken` | Email already registered |
| 410 | `interview_ended` | Session already ended |
| 413 / 415 | `payload_too_large` / `unsupported_media_type` | Bad body |
| 429 | `rate_limited` | Slow down (limits below) |
| 503 | `livekit_unavailable`, `database_unavailable` | A dependency is down |
| 500 | `internal_error` | Unexpected |

## Authentication

Two kinds of session, both JWTs (HS256):

| Who | Obtain with | Lifetime | Scope |
| --- | --- | --- | --- |
| **Interviewer / admin** | `POST /api/auth/login` or `/register` | 8 h | Their own interviews (admins: all) |
| **Candidate** | `POST /api/interviews/{id}/join` | 4 h | That one interview only |

Send the token as `Authorization: Bearer <token>`. Interviewer tokens are also set as the **httpOnly cookie**
`im_session`, so browser dashboards can rely on the cookie alone. `POST /api/auth/logout` bumps the user's
`sessionVersion`, which invalidates **all** their tokens, not just the current one.

Legend used below: 🔓 public · 👤 interviewer/admin · 🧑 candidate · 👤🧑 either.

---

## Auth

### `POST /api/auth/register` 🔓
Creates an interviewer (or an admin when `adminCode` equals the server's `ADMIN_REGISTRATION_CODE`), and signs them
in immediately. Limit: 10/hour/IP.

```json
// request
{ "name": "Dana Reviewer", "email": "dana@example.com", "password": "at-least-10-chars", "adminCode": "optional" }
```
* `name` 1–120 (trimmed) · `email` valid, ≤254, stored lower-case · `password` 10 chars – 72 bytes · `adminCode` optional.
* Unknown fields (e.g. `role`) are ignored, so roles can't be self-assigned.

```json
// 201 (also sets the im_session cookie)
{ "token": "eyJhbGciOi…", "user": { "id": "c…", "name": "Dana Reviewer", "email": "dana@example.com", "role": "INTERVIEWER", "createdAt": "2030-01-02T10:00:00.000Z" } }
```
Errors: `400`, `403 invalid_admin_code`, `409 email_taken`, `429`.

### `POST /api/auth/login` 🔓
```json
{ "email": "dana@example.com", "password": "…" }
```
`200` → same body as register (and sets the cookie). A wrong password and an unknown email give the **same**
`401 invalid_credentials`. Limits: 30/10 min/IP and 10/10 min/email.

### `POST /api/auth/logout` 👤
Body: `{}`. `200 { "ok": true }`. Clears the cookie and invalidates every session of this user.

### `GET /api/auth/me` 👤
`200 { "user": { …UserDTO } }`

---

## Interviews

### `POST /api/interviews` 👤
```json
{ "title": "Backend engineer", "candidateName": "Sam Candidate", "scheduledAt": "2030-01-02T10:00:00Z" }
```
`title` 1–200, `candidateName` 1–120, `scheduledAt` optional or null, ISO 8601 **with** a UTC offset.

`201`:
```json
{ "interview": {
  "id": "7K2M-9QXT-4HVB", "title": "Backend engineer", "interviewerId": "c…", "candidateName": "Sam Candidate",
  "status": "SCHEDULED", "livekitRoomName": "interview-7K2M-9QXT-4HVB",
  "scheduledAt": "2030-01-02T10:00:00.000Z", "startedAt": null, "endedAt": null,
  "createdAt": "…", "candidateJoinedAt": null, "monitoringStatus": null } }
```
The `id` is what the candidate types or receives in a link (Crockford base32, no I/L/O/U).

### `GET /api/interviews` 👤
`200 { "interviews": [InterviewDTO] }`. Newest first, at most 200. Admins see all, interviewers their own.

### `GET /api/interviews/{id}` 👤🧑
Interviewers and admins get the full `InterviewDTO` (with `monitoringStatus`). A **candidate** gets the reduced view,
and only for their own interview (`403` otherwise):
```json
{ "interview": { "id": "…", "title": "…", "candidateName": "…", "status": "ACTIVE", "startedAt": "…", "endedAt": null } }
```
`id` tolerates lower case, spaces and look-alike letters (`o→0`, `i/l→1`).

### `POST /api/interviews/{id}/join` 🔓
The candidate joins. Limit: 20/10 min/IP.
```json
{ "candidateName": "Sam Candidate", "consentAccepted": true }
```
`consentAccepted` **must be `true`** (else `400`). Name matching ignores case and extra spaces.
A wrong name and a wrong ID return the **same** `404`, so IDs can't be discovered. Ended interviews return `410`.

`200`:
```json
{ "token": "<candidate token>", "interview": { …CandidateInterviewDTO }, "readinessThreshold": 80 }
```
Records the `consent_accepted` and `candidate_joined` timeline events.

### `POST /api/interviews/{id}/end` 👤🧑
Body `{}`. Ends the session for everyone: broadcasts `session_ended` into the LiveKit room, then deletes the room.
Status becomes `COMPLETED` if it had started, otherwise `CANCELLED`. Safe to call twice. Returns `{ "interview": … }`
(the full DTO for interviewers, the reduced one for candidates). After this, candidate tokens get `410` on every action
but can still `GET` the interview.

### `GET /api/interviews/{id}/events` 👤 (owner or admin)
Query: `after` (ISO time, only newer events), `limit` (1–500, default 200). Oldest first.
```json
{ "events": [ { "id": "c…", "interviewId": "…", "eventType": "screen_lost", "message": "Screen is no longer detected.", "severity": "CRITICAL", "metadata": { "visibilityPercentage": 0 }, "createdAt": "…" } ] }
```
`severity` is `INFO | WARNING | CRITICAL`.

---

## LiveKit

### `POST /api/livekit/token` 👤🧑
```json
{ "interviewId": "7K2M-9QXT-4HVB" }
```
```json
{ "token": "<livekit jwt>", "url": "wss://livekit.example.com", "roomName": "interview-7K2M-9QXT-4HVB", "identity": "candidate-7K2M-9QXT-4HVB", "expiresInSeconds": 600 }
```
* Creates the room if needed. Use `token` and `url` with the LiveKit client SDK.
* **A candidate's first call starts the interview** (`SCHEDULED → ACTIVE`, sets `startedAt`). The interviewer's call doesn't.
* The candidate's identity is always `candidate-<id>` (a second device replaces the first). The interviewer's is
  `interviewer-<userId>`.
* Candidates can publish camera and microphone only. Interviewers are subscribe-only. **Nobody can publish data**, so
  every realtime message in the room is sent by this server.
* `410` if ended · `503 livekit_unavailable` if LiveKit can't be reached (the interview isn't started in that case) ·
  limit 30/min/user.

### `POST /api/livekit/webhook` (LiveKit only)
Not for the frontend. Configure LiveKit's webhook to this URL. Requests must be signed by LiveKit (a JWT in
`Authorization` covering the raw body, else `401`). Converts LiveKit events into timeline events (`monitoring_started`,
`candidate_left`, `camera_connected`, `camera_disconnected`, `interviewer_joined`, `interviewer_left`), and closes an
`ACTIVE` interview when its room finishes. Redeliveries are de-duplicated by webhook id. Always answers
`200 { "ok": true }` once the signature is valid.

### Realtime messages (sent into the room, topic `monitoring`)
Reliable JSON data packets:
```json
{ "type": "event",  "event": { …MonitoringEventDTO } }
{ "type": "status", "status": { …MonitoringStatusDTO } }
{ "type": "session_ended", "interviewId": "…", "endedBy": "interviewer" | "candidate" | "system" }
```
Delivery is best effort, so clients also poll `GET /api/interviews/{id}` and `…/events`.

---

## Monitoring

### `POST /api/monitoring/events` 👤🧑
```json
{ "interviewId": "7K2M-9QXT-4HVB", "eventType": "network_unstable", "metadata": { "rttMs": 900 } }
```
`metadata` is optional: at most 16 keys (names ≤60), string values ≤300 chars. Clients choose only from an allowlist;
the **message and severity come from the server**:

| Reporter | Allowed `eventType` |
| --- | --- |
| Candidate 🧑 | `camera_permission_error`, `calibration_passed`, `candidate_reconnecting`, `candidate_reconnected`, `network_unstable`, `network_recovered`, `app_backgrounded`, `app_foregrounded` |
| Interviewer 👤 | `video_stopped`, `video_resumed`, `network_unstable`, `network_recovered` |

Anything else → `403`. `201 { "event": MonitoringEventDTO }`. Limit 60/min per interview and side. `410` once ended.

The candidate's joining page reports `app_backgrounded` and `app_foregrounded` when its browser tab is hidden and shown.

### `POST /api/monitoring/status` 👤🧑
```json
{
  "interviewId": "7K2M-9QXT-4HVB", "source": "stream_analysis", "screenDetected": true,
  "visibilityPercentage": 90, "clarity": "good", "lighting": "good", "stability": "stable",
  "alignment": "correct", "readinessScore": 95
}
```
| Field | Allowed |
| --- | --- |
| `source` | `calibration` (candidate only) · `stream_analysis` (interviewer only). The wrong side gets `403` |
| `visibilityPercentage`, `readinessScore` | integers 0–100 (numbers, not strings) |
| `clarity` | `good` `fair` `poor` |
| `lighting` | `good` `low` `high` |
| `stability` | `stable` `moderate` `unstable` |
| `alignment` | `correct` `off_center` `skewed` `too_close` `too_far` `cut_off` `unknown` |

Saves the latest status (one row per interview) and broadcasts it. For `stream_analysis` only, it also derives
timeline events: `screen_detected`, `screen_lost`, `visibility_dropped` (falls below 70), and `positioning_corrected`
(recovers to ≥80).

`200`:
```json
{ "status": { "id": "…", "interviewId": "…", "source": "stream_analysis", "screenDetected": true, "visibilityPercentage": 90, "clarity": "good", "lighting": "good", "stability": "stable", "alignment": "correct", "readinessScore": 95, "updatedAt": "…" },
  "events": [ { …MonitoringEventDTO } ] }
```
Limit 120/min per interview and side. `410` once ended.

---

## Analytics

### `GET /api/analytics/overview` 👤
Own interviews (admins: all). `interviewsByDay` covers the last 14 UTC days, oldest first; `eventsBySeverity` covers
the same period.
```json
{ "totals": { "total": 3, "active": 1, "completed": 0, "upcoming": 1 },
  "interviewsByDay": [ { "date": "2030-01-01", "count": 0 }, … ],
  "eventsBySeverity": [ { "severity": "INFO", "count": 5 }, { "severity": "WARNING", "count": 1 }, { "severity": "CRITICAL", "count": 0 } ] }
```
(`upcoming` = `SCHEDULED`.)

## Health

### `GET /api/health` 🔓
`200 { "status": "ok" }` when the database answers, otherwise `503 database_unavailable`. Use it for platform health
checks.

---

## Data types

```ts
type UserRole = 'ADMIN' | 'INTERVIEWER';
type InterviewStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type EventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
```
Full schemas for every request and response are at `/docs` → *Schemas*, or in `/openapi.json`. The TypeScript types
the dashboard uses are in `src/types/index.ts`.

## Rate limits (summary)

| Key | Limit |
| --- | --- |
| register | 10 / hour / IP |
| login | 30 / 10 min / IP, 10 / 10 min / email |
| join | 20 / 10 min / IP |
| livekit token | 30 / min / user (or interview) |
| events | 60 / min / interview & side |
| status | 120 / min / interview & side |

Limits are held in process memory (one instance). Running several instances needs a shared store such as Redis.
For `X-Forwarded-For`, the **rightmost** entry (added by your own proxy) is used as the client IP.

## Calling the API from a browser on another domain

Same-origin use, where the dashboard proxies `/api/*` to this server as it does today, needs nothing. If a browser
calls the API directly on a different domain, set `CORS_ORIGINS` on the server, send `credentials: 'include'` from the
client, and use `COOKIE_SAMESITE=none` (HTTPS required). Or skip cookies and send the `Authorization: Bearer` token.
These are settings on the API server, not in this repo.
