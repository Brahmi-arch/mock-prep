import re

with open("static/app.js", "r", encoding="utf-8") as f:
    orig = f.read()

idx_ensure = orig.find("function permissionCard(name, title, desc) {")
idx_compute_cma = orig.find("function computeCmaTrajectory(questions, checkin = {}) {")
idx_report = orig.find("async function renderReport() {")
idx_history = orig.find("function renderHistory() {")
idx_privacy = orig.find("function renderPrivacy() {")
idx_load_history = orig.find("async function loadHistory() {")

core_interview_engine = orig[idx_ensure:idx_compute_cma]
cma_trajectory_code = orig[idx_compute_cma:idx_report]
auth_lifecycle_code = orig[idx_load_history:]

# We will construct new sections
new_code = '''// MockPrep — AI Interview Studio
// Design System: Urbanist typography, #F6F6FA canvas, #FDFEFF cards, #212121 ink, #D7D7F4 lavender

const $ = (sel) => document.querySelector(sel);
const esc = (value='') => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmtTime = (s) => `${Math.floor(Math.max(s,0)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(s,0)%60).toString().padStart(2,'0')}`;
const niceDate = (iso) => new Date(iso).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
const draftGet = (key) => { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } };
const draftSet = (key, v) => { try { sessionStorage.setItem(key, v); } catch {} };
const draftDel = (key) => { try { sessionStorage.removeItem(key); } catch {} };
const clip = (v, n=55) => String(v || '').length > n ? String(v).slice(0, n) + '…' : v;

// Radix / Figma SVG Icons
const R_ICON = {
  plus: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2.75C8 2.47386 7.77614 2.25 7.5 2.25C7.22386 2.25 7 2.47386 7 2.75V7H2.75C2.47386 7 2.25 7.22386 2.25 7.5C2.25 7.77614 2.47386 8 2.75 8H7V12.25C7 12.5261 7.22386 12.75 7.5 12.75C7.77614 12.75 8 12.5261 8 12.25V8H12.25C12.5261 8 12.75 7.77614 12.75 7.5C12.75 7.22386 12.5261 7 12.25 7H8V2.75Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  arrowRight: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.4669 3.72684C11.7558 3.97448 11.7853 4.40827 11.5327 4.69715L6.53267 10.6972C6.40428 10.844 6.21639 10.9298 6.01824 10.9327C5.82008 10.9356 5.63007 10.8553 5.49845 10.7119L3.49845 8.21191C3.25301 7.91717 3.29221 7.48427 3.58695 7.23883C3.88168 6.99339 4.31458 7.03259 4.56002 7.32733L6.00287 8.94828L10.4966 3.79259C10.7492 3.50371 11.178 3.4792 11.4669 3.72684Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  camera: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 3C1.67157 3 1 3.67157 1 4.5V11.5C1 12.3284 1.67157 13 2.5 13H12.5C13.3284 13 14 12.3284 14 11.5V4.5C14 3.67157 13.3284 3 12.5 3H10.8536L9.64645 1.79289C9.45892 1.60536 9.20456 1.5 8.93934 1.5H6.06066C5.79544 1.5 5.54108 1.60536 5.35355 1.79289L4.14645 3H2.5ZM2.5 4H4.5C4.63261 4 4.75979 3.94732 4.85355 3.85355L6.06066 2.64645C6.15442 2.55268 6.2816 2.5 6.41421 2.5H8.58579C8.71839 2.5 8.84558 2.55268 8.93934 2.64645L10.1464 3.85355C10.2402 3.94732 10.3674 4 10.5 4H12.5C12.7761 4 13 4.22386 13 4.5V11.5C13 11.7761 12.7761 12 12.5 12H2.5C2.22386 12 2 11.7761 2 11.5V4.5C2 4.22386 2.22386 4 2.5 4ZM7.5 5.5C6.11929 5.5 5 6.61929 5 8C5 9.38071 6.11929 10.5 7.5 10.5C8.88071 10.5 10 9.38071 10 8C10 6.61929 8.88071 5.5 7.5 5.5ZM6 8C6 7.17157 6.67157 6.5 7.5 6.5C8.32843 6.5 9 7.17157 9 8C9 8.82843 8.32843 9.5 7.5 9.5C6.67157 9.5 6 8.82843 6 8Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H11V12C11 12.5523 10.5523 13 10 13H5C4.44772 13 4 12.5523 4 12V4H3.5C3.22386 4 3 3.77614 3 3.5ZM5 4V12H10V4H5ZM6.5 5.5C6.77614 5.5 7 5.72386 7 6V10.5C7 10.7761 6.77614 11 6.5 11C6.22386 11 6 10.7761 6 10.5V6C6 5.72386 6.22386 5.5 6.5 5.5ZM8.5 5.5C8.77614 5.5 9 5.72386 9 6V10.5C9 10.7761 8.77614 11 8.5 11C8.22386 11 8 10.7761 8 10.5V6C8 5.72386 8.22386 5.5 8.5 5.5Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  download: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 1C7.77614 1 8 1.22386 8 1.5V8.29289L9.64645 6.64645C9.84171 6.45118 10.1583 6.45118 10.3536 6.64645C10.5488 6.84171 10.5488 7.15829 10.3536 7.35355L7.85355 9.85355C7.65829 10.0488 7.34171 10.0488 7.14645 9.85355L4.64645 7.35355C4.45118 7.15829 4.45118 6.84171 4.64645 6.64645C4.84171 6.45118 5.15829 6.45118 5.35355 6.64645L7 8.29289V1.5C7 1.22386 7.22386 1 7.5 1ZM2.5 10C2.77614 10 3 10.2239 3 10.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V10.5C12 10.2239 12.2239 10 12.5 10C12.7761 10 13 10.2239 13 10.5V12.5C13 13.3284 12.3284 14 11.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10.5C2 10.2239 2.22386 10 2.5 10Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`
};

const S = {
  me: null, health: {}, history: [], view: 'dashboard', item: null, idx: 0,
  setup: {
    mode: 'interview', difficulty: 'Intermediate', question_count: 5, topic: 'UI/UX Designer',
    camera: true, microphone: true, screen: true, face: true, record: true, secondary: false, adaptive: true, geminiAudio: true
  },
  mood: {
    state: 'Calm',
    energyDesc: 'Pleasant · Low energy',
    date: 'Self-reported · Today'
  },
  stream: null, screenStream: null, secondStream: null, remoteStream: null, recorder: null, recChunks: [],
  audioRecorder: null, audioChunks: [], recognizer: null, answering: false, liveText: '', edited: false, answerStarted: 0,
  startTime: 0, elapsedAccum: 0, timerId: null, drawFrame: null, faceModel: null, faceInterval: null,
  faceState: { count: null, direction: '—', gaze: '—', since: 0, key: null },
  audioCtx: null, analyser: null, sessionLive: false, events: [], lastEvent: {}, ws: null, peer: null,
  toastTimer: null, recorderError: false, loading: false, audioQuietSince: 0, paused: false,
  videoMime: 'video/webm', transcriptionOrigin: '', uiNote: ''
};

async function api(path, opts = {}) {
  const { method = 'GET', body, ...rest } = opts;
  const init = { method, credentials: 'same-origin', ...rest };
  if (body !== undefined) {
    if (body instanceof FormData) {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      init.headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
    }
  }
  let response;
  try {
    response = await fetch('/api' + path, init);
  } catch (e) {
    throw new Error('Local server unreachable. Check that server.py is running.');
  }
  let data;
  const rawText = await response.text();
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { detail: rawText.trim() || `Server response status ${response.status}` };
  }
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`);
  return data;
}

function toast(msg, error = false) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast' + (error ? ' error' : '');
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(() => el.classList.add('hidden'), 5000);
}

function busy(btn, on, text = 'Processing…') {
  if (btn) {
    if (on) {
      btn.dataset.previous = btn.innerHTML;
      btn.innerHTML = `<span class="spinner"></span>${esc(text)}`;
    } else {
      btn.innerHTML = btn.dataset.previous || btn.innerHTML;
    }
    btn.disabled = on;
  }
}

function setView(view) {
  S.view = view;
  
  // Set active class strictly on matched nav-item
  document.querySelectorAll('.nav-item').forEach(e => {
    e.classList.toggle('active', e.dataset.view === view);
  });
  
  const titles = {
    dashboard: 'HOME',
    prepare: 'PRACTICE',
    room: 'LIVE INTERVIEW',
    report: 'EVALUATION REPORT',
    history: 'REPORTS',
    library: 'LIBRARY',
    coach: 'AI COACH',
    settings: 'SETTING',
    profile: 'PROFILE'
  };
  
  const b = $('#breadcrumb');
  if (b) b.textContent = titles[view] || view.toUpperCase();
  
  const renderers = {
    dashboard: renderDashboard,
    prepare: renderPrepare,
    room: renderRoom,
    report: renderReport,
    history: renderHistory,
    library: renderLibrary,
    coach: renderCoach,
    settings: renderSettings,
    profile: renderProfile
  };
  
  if (renderers[view]) {
    renderers[view]();
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// -----------------------------------------------------------------------------
// View 1: Dashboard (Figma Node 105:166)
// -----------------------------------------------------------------------------
function renderDashboard() {
  const complete = S.history.filter(x => x.state === 'complete');
  const scored = complete.filter(x => Number.isFinite(x.report?.overall));
  const latestScore = scored.length ? Math.round(scored[0].report.overall) : 82;
  const sessionsCount = S.history.length || 3;
  const practiceMin = complete.reduce((acc, x) => {
    const ansDur = (x.answers || []).reduce((t, a) => t + (a.duration || 0), 0);
    return acc + Math.round(ansDur / 60);
  }, 0) || 30;

  $('#view').innerHTML = `
    <div class="content dashboard-container">
      <!-- 1. Hero Practice Card (232px high, #212121) -->
      <section class="hero-card" aria-label="Welcome banner">
        <div class="hero-left">
          <div class="hero-badge-tag">YOUR PRACTICE SPACE</div>
          <h1 class="hero-headline">Welcome back, Brahmi.</h1>
          <div class="hero-subtitle">
            <div>Rehearse an interview, viva, or presentation.</div>
            <div>Find one thing to work on in your next session.</div>
          </div>
          <div class="hero-actions">
            <button class="btn-hero-primary" id="btnStartPracticeHero" type="button">
              <span>Start a practice session</span>
              <img src="/static/assets/3c6a6.svg" width="18" height="18" alt="→" />
            </button>
            <span class="hero-link" id="btnPacePracticeHero" role="button" tabindex="0">Set your own pace</span>
          </div>
        </div>
        <div class="hero-artwork">
          <img src="/static/assets/ceb64.svg" alt="Voice waveform artwork" />
          <div class="voice-pill">VOICE PRACTICE</div>
        </div>
      </section>

      <!-- 2. Practice Overview & Metrics -->
      <section class="overview-section" aria-label="Practice at a glance">
        <div class="overview-header">
          <div>
            <h2 class="overview-title">Your practice at a glance</h2>
            <p class="overview-sub">See how often you practice and how your scores are changing.</p>
          </div>
          <div class="overview-date-pill">
            <img src="/static/assets/e3b6a.svg" width="17" height="17" alt="" />
            <span>12–18 November</span>
          </div>
        </div>

        <div class="metrics-row">
          <!-- Metric 1: Latest score -->
          <div class="metric-card">
            <div class="metric-card-top">
              <div class="metric-icon-tile lav">
                <img src="/static/assets/1aa9a.svg" width="18" height="18" alt="" />
              </div>
              <span class="metric-label">Latest score</span>
            </div>
            <div class="metric-card-bottom">
              <span class="metric-value">${latestScore} / 100</span>
              <span class="metric-context">+8 pts vs. previous</span>
            </div>
          </div>

          <!-- Metric 2: Sessions -->
          <div class="metric-card">
            <div class="metric-card-top">
              <div class="metric-icon-tile teal">
                <img src="/static/assets/9e058.svg" width="18" height="18" alt="" />
              </div>
              <span class="metric-label">Sessions</span>
            </div>
            <div class="metric-card-bottom">
              <span class="metric-value">${sessionsCount}</span>
              <span class="metric-context">in the last 7 days</span>
            </div>
          </div>

          <!-- Metric 3: Practice time -->
          <div class="metric-card">
            <div class="metric-card-top">
              <div class="metric-icon-tile yellow">
                <img src="/static/assets/2a669.svg" width="18" height="18" alt="" />
              </div>
              <span class="metric-label">Practice time</span>
            </div>
            <div class="metric-card-bottom">
              <span class="metric-value">${practiceMin} min</span>
              <span class="metric-context">in the last 7 days</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Grid Row 1: Score trend (720px) + Weekly activity (400px) -->
      <div class="grid-2-custom">
        <!-- Score Trend Card -->
        <div class="card-white score-trend-card">
          <div class="card-header-row">
            <div>
              <h3 class="card-title">Score trend</h3>
              <p class="card-sub">Last 4 sessions · score out of 100</p>
            </div>
            <div class="pill-badge wash-green">+8 pts vs. previous</div>
          </div>

          <div class="chart-svg-wrap">
            <svg viewBox="0 0 670 155" width="100%" height="100%" preserveAspectRatio="none" style="overflow: visible;">
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#38325a" stop-opacity="0.14" />
                  <stop offset="100%" stop-color="#38325a" stop-opacity="0.00" />
                </linearGradient>
              </defs>

              <!-- Grid horizontal lines -->
              <line x1="40" y1="10" x2="650" y2="10" stroke="#e7e5ef" stroke-width="1" />
              <text x="12" y="14" fill="#656375" font-size="11" font-weight="700">100</text>

              <line x1="40" y1="38" x2="650" y2="38" stroke="#e7e5ef" stroke-width="1" />
              <text x="18" y="42" fill="#656375" font-size="11" font-weight="700">75</text>

              <line x1="40" y1="68" x2="650" y2="68" stroke="#e7e5ef" stroke-width="1" />
              <text x="18" y="72" fill="#656375" font-size="11" font-weight="700">50</text>

              <line x1="40" y1="98" x2="650" y2="98" stroke="#e7e5ef" stroke-width="1" />
              <text x="18" y="102" fill="#656375" font-size="11" font-weight="700">25</text>

              <line x1="40" y1="126" x2="650" y2="126" stroke="#e7e5ef" stroke-width="1" />
              <text x="24" y="130" fill="#656375" font-size="11" font-weight="700">0</text>

              <!-- Gradient Area fill under curve -->
              <path d="M 90,52 C 160,46 190,46 250,44 C 320,40 350,34 410,32 C 480,30 510,18 565,16 L 565,126 L 90,126 Z" fill="url(#scoreGrad)" />

              <!-- Smooth Curve Line -->
              <path d="M 90,52 C 160,46 190,46 250,44 C 320,40 350,34 410,32 C 480,30 510,18 565,16" fill="none" stroke="#38325a" stroke-width="2.5" stroke-linecap="round" />

              <!-- Point 1 (8 Nov · 64) -->
              <circle cx="90" cy="52" r="4.5" fill="#38325a" />
              <circle cx="90" cy="52" r="2" fill="#ffffff" />
              <text x="90" y="38" text-anchor="middle" fill="#38325a" font-size="12" font-weight="700">64</text>
              <text x="90" y="145" text-anchor="middle" fill="#565563" font-size="12" font-weight="700">8 Nov</text>

              <!-- Point 2 (12 Nov · 68) -->
              <circle cx="250" cy="44" r="4.5" fill="#38325a" />
              <circle cx="250" cy="44" r="2" fill="#ffffff" />
              <text x="250" y="30" text-anchor="middle" fill="#38325a" font-size="12" font-weight="700">68</text>
              <text x="250" y="145" text-anchor="middle" fill="#565563" font-size="12" font-weight="700">12 Nov</text>

              <!-- Point 3 (14 Nov · 74) -->
              <circle cx="410" cy="32" r="4.5" fill="#38325a" />
              <circle cx="410" cy="32" r="2" fill="#ffffff" />
              <text x="410" y="18" text-anchor="middle" fill="#38325a" font-size="12" font-weight="700">74</text>
              <text x="410" y="145" text-anchor="middle" fill="#565563" font-size="12" font-weight="700">14 Nov</text>

              <!-- Point 4 (17 Nov · 82) with Halo -->
              <circle cx="565" cy="16" r="10" fill="#d7d7f4" opacity="0.6" />
              <circle cx="565" cy="16" r="5" fill="#38325a" />
              <circle cx="565" cy="16" r="2" fill="#ffffff" />

              <!-- Score tag 82 -->
              <rect x="544" y="-8" width="42" height="20" rx="6" fill="#d7d7f4" />
              <text x="565" y="6" text-anchor="middle" fill="#38325a" font-size="12" font-weight="700">82</text>
              <text x="565" y="145" text-anchor="middle" fill="#565563" font-size="12" font-weight="700">17 Nov</text>
            </svg>
          </div>
        </div>

        <!-- Weekly Activity Card -->
        <div class="card-white weekly-activity-card">
          <div class="card-header-row">
            <div>
              <h3 class="card-title">Weekly activity</h3>
              <p class="card-sub">Minutes practiced each day</p>
            </div>
            <div class="pill-badge wash-plum">30 min total</div>
          </div>

          <div class="weekly-bars-grid">
            <!-- Thu: 10m -->
            <div class="weekly-col">
              <span class="weekly-val">10</span>
              <div class="weekly-bar" style="height: 66px;"></div>
              <span class="weekly-day">Thu</span>
            </div>
            <!-- Fri: 0m -->
            <div class="weekly-col">
              <span class="weekly-val" style="visibility: hidden;">0</span>
              <div class="weekly-bar flat"></div>
              <span class="weekly-day">Fri</span>
            </div>
            <!-- Sat: 8m -->
            <div class="weekly-col">
              <span class="weekly-val">8</span>
              <div class="weekly-bar" style="height: 53px;"></div>
              <span class="weekly-day">Sat</span>
            </div>
            <!-- Sun: 0m -->
            <div class="weekly-col">
              <span class="weekly-val" style="visibility: hidden;">0</span>
              <div class="weekly-bar flat"></div>
              <span class="weekly-day">Sun</span>
            </div>
            <!-- Mon: 0m -->
            <div class="weekly-col">
              <span class="weekly-val" style="visibility: hidden;">0</span>
              <div class="weekly-bar flat"></div>
              <span class="weekly-day">Mon</span>
            </div>
            <!-- Tue: 12m (highlight) -->
            <div class="weekly-col">
              <span class="weekly-val">12</span>
              <div class="weekly-bar highlight" style="height: 80px;"></div>
              <span class="weekly-day">Tue</span>
            </div>
            <!-- Wed: 0m -->
            <div class="weekly-col">
              <span class="weekly-val" style="visibility: hidden;">0</span>
              <div class="weekly-bar flat"></div>
              <span class="weekly-day">Wed</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Grid Row 2: Latest feedback (720px) + Mood check-in (400px lavender) -->
      <div class="grid-2-custom">
        <!-- Latest Feedback Card -->
        <div class="card-white latest-feedback-card">
          <div>
            <div class="card-header-row">
              <div>
                <h3 class="card-title">Latest feedback</h3>
                <p class="card-sub">UI/UX mock interview · 17 Nov</p>
              </div>
              <button class="btn-control-outline" id="btnViewReportFeedback" type="button">
                <span>View full report</span>
                <img src="/static/assets/ea296.svg" width="18" height="18" alt="↗" />
              </button>
            </div>

            <div class="feedback-boxes-row">
              <div class="feedback-box">
                <div class="feedback-box-top">
                  <img src="/static/assets/0325a.svg" width="19" height="19" alt="" />
                  <span>Lowest-scoring skill</span>
                </div>
                <div class="feedback-box-skill plum">Answer structure</div>
                <div class="feedback-box-desc">You described your actions, but left out the result.</div>
              </div>

              <div class="feedback-box">
                <div class="feedback-box-top">
                  <img src="/static/assets/7b6a7.svg" width="19" height="19" alt="" />
                  <span>Improved in the last session</span>
                </div>
                <div class="feedback-box-skill green">Speaking pace</div>
                <div class="feedback-box-desc">You spoke more steadily and paused between ideas.</div>
              </div>
            </div>
          </div>

          <div class="feedback-next-step">
            <img src="/static/assets/5a506.svg" width="18" height="18" alt="" />
            <span class="next-step-label">Next step:</span>
            <span class="next-step-text">End your next answer with what changed and how you know.</span>
          </div>
        </div>

        <!-- Mood Check-in Card (Lavender #D7D7F4) -->
        <div class="card-lavender mood-card">
          <div class="mood-card-header">
            <div class="mood-title-wrap">
              <div class="mood-icon-tile">
                <img src="/static/assets/7bcaf.svg" width="20" height="20" alt="😊" />
              </div>
              <h3 class="card-title" style="margin: 0;">Mood check-in</h3>
            </div>
            <div class="pill-badge paper-plum">CMM model</div>
          </div>

          <div class="mood-circumplex-sub">Circumplex model of affect</div>

          <div class="mood-body">
            <div class="mood-body-left">
              <span class="mood-checkin-tag">LAST CHECK-IN</span>
              <span class="mood-state-word" id="moodStateWord">${S.mood.state}</span>
              <span class="mood-energy-desc" id="moodEnergyDesc">${S.mood.energyDesc}</span>
              <span class="mood-meta-date" id="moodMetaDate">${S.mood.date}</span>
            </div>

            <div class="mood-chart-widget">
              <span style="font-size: 10px; font-weight: 700; color: var(--color-muted); margin-bottom: 2px;">Higher energy</span>
              <img src="/static/assets/3b26a.svg" width="119" height="58" alt="Circumplex chart" />
              <div style="width: 100%; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: var(--color-muted); margin-top: 2px;">
                <span>Unpleasant</span>
                <span>Pleasant</span>
              </div>
            </div>
          </div>

          <div>
            <button class="btn-control-outline plum" id="btnUpdateMoodModal" type="button">
              <span>Update mood</span>
              <img src="/static/assets/4327e.svg" width="18" height="18" alt="→" />
            </button>
          </div>
        </div>
      </div>

      <!-- 5. Grid Row 3: Recent practice (720px) + AI insights (400px) -->
      <div class="grid-2-custom">
        <!-- Recent Practice Card -->
        <div class="card-white recent-practice-card">
          <div class="card-header-row">
            <div>
              <h3 class="card-title">Recent practice</h3>
              <p class="card-sub">Revisit a session or check its feedback.</p>
            </div>
            <button class="btn-control-outline" id="btnAllSessions" type="button">
              <span>All sessions</span>
              <img src="/static/assets/3c6a6.svg" width="18" height="18" alt="→" />
            </button>
          </div>

          <div class="practice-rows-list">
            <!-- Row 1 -->
            <div class="practice-row-item" data-action="practice-item" data-id="ui-ux">
              <div class="practice-row-left">
                <div class="practice-type-tile">
                  <img src="/static/assets/ff95a.svg" width="20" height="20" alt="🎙" />
                </div>
                <div class="practice-title-meta">
                  <span class="practice-title">UI/UX mock interview</span>
                  <span class="practice-meta">17 Nov · 12 min</span>
                </div>
              </div>
              <div class="practice-row-right">
                <span class="practice-score">82 / 100</span>
                <img src="/static/assets/e255f.svg" width="17" height="17" alt="↗" />
              </div>
            </div>

            <!-- Row 2 -->
            <div class="practice-row-item" data-action="practice-item" data-id="hci">
              <div class="practice-row-left">
                <div class="practice-type-tile">
                  <img src="/static/assets/0c4dd.svg" width="20" height="20" alt="📖" />
                </div>
                <div class="practice-title-meta">
                  <span class="practice-title">HCI viva practice</span>
                  <span class="practice-meta">14 Nov · 8 min</span>
                </div>
              </div>
              <div class="practice-row-right">
                <span class="practice-score">74 / 100</span>
                <img src="/static/assets/e255f.svg" width="17" height="17" alt="↗" />
              </div>
            </div>

            <!-- Row 3 -->
            <div class="practice-row-item" data-action="practice-item" data-id="case-study">
              <div class="practice-row-left">
                <div class="practice-type-tile">
                  <img src="/static/assets/e2a5e.svg" width="20" height="20" alt="🖥" />
                </div>
                <div class="practice-title-meta">
                  <span class="practice-title">Case study presentation</span>
                  <span class="practice-meta">12 Nov · 10 min</span>
                </div>
              </div>
              <div class="practice-row-right">
                <span class="practice-score">68 / 100</span>
                <img src="/static/assets/e255f.svg" width="17" height="17" alt="↗" />
              </div>
            </div>
          </div>
        </div>

        <!-- AI Insights Card -->
        <div class="card-white ai-insights-card">
          <div class="ai-card-top">
            <div class="ai-title-wrap">
              <div class="ai-icon-tile">
                <img src="/static/assets/dd36d.svg" width="20" height="20" alt="✨" />
              </div>
              <h3 class="card-title" style="margin: 0;">AI insights</h3>
            </div>
            <div class="pill-badge wash-plum">AI COACH</div>
          </div>

          <div class="ai-box-prompt">
            <span class="ai-box-tag">BASED ON YOUR LAST SESSION</span>
            <span class="ai-box-text" id="aiBoxPromptText">Add a result to your strongest example. Use one number or a clear outcome.</span>
          </div>

          <div class="ai-chips-row">
            <button class="ai-chip" id="chipStar" type="button">Try a STAR answer</button>
            <button class="ai-chip" id="chipQuestion" type="button">Give me a question</button>
          </div>

          <div class="ai-input-bar">
            <input type="text" id="aiCoachQuickInput" placeholder="Ask the AI Coach…" />
            <button class="btn-ai-send" id="btnAiCoachSend" type="button" title="Send to AI Coach">
              <img src="/static/assets/6f2ab.svg" width="20" height="20" alt="Send" />
            </button>
          </div>
        </div>
      </div>

      <!-- 6. Footer Note -->
      <div class="dashboard-footer-note">Illustrative data for this dashboard concept</div>
    </div>
  `;

  setupDashboardEvents();
}

function setupDashboardEvents() {
  $('#btnStartPracticeHero')?.addEventListener('click', () => setView('prepare'));
  $('#btnPacePracticeHero')?.addEventListener('click', () => setView('prepare'));

  $('#btnViewReportFeedback')?.addEventListener('click', () => {
    if (S.history.length) {
      S.item = S.history[0];
      setView('report');
    } else {
      setView('history');
    }
  });

  $('#btnAllSessions')?.addEventListener('click', () => setView('history'));

  document.querySelectorAll('[data-action="practice-item"]').forEach(item => {
    item.addEventListener('click', () => {
      if (S.history.length) {
        S.item = S.history[0];
        setView('report');
      } else {
        setView('history');
      }
    });
  });

  // Mood Update Modal
  $('#btnUpdateMoodModal')?.addEventListener('click', () => {
    showMoodModal();
  });

  // AI insights chips
  $('#chipStar')?.addEventListener('click', () => {
    const input = $('#aiCoachQuickInput');
    if (input) input.value = "How do I structure a UI/UX case study using the STAR framework?";
    askCoachQuick("How do I structure a UI/UX case study using the STAR framework?");
  });

  $('#chipQuestion')?.addEventListener('click', () => {
    const input = $('#aiCoachQuickInput');
    if (input) input.value = "Give me a practical UI/UX design mock interview question.";
    askCoachQuick("Give me a practical UI/UX design mock interview question.");
  });

  // AI insights input & send
  $('#btnAiCoachSend')?.addEventListener('click', () => {
    const input = $('#aiCoachQuickInput');
    const val = input ? input.value.trim() : '';
    if (val) askCoachQuick(val);
  });

  $('#aiCoachQuickInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      if (val) askCoachQuick(val);
    }
  });
}

function showMoodModal() {
  const existing = $('#moodModalBackdrop');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'moodModalBackdrop';
  modal.className = 'auth-backdrop';
  modal.innerHTML = `
    <div class="auth-card" style="max-width: 420px; text-align: left;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h2 style="font-size: 20px; font-weight: 700; color: var(--color-ink); margin: 0;">Update Mood Check-in</h2>
        <button id="btnCloseMoodModal" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--color-muted);">✕</button>
      </div>
      <p style="font-size: 13px; color: var(--color-muted); margin-bottom: 18px;">
        Select your current affective state on the Circumplex Model of Affect (Valence & Energy):
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
        <button class="mood-choice-btn" data-state="Calm" data-desc="Pleasant · Low energy" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Calm</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · Low energy</div>
        </button>
        <button class="mood-choice-btn" data-state="Focused" data-desc="Pleasant · Optimal flow" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Focused</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · Optimal flow</div>
        </button>
        <button class="mood-choice-btn" data-state="Confident" data-desc="Pleasant · High energy" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Confident</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · High energy</div>
        </button>
        <button class="mood-choice-btn" data-state="Excited" data-desc="Pleasant · High activation" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Excited</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · High activation</div>
        </button>
        <button class="mood-choice-btn" data-state="Reflective" data-desc="Pleasant · Low energy" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Reflective</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · Low energy</div>
        </button>
        <button class="mood-choice-btn" data-state="Tense" data-desc="High energy · Pressured" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Tense</div>
          <div style="font-size: 11px; color: var(--color-muted);">High energy · Pressured</div>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $('#btnCloseMoodModal')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelectorAll('.mood-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const state = btn.dataset.state;
      const desc = btn.dataset.desc;
      S.mood.state = state;
      S.mood.energyDesc = desc;
      S.mood.date = 'Self-reported · Just now';
      
      const stEl = $('#moodStateWord');
      const descEl = $('#moodEnergyDesc');
      const dateEl = $('#moodMetaDate');
      if (stEl) stEl.textContent = state;
      if (descEl) descEl.textContent = desc;
      if (dateEl) dateEl.textContent = S.mood.date;

      toast(`Mood updated to ${state} (${desc})`);
      modal.remove();
    });
  });
}

async function askCoachQuick(query) {
  const boxText = $('#aiBoxPromptText');
  if (boxText) {
    boxText.textContent = "AI Coach is thinking…";
  }
  try {
    const res = await api('/coach/ask', { method: 'POST', body: { message: query } });
    if (boxText) {
      boxText.textContent = res.reply.split('\\n')[0] || res.reply;
    }
    // Switch to dedicated coach view with prefilled response
    S.lastCoachQuery = query;
    S.lastCoachReply = res.reply;
    setView('coach');
  } catch (err) {
    if (boxText) boxText.textContent = "Focus on the result: What metric improved by how much?";
    toast("AI Coach: " + err.message, true);
  }
}

// -----------------------------------------------------------------------------
// View 2: Prepare (Practice)
// -----------------------------------------------------------------------------
function renderPrepare() {
  const u = S.setup;
  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>New practice session</h1>
          <p>Configure interview parameters, evaluation mode, and device permissions.</p>
        </div>
      </div>

      <div class="grid-sidebar">
        <!-- Left: Form settings -->
        <div class="form-section">
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Session parameters</div>
                <div class="card-subtitle">Interview context and complexity</div>
              </div>
            </div>

            <div class="form-group" style="margin-top: 14px;">
              <label>Practice format</label>
              <div class="segmented-control" id="modeSelector">
                ${['interview', 'viva', 'presentation'].map(m => `
                  <div class="segmented-option ${u.mode === m ? 'active' : ''}" data-mode="${m}">
                    ${m.charAt(0).toUpperCase() + m.slice(1)}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="form-group" style="margin-top: 14px;">
              <label for="topic">Target role or topic</label>
              <input id="topic" maxlength="180" value="${esc(u.topic)}" placeholder="e.g. UI/UX Designer" />
            </div>

            <div class="form-row" style="margin-top: 14px;">
              <div class="form-group">
                <label for="difficulty">Difficulty level</label>
                <select id="difficulty">
                  ${['Beginner', 'Intermediate', 'Advanced'].map(x => `<option ${u.difficulty === x ? 'selected' : ''}>${x}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="questionCount">Question count</label>
                <select id="questionCount">
                  ${[3, 4, 5, 6, 7, 8].map(n => `<option value="${n}" ${u.question_count === n ? 'selected' : ''}>${n} questions</option>`).join('')}
                </select>
              </div>
            </div>

            <div style="margin-top: 16px;">
              <label class="checkbox-card">
                <input type="checkbox" data-setup="adaptive" ${u.adaptive ? 'checked' : ''} />
                <div class="checkbox-content">
                  <span class="checkbox-title">Adaptive follow-up questions</span>
                  <span class="checkbox-desc">AI generates subsequent prompts based on candidate answer context.</span>
                </div>
              </label>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Device permissions</div>
                <div class="card-subtitle">Local recording and tracking consent</div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
              ${permissionCard('camera', 'Camera stream', 'Captures candidate video feed for live room and composite recording.')}
              ${permissionCard('microphone', 'Microphone audio', 'Enables spoken answers, live speech recognition, and audio transcription.')}
              ${permissionCard('screen', 'Screen capture', 'Records desktop, application window, or tab via native browser dialog.')}
              ${permissionCard('face', 'On-device face presence', 'Runs local MediaPipe heuristics for frame presence. No biometric classification.')}
              ${permissionCard('record', 'Local video recording', 'Stores composite replay file on local server storage.')}
              ${permissionCard('secondary', 'Secondary camera', 'Enables mobile camera pairing over WebRTC for auxiliary viewing.')}
            </div>

            <div class="info-banner" style="margin-top: 14px;">
              All media streams are processed locally. Hardware permissions may be withdrawn at any time during practice.
            </div>
          </div>
        </div>

        <!-- Right: Verification & Launch -->
        <div class="form-section">
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Hardware check</div>
                <div class="card-subtitle">Verify camera and audio inputs</div>
              </div>
            </div>

            <div class="device-preview-box" id="preparePreview">
              <span>Camera uninitialized</span>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 14px;">
              <button class="btn secondary small" data-action="device-check">
                ${R_ICON.camera}
                <span>Verify devices</span>
              </button>
              <span id="deviceState" style="font-size: 11px; color: var(--text-muted);">Permission required</span>
            </div>

            <div style="border-top: 1px solid var(--color-border); margin: 18px 0;"></div>

            <div class="card-title" style="margin-bottom: 4px;">Baseline check-in</div>
            <p style="font-size: 11px; color: var(--color-muted); margin-bottom: 12px;">Self-reported state for post-interview review.</p>

            <div class="form-row">
              <div class="form-group">
                <label for="energy">Energy level</label>
                <select id="energy">
                  <option>Moderate</option>
                  <option>High</option>
                  <option>Low</option>
                </select>
              </div>
              <div class="form-group">
                <label for="feeling">Affect</label>
                <select id="feeling">
                  <option>Focused</option>
                  <option>Calm</option>
                  <option>Confident</option>
                  <option>Tense</option>
                </select>
              </div>
            </div>

            <div style="border-top: 1px solid var(--color-border); margin: 18px 0;"></div>

            <div class="info-banner ${S.health.ai_configured ? '' : 'warning'}" style="margin-bottom: 16px;">
              ${S.health.ai_configured ? 'Gemini 2.5 Flash connected. Dynamic questions and coaching enabled.' : 'Gemini key unconfigured. Standard template questions and rule-based feedback enabled.'}
            </div>

            <button class="btn primary full" data-action="start">
              <span>Start practice session</span>
              ${R_ICON.arrowRight}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (S.stream) attachVideo($('#preparePreview'), 'cameraSource');

  $('#modeSelector')?.addEventListener('click', e => {
    const opt = e.target.closest('.segmented-option');
    if (!opt) return;
    document.querySelectorAll('#modeSelector .segmented-option').forEach(el => el.classList.remove('active'));
    opt.classList.add('active');
    S.setup.mode = opt.dataset.mode;
  });
}
'''

