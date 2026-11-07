"""Mock Preparation AI: local-first consent-led UX interview rehearsal server.

Run: uvicorn server:app --host 127.0.0.1 --port 8000
Persistent content: ./storage/. External Gemini key: GEMINI_API_KEY environment variable.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request, Response, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

ROOT = Path(__file__).resolve().parent
STORAGE = ROOT / "storage"
STORAGE.mkdir(exist_ok=True)
DB_PATH = STORAGE / "app.sqlite3"
STATIC = ROOT / "static"
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
API = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
AUTH_COOKIE = "mockprep_session"
MAX_UPLOAD = 250 * 1024 * 1024
MAX_AUDIO = 14 * 1024 * 1024

app = FastAPI(title="Mock Preparation AI", docs_url=None, redoc_url=None)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": f"Server error: {str(exc)}"})

@contextmanager
def db():
    con = sqlite3.connect(DB_PATH, timeout=20)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db():
    with db() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tokens (
          token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
          expires INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS interviews (
          id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, role TEXT NOT NULL,
          topic TEXT NOT NULL, difficulty TEXT NOT NULL, question_count INTEGER NOT NULL,
          questions_json TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL, ended_at TEXT,
          consent_json TEXT NOT NULL, checkin_json TEXT, report_json TEXT,
          report_origin TEXT, recording_file TEXT, photo_file TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS answers (
          interview_id TEXT NOT NULL, idx INTEGER NOT NULL,
          text TEXT NOT NULL, duration REAL NOT NULL DEFAULT 0,
          audio_file TEXT, updated_at TEXT NOT NULL,
          PRIMARY KEY(interview_id,idx),
          FOREIGN KEY(interview_id) REFERENCES interviews(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT, interview_id TEXT NOT NULL,
          kind TEXT NOT NULL, detail TEXT NOT NULL, elapsed REAL NOT NULL,
          created_at TEXT NOT NULL, FOREIGN KEY(interview_id) REFERENCES interviews(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS camera_invites (
          token_hash TEXT PRIMARY KEY, interview_id TEXT NOT NULL,
          expires INTEGER NOT NULL, FOREIGN KEY(interview_id) REFERENCES interviews(id) ON DELETE CASCADE
        );
        """)
        fields = [r[1] for r in c.execute("PRAGMA table_info(interviews)").fetchall()]
        if "checkin_json" not in fields:
            c.execute("ALTER TABLE interviews ADD COLUMN checkin_json TEXT")

init_db()
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")


def utc():
    return datetime.now(timezone.utc).isoformat()


def hashed_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    if hasattr(hashlib, "scrypt"):
        try:
            pwd_hash = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
            return "scrypt:" + salt.hex() + ":" + pwd_hash.hex()
        except (AttributeError, ValueError):
            pass
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return "pbkdf2:" + salt.hex() + ":" + pwd_hash.hex()


def password_ok(password: str, stored: str) -> bool:
    try:
        parts = stored.split(":")
        if len(parts) == 3:
            algo, s, p = parts
            salt = bytes.fromhex(s)
            expected = bytes.fromhex(p)
            if algo == "scrypt":
                if hasattr(hashlib, "scrypt"):
                    trial = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
                    return hmac.compare_digest(trial, expected)
                return False
            elif algo == "pbkdf2":
                trial = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
                return hmac.compare_digest(trial, expected)
            return False
        elif len(parts) == 2:
            s, p = parts
            salt = bytes.fromhex(s)
            expected = bytes.fromhex(p)
            if hasattr(hashlib, "scrypt"):
                trial = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
                return hmac.compare_digest(trial, expected)
            return False
        return False
    except (ValueError, TypeError):
        return False


def user_id(request: Request) -> int:
    token = request.cookies.get(AUTH_COOKIE, "")
    if not token:
        raise HTTPException(401, "Please sign in first.")
    h = hashlib.sha256(token.encode()).hexdigest()
    with db() as c:
        row = c.execute("SELECT user_id FROM tokens WHERE token_hash=? AND expires>?", (h, int(time.time()))).fetchone()
    if not row:
        raise HTTPException(401, "Your session expired. Please sign in again.")
    return row["user_id"]


