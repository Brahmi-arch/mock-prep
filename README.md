# Mock Preparation AI — working local prototype

A responsive, consent-based **AI mock interview studio** for **UI/UX designers**. Built with **HTML, CSS, JavaScript, FastAPI, SQLite, and Gemini**. **No API credentials are present in frontend source code.**

**Status:** Tested backend/API interactions and a browser UI flow with simulated server responses. Actual Gemini requests, hardware permissions, real microphone transcription, WebRTC between different devices and MediaPipe CDN loading **must be tested on your machine/network**. This is a working local application, **not a certified exam proctor or production-grade deployment**.

## Run it (Mac / Linux)

1. Install **Python 3.10+** and Chrome or Edge.
2. Extract this ZIP and open Terminal in `mock-preparation-ai-final`.
3. Run `cp .env.example .env`.
4. Open `.env` in a text editor. Set `GEMINI_API_KEY=your_actual_new_key` using a **valid Gemini API key from Google AI Studio**. Keep this secret; never add it to browser JS or commit it to Git. The app still has a clearly labeled demo mode if no key is provided.
5. Run `bash run.sh`.
6. Open **http://127.0.0.1:8000** in Chrome or Edge. Create your account and start a practice.

Windows: copy `.env.example` to `.env`, edit it, and double-click **run.bat** from within the unzipped folder. If Windows blocks the batch file, open Command Prompt in the folder and run `run.bat` manually.

If you want to use a different port, edit `run.sh` / `run.bat`, or run:

```bash
python -m pip install -r requirements.txt
python -m uvicorn server:app --env-file .env --host 127.0.0.1 --port 8000
```

**A URL on localhost works only on that computer.** This ZIP doesn't create a public website.

## What works

| Function | Implementation |
| --- | --- |
| Account registration and sign-in | Password hashing (scrypt), HttpOnly session cookies, local SQLite |
| AI question generation | Gemini REST `generateContent` via server-side key |
| AI follow-up questions | Gemini can ask a new question based on the previous saved answer |
| AI question voice | Browser text-to-speech (`speechSynthesis`) |
| Spoken answers | Browser live speech recognition where supported; Gemini audio transcription fallback / refinement |
| Typed responses | Editable response text boxes for accessibility and transcription corrections |
| AI performance report | Gemini scores UX content and gives interview coaching grounded in transcripts |
| Device check | Browser camera and microphone permission prompts |
| Screen share | User-selected screen/window/tab via browser screen capture picker |
| Session recording | Browser MediaRecorder saves composite screen/camera/optional extra video plus mic audio to the local server |
| Face presence | Optional, local MediaPipe Face Landmarker checks face count, rough head orientation and tentative eye-landmark direction; records no-face/multiple-face/turned events |
| Microphone signals | Actual microphone captured; low signal event; optional AI audio cues, explicitly uncertain |
| Browser activity | Visibility change, lost focus, fullscreen exit, screen share stopped, permissions/device loss, offline events |
| Extra camera | A second local webcam, or a phone using token-authorized WebRTC signaling (HTTPS and reachable server needed) |
| Progress | Local database sessions, answer-quality trend, replay, exports, deletion |
| Mood | Student self-reported energy/feeling check-in, **not** camera-inferred mood |

**If Gemini isn't configured, is invalid, is rate-limited, or is offline:** questions fall back to a labeled sample set and reports become **unscored rule-based summaries**. The UI never claims that this fallback is AI evaluation. Audio-to-text then relies on browser speech recognition or typed answers.

## How to use the interview

1. **Dashboard → New practice**. Enter a UI/UX role or topic and choose difficulty/number of questions.
2. Review permission checkboxes. For full recording, enable camera, microphone, screen, and **Save recording**.
3. Click **Check camera/mic** if you want to verify devices. Click **Start** and explicitly select the screen/window/tab to share if prompted.
4. AI asks the question aloud (browser voice). Click **Start answering**. Speak naturally. **Stop answering** when done; correct transcript as needed. Click **Save & next**.
5. Optionally pause / resume recording. Additional webcam or tokenized phone video can appear as a second camera feed.
6. Click **End & report** or complete all questions. The recording is uploaded to the local server, and Gemini evaluates the interview transcript. Review your report and events separately.
7. Return to **Sessions & progress** to compare attempts, play recordings, export JSON, or delete sessions.

## Screen capture and recording notes