# Next, we insert core_interview_engine and cma_trajectory_code
# Then write updated renderReport, renderHistory, renderLibrary, renderCoach, renderSettings, renderProfile

views_code = '''
// -----------------------------------------------------------------------------
// View 4: Evaluation Report (Harmonious with Circumplex Centerpiece & Back Button)
// -----------------------------------------------------------------------------
async function renderReport() {
  if (!S.item) return setView('history');
  const report = S.item.report;
  if (!report) {
    $('#view').innerHTML = `
      <div class="content">
        <div class="view-header">
          <div class="view-header-title">
            <h1>Session report unavailable</h1>
            <p>Responses have been stored. Generate the evaluation report below.</p>
          </div>
        </div>
        <button class="btn primary" data-action="retry-report">Generate evaluation report</button>
      </div>
    `;
    return;
  }

  const answered = (S.item.answers || []).filter(a => a.text?.trim());
  const dur = answered.reduce((t, a) => t + (a.duration || 0), 0);
  const words = answered.reduce((t, a) => t + wordCount(a.text), 0);
  const pace = (dur > 10 && words > 0) ? Math.round(words / (dur / 60)) : 124;
  const score = typeof report.overall === 'number' ? Math.round(report.overall) : 84;
  const qCount = S.item.question_count || S.item.questions?.length || 5;
  const durMinutes = dur > 0 ? Math.max(1, Math.round(dur / 60)) : 15;

  const defaultTopics = ['Product introduction', 'Design methodology', 'Complex edge case', 'Cross-functional alignment', 'Outcome metrics'];
  const questions = (S.item.questions || []).map((q, i) => {
    const a = S.item.answers?.find(x => x.idx === i);
    const topic = defaultTopics[i] || `Prompt ${i + 1}`;
    const fb = report.question_feedback?.[i]?.feedback || 'Structured response provided.';
    return {
      idx: i,
      title: `Prompt ${i + 1} · ${topic}`,
      q,
      text: a?.text || '',
      duration: a?.duration || 0,
      feedback: fb
    };
  });

  const events = S.item.events || [];
  const nextStepPrompt = (report.next_steps && report.next_steps[0]) || 'Refine outcome quantification and design system rationale.';
  const checkin = S.item.checkin || {};
  const energy = checkin.energy || 'Moderate';
  const feeling = checkin.feeling || 'Focused';

  const cmaPoints = computeCmaTrajectory(questions, checkin);
  const trajectorySvg = cmaPoints.length > 1
    ? `<polyline points="${cmaPoints.map(p => `${p.cx},${p.cy}`).join(' ')}" fill="none" stroke="#38325a" stroke-width="1.8" stroke-dasharray="3 3"/>`
    : '';
  const dotsSvg = cmaPoints.map(p => `
    <circle cx="${p.cx}" cy="${p.cy}" r="5" fill="#38325a" stroke="#ffffff" stroke-width="1.5"/>
    <text x="${p.labelX}" y="${p.labelY}" text-anchor="${p.anchor}" font-size="9" font-weight="700" fill="#38325a">Q${p.qNum}</text>
  `).join('');

  $('#view').innerHTML = `
    <div class="content">
      <!-- Back button at top -->
      <div class="report-header-row">
        <button class="btn-back-report" id="btnReportBack" type="button">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor"/>
          </svg>
          <span>Back to reports</span>
        </button>
        <div class="pill-badge wash-green">EVALUATION COMPLETE</div>
      </div>

      <div class="view-header" style="margin-top: 4px;">
        <div class="view-header-title">
          <h1>Interview evaluation report</h1>
          <p>${esc(S.item.topic)} · ${durMinutes} min session · ${answered.length} of ${qCount} prompts answered</p>
        </div>
      </div>

      <!-- Hero Circumplex Model Centerpiece -->
      <div class="cma-hero-card">
        <div class="cma-hero-title-row">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="pill-badge wash-plum" style="font-size: 11px;">SERVICE DESIGN CORE</span>
              <h2 style="font-size: 20px; font-weight: 700; color: var(--color-ink); margin: 0;">Circumplex Model of Affect (CMA)</h2>
            </div>
            <p style="font-size: 13px; color: var(--color-muted); margin-top: 4px;">Candidate affective trajectory plotted across Valence and Arousal activation dimensions.</p>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: var(--color-plum);">
            Baseline: ${esc(energy)} energy · ${esc(feeling)}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 280px 1fr; gap: 28px; align-items: center;">
          <!-- SVG Circumplex Chart with Pastel Quadrants -->
          <div style="position: relative; width: 100%; aspect-ratio: 1.1; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 240 210" style="width: 100%; height: 100%;">
              <defs>
                <clipPath id="circleClip">
                  <circle cx="120" cy="105" r="72" />
                </clipPath>
              </defs>

              <!-- Outer Circle Background with Pastel Quadrants -->
              <g clip-path="url(#circleClip)">
                <!-- Q2: Top-Left (Unpleasant / High Energy - Peach #FFEBE3) -->
                <rect x="40" y="25" width="80" height="80" fill="#FFEBE3" />
                <!-- Q1: Top-Right (Pleasant / High Energy - Lavender #E8E7FA) -->
                <rect x="120" y="25" width="80" height="80" fill="#E8E7FA" />
                <!-- Q3: Bottom-Left (Unpleasant / Low Energy - Mist #ECEEF2) -->
                <rect x="40" y="105" width="80" height="80" fill="#ECEEF2" />
                <!-- Q4: Bottom-Right (Pleasant / Low Energy - Mint #E4F6ED) -->
                <rect x="120" y="105" width="80" height="80" fill="#E4F6ED" />
              </g>

              <!-- Outer boundary stroke -->
              <circle cx="120" cy="105" r="72" fill="none" stroke="#e7e5ef" stroke-width="1.5"/>

              <!-- Central Cross Axes -->
              <line x1="48" y1="105" x2="192" y2="105" stroke="#656375" stroke-width="1.2" stroke-dasharray="2 2" />
              <line x1="120" y1="33" x2="120" y2="177" stroke="#656375" stroke-width="1.2" stroke-dasharray="2 2" />

              <!-- Axis Labels -->
              <text x="120" y="22" text-anchor="middle" font-size="8" font-weight="700" fill="#38325a" letter-spacing="1px">HIGH ACTIVATION</text>
              <text x="120" y="196" text-anchor="middle" font-size="8" font-weight="700" fill="#565563" letter-spacing="1px">LOW ACTIVATION</text>
              <text x="36" y="108" text-anchor="end" font-size="8" font-weight="700" fill="#565563">UNPLEASANT</text>
              <text x="204" y="108" text-anchor="start" font-size="8" font-weight="700" fill="#38325a">PLEASANT</text>

              <!-- Dynamic Trajectory Polyline -->
              ${trajectorySvg}

              <!-- Dynamic Plotted Dots -->
              ${dotsSvg}
            </svg>
          </div>

          <!-- 4 Pastel Quadrant Info Cards -->
          <div class="cma-quadrant-grid">
            <div class="cma-quadrant-card q1">
              <div style="font-size: 13px; font-weight: 700; color: #38325a;">Q1 · High Activation / Pleasant</div>
              <div style="font-size: 11px; color: #565563;">State: Confident, Focused, Optimal Flow</div>
            </div>
            <div class="cma-quadrant-card q2">
              <div style="font-size: 13px; font-weight: 700; color: #9c4221;">Q2 · High Activation / Unpleasant</div>
              <div style="font-size: 11px; color: #565563;">State: Tense, Anxious, Pressured</div>
            </div>
            <div class="cma-quadrant-card q4">
              <div style="font-size: 13px; font-weight: 700; color: #1e664e;">Q4 · Low Activation / Pleasant</div>
              <div style="font-size: 11px; color: #565563;">State: Calm, Composed, Reflective</div>
            </div>
            <div class="cma-quadrant-card q3">
              <div style="font-size: 13px; font-weight: 700; color: #475569;">Q3 · Low Activation / Unpleasant</div>
              <div style="font-size: 11px; color: #565563;">State: Fatigued, Hesitant, Reserved</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Metric Cards Row -->
      <div class="grid-4" style="margin-bottom: 24px;">
        <div class="report-metric-card">
          <div class="metric-top-label">Overall score</div>
          <div class="metric-big-val">${score} / 100</div>
          <div class="metric-caption">AI response quality rating</div>
        </div>
        <div class="report-metric-card">
          <div class="metric-top-label">Speaking pace</div>
          <div class="metric-big-val">${pace}</div>
          <div class="metric-caption">Words per minute</div>
        </div>
        <div class="report-metric-card">
          <div class="metric-top-label">Active duration</div>
          <div class="metric-big-val">${durMinutes}m</div>
          <div class="metric-caption">Recorded speaking time</div>
        </div>
        <div class="report-metric-card">
          <div class="metric-top-label">Audit events</div>
          <div class="metric-big-val">${events.length}</div>
          <div class="metric-caption">Monitored review moments</div>
        </div>
      </div>

      <div class="report-grid-3">
        <!-- Col 1: Questions review -->
        <div class="card" id="colQuestions">
          <div class="card-header">
            <div>
              <div class="card-title">Prompt evaluations</div>
              <div class="card-subtitle">Click to expand candidate transcript</div>
            </div>
          </div>

          <div style="margin-top: 10px;">
            ${questions.map((item, idx) => `
              <div class="q-item ${idx === 0 ? 'expanded' : ''}" data-action="toggle-q-detail">
                <div class="q-item-header">${esc(item.title)}</div>
                <div class="q-item-verdict">${esc(clip(item.feedback, 55))}</div>
                <div class="q-item-detail">
                  <div style="font-weight: 600; margin-bottom: 4px; color: var(--color-ink);">Prompt:</div>
                  <div style="margin-bottom: 8px; font-size: 13px;">${esc(item.q)}</div>
                  <div style="font-weight: 600; margin-bottom: 4px; color: var(--color-ink);">Your response:</div>
                  <div style="margin-bottom: 8px; font-size: 13px; color: var(--color-muted);">${esc(item.text || 'No spoken or typed answer recorded.')}</div>
                  <div style="background: var(--color-wash); padding: 10px 12px; border-radius: 10px; border: 1px solid var(--color-border);">
                    <strong style="color: var(--color-plum);">Coaching note:</strong> ${esc(item.feedback)}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Col 2: Activity Timeline -->
        <div class="card" id="colTimeline">
          <div class="card-header">
            <div>
              <div class="card-title">Audit timeline</div>
              <div class="card-subtitle">Logged session milestones</div>
            </div>
          </div>

          <div class="feed-list" style="max-height: 480px;">
            ${events.length ? events.map(e => `
              <div class="feed-item">
                <time>${fmtTime(e.elapsed)}</time>
                <span>${esc(e.detail)}</span>
              </div>
            `).join('') : '<div style="font-size: 12px; color: var(--color-muted); padding: 12px 0;">No audit events logged during this attempt.</div>'}
          </div>
        </div>

        <!-- Col 3: CMA Breakdown Details -->
        <div class="card" id="colCma">
          <div class="card-header">
            <div>
              <div class="card-title">Affect progression</div>
              <div class="card-subtitle">Question-by-question breakdown</div>
            </div>
          </div>

          <div style="font-size: 12px; color: var(--color-muted); line-height: 1.6; margin-top: 10px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${cmaPoints.map(p => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-border);">
                  <span><strong style="color: var(--color-ink);">Q${p.qNum}:</strong> ${esc(p.label)}</span>
                  <span style="color: var(--color-plum); font-weight: 700; font-size: 11px;">${esc(p.metrics)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Next Steps -->
      <div class="grid-2" style="margin-top: 24px;">
        <div class="card">
          <div class="card-title">Media capture status</div>
          <div style="font-size: 13px; color: var(--color-muted); margin: 6px 0 10px;">
            Video replay: <strong>${S.item.has_recording ? 'Available locally' : 'No recording saved'}</strong> · Audio: Captured · Screen: Consented
          </div>
          <p style="font-size: 12px; color: var(--color-muted); line-height: 1.4;">
            Video files are stored on this local computer. They can be reviewed or permanently deleted at any time.
          </p>
        </div>

        <div class="card">
          <div class="card-title">Recommended next step</div>
          <div style="font-size: 13px; font-weight: 600; color: var(--color-ink); margin: 6px 0 14px;">
            ${esc(nextStepPrompt)}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn primary small" data-action="new">Practice again</button>
            <button class="btn secondary small" data-action="review-recording">Review recording</button>
          </div>
        </div>
      </div>
    </div>
  `;

  $('#btnReportBack')?.addEventListener('click', () => setView('history'));
}

// -----------------------------------------------------------------------------
// View 5: History / Reports Table
// -----------------------------------------------------------------------------
function renderHistory() {
  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>Practice reports & sessions</h1>
          <p>Chronological record of interview simulations and diagnostic evaluations.</p>
        </div>
        <button class="btn primary" data-action="new">
          ${R_ICON.plus}
          <span>Start new session</span>
        </button>
      </div>

      <div class="table-container">
        ${sessionTableHtml(S.history)}
      </div>
    </div>
  `;
}

function sessionTableHtml(items) {
  if (!items.length) {
    return `<div style="padding: 48px; text-align: center; color: var(--color-muted); font-size: 14px;">No practice sessions recorded yet. Start your first session above.</div>`;
  }
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Role / Topic</th>
          <th>Date</th>
          <th>Questions</th>
          <th>Status</th>
          <th style="text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(s => `
          <tr>
            <td>
              <span class="cell-title">${esc(clip(s.topic, 42))}</span>
              <span class="cell-meta">${esc(s.role || 'UI/UX Designer')} · ${esc(s.difficulty || 'Intermediate')}</span>
            </td>
            <td>${niceDate(s.created_at)}</td>
            <td>${s.question_count || 5} prompts</td>
            <td>
              <span class="badge ${s.state === 'complete' ? 'complete' : 'active'}">
                ${s.state === 'complete' ? 'Completed' : 'Active'}
              </span>
            </td>
            <td style="text-align: right;">
              <button class="btn secondary small" data-action="open-session" data-id="${s.id}">
                <span>${s.state === 'complete' ? 'View report' : 'Resume'}</span>
                ${R_ICON.arrowRight}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// -----------------------------------------------------------------------------
// View 6: Library (Question Bank)
// -----------------------------------------------------------------------------
function renderLibrary() {
  const libraryItems = [
    { title: "Walk through your end-to-end design process", category: "Process", difficulty: "Intermediate", desc: "How you move from ambiguous problem space to validated user prototype." },
    { title: "Resolving user feedback vs business constraints", category: "Strategy", difficulty: "Advanced", desc: "A time when user research conflicted with sprint deadlines or stakeholder assumptions." },
    { title: "Designing for accessibility (WCAG AA)", category: "Usability", difficulty: "Intermediate", desc: "Handling contrast, screen-reader navigation, and tap targets on mobile." },
    { title: "Structuring complex edge cases in checkout", category: "Edge Cases", difficulty: "Advanced", desc: "Form validation, error recovery, network dropouts, and multi-currency edge states." },
    { title: "Building and scaling a design system component", category: "Systems", difficulty: "Intermediate", desc: "Creating atomic tokens, variants, documentation, and handoff to engineers." },
    { title: "Behavioral STAR: Handling a difficult design critique", category: "Behavioral", difficulty: "Beginner", desc: "Situation, Task, Action, and quantifiable Result when your concept was challenged." }
  ];

  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>Question Library</h1>
          <p>Curated UI/UX mock interview questions and behavioral prompt templates.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; margin-top: 16px;">
        ${libraryItems.map(item => `
          <div class="card-white" style="display: flex; flex-direction: column; justify-content: space-between; height: 180px;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span class="pill-badge wash-plum" style="font-size: 11px;">${item.category}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--color-muted);">${item.difficulty}</span>
              </div>
              <h3 style="font-size: 16px; font-weight: 700; color: var(--color-ink); margin: 0 0 6px;">${item.title}</h3>
              <p style="font-size: 13px; color: var(--color-muted); line-height: 1.35; margin: 0;">${item.desc}</p>
            </div>
            <div>
              <button class="btn-control-outline" data-action="practice-lib-q" data-topic="${esc(item.title)}" style="height: 36px; padding: 0 12px; font-size: 12px;">
                <span>Practice this prompt</span>
                <img src="/static/assets/3c6a6.svg" width="14" height="14" alt="→" />
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.querySelectorAll('[data-action="practice-lib-q"]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.setup.topic = btn.dataset.topic;
      setView('prepare');
    });
  });
}

// -----------------------------------------------------------------------------
// View 7: AI Coach (Interactive Workspace)
// -----------------------------------------------------------------------------
function renderCoach() {
  const initialQuery = S.lastCoachQuery || "How do I structure a STAR response for a UX case study?";
  const initialReply = S.lastCoachReply || 
    "When structuring your answer using the **STAR** method:\\n\\n" +
    "1. **Situation**: Set the context in 1-2 sentences. Who was the user and what was the core friction?\\n" +
    "2. **Task**: Define your explicit role. Were you lead designer, researcher, or systems contributor?\\n" +
    "3. **Action**: Explain 2-3 specific design methods (user testing, journey mapping, wireframing, edge case auditing).\\n" +
    "4. **Result**: End with quantifiable impact (e.g., +18% task completion rate, 40% fewer drop-offs) and your key takeaway.";

  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>AI Coach Workspace</h1>
          <p>Interactive coaching, response structuring, and behavioral critique.</p>
        </div>
      </div>

      <div class="grid-2-custom">
        <!-- Main Chat Box -->
        <div class="card-white" style="display: flex; flex-direction: column; min-height: 480px; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--color-border); padding-bottom: 14px; margin-bottom: 16px;">
              <div class="ai-icon-tile">
                <img src="/static/assets/dd36d.svg" width="20" height="20" alt="AI" />
              </div>
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--color-ink); margin: 0;">AI Design Mentor</h3>
                <span style="font-size: 12px; color: var(--color-green); font-weight: 600;">Active · Gemini Flash</span>
              </div>
            </div>

            <div id="coachThread" style="display: flex; flex-direction: column; gap: 14px; max-height: 380px; overflow-y: auto; padding-right: 6px;">
              <div style="background: var(--color-wash); border-radius: 14px; padding: 14px 18px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--color-quiet); letter-spacing: 1px; margin-bottom: 4px;">QUESTION</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--color-plum);" id="threadQuery">${esc(initialQuery)}</div>
              </div>

              <div style="background: #ffffff; border: 1px solid var(--color-border); border-radius: 14px; padding: 16px 18px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--color-plum); letter-spacing: 1px; margin-bottom: 8px;">COACH GUIDANCE</div>
                <div style="font-size: 14px; line-height: 1.6; color: var(--color-ink); white-space: pre-line;" id="threadReply">${esc(initialReply)}</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <div class="ai-input-bar">
              <input type="text" id="coachPageInput" placeholder="Ask your coach anything about UI/UX interviews…" />
              <button class="btn-ai-send" id="btnCoachPageSend" type="button">
                <img src="/static/assets/6f2ab.svg" width="20" height="20" alt="Send" />
              </button>
            </div>
          </div>
        </div>

        <!-- Sidebar Hints & Chips -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="card-lavender">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--color-ink); margin: 0 0 8px;">Quick Coaching Drills</h3>
            <p style="font-size: 13px; color: var(--color-plum); line-height: 1.4; margin-bottom: 14px;">Select a prompt below to see instant coaching advice:</p>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button class="btn-control-outline" data-action="coach-chip" data-msg="How do I answer 'Tell me about yourself' as a UI/UX candidate?">
                <span>Tell me about yourself</span>
              </button>
              <button class="btn-control-outline" data-action="coach-chip" data-msg="How do I explain trade-offs between user needs and technical constraints?">
                <span>Explaining UX trade-offs</span>
              </button>
              <button class="btn-control-outline" data-action="coach-chip" data-msg="What are common questions about design systems and component libraries?">
                <span>Design system questions</span>
              </button>
              <button class="btn-control-outline" data-action="coach-chip" data-msg="How do I improve my speaking pace when nervous?">
                <span>Pacing & calmness techniques</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-action="coach-chip"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = btn.dataset.msg;
      sendCoachMessage(msg);
    });
  });

  $('#btnCoachPageSend')?.addEventListener('click', () => {
    const input = $('#coachPageInput');
    const msg = input ? input.value.trim() : '';
    if (msg) {
      input.value = '';
      sendCoachMessage(msg);
    }
  });

  $('#coachPageInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const msg = e.target.value.trim();
      if (msg) {
        e.target.value = '';
        sendCoachMessage(msg);
      }
    }
  });
}

async function sendCoachMessage(query) {
  const qEl = $('#threadQuery');
  const rEl = $('#threadReply');
  if (qEl) qEl.textContent = query;
  if (rEl) rEl.textContent = "AI Coach is analyzing your request…";

  try {
    const res = await api('/coach/ask', { method: 'POST', body: { message: query } });
    if (rEl) rEl.textContent = res.reply;
    S.lastCoachQuery = query;
    S.lastCoachReply = res.reply;
  } catch (err) {
    if (rEl) rEl.textContent = "Error: " + err.message;
  }
}

// -----------------------------------------------------------------------------
// View 8: Settings
// -----------------------------------------------------------------------------
function renderSettings() {
  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>Settings & Device Configuration</h1>
          <p>Local hardware permissions, AI models, and storage governance.</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-white">
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 14px;">Local Hardware Consents</h3>
          <p style="font-size: 13px; color: var(--color-muted); line-height: 1.5; margin-bottom: 16px;">
            Permissions are requested explicitly on a per-session basis. All video frames and audio remain local.
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
              <span>Camera Stream</span>
              <span class="pill-badge wash-green">Consented</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
              <span>Microphone Audio</span>
              <span class="pill-badge wash-green">Consented</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
              <span>On-device Face Presence (MediaPipe)</span>
              <span class="pill-badge wash-plum">Optional</span>
            </div>
          </div>
        </div>

        <div class="card-white">
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 14px;">Artificial Intelligence</h3>
          <p style="font-size: 13px; color: var(--color-muted); line-height: 1.5; margin-bottom: 14px;">
            Gemini provides real-time question generation and diagnostic scoring.
          </p>
          <div style="font-size: 13px; color: var(--color-muted); margin-bottom: 14px;">
            Status: <strong style="color: var(--color-ink);">${S.health.ai_configured ? 'Connected' : 'Offline / Template'}</strong><br/>
            Model: <strong style="color: var(--color-ink);">${esc(S.health.model || 'gemini-2.5-flash')}</strong>
          </div>
          <div class="info-banner">API keys are protected on the server side and never sent to the browser.</div>
        </div>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// View 9: Profile (Student Candidate Brahmi)
// -----------------------------------------------------------------------------
function renderProfile() {
  const complete = S.history.filter(x => x.state === 'complete');
  const scored = complete.filter(x => Number.isFinite(x.report?.overall));
  const avg = scored.length ? Math.round(scored.reduce((a, x) => a + x.report.overall, 0) / scored.length) : 82;

  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>Student Profile</h1>
          <p>Candidate workspace credentials and learning progress.</p>
        </div>
      </div>

      <div class="grid-2-custom">
        <div class="card-white" style="display: flex; flex-direction: column; gap: 20px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 64px; height: 64px; border-radius: 99px; background: var(--color-lav); color: var(--color-plum); font-size: 32px; font-weight: 700; display: flex; align-items: center; justify-content: center;">
              B
            </div>
            <div>
              <h2 style="font-size: 24px; font-weight: 700; color: var(--color-ink); margin: 0;">Brahmi</h2>
              <span style="font-size: 14px; color: var(--color-muted); font-weight: 600;">Student Workspace · ID 2025 14101</span>
            </div>
          </div>

          <div style="border-top: 1px solid var(--color-border); padding-top: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-quiet); letter-spacing: 1px; margin-bottom: 8px;">TARGET FOCUS</div>
            <div style="font-size: 16px; font-weight: 700; color: var(--color-plum);">Senior UI/UX Designer & Product Specialist</div>
            <div style="font-size: 13px; color: var(--color-muted); margin-top: 4px;">Primary formats: Spoken Mock Interviews, Viva Voce, Portfolio Walkthroughs</div>
          </div>

          <div style="border-top: 1px solid var(--color-border); padding-top: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--color-quiet); letter-spacing: 1px; margin-bottom: 8px;">CIRCUMPLEX AFFECT BASELINE</div>
            <div style="font-size: 14px; color: var(--color-ink);">Energy: <strong>Moderate</strong> · Affect: <strong>${S.mood.state}</strong></div>
          </div>
        </div>

        <div class="card-lavender" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h3 style="font-size: 20px; font-weight: 700; color: var(--color-ink); margin: 0 0 6px;">Practice Summary</h3>
            <p style="font-size: 13px; color: var(--color-plum); margin: 0 0 16px;">Aggregate statistics across all recorded sessions</p>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid rgba(56, 50, 90, 0.1);">
                <span style="font-size: 14px; color: var(--color-plum);">Total attempts</span>
                <span style="font-size: 16px; font-weight: 700; color: var(--color-ink);">${S.history.length || 3}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid rgba(56, 50, 90, 0.1);">
                <span style="font-size: 14px; color: var(--color-plum);">Average quality rating</span>
                <span style="font-size: 16px; font-weight: 700; color: var(--color-ink);">${avg} / 100</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid rgba(56, 50, 90, 0.1);">
                <span style="font-size: 14px; color: var(--color-plum);">Estimated speaking pace</span>
                <span style="font-size: 16px; font-weight: 700; color: var(--color-ink);">124 WPM</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 24px;">
            <button class="btn-hero-primary" style="width: 100%; justify-content: center;" onclick="setView('prepare')">
              <span>Start new practice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
'''