def owner(request: Request, interview_id: str) -> sqlite3.Row:
    uid = user_id(request)
    with db() as c:
        item = c.execute("SELECT * FROM interviews WHERE id=? AND user_id=?", (interview_id, uid)).fetchone()
    if not item:
        raise HTTPException(404, "Session not found.")
    return item


def safe_filename(interview_id: str, suffix: str) -> Path:
    folder = STORAGE / "recordings" / interview_id
    folder.mkdir(parents=True, exist_ok=True)
    return folder / suffix


def parse_json(raw: str) -> Any:
    data = raw.strip()
    data = re.sub(r"^```(?:json)?\s*|\s*```$", "", data)
    try:
        return json.loads(data)
    except ValueError:
        match = re.search(r"\{[\s\S]*\}", data)
        if match:
            return json.loads(match.group(0))
        raise

async def gemini(prompt: str, *, audio: bytes | None = None, mime: str = "audio/webm") -> Any:
    if not GEMINI_KEY:
        raise HTTPException(503, "Gemini key missing. Set GEMINI_API_KEY in the server environment.")
    parts: list[dict[str, Any]] = [{"text": prompt}]
    if audio is not None:
        parts.append({"inlineData": {"mimeType": mime, "data": base64.b64encode(audio).decode()}})
    payload = {"contents": [{"role": "user", "parts": parts}],
               "generationConfig": {"temperature": 0.55, "responseMimeType": "application/json"}}
    try:
        async with httpx.AsyncClient(timeout=75) as client:
            r = await client.post(API, headers={"x-goog-api-key": GEMINI_KEY}, json=payload)
        if r.status_code >= 400:
            try:
                detail = r.json().get("error", {}).get("message", "Unknown API error")
            except ValueError:
                detail = r.text[:250]
            raise HTTPException(502, f"Gemini returned {r.status_code}: {detail[:360]}")
        doc = r.json()
        candidate = doc["candidates"][0]["content"]["parts"]
        result = "".join(p.get("text", "") for p in candidate)
        return parse_json(result)
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as ex:
        raise HTTPException(502, f"Gemini response error: {str(ex)[:300]}") from ex


class AuthInput(BaseModel):
    name: str = ""
    email: str
    password: str

@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")

@app.get("/second-camera")
def secondary_page():
    return FileResponse(STATIC / "secondary.html")

@app.get("/api/health")
def health():
    return {"status": "ok", "ai_configured": bool(GEMINI_KEY), "model": GEMINI_MODEL,
            "storage": "local", "face_monitoring": "browser MediaPipe optional"}

@app.post("/api/auth/register")
def register(body: AuthInput, response: Response):
    email = body.email.strip().lower()
    name = body.name.strip()[:100]
    if not name or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or len(body.password) < 8:
        raise HTTPException(400, "Enter your name, valid email and password of at least 8 characters.")
    with db() as c:
        if c.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
            raise HTTPException(409, "Email is already registered.")
        cur = c.execute("INSERT INTO users(name,email,password_hash,created_at) VALUES (?,?,?,?)",
                        (name, email, hashed_password(body.password), utc()))
        uid = cur.lastrowid
    set_token(response, uid)
    return {"id": uid, "name": name, "email": email}


def set_token(response: Response, uid: int):
    value = secrets.token_urlsafe(32)
    with db() as c:
        c.execute("INSERT INTO tokens(token_hash,user_id,expires) VALUES (?,?,?)",
                  (hashlib.sha256(value.encode()).hexdigest(), uid, int(time.time()) + 604800))
    response.set_cookie(AUTH_COOKIE, value, httponly=True, samesite="strict", secure=False,
                        max_age=604800, path="/")  # secure=True when deploying behind HTTPS

@app.post("/api/auth/login")
def login(body: AuthInput, response: Response):
    email = body.email.strip().lower()
    with db() as c:
        u = c.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not u or not password_ok(body.password, u["password_hash"]):
        raise HTTPException(401, "Incorrect email or password.")
    set_token(response, u["id"])
    return {"id": u["id"], "name": u["name"], "email": u["email"]}