- Use a desktop Chrome or Edge browser for the best compatibility. Camera/mic/screen capture depends on the browser, operating system, permissions and device support.
- The screen sharing picker **must** be explicitly invoked by the user each time. Some browsers can't capture a given source or include system audio.
- The browser can record what the student selects to share. It **cannot** silently capture the whole device, see into unshared applications, block OS-level apps, or run a real lockdown browser.
- Data is stored in `storage/app.sqlite3` and `storage/recordings/{session-id}/` on your machine. **The local storage is not encrypted at rest.** Do not share this folder.
- Screen recording may include private data. Confirm you are not displaying confidential content before sharing.
- Recording quality and upload size are limited by your machine. Very large video files (more than 250 MB) are rejected. Stop and save shorter sessions.
- If you stop a session and later resume, the new video segment replaces the previous session recording; saved textual answers remain. This is a current limitation.
- While typing, a temporary sessionStorage draft can protect against an accidental refresh in the same tab. It is not a synchronized backup.

## Facial recognition and integrity limitations (important)

The application implements **face detection and landmark tracking**, **not identity recognition**. An account password is used to sign in, and an optional camera check-in photo can be kept for manual review. Reliable biometric identity matching would require a properly consented biometric workflow, anti-spoof/liveness tests, careful bias and accuracy evaluation, and privacy/security review.

MediaPipe detects face landmarks locally after the student opts in and after its model loads over the internet. It flags a missing face, multiple faces, estimated head turn, or an uncertain possible side glance for review. **Eye direction is only a rough landmark heuristic; it does not reliably establish gaze, intent, wrongdoing, identity, mood, or whether the person is cheating.** Face detection may fail with poor light, occlusion, unusual angles, low-quality cameras, or a network error.

Microphone captures audio. Gemini may return **possible** hints about overlapping voices, whispers, clipping, and background noise in an individual response recording. These hints are not independently verified; the system does **not** identify unauthorized devices, determine speaker identity, or prove malpractice. Event metadata does not influence the report score.

## Secondary phone camera

The main session page has an **Invite phone** action under **Second camera** when you have opted in. It generates a short-lived invitation link. The phone accesses its camera only when the user taps Allow. Signaling is relayed via WebSocket; media streams peer-to-peer over WebRTC.

**This will not work by opening a `127.0.0.1` link on another phone**: that address means the phone itself. To use a phone, make this server reachable via HTTPS through your own secure reverse proxy or HTTPS tunnel, then open the generated link using that hostname. A TURN server may be required on difficult networks. This package bundles a STUN server but no TURN credentials. The phone integration has not been verified over a real multi-device network in this environment.

Do not expose the prototype's HTTP server to the public internet without HTTPS, secure cookies, rate-limiting, stronger authentication, storage controls, a TURN deployment as needed, and a security review.

## Technical architecture

```
static/index.html + style.css + app.js   (browser UI, optional MediaPipe, recording)
static/secondary.html + secondary.js     (phone camera WebRTC)
                       |
                   FastAPI /api
                    /      \
          local SQLite     Gemini API over HTTPS
          recordings       questions, transcription, coaching
```

- `server.py`: SQLite, authentication, Gemini adapter, interview state, media and report endpoints, WebRTC signaling.
- `static/app.js`: UI state, consent, MediaRecorder, Web Speech, MediaPipe, event logging, optional phone camera, reports.
- `tests/test_api.py`: backend integration tests. These tests stub Gemini and do not send real requests to Google.
- `.env.example`: safe credential template. Your actual `.env` stays out of ZIP and Git.

## Test locally

```bash
python -m pip install -r requirements.txt
python -m pip install pytest
PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 pytest -q tests/test_api.py
```

Backend integration test cases cover registration/authentication, interview creation, answer/event saving, rule-based and stubbed Gemini reports, transcription stub, media permission checks, downloads, invitation link generation and deletion.

## Deployment / future production work

Before treating it as a production or formal examination system: add encrypted storage, user account recovery, rate limits, database backups, data retention limits, device enrollment and biometric safeguards if truly necessary, rigorous accuracy/bias evaluations, documented consent and revocation, security testing, WebRTC TURN and HTTPS, long-session chunked video uploads, background worker queues, accessibility testing, and an actual native or managed lockdown solution **if your use case genuinely requires one**. This app is designed for **practice coaching**, not disciplinary automated decisions.

## Documentation used

- Gemini REST generateContent: https://ai.google.dev/api/generate-content
- MediaPipe Face Landmarker Web: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js
- MDN Screen capture: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- MDN WebRTC: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
# mock-prep
# mock-prep
# mock-prep
# mock-prep
