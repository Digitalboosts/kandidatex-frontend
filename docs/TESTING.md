# Tests

```sh
npm test            # detection engine (vitest)
npm run typecheck
npm run lint
npm run test:e2e    # dashboard and candidate page, in a real browser
```

## Detection engine: `test`

No services needed.

- `detection.test.ts` runs the engine with **real OpenCV** (opencv.js) on rendered desk scenes: a good screen, a dark
  theme, no screen, cut-off screens, wrong-shaped rectangles, blur, poor lighting, movement, memory leaks and row
  padding.
- `analysis.test.ts` covers the score, the readiness gate, contour filtering and smoothing.

## End to end: `e2e`

Starts the dashboard if it isn't running, and uses the API server it proxies to (`BACKEND_URL`). Uses your installed
Chrome.

**These tests create accounts and interviews on that API server.** Point `BACKEND_URL` at a test server rather than
the one real interviews use.

**Creating interviews needs a paid plan.** A freshly registered account has none, so set `E2E_ADMIN_CODE` to the
server's `ADMIN_REGISTRATION_CODE`: the accounts that create interviews then register as admins, who aren't limited.
Without it, every test that creates an interview gets `402 subscription_required`. The overview-count test skips
itself in admin mode, because an admin's totals include everyone's interviews.

| File | Needs | Covers |
| --- | --- | --- |
| `interview-flow.spec.ts` | API server | Accounts, interviews, the candidate's joining page, candidate API, live timeline, ending, access control |
| `subscription.spec.ts` | API server | What an account without a plan sees: blocked creation, 402, the billing page |
| `recording.spec.ts` | API server, `E2E_ADMIN_CODE` | Screen analysis validation, chunked recording upload, history and playback |
| `analyzer.spec.ts` | API server | The real worker and opencv.js analyzing a real `<video>` element |
| `streaming.spec.ts` | API server and its LiveKit | Real media through LiveKit: publisher to dashboard, analyzer finds the screen, ending disconnects the publisher |

`streaming.spec.ts` skips itself when the LiveKit address the API hands out can't be reached. A browser with a fake camera plays the candidate's
part, publishing with the same tokens.

## Manual: the candidate's joining page with a real camera

Calibration and streaming depend on a real camera pointed at a real screen, so check them by hand, in a phone's
browser and on a computer with a webcam. A phone's browser only allows the camera over https, so for a phone on the
same Wi-Fi run `npm run dev:https` and open `https://<your computer's LAN IP>:3000/join/<id>`. The certificate is
self-signed, so the phone warns once; continue past the warning.

- [ ] A laptop in view reaches the threshold, and Continue enables
- [ ] Covering the camera or pointing it away drops the score and disables Continue
- [ ] Each instruction appears when it should, and left and right are the correct way round
- [ ] The outline sits on the screen in the preview, on both cameras
- [ ] Video appears on the dashboard after Continue, and the status cards update
- [ ] Moving the camera off the screen raises a dashboard warning and a notice on the candidate's page
- [ ] Going offline shows reconnecting, and coming back recovers
- [ ] Blocking camera permission shows how to allow it in the browser
- [ ] Switching tab or locking the phone adds a timeline event
- [ ] Ending from either side ends both