@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get(AUTH_COOKIE, "")
    if token:
        with db() as c:
            c.execute("DELETE FROM tokens WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),))
    response.delete_cookie(AUTH_COOKIE, path="/")
    return {"ok": True}

@app.get("/api/me")
def me(request: Request):
    uid = user_id(request)
    with db() as c:
        u = c.execute("SELECT id,name,email FROM users WHERE id=?", (uid,)).fetchone()
    return dict(u)

SAMPLE_QUESTIONS = [
    "Tell me about yourself and what motivated you to become a UI/UX designer.",
    "Walk me through your UX design process, from understanding a problem to testing your solution.",
    "How would you improve a confusing checkout flow if users were abandoning it before payment?",
    "Tell me about a design decision in your portfolio that changed after user feedback.",
    "How do you handle conflicting feedback from users, product managers, and developers?",
    "How would you design an accessible mobile service for first-time smartphone users?",
    "Which research method would you choose to understand why an onboarding flow fails, and why?",
    "How would you measure whether a redesign improved the actual user experience?"
]

class NewInterview(BaseModel):
    topic: str = Field(default="UI/UX designer internship", max_length=180)
    difficulty: str = "Intermediate"
    question_count: int = Field(default=5, ge=3, le=8)
    mode: str = "interview"
    consent: dict[str, bool] = Field(default_factory=dict)
    checkin: dict[str, str] = Field(default_factory=dict)

@app.post("/api/interviews")
async def create_interview(request: Request, params: NewInterview):
    uid = user_id(request)
    if params.difficulty not in {"Beginner", "Intermediate", "Advanced"}:
        raise HTTPException(400, "Invalid difficulty.")
    if params.mode not in {"interview", "viva", "presentation"}:
        raise HTTPException(400, "Invalid practice type.")
    questions = SAMPLE_QUESTIONS[:params.question_count]
    mode = "sample"  # explicitly never describe local questions as AI generated
    ai_warning = None
    if GEMINI_KEY:
        prompt = f"""You are a friendly but realistic experienced UI/UX design interviewer.
Create exactly {params.question_count} varied, concise, practical interview questions for a student practicing a {params.mode}.
Role/topic: {params.topic}. Difficulty: {params.difficulty}. Cover UX process, research, usability, accessibility, design thinking, collaboration and portfolio based on relevance.
Return JSON only: {{"questions": ["question 1", "question 2", ...]}}. No model answers."""
        try:
            result = await gemini(prompt)
            draft = result.get("questions", []) if isinstance(result, dict) else []
            if len(draft) != params.question_count or not all(isinstance(q, str) for q in draft):
                raise HTTPException(502, "Gemini returned an invalid question list")
            questions = [q.strip()[:450] for q in draft]
            mode = "gemini"
        except HTTPException as exc:
            ai_warning = f"Gemini unavailable; using clearly labeled sample questions: {exc.detail}"
            questions = SAMPLE_QUESTIONS[:params.question_count]
    iid = secrets.token_urlsafe(12)
    consent = {k: bool(v) for k, v in params.consent.items() if k in {"camera", "microphone", "screen", "face", "record", "secondary"}}
    with db() as c:
        c.execute("""INSERT INTO interviews(id,user_id,role,topic,difficulty,question_count,questions_json,state,created_at,consent_json,checkin_json)
                     VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                  (iid, uid, params.mode, params.topic.strip() or "UI/UX designer", params.difficulty,
                   params.question_count, json.dumps(questions), "active", utc(), json.dumps(consent), json.dumps({"energy": str(params.checkin.get("energy", "Neutral"))[:40], "feeling": str(params.checkin.get("feeling", "Calm"))[:40]})))
    return {"id": iid, "questions": questions, "question_origin": mode, "state": "active", "ai_warning": ai_warning}


def serialize_interview(c: sqlite3.Connection, row: sqlite3.Row, detailed=False):
    item = dict(row)
    item["questions"] = json.loads(item.pop("questions_json"))
    item["consent"] = json.loads(item.pop("consent_json"))
    item["checkin"] = json.loads(item.pop("checkin_json") or "{}")
    item["report"] = json.loads(item.pop("report_json")) if item.get("report_json") else None
    item.pop("report_json", None)
    item["has_recording"] = bool(item.pop("recording_file", ""))
    item["has_photo"] = bool(item.pop("photo_file", ""))
    if detailed:
        item["answers"] = [dict(a) for a in c.execute("SELECT idx,text,duration,audio_file,updated_at FROM answers WHERE interview_id=? ORDER BY idx", (row["id"],))]
        item["events"] = [dict(e) for e in c.execute("SELECT kind,detail,elapsed,created_at FROM events WHERE interview_id=? ORDER BY id", (row["id"],))]
        for a in item["answers"]:
            a["has_audio"] = bool(a.pop("audio_file"))
    return item

@app.get("/api/interviews")
def list_interviews(request: Request):
    uid = user_id(request)
    with db() as c:
        rows = c.execute("SELECT * FROM interviews WHERE user_id=? ORDER BY created_at DESC LIMIT 100", (uid,)).fetchall()
        return [serialize_interview(c, r) for r in rows]

@app.get("/api/interviews/{iid}")
def get_interview(iid: str, request: Request):
    row = owner(request, iid)
    with db() as c:
        return serialize_interview(c, row, True)

class AnswerInput(BaseModel):
    idx: int = Field(ge=0, le=20)
    text: str = Field(default="", max_length=18000)
    duration: float = Field(default=0, ge=0, le=3600)

@app.post("/api/interviews/{iid}/answer")
def save_answer(iid: str, body: AnswerInput, request: Request):
    row = owner(request, iid)
    if row["state"] != "active":
        raise HTTPException(409, "Session has already ended.")
    if body.idx >= row["question_count"]:
        raise HTTPException(400, "Invalid question index.")
    with db() as c:
        c.execute("""INSERT INTO answers(interview_id,idx,text,duration,updated_at)
                     VALUES (?,?,?,?,?) ON CONFLICT(interview_id,idx)
                     DO UPDATE SET text=excluded.text,duration=excluded.duration,updated_at=excluded.updated_at""",
                  (iid, body.idx, body.text.strip(), round(body.duration,1), utc()))
    return {"ok": True}

class EventInput(BaseModel):
    kind: str = Field(max_length=70)
    detail: str = Field(max_length=240)
    elapsed: float = Field(ge=0, le=86400)

@app.post("/api/interviews/{iid}/event")
def log_event(iid: str, body: EventInput, request: Request):
    row = owner(request, iid)
    if row["state"] != "active":
        return {"ok": False, "reason": "ended"}
    with db() as c:
        c.execute("INSERT INTO events(interview_id,kind,detail,elapsed,created_at) VALUES(?,?,?,?,?)",
                  (iid, body.kind.strip(), body.detail.strip(), body.elapsed, utc()))
    return {"ok": True}

async def store_upload(f: UploadFile, destination: Path, max_bytes: int):
    written = 0
    temp = destination.with_suffix(destination.suffix + ".part")
    try:
        with temp.open("wb") as output:
            while chunk := await f.read(1024 * 1024):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(413, "Recording too large. Choose a shorter session.")
                output.write(chunk)
        temp.replace(destination)
    finally:
        await f.close()
        temp.unlink(missing_ok=True)
    return written

@app.post("/api/interviews/{iid}/recording")
async def upload_recording(iid: str, request: Request, file: UploadFile = File(...)):
    row = owner(request, iid)
    if not json.loads(row["consent_json"]).get("record"):
        raise HTTPException(403, "Recording consent was not given.")
    ext = ".mp4" if "mp4" in (file.content_type or "") else ".webm"
    path = safe_filename(iid, "session"+ext)
    size = await store_upload(file, path, MAX_UPLOAD)
    with db() as c:
        c.execute("UPDATE interviews SET recording_file=? WHERE id=?", (str(path), iid))
    return {"ok": True, "bytes": size}

@app.post("/api/interviews/{iid}/checkin")
async def save_checkin(iid: str, request: Request, file: UploadFile = File(...)):
    row = owner(request, iid)
    if not json.loads(row["consent_json"]).get("camera"):
        raise HTTPException(403, "Camera consent required.")
    if file.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(400, "Only JPEG or PNG check-in images are allowed.")
    path = safe_filename(iid, "checkin.jpg" if file.content_type == "image/jpeg" else "checkin.png")
    await store_upload(file, path, 2_000_000)
    with db() as c:
        c.execute("UPDATE interviews SET photo_file=? WHERE id=?", (str(path), iid))
    return {"ok": True, "note": "A manual-review reference image; not an automated identity match."}

@app.post("/api/interviews/{iid}/transcribe/{idx}")
async def transcribe(iid: str, idx: int, request: Request, file: UploadFile = File(...)):
    row = owner(request, iid)
    if idx < 0 or idx >= row["question_count"]:
        raise HTTPException(400, "Invalid question index.")
    if not json.loads(row["consent_json"]).get("microphone"):
        raise HTTPException(403, "Microphone consent required.")
    # Use the uploaded audio directly with Gemini, then store only if explicitly consented to recording.
    mime = (file.content_type or "audio/webm").split(";")[0]
    if mime not in {"audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg", "audio/aac", "audio/x-m4a"}:
        raise HTTPException(415, "Unsupported audio format")
    raw = await file.read(MAX_AUDIO + 1)
    await file.close()
    if len(raw) > MAX_AUDIO:
        raise HTTPException(413, "Answer audio exceeds 14 MB.")
    if not GEMINI_KEY:
        raise HTTPException(503, "Gemini key required for audio transcription. You can still type your answer.")
    answer = await gemini("Transcribe ONLY the student's spoken words accurately from this interview answer audio. "
                          "Report optional audio cues for personal review such as possible overlapping voices, whispering, "
                          "clipping or prolonged noise, ONLY if plainly audible. Do not invent cues, identify a speaker, "
                          "infer devices, detect cheating or assume misconduct. "
                          'Respond JSON: {"transcript": "...", "audio_observations": ["possible sound cue ..."]}. '
                          "If unintelligible return empty transcript and empty observations.", audio=raw, mime=mime)
    transcript = str(answer.get("transcript", ""))[:18000]
    if json.loads(row["consent_json"]).get("record"):
        suffix = ".mp4" if mime == "audio/mp4" else ".webm"
        path = safe_filename(iid, f"answer-{idx}{suffix}")
        path.write_bytes(raw)
        with db() as c:
            c.execute("""INSERT INTO answers(interview_id,idx,text,duration,audio_file,updated_at) VALUES(?,?,?,?,?,?)
                         ON CONFLICT(interview_id,idx) DO UPDATE SET audio_file=excluded.audio_file""",
                      (iid, idx, "", 0, str(path), utc()))
    observations = answer.get("audio_observations", [])
    if not isinstance(observations, list): observations = []
    observations = [str(x)[:160] for x in observations[:3] if isinstance(x, str)]
    return {"transcript": transcript, "origin": "gemini-audio", "audio_observations": observations}

@app.post("/api/interviews/{iid}/next/{idx}")
async def adaptive_question(iid: str, idx: int, request: Request):
    row = owner(request, iid)
    if row["state"] != "active" or idx < 0 or idx >= row["question_count"] - 1:
        raise HTTPException(400, "No next question available.")
    with db() as c:
        answer = c.execute("SELECT text FROM answers WHERE interview_id=? AND idx=?", (iid, idx)).fetchone()
    if not answer or not answer["text"].strip():
        raise HTTPException(400, "Save an answer first.")
    questions = json.loads(row["questions_json"])
    result = await gemini(f"You are a friendly UI/UX designer interviewer. Current question: {questions[idx]}\n"
                          f"Student answer: {answer['text'][:3000]}\nCreate ONE concise relevant follow-up question "
                          "probing the candidate's thinking. Do not give feedback or an answer. Return JSON "
                          '{"question": "..."}.')
    q = str(result.get("question", "")).strip()[:450]
    if not q:
        raise HTTPException(502, "Gemini returned an empty follow-up.")
    questions[idx+1] = q
    with db() as c:
        c.execute("UPDATE interviews SET questions_json=? WHERE id=?", (json.dumps(questions), iid))
    return {"question": q}


def local_report(questions: list[str], answers: list[dict], events: list[dict]):
    durations = sum(a.get("duration", 0) for a in answers)
    words = sum(len(a.get("text", "").split()) for a in answers)
    filled = sum(bool(a.get("text", "").strip()) for a in answers)
    pace = round(words / (durations / 60)) if durations >= 10 else None
    caution = "This is a rule-based summary, not AI assessment. Configure Gemini for content-aware evaluation."
    return {"overall": None, "scores": {}, "summary": f"Answered {filled}/{len(questions)} questions with {words} words. {caution}",
            "strengths": ["Completed a practice attempt"],
            "improvements": ["Add Gemini for detailed answer feedback", "Review your own recording and transcript"],
            "next_steps": ["Review each answer", "Retry the interview with clearer examples"],
            "question_feedback": [{"question": q, "feedback": "Transcript saved for review; AI scoring unavailable."} for q in questions],
            "metrics": {"answer_count": filled, "word_count": words, "approx_wpm": pace, "event_count": len(events)},
            "disclaimer": caution}

@app.post("/api/interviews/{iid}/report")
async def report(iid: str, request: Request):
    row = owner(request, iid)
    questions = json.loads(row["questions_json"])
    with db() as c:
        answers = [dict(x) for x in c.execute("SELECT idx,text,duration FROM answers WHERE interview_id=? ORDER BY idx", (iid,))]
        events = [dict(x) for x in c.execute("SELECT kind,detail,elapsed FROM events WHERE interview_id=? ORDER BY id", (iid,))]
    if GEMINI_KEY:
        qas = [{"question": q, "answer": next((a["text"] for a in answers if a["idx"] == i), ""),
                "response_seconds": next((a["duration"] for a in answers if a["idx"] == i), 0)} for i, q in enumerate(questions)]
        prompt = f"""You are a helpful UX interview coach. Evaluate ONLY the student's actual recorded transcripts, not their appearance or inferred emotions. Give practical, supportive and evidence-grounded feedback. There may be speech-to-text errors. Do not invent achievements, attitudes, speaker identities, or facts. No hiring decision. Proctoring signals are informational and may be false positives; NEVER label cheating or score based on them.
Interview context: {row['topic']}, {row['difficulty']}. Student self-reported check-in (not a grade): {row['checkin_json'] or "none"}. Questions and transcripts: {json.dumps(qas, ensure_ascii=False)}.
Session monitoring metadata (not evidence of wrongdoing): {json.dumps(events[:100], ensure_ascii=False)}.
Return ONLY JSON object with keys: "overall" (integer 0..100 based on answer quality alone or null if insufficient text), "scores" (object with integer values 0..100 for "UX process", "User research", "Problem solving", "Communication" when answer content suffices; omit unassessable metrics), "summary" (2 short sentences), "strengths" (2-4 specific short strings), "improvements" (2-4 actionable short strings), "next_steps" (2-3 focused practice tasks), "question_feedback" (one object per question: {{"question":"...", "feedback":"one concise specific insight"}}), "disclaimer" (short statement about transcript and monitoring limitations). Base scores only on evidence provided, give null overall if no answer. """
        try:
            data = await gemini(prompt)
            if not isinstance(data, dict) or "summary" not in data:
                raise HTTPException(502, "Gemini returned an invalid report")
            origin = "gemini"
        except HTTPException as exc:
            data = local_report(questions, answers, events)
            data["disclaimer"] += f" Gemini unavailable: {str(exc.detail)[:160]}"
            origin = "rule-based"
    else:
        data = local_report(questions, answers, events)
        origin = "rule-based"
    with db() as c:
        c.execute("UPDATE interviews SET state='complete',ended_at=?,report_json=?,report_origin=? WHERE id=?",
                  (utc(), json.dumps(data, ensure_ascii=False), origin, iid))
    return {"report": data, "origin": origin}

@app.get("/api/interviews/{iid}/media/{kind}")
def get_media(iid: str, kind: str, request: Request):
    row = owner(request, iid)
    if kind == "recording":
        path = row["recording_file"]
    elif kind == "checkin":
        path = row["photo_file"]
    elif kind.startswith("answer-") and kind[7:].isdigit():
        with db() as c:
            r = c.execute("SELECT audio_file FROM answers WHERE interview_id=? AND idx=?", (iid, int(kind[7:]))).fetchone()
        path = r["audio_file"] if r else None
    else:
        raise HTTPException(404, "Not found")
    if not path or not Path(path).is_file():
        raise HTTPException(404, "Media not available")
    media = "video/mp4" if path.endswith(".mp4") else "video/webm"
    if kind == "checkin": media = "image/jpeg" if path.endswith(".jpg") else "image/png"
    if kind.startswith("answer-"): media = "audio/mp4" if path.endswith(".mp4") else "audio/webm"
    return FileResponse(path, media_type=media, filename=Path(path).name)

@app.get("/api/interviews/{iid}/export")
def export(iid: str, request: Request):
    row = owner(request, iid)
    with db() as c:
        doc = serialize_interview(c, row, detailed=True)
    return JSONResponse(doc, headers={"Content-Disposition": f'attachment; filename="mockprep-{iid}.json"'})

@app.delete("/api/interviews/{iid}")
def delete_interview(iid: str, request: Request):
    owner(request, iid)
    import shutil
    with db() as c:
        c.execute("DELETE FROM camera_invites WHERE interview_id=?", (iid,))
        c.execute("DELETE FROM events WHERE interview_id=?", (iid,))
        c.execute("DELETE FROM answers WHERE interview_id=?", (iid,))
        c.execute("DELETE FROM interviews WHERE id=?", (iid,))
    shutil.rmtree(STORAGE / "recordings" / iid, ignore_errors=True)
    return {"ok": True}

@app.delete("/api/interviews/{iid}/recording")
def delete_recording(iid: str, request: Request):
    row = owner(request, iid)
    rec_file = row["recording_file"]
    if rec_file and Path(rec_file).is_file():
        try:
            Path(rec_file).unlink()
        except OSError:
            pass
    with db() as c:
        c.execute("UPDATE interviews SET recording_file=NULL WHERE id=?", (iid,))
    return {"ok": True}

@app.post("/api/interviews/{iid}/invite")
def invite_secondary(iid: str, request: Request):
    row = owner(request, iid)
    if not json.loads(row["consent_json"]).get("secondary"):
        raise HTTPException(403, "Secondary-camera consent required.")
    token = secrets.token_urlsafe(28)
    with db() as c:
        c.execute("INSERT INTO camera_invites(token_hash,interview_id,expires) VALUES(?,?,?)",
                  (hashlib.sha256(token.encode()).hexdigest(), iid, int(time.time()) + 3600))
    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/second-camera?session={iid}&token={token}",
            "note": "Phone cameras require HTTPS (localhost only counts as secure on the same device)."}

# Simple one-primary / one-secondary P2P WebRTC signaling. No TURN server is bundled.
rooms: dict[str, dict[str, WebSocket]] = {}

@app.websocket("/ws/rooms/{iid}/{role}")
async def ws_room(ws: WebSocket, iid: str, role: str):
    if role not in {"primary", "secondary"}:
        await ws.close(code=1008)
        return
    accepted = False
    with db() as c:
        if role == "secondary":
            token = ws.query_params.get("token", "")
            h = hashlib.sha256(token.encode()).hexdigest()
            found = c.execute("SELECT 1 FROM camera_invites WHERE token_hash=? AND interview_id=? AND expires>?",
                              (h, iid, int(time.time()))).fetchone()
            accepted = bool(found)
        else:
            token = ws.cookies.get(AUTH_COOKIE, "")
            h = hashlib.sha256(token.encode()).hexdigest()
            found = c.execute("""SELECT 1 FROM tokens t JOIN interviews i ON i.user_id=t.user_id
                                   WHERE t.token_hash=? AND t.expires>? AND i.id=?""",
                              (h, int(time.time()), iid)).fetchone()
            accepted = bool(found)
    if not accepted:
        await ws.close(code=1008)
        return
    await ws.accept()
    room = rooms.setdefault(iid, {})
    if role in room:
        try: await room[role].close(code=1012)
        except Exception: pass
    room[role] = ws
    other = "secondary" if role == "primary" else "primary"
    if other in room:
        for member in list(room.values()):
            try: await member.send_json({"type": "peer-ready"})
            except Exception: pass
    try:
        while True:
            data = await ws.receive_json()
            if isinstance(data, dict) and data.get("type") in {"offer", "answer", "ice", "bye"}:
                peer = room.get(other)
                if peer:
                    await peer.send_json(data)
    except (WebSocketDisconnect, RuntimeError, ValueError):
        pass
    finally:
        if room.get(role) is ws:
            room.pop(role, None)
            if room.get(other):
                try: await room[other].send_json({"type": "peer-left"})
                except Exception: pass
        if not room:
            rooms.pop(iid, None)

@app.middleware("http")
async def protect_mutations(request: Request, call_next):
    # Strict same-origin check on authenticated mutating endpoints for local use.
    if request.url.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        if origin and origin.rstrip("/") != str(request.base_url).rstrip("/"):
            return JSONResponse(status_code=403, content={"detail": "Cross-origin request refused"})
    return await call_next(request)