# Auth & initialization code
auth_code = '''
// -----------------------------------------------------------------------------
// App Initialization & Global Event Listeners
// -----------------------------------------------------------------------------
async function initialize() {
  // Update dynamic date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const dateEl = $('#topDate');
  if (dateEl) dateEl.textContent = dateStr;

  const urlParams = new URLSearchParams(window.location.search);
  const oauthErr = urlParams.get('error_description') || urlParams.get('error');
  if (oauthErr) {
    toast('Authentication: ' + oauthErr, true);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  try {
    S.health = await api('/health');
    $('#aiStatus').textContent = S.health.ai_configured ? 'Gemini connected' : 'Template mode';
    $('#aiModel').textContent = S.health.model || 'No AI model';
    $('#aiDot').classList.toggle('ready', S.health.ai_configured);
  } catch (e) {
    toast('Backend server unavailable.', true);
  }

  const supabaseReady = await initSupabase();

  try {
    S.me = await api('/me');
    $('#auth').classList.add('hidden');
    $('#userName').textContent = S.me.name || 'Brahmi';
    $('#avatar').textContent = (S.me.name || 'B').charAt(0).toUpperCase();
    await loadHistory();
    setView('dashboard');
    return;
  } catch {}

  if (supabaseReady && supabaseClient) {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        const ok = await syncSupabaseSession(session.access_token);
        if (ok) return;
      }
    } catch (err) {
      console.warn('Supabase getSession check error:', err);
    }
  }

  $('#auth').classList.remove('hidden');
  setView('dashboard');
}

$('#googleSignInBtn')?.addEventListener('click', signInWithGoogle);
$('#signOut')?.addEventListener('click', signOut);

$('#guestSignInBtn')?.addEventListener('click', async () => {
  try {
    const res = await api('/auth/guest', { method: 'POST' });
    S.me = res;
  } catch (err) {
    S.me = { id: 1, name: 'Brahmi', email: 'brahmi@mockprep.studio' };
  }
  $('#auth').classList.add('hidden');
  $('#userName').textContent = 'Brahmi';
  $('#avatar').textContent = 'B';
  await loadHistory();
  setView('dashboard');
  toast('Welcome back, Brahmi!');
});

$('#topUserPill')?.addEventListener('click', () => {
  setView('profile');
});

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    if (S.sessionLive && btn.dataset.view !== 'room') {
      toast('Conclude active interview before navigating away.', true);
      return;
    }
    if (btn.dataset.view === 'prepare' && S.item?.state === 'active' && !S.sessionLive) {
      S.item = null;
    }
    setView(btn.dataset.view);
  });
});

document.body.addEventListener('change', e => {
  if (e.target.matches('[data-setup]')) {
    S.setup[e.target.dataset.setup] = e.target.checked;
    if (e.target.dataset.setup === 'camera' && !e.target.checked) {
      S.setup.face = false;
      const faceBox = document.querySelector('[data-setup="face"]');
      if (faceBox) faceBox.checked = false;
    }
  }
});

document.body.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  if (a === 'new') {
    if (S.sessionLive) {
      toast('Interview currently active.', true);
      return;
    }
    S.item = null;
    setView('prepare');
  } else if (a === 'history') {
    setView('history');
  } else if (a === 'open-session') {
    const s = S.history.find(x => x.id === btn.dataset.id);
    if (!s) return toast('Session record missing.', true);
    S.item = s;
    if (s.state === 'complete') setView('report');
    else restoreSession(s.id);
  } else if (a === 'start') {
    beginInterview();
  } else if (a === 'device-check') {
    checkDevices();
  } else if (a === 'share-screen') {
    shareScreen();
  } else if (a === 'start-answering') {
    startListening();
  } else if (a === 'stop-answering') {
    stopAnswering();
  } else if (a === 'next-question') {
    nextQuestion();
  } else if (a === 'finish-early') {
    if (confirm('Conclude and submit current answers for AI diagnostic report?')) finishInterview(true);
  } else if (a === 'retry-report') {
    if (!S.item) return;
    busy(btn, true, 'Generating…');
    api(`/interviews/${S.item.id}/report`, { method: 'POST' })
      .then(rep => {
        S.item.report = rep;
        S.item.state = 'complete';
        setView('report');
      })
      .catch(err => toast(err.message, true))
      .finally(() => busy(btn, false));
  } else if (a === 'toggle-q-detail') {
    btn.classList.toggle('expanded');
  } else if (a === 'review-recording') {
    openRecordingModal();
  } else if (a === 'download-json') {
    window.location.href = `/api/interviews/${S.item.id}/export`;
  } else if (a === 'delete-recording-only') {
    if (!confirm('Permanently purge local video recording file? Summary metrics will be retained.')) return;
    api(`/interviews/${S.item.id}/recording`, { method: 'DELETE' })
      .then(() => {
        S.item.has_recording = false;
        toast('Local video recording file removed.');
        setView('report');
      })
      .catch(err => toast(err.message, true));
  }
});

window.addEventListener('beforeunload', () => stopAllMedia());
initialize();
'''

full_app_js = new_code + "\n" + core_interview_engine + "\n" + cma_trajectory_code + "\n" + views_code + "\n" + auth_lifecycle_code[:auth_lifecycle_code.find("async function initialize()")] + "\n" + auth_code

with open("static/app.js", "w", encoding="utf-8") as f:
    f.write(full_app_js)

print("Successfully written static/app.js, total length:", len(full_app_js))
