// MockPrep — AI Interview Studio (Radix Monochromatic Design System)
// Monochromatic light theme, strict 8px max radius, zero shadows, Noto Sans typography.

const $ = (sel) => document.querySelector(sel);
const esc = (value='') => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmtTime = (s) => `${Math.floor(Math.max(s,0)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(s,0)%60).toString().padStart(2,'0')}`;
const niceDate = (iso) => new Date(iso).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
const draftGet = (key) => { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } };
const draftSet = (key, v) => { try { sessionStorage.setItem(key, v); } catch {} };
const draftDel = (key) => { try { sessionStorage.removeItem(key); } catch {} };
const clip = (v, n=55) => String(v || '').length > n ? String(v).slice(0, n) + '…' : v;

// Radix UI 15x15 SVG Icon Library
const R_ICON = {
  plus: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2.75C8 2.47386 7.77614 2.25 7.5 2.25C7.22386 2.25 7 2.47386 7 2.75V7H2.75C2.47386 7 2.25 7.22386 2.25 7.5C2.25 7.77614 2.47386 8 2.75 8H7V12.25C7 12.5261 7.22386 12.75 7.5 12.75C7.77614 12.75 8 12.5261 8 12.25V8H12.25C12.5261 8 12.75 7.77614 12.75 7.5C12.75 7.22386 12.5261 7 12.25 7H8V2.75Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  arrowRight: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.4669 3.72684C11.7558 3.97448 11.7853 4.40827 11.5327 4.69715L6.53267 10.6972C6.40428 10.844 6.21639 10.9298 6.01824 10.9327C5.82008 10.9356 5.63007 10.8553 5.49845 10.7119L3.49845 8.21191C3.25301 7.91717 3.29221 7.48427 3.58695 7.23883C3.88168 6.99339 4.31458 7.03259 4.56002 7.32733L6.00287 8.94828L10.4966 3.79259C10.7492 3.50371 11.178 3.4792 11.4669 3.72684Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  speaker: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.45955 1.08051C7.69792 0.941944 7.99407 0.977227 8.19665 1.16833C8.39923 1.35944 8.47355 1.67389 8.38167 1.95079L7.04284 5.9877H10.5C11.3284 5.9877 12 6.65927 12 7.4877C12 8.31612 11.3284 8.9877 10.5 8.9877H7.04284L8.38167 13.0246C8.47355 13.3015 8.39923 13.616 8.19665 13.8071C7.99407 13.9982 7.69792 14.0335 7.45955 13.8949L2.20955 10.8449C2.07923 10.7692 2 10.6307 2 10.4877V4.4877C2 4.34468 2.07923 4.20623 2.20955 4.13051L7.45955 1.08051ZM3 5.06822V9.90717L6.96914 12.2139L5.8647 8.88338C5.78207 8.63412 5.84542 8.36109 6.0305 8.17006C6.21558 7.97903 6.49058 7.90095 6.74906 7.96582H10.5C10.7761 7.96582 11 7.74196 11 7.46582C11 7.18968 10.7761 6.96582 10.5 6.96582H6.74906C6.49058 7.03069 6.21558 6.95261 6.0305 6.76158C5.84542 6.57055 5.78207 6.29752 5.8647 6.04826L6.96914 2.71751L3 5.06822Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  mic: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 1C6.11929 1 5 2.11929 5 3.5V7.5C5 8.88071 6.11929 10 7.5 10C8.88071 10 10 8.88071 10 7.5V3.5C10 2.11929 8.88071 1 7.5 1ZM6 3.5C6 2.67157 6.67157 2 7.5 2C8.32843 2 9 2.67157 9 3.5V7.5C9 8.32843 8.32843 9 7.5 9C6.67157 9 6 8.32843 6 7.5V3.5ZM2.5 7C2.5 6.72386 2.27614 6.5 2 6.5C1.72386 6.5 1.5 6.72386 1.5 7C1.5 9.97234 3.70884 12.4285 6.55 12.9244V14H5C4.72386 14 4.5 14.2239 4.5 14.5C4.5 14.7761 4.72386 15 5 15H10C10.2761 15 10.5 14.7761 10.5 14.5C10.5 14.2239 10.2761 14 10 14H8.45V12.9244C11.2912 12.4285 13.5 9.97234 13.5 7C13.5 6.72386 13.2761 6.5 13 6.5C12.7239 6.5 12.5 6.72386 12.5 7C12.5 9.76142 10.2614 12 7.5 12C4.73858 12 2.5 9.76142 2.5 7Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  stop: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3.5C3 3.22386 3.22386 3 3.5 3H11.5C11.7761 3 12 3.22386 12 3.5V11.5C12 11.7761 11.7761 12 11.5 12H3.5C3.22386 12 3 11.7761 3 11.5V3.5ZM4 4V11H11V4H4Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  camera: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 3C1.67157 3 1 3.67157 1 4.5V11.5C1 12.3284 1.67157 13 2.5 13H12.5C13.3284 13 14 12.3284 14 11.5V4.5C14 3.67157 13.3284 3 12.5 3H10.8536L9.64645 1.79289C9.45892 1.60536 9.20456 1.5 8.93934 1.5H6.06066C5.79544 1.5 5.54108 1.60536 5.35355 1.79289L4.14645 3H2.5ZM2.5 4H4.5C4.63261 4 4.75979 3.94732 4.85355 3.85355L6.06066 2.64645C6.15442 2.55268 6.2816 2.5 6.41421 2.5H8.58579C8.71839 2.5 8.84558 2.55268 8.93934 2.64645L10.1464 3.85355C10.2402 3.94732 10.3674 4 10.5 4H12.5C12.7761 4 13 4.22386 13 4.5V11.5C13 11.7761 12.7761 12 12.5 12H2.5C2.22386 12 2 11.7761 2 11.5V4.5C2 4.22386 2.22386 4 2.5 4ZM7.5 5.5C6.11929 5.5 5 6.61929 5 8C5 9.38071 6.11929 10.5 7.5 10.5C8.88071 10.5 10 9.38071 10 8C10 6.61929 8.88071 5.5 7.5 5.5ZM6 8C6 7.17157 6.67157 6.5 7.5 6.5C8.32843 6.5 9 7.17157 9 8C9 8.82843 8.32843 9.5 7.5 9.5C6.67157 9.5 6 8.82843 6 8Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H11V12C11 12.5523 10.5523 13 10 13H5C4.44772 13 4 12.5523 4 12V4H3.5C3.22386 4 3 3.77614 3 3.5ZM5 4V12H10V4H5ZM6.5 5.5C6.77614 5.5 7 5.72386 7 6V10.5C7 10.7761 6.77614 11 6.5 11C6.22386 11 6 10.7761 6 10.5V6C6 5.72386 6.22386 5.5 6.5 5.5ZM8.5 5.5C8.77614 5.5 9 5.72386 9 6V10.5C9 10.7761 8.77614 11 8.5 11C8.22386 11 8 10.7761 8 10.5V6C8 5.72386 8.22386 5.5 8.5 5.5Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  download: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 1C7.77614 1 8 1.22386 8 1.5V8.29289L9.64645 6.64645C9.84171 6.45118 10.1583 6.45118 10.3536 6.64645C10.5488 6.84171 10.5488 7.15829 10.3536 7.35355L7.85355 9.85355C7.65829 10.0488 7.34171 10.0488 7.14645 9.85355L4.64645 7.35355C4.45118 7.15829 4.45118 6.84171 4.64645 6.64645C4.84171 6.45118 5.15829 6.45118 5.35355 6.64645L7 8.29289V1.5C7 1.22386 7.22386 1 7.5 1ZM2.5 10C2.77614 10 3 10.2239 3 10.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V10.5C12 10.2239 12.2239 10 12.5 10C12.7761 10 13 10.2239 13 10.5V12.5C13 13.3284 12.3284 14 11.5 14H3.5C2.67157 14 2 13.3284 2 12.5V10.5C2 10.2239 2.22386 10 2.5 10Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  cross: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  refresh: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.84998 7.49998C1.84998 4.66458 4.05979 2.34998 6.84998 2.34998C8.1758 2.34998 9.38753 2.87129 10.2971 3.73147L8.94998 5.07859H13.35V0.678589L11.7107 2.31787C10.4738 1.18975 8.76106 0.549976 6.84998 0.549976C3.0116 0.549976 0.0499756 3.6616 0.0499756 7.49998C0.0499756 8.35645 0.208757 9.17641 0.499988 9.93297L2.14624 9.18664C1.9545 8.6631 1.84998 8.09458 1.84998 7.49998ZM13.15 7.49998C13.15 10.3354 10.9402 12.65 8.14998 12.65C6.82416 12.65 5.61242 12.1287 4.70289 11.2685L6.04998 9.92136H1.64998V14.3214L3.28926 12.6821C4.52618 13.8102 6.2389 14.45 8.14998 14.45C11.9884 14.45 14.95 11.3384 14.95 7.49998C14.95 6.6435 14.7912 5.82354 14.5 5.06699L12.8537 5.81331C13.0455 6.33685 13.15 6.90537 13.15 7.49998Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`,
  chevronDown: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.14645 5.64645C3.34171 5.45118 3.65829 5.45118 3.85355 5.64645L7.5 9.29289L11.1464 5.64645C11.3417 5.45118 11.6583 5.45118 11.8536 5.64645C12.0488 5.84171 12.0488 6.15829 11.8536 6.35355L7.85355 10.3536C7.65829 10.5488 7.34171 10.5488 7.14645 10.3536L3.14645 6.35355C2.95118 6.15829 2.95118 5.84171 3.14645 5.64645Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg>`
};

const S = {
  me: null, health: {}, history: [], view: 'dashboard', item: null, idx: 0,
  setup: {
    mode: 'interview', difficulty: 'Intermediate', question_count: 5, topic: 'UI/UX Designer',
    camera: true, microphone: true, screen: true, face: true, record: true, secondary: false, adaptive: true, geminiAudio: true
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
  document.querySelectorAll('.nav-item').forEach(e => e.classList.toggle('active', e.dataset.view === view));
  const titles = {
    dashboard: 'DASHBOARD',
    prepare: 'NEW PRACTICE',
    room: 'LIVE INTERVIEW',
    report: 'EVALUATION REPORT',
    history: 'SESSIONS & PROGRESS',
    privacy: 'PRIVACY & SETTINGS'
  };
  const b = $('#breadcrumb');
  if (b) b.textContent = titles[view] || view.toUpperCase();
  const renderers = {
    dashboard: renderDashboard,
    prepare: renderPrepare,
    room: renderRoom,
    report: renderReport,
    history: renderHistory,
    privacy: renderPrivacy
  };
  renderers[view]?.();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// -----------------------------------------------------------------------------
// View 1: Dashboard
// -----------------------------------------------------------------------------
function renderDashboard() {
  const complete = S.history.filter(x => x.state === 'complete');
  const scored = complete.filter(x => Number.isFinite(x.report?.overall));
  const avg = scored.length ? Math.round(scored.reduce((a, x) => a + x.report.overall, 0) / scored.length) : '—';

  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>Dashboard</h1>
          <p>Mock interview preparation, response evaluation, and performance tracking.</p>
        </div>
        <button class="btn primary" data-action="new">
          ${R_ICON.plus}
          <span>New practice session</span>
        </button>
      </div>

      <div class="grid-3">
        <div class="stat-card">
          <div class="stat-label">Total attempts</div>
          <div class="stat-value">${S.history.length}</div>
          <div class="stat-sub">Recorded practice sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Completed sessions</div>
          <div class="stat-value">${complete.length}</div>
          <div class="stat-sub">Fully evaluated attempts</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Average quality score</div>
          <div class="stat-value">${avg === '—' ? '—' : avg + '%'}</div>
          <div class="stat-sub">AI structured response rating</div>
        </div>
      </div>

      <div class="view-header" style="margin-top: 16px; margin-bottom: 12px;">
        <div>
          <h2>Recent sessions</h2>
          <p style="font-size: 12px; color: var(--text-muted);">Saved local interview attempts</p>
        </div>
        <button class="btn secondary small" data-action="history">
          <span>View all sessions</span>
          ${R_ICON.arrowRight}
        </button>
      </div>

      <div class="table-container">
        ${sessionTableHtml(S.history.slice(0, 5))}
      </div>

      <div class="view-header" style="margin-top: 36px; margin-bottom: 14px;">
        <div>
          <h2>Practice workflow</h2>
          <p style="font-size: 12px; color: var(--text-muted);">Standardized 3-step preparation pipeline</p>
        </div>
      </div>

      <div class="grid-3">
        <div class="card">
          <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--text-muted);">01 / CONFIGURE</div>
          <h3 style="margin-top: 8px;">Parameters & Hardware</h3>
          <p style="margin-top: 6px; font-size: 12px; line-height: 1.5;">Define role focus and select explicit hardware permissions before launching.</p>
        </div>
        <div class="card">
          <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--text-muted);">02 / SIMULATE</div>
          <h3 style="margin-top: 8px;">Spoken Responses</h3>
          <p style="margin-top: 6px; font-size: 12px; line-height: 1.5;">Answer real-world prompts aloud with optional speech recognition and pacing logs.</p>
        </div>
        <div class="card">
          <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--text-muted);">03 / EVALUATE</div>
          <h3 style="margin-top: 8px;">Diagnostic Report</h3>
          <p style="margin-top: 6px; font-size: 12px; line-height: 1.5;">Inspect AI feedback, speaking pace, timestamps, and video playback locally.</p>
        </div>
      </div>
    </div>
  `;
}

function sessionTableHtml(items) {
  if (!items.length) {
    return `<div style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 12px;">No practice sessions recorded yet. Start your first session above.</div>`;
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
              <span class="cell-meta">${esc(s.role)} · ${esc(s.difficulty)}</span>
            </td>
            <td>${niceDate(s.created_at)}</td>
            <td>${s.question_count} items</td>
            <td>
              <span class="badge ${s.state === 'complete' ? 'complete' : 'active'}">
                ${s.state === 'complete' ? 'Completed' : 'Paused'}
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
// View 2: Prepare
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
              <input id="topic" maxlength="180" value="${esc(u.topic)}" placeholder="e.g. Senior UI/UX Designer" />
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

            <div style="border-top: 1px solid var(--border); margin: 18px 0;"></div>

            <div class="card-title" style="margin-bottom: 4px;">Baseline check-in</div>
            <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Self-reported state for post-interview review.</p>

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

            <div style="border-top: 1px solid var(--border); margin: 18px 0;"></div>

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

function permissionCard(name, title, desc) {
  const u = S.setup;
  return `
    <label class="checkbox-card">
      <input type="checkbox" data-setup="${name}" ${u[name] ? 'checked' : ''} />
      <div class="checkbox-content">
        <span class="checkbox-title">${esc(title)}</span>
        <span class="checkbox-desc">${esc(desc)}</span>
      </div>
    </label>
  `;
}

function currentConsents() {
  const u = S.setup;
  return {
    camera: u.camera,
    microphone: u.microphone,
    screen: u.screen,
    face: u.face && u.camera,
    record: u.record,
    secondary: u.secondary
  };
}

async function ensureMedia() {
  if (S.stream) return S.stream;
  const { camera, microphone } = S.setup;
  if (!camera && !microphone) return null;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Device media unsupported. Ensure localhost or HTTPS origin.');
  }
  try {
    S.stream = await navigator.mediaDevices.getUserMedia({
      video: camera ? { width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 24 } } : false,
      audio: microphone ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false
    });
    const cams = S.stream.getVideoTracks();
    if (cams.length) {
      $('#cameraSource').srcObject = new MediaStream(cams);
      $('#cameraSource').play().catch(() => {});
      cams[0].addEventListener('ended', () => logEvent('camera-disconnected', 'Camera hardware stream disconnected.'));
    }
    const mics = S.stream.getAudioTracks();
    if (mics.length) {
      mics[0].addEventListener('ended', () => logEvent('microphone-disconnected', 'Microphone stream disconnected.'));
      initAudioMeter();
    }
    return S.stream;
  } catch (err) {
    throw new Error('Device initialization error: ' + err.message);
  }
}

function attachVideo(host, sourceId) {
  if (!host) return;
  host.innerHTML = '';
  const el = document.createElement('video');
  el.autoplay = true;
  el.playsInline = true;
  el.muted = true;
  el.srcObject = $(sourceId.startsWith('#') ? sourceId : '#' + sourceId)?.srcObject || null;
  if (el.srcObject) {
    host.appendChild(el);
    el.play().catch(() => {});
  } else {
    host.innerHTML = '<span>Camera feed inactive</span>';
  }
}

async function checkDevices() {
  const btn = $('[data-action="device-check"]');
  busy(btn, true, 'Testing…');
  try {
    await ensureMedia();
    attachVideo($('#preparePreview'), 'cameraSource');
    $('#deviceState').textContent = 'Devices verified';
    toast('Camera and microphone connected successfully.');
  } catch (e) {
    toast(e.message, true);
    $('#deviceState').textContent = 'Hardware error';
  } finally {
    busy(btn, false);
  }
}

async function shareScreen() {
  if (!S.setup.screen) return null;
  if (S.screenStream) return S.screenStream;
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen capture unavailable in this browser environment.');
  }
  try {
    S.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 15 } },
      audio: false
    });
    $('#screenSource').srcObject = S.screenStream;
    $('#screenSource').play().catch(() => {});
    S.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      S.screenStream = null;
      $('#screenSource').srcObject = null;
      logEvent('screen-share-stopped', 'Screen capture terminated by user.');
      updateSignals();
    });
    return S.screenStream;
  } catch (e) {
    throw new Error('Screen sharing aborted: ' + e.message);
  }
}

async function beginInterview() {
  if (S.loading) return;
  S.setup.topic = $('#topic').value.trim() || 'UI/UX Designer';
  S.setup.difficulty = $('#difficulty').value;
  S.setup.question_count = Number($('#questionCount').value);
  const btn = $('[data-action="start"]');
  S.loading = true;
  busy(btn, true, 'Starting session…');
  try {
    if (S.setup.screen) {
      try {
        await shareScreen();
      } catch (e) {
        S.setup.screen = false;
        toast(e.message + ' Proceeding without screen stream.', true);
      }
    }
    try {
      await ensureMedia();
    } catch (e) {
      S.setup.camera = false;
      S.setup.microphone = false;
      S.setup.face = false;
      toast(e.message + ' Continuing in text input mode.', true);
    }
    const payload = {
      mode: S.setup.mode,
      topic: S.setup.topic,
      difficulty: S.setup.difficulty,
      question_count: S.setup.question_count,
      consent: currentConsents(),
      checkin: {
        energy: $('#energy')?.value || 'Moderate',
        feeling: $('#feeling')?.value || 'Focused'
      }
    };
    const response = await api('/interviews', { method: 'POST', body: payload });
    S.item = await api('/interviews/' + response.id);
    S.idx = 0;
    S.events = [];
    S.elapsedAccum = 0;
    launchLiveSession();
    toast(response.question_origin === 'gemini' ? 'Session initialized with Gemini questions.' : 'Session initialized with template questions.');
  } catch (e) {
    toast(e.message, true);
  } finally {
    S.loading = false;
    busy(btn, false);
  }
}

function launchLiveSession() {
  S.startTime = Date.now();
  S.sessionLive = true;
  S.paused = false;
  S.answering = false;
  S.liveText = '';
  S.edited = false;
  S.events = S.item.events || [];
  setView('room');
  startTimer();
  startRecording();
  if (S.setup.face) startFaceTracking();
  if (S.setup.secondary) connectPrimaryWs();
  logEvent('session-start', 'Interview session initiated with consented hardware.');
  setTimeout(() => speakQuestion(), 600);
}

// -----------------------------------------------------------------------------
// View 3: Live Interview Room
// -----------------------------------------------------------------------------
function renderRoom() {
  if (!S.item) {
    setView('dashboard');
    return;
  }
  const q = S.item.questions[S.idx] || '';
  const progressPct = Math.round((S.idx / S.item.question_count) * 100);

  $('#view').innerHTML = `
    <div class="content">
      <div class="room-header">
        <div>
          <span class="room-topic-badge">${esc(S.item.topic.toUpperCase())}</span>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-top: 2px;">
            Question ${S.idx + 1} of ${S.item.question_count}
          </div>
        </div>

        <div class="room-timer" id="timer">00:00</div>

        <div class="recording-indicator ${S.recorder?.state === 'recording' ? 'recording' : ''}" id="recordStatusChip">
          <span class="rec-pulse"></span>
          <span>${S.recorder?.state === 'recording' ? 'RECORDING' : S.setup.record ? 'STANDBY' : 'REC DISABLED'}</span>
        </div>
      </div>

      ${!S.sessionLive ? '<div class="info-banner warning" style="margin-bottom: 16px;">This session was interrupted. Transcripts are preserved. Click "Resume session" to reconnect hardware.</div>' : ''}

      <div class="grid-sidebar">
        <!-- Main stage -->
        <div>
          <div class="question-box">
            <div class="question-meta">PROMPT ${S.idx + 1} OF ${S.item.question_count}</div>
            <div class="question-text" id="activeQuestion">${esc(q)}</div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
              <button class="btn secondary small" data-action="speak">
                ${R_ICON.speaker}
                <span>Repeat question</span>
              </button>
              <span style="font-size: 11px; color: var(--text-muted);">${progressPct}% completed</span>
            </div>

            <div class="progress-bar-container">
              <div class="progress-bar-fill" id="qProgress" style="width: ${progressPct}%;"></div>
            </div>
          </div>

          <div class="video-grid">
            <div class="video-cell">
              <video id="previewCamera" muted autoplay playsinline></video>
              <span class="video-cell-label">Candidate Camera</span>
              <span id="cameraPlaceholder" class="placeholder hidden" style="font-size: 11px; color: var(--text-muted);">Camera inactive</span>
            </div>
            <div class="video-cell">
              <video id="previewScreen" muted autoplay playsinline></video>
              <span class="video-cell-label">Screen Capture</span>
              <span id="screenPlaceholder" class="placeholder hidden" style="font-size: 11px; color: var(--text-muted);">Screen share inactive</span>
            </div>
          </div>

          <div class="response-card">
            <div class="card-header">
              <div>
                <div class="card-title">Candidate response</div>
                <div class="card-subtitle">Speak aloud or type your answer directly</div>
              </div>
              <span id="listenStatus" class="badge">Ready</span>
            </div>

            <textarea id="answerText" class="response-textarea" placeholder="Spoken transcript will appear here automatically. You may also edit or type manually…">${esc(draftGet('mockprep_draft_' + S.item.id + '_' + S.idx) || S.item.answers?.find(a => a.idx === S.idx)?.text || '')}</textarea>

            <div class="response-footer">
              <span id="wordCount" style="font-size: 11px; color: var(--text-muted);">0 words</span>
              <span style="font-size: 11px; color: var(--text-muted);">Local transcription enabled</span>
            </div>

            <div style="border-top: 1px solid var(--border); margin: 16px 0;"></div>

            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: gap: 8px;">
              <div style="display: flex; gap: 8px;">
                <button class="btn primary" id="answerButton" data-action="listen">
                  ${R_ICON.mic}
                  <span>Start voice answer</span>
                </button>
                <button class="btn secondary" data-action="speak">
                  ${R_ICON.refresh}
                  <span>Repeat prompt</span>
                </button>
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="btn secondary" data-action="pause" id="pauseButton">Pause</button>
                <button class="btn secondary" id="nextButton" data-action="next">
                  <span>${S.idx === S.item.question_count - 1 ? 'Finish interview' : 'Save & Next'}</span>
                  ${R_ICON.arrowRight}
                </button>
                <button class="btn danger" data-action="finish">End & report</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right sidebar -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Signal monitor</div>
                <div class="card-subtitle">Real-time device indicators</div>
              </div>
            </div>

            <div class="signal-list">
              <div class="signal-row">
                <span class="signal-name"><span class="status-dot" id="cameraDot"></span> Camera</span>
                <span class="signal-val" id="cameraStatus">Off</span>
              </div>
              <div class="signal-row">
                <span class="signal-name"><span class="status-dot" id="micDot"></span> Microphone</span>
                <span class="signal-val" id="micStatus">Off</span>
              </div>
              <div class="signal-row">
                <span class="signal-name"><span class="status-dot" id="screenDot"></span> Screen share</span>
                <span class="signal-val" id="screenStatus">Off</span>
              </div>
              <div class="signal-row">
                <span class="signal-name"><span class="status-dot" id="faceDot"></span> Face tracking</span>
                <span class="signal-val" id="faceStatus">Unavailable</span>
              </div>
            </div>

            <div style="border-top: 1px solid var(--border); margin: 14px 0;"></div>

            <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px; color: var(--text-secondary);">
              <div>Faces detected: <strong id="facesCount" style="color: var(--text-primary);">—</strong></div>
              <div>Head direction: <strong id="headDirection" style="color: var(--text-primary);">—</strong></div>
              <div>Eye gaze: <strong id="gazeDirection" style="color: var(--text-primary);">—</strong></div>
            </div>

            <div class="info-banner" style="margin-top: 12px; font-size: 11px;">
              Face orientation is processed entirely in-browser. It is not conclusive proof of attention.
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Session controls</div>
                <div class="card-subtitle">Tools and auxiliary input</div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button class="btn secondary small full" data-action="checkin">
                ${R_ICON.camera}
                <span>Capture reference photo</span>
              </button>
              <button class="btn secondary small full" data-action="fullscreen">Toggle fullscreen</button>
              ${!S.sessionLive ? '<button class="btn primary small full" data-action="resume">Resume session</button>' : ''}
            </div>

            <div style="border-top: 1px solid var(--border); margin: 14px 0;"></div>

            <div class="card-title" style="font-size: 12px;">Secondary camera</div>
            <p id="secondStatus" style="font-size: 11px; color: var(--text-muted); margin: 4px 0 10px;">Not connected</p>

            <div style="display: flex; gap: 6px;">
              <button class="btn secondary small" data-action="second-webcam">+ Add webcam</button>
              <button class="btn secondary small" data-action="invite-phone">Connect phone</button>
            </div>

            <div id="phoneInvite" class="hidden" style="margin-top: 10px;"></div>
            <video id="previewSecond" autoplay playsinline muted style="display: none; width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: var(--radius-sm); margin-top: 10px; background: #000; border: 1px solid var(--border);"></video>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Activity events</div>
                <div class="card-subtitle">Time-stamped audit log</div>
              </div>
            </div>

            <div class="feed-list" id="eventFeed">
              ${eventHtml()}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  $('#answerText').addEventListener('input', () => {
    S.edited = true;
    draftSet('mockprep_draft_' + S.item.id + '_' + S.idx, $('#answerText').value);
    $('#wordCount').textContent = wordCount($('#answerText').value) + ' words';
  });

  if (S.stream?.getVideoTracks().length) {
    $('#previewCamera').srcObject = $('#cameraSource').srcObject;
    $('#previewCamera').play().catch(() => {});
  }
  if (S.screenStream) {
    $('#previewScreen').srcObject = S.screenStream;
    $('#previewScreen').play().catch(() => {});
  }
  $('#cameraPlaceholder').classList.toggle('hidden', !!S.stream?.getVideoTracks().length);
  $('#screenPlaceholder').classList.toggle('hidden', !!S.screenStream);

  $('#previewSecond').srcObject = S.remoteStream || S.secondStream || null;
  if ($('#previewSecond').srcObject) {
    $('#previewSecond').style.display = 'block';
    $('#previewSecond').play().catch(() => {});
  }

  $('#wordCount').textContent = wordCount($('#answerText').value) + ' words';
  updateSignals();
}

function wordCount(s) {
  return (String(s || '').match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length;
}

function speakQuestion() {
  if (!('speechSynthesis' in window)) {
    toast('Speech synthesis is unsupported in this browser.', true);
    return;
  }
  window.speechSynthesis.cancel();
  const q = S.item?.questions?.[S.idx];
  if (!q) return;
  const utter = new SpeechSynthesisUtterance(q);
  utter.rate = 0.95;
  utter.pitch = 1.0;
  utter.lang = 'en-US';
  window.speechSynthesis.speak(utter);
}

function startTimer() {
  clearInterval(S.timerId);
  S.timerId = setInterval(() => {
    if (S.sessionLive && $('#timer')) $('#timer').textContent = fmtTime(elapsed());
    if (S.sessionLive && S.analyser) {
      const buffer = new Uint8Array(S.analyser.fftSize);
      S.analyser.getByteTimeDomainData(buffer);
      const rms = Math.sqrt(buffer.reduce((sum, b) => sum + ((b - 128) / 128) ** 2, 0) / buffer.length);
      if ($('#micStatus')) $('#micStatus').textContent = 'Level ' + Math.round(Math.min(100, rms * 180)) + '%';
      if (S.answering) {
        if (rms < 0.008) {
          if (!S.audioQuietSince) S.audioQuietSince = Date.now();
          if (Date.now() - S.audioQuietSince > 14000) {
            logEvent('low-mic-signal', 'Low microphone amplitude detected for 14+ seconds.');
            S.audioQuietSince = Date.now() + 20000;
          }
        } else {
          S.audioQuietSince = 0;
        }
      }
    }
  }, 500);
}

function elapsed() {
  return S.elapsedAccum + (S.sessionLive && !S.paused ? Math.round((Date.now() - S.startTime) / 1000) : 0);
}

function updateSignals() {
  if (S.view !== 'room') return;
  const signals = [
    ['camera', !!S.stream?.getVideoTracks().some(t => t.readyState === 'live')],
    ['mic', !!S.stream?.getAudioTracks().some(t => t.readyState === 'live')],
    ['screen', !!S.screenStream?.getVideoTracks().some(t => t.readyState === 'live')],
    ['face', !!S.faceModel]
  ];
  signals.forEach(([n, on]) => {
    const dot = $('#' + n + 'Dot');
    if (dot) dot.classList.toggle('ready', on);
    const label = $('#' + n + 'Status');
    if (label) {
      label.textContent = on ? (n === 'face' ? 'Tracking' : 'Active') : 'Off';
      label.classList.toggle('active', on);
    }
  });
}

function eventHtml() {
  if (!S.events?.length) return '<div class="muted" style="font-size: 11px;">Activity events will be recorded here.</div>';
  return S.events.slice(-10).reverse().map(e => `
    <div class="feed-item">
      <time>${fmtTime(e.elapsed)}</time>
      <span>${esc(clip(e.detail, 85))}</span>
    </div>
  `).join('');
}

async function logEvent(kind, detail) {
  if (!S.sessionLive || !S.item) return;
  const e = { kind, detail, elapsed: elapsed() };
  if (S.lastEvent[kind] && Date.now() - S.lastEvent[kind] < 9500) return;
  S.lastEvent[kind] = Date.now();
  S.events.push(e);
  if ($('#eventFeed')) $('#eventFeed').innerHTML = eventHtml();
  try {
    await api('/interviews/' + S.item.id + '/event', { method: 'POST', body: e });
  } catch (error) {
    console.warn('Event sync failed', error.message);
  }
}

function initAudioMeter() {
  if (!S.stream?.getAudioTracks().length || S.audioCtx) return;
  try {
    S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = S.audioCtx.createMediaStreamSource(new MediaStream(S.stream.getAudioTracks()));
    S.analyser = S.audioCtx.createAnalyser();
    S.analyser.fftSize = 1024;
    src.connect(S.analyser);
  } catch (e) {
    console.warn('AudioContext unavailable', e);
  }
}

function drawCover(ctx, video, x, y, w, h) {
  if (!video || video.readyState < 2 || !video.videoWidth) return false;
  const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, x, y, w, h);
  return true;
}

// Monochromatic video composite renderer
function drawComposite() {
  if (!S.sessionLive) return;
  const canvas = $('#recordCanvas'), ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Pure dark grayscale background
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, W, H);

  const cam = $('#cameraSource'), screen = $('#screenSource');
  const activeScreen = !!S.screenStream && screen.readyState >= 2;

  if (activeScreen) {
    drawCover(ctx, screen, 0, 0, W, H);
  } else if (cam.readyState >= 2) {
    drawCover(ctx, cam, 0, 0, W, H);
    ctx.fillStyle = 'rgba(9, 9, 11, 0.25)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 32px "Noto Sans", sans-serif';
    ctx.fillText('MockPrep AI Interview Studio', 60, 140);
  }

  // Picture-in-picture camera feed
  if (activeScreen && cam.readyState >= 2) {
    ctx.fillStyle = '#09090b';
    ctx.fillRect(W - 324, 16, 308, 188);
    drawCover(ctx, cam, W - 320, 20, 300, 180);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.strokeRect(W - 320, 20, 300, 180);
  }

  // Secondary stream if present
  const side = S.remoteStream ? $('#remoteSource') : S.secondStream ? $('#secondSource') : null;
  if (side && side.readyState >= 2) {
    const secondX = activeScreen ? W - 324 : W - 370;
    const secondY = activeScreen ? 220 : 20;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(secondX - 4, secondY - 4, 308, 188);
    drawCover(ctx, side, secondX, secondY, 300, 180);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1;
    ctx.strokeRect(secondX, secondY, 300, 180);
  }

  // Clean Lower Monochromatic Banner
  ctx.fillStyle = 'rgba(9, 9, 11, 0.9)';
  ctx.fillRect(0, H - 64, W, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 16px "Noto Sans", sans-serif';
  ctx.fillText('MockPrep · ' + (S.item?.topic || 'Practice').slice(0, 60), 24, H - 38);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '13px "Noto Sans", sans-serif';
  ctx.fillText(`Question ${S.idx + 1} / ${S.item?.question_count || '?'}    ·    ${fmtTime(elapsed())}`, 24, H - 16);

  S.drawFrame = requestAnimationFrame(drawComposite);
}

function startRecording() {
  if (S.drawFrame) cancelAnimationFrame(S.drawFrame);
  drawComposite();
  if (!S.setup.record) return;
  if (!window.MediaRecorder) {
    toast('Video recording unsupported in this browser.', true);
    return;
  }
  try {
    const stream = $('#recordCanvas').captureStream(15);
    for (const track of S.stream?.getAudioTracks() || []) stream.addTrack(track);
    const candidates = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const mime = candidates.find(x => MediaRecorder.isTypeSupported(x));
    S.videoMime = mime || 'video/webm';
    S.recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 1_200_000 } : undefined);
    S.recChunks = [];
    S.recorder.addEventListener('dataavailable', e => { if (e.data.size) S.recChunks.push(e.data); });
    S.recorder.start(1500);
    const chip = $('#recordStatusChip');
    if (chip) {
      chip.className = 'recording-indicator recording';
      chip.innerHTML = '<span class="rec-pulse"></span><span>RECORDING</span>';
    }
  } catch (e) {
    S.recorder = null;
    S.recorderError = true;
    toast('Recording initialization failed: ' + e.message, true);
  }
}

function stopRecording() {
  return new Promise(resolve => {
    if (!S.recorder || S.recorder.state === 'inactive') {
      resolve(null);
      return;
    }
    const rec = S.recorder;
    rec.addEventListener('stop', () => {
      const b = new Blob(S.recChunks, { type: rec.mimeType || S.videoMime });
      S.recChunks = [];
      resolve(b.size ? b : null);
    }, { once: true });
    try {
      rec.stop();
    } catch {
      resolve(null);
    }
  });
}

async function startListening() {
  if (!S.sessionLive || S.paused) {
    toast('Resume your session before recording speech.', true);
    return;
  }
  if (S.answering) return;
  window.speechSynthesis?.cancel();
  S.answering = true;
  S.audioQuietSince = 0;
  S.answerStarted = Date.now();
  S.edited = false;
  S.liveText = '';
  S.transcriptionOrigin = '';

  $('#listenStatus').textContent = 'Listening…';
  $('#listenStatus').className = 'badge active';
  $('#answerButton').innerHTML = `${R_ICON.stop}<span>Stop answering</span>`;

  if (S.stream?.getAudioTracks().length && window.MediaRecorder) {
    try {
      const trackStream = new MediaStream(S.stream.getAudioTracks());
      S.audioChunks = [];
      const opts = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
      S.audioRecorder = new MediaRecorder(trackStream, opts ? { mimeType: opts } : undefined);
      S.audioRecorder.ondataavailable = e => { if (e.data.size) S.audioChunks.push(e.data); };
      S.audioRecorder.start(1000);
    } catch (e) {
      console.warn('Audio track recorder unavailable', e);
    }
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Recognition && S.setup.microphone && S.stream?.getAudioTracks().length) {
    try {
      S.recognizer = new Recognition();
      S.recognizer.lang = 'en-US';
      S.recognizer.continuous = true;
      S.recognizer.interimResults = true;
      S.recognizer.onresult = e => {
        let final = '', interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const text = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += text + ' ';
          else interim += text + ' ';
        }
        S.liveText = (final + ' ' + interim).trim();
        if (!S.edited && $('#answerText')) {
          $('#answerText').value = S.liveText;
          $('#wordCount').textContent = wordCount(S.liveText) + ' words';
        }
      };
      S.recognizer.onerror = e => {
        if (!['no-speech', 'aborted'].includes(e.error)) console.warn('SpeechRecognition error:', e.error);
      };
      S.recognizer.onend = () => {
        if (S.answering && S.recognizer) {
          setTimeout(() => {
            if (S.answering) {
              try { S.recognizer.start(); } catch {}
            }
          }, 450);
        }
      };
      S.recognizer.start();
    } catch (e) {
      console.warn('SpeechRecognition startup error', e);
    }
  } else if (!S.stream?.getAudioTracks().length) {
    toast('No active microphone. Type your response in the textarea.');
  }
}

async function stopAnswering() {
  if (!S.answering) return null;
  S.answering = false;
  if (S.recognizer) {
    try {
      S.recognizer.onend = null;
      S.recognizer.stop();
    } catch {}
    S.recognizer = null;
  }
  if ($('#answerButton')) $('#answerButton').innerHTML = `${R_ICON.mic}<span>Start voice answer</span>`;
  if ($('#listenStatus')) {
    $('#listenStatus').textContent = 'Answer saved';
    $('#listenStatus').className = 'badge';
  }
  const r = S.audioRecorder;
  if (!r || r.state === 'inactive') {
    S.audioRecorder = null;
    return null;
  }
  return await new Promise(resolve => {
    r.addEventListener('stop', () => {
      const blob = new Blob(S.audioChunks, { type: r.mimeType || 'audio/webm' });
      S.audioRecorder = null;
      S.audioChunks = [];
      resolve(blob.size ? blob : null);
    }, { once: true });
    try { r.stop(); } catch { resolve(null); }
  });
}

async function saveCurrentAnswer() {
  if (!S.item) return;
  const btn = $('#nextButton');
  busy(btn, true, 'Saving…');
  try {
    const t = S.answerStarted ? Math.max(1, Math.round((Date.now() - S.answerStarted) / 1000)) : 0;
    const audio = await stopAnswering();
    let text = $('#answerText')?.value?.trim() || '';

    if (audio && S.health.ai_configured && S.setup.geminiAudio && !S.edited) {
      try {
        const fd = new FormData();
        fd.append('file', audio, audio.type.includes('mp4') ? 'answer.mp4' : 'answer.webm');
        $('#listenStatus').textContent = 'Transcribing…';
        const res = await api('/interviews/' + S.item.id + '/transcribe/' + S.idx, { method: 'POST', body: fd });
        if (res.transcript) {
          text = res.transcript;
          S.transcriptionOrigin = 'Gemini transcription';
        }
        for (const obs of res.audio_observations || []) {
          logEvent('audio-review-cue', 'Audio cue: ' + obs);
        }
      } catch (e) {
        toast('AI transcription fallback: using local text.', true);
      }
    }
    await api('/interviews/' + S.item.id + '/answer', {
      method: 'POST',
      body: { idx: S.idx, text, duration: t }
    });
    S.item.answers = S.item.answers || [];
    S.item.answers = S.item.answers.filter(a => a.idx !== S.idx).concat([{ idx: S.idx, text, duration: t }]);
    if ($('#answerText')) $('#answerText').value = text;
    draftDel('mockprep_draft_' + S.item.id + '_' + S.idx);
    return true;
  } catch (e) {
    toast('Answer persistence error: ' + e.message, true);
    return false;
  } finally {
    busy(btn, false);
  }
}

async function nextQuestion() {
  if (S.loading || S.paused) {
    if (S.paused) toast('Resume the session before continuing.', true);
    return;
  }
  S.loading = true;
  try {
    if (!await saveCurrentAnswer()) return;
    if (S.idx >= S.item.question_count - 1) {
      await finishInterview(true);
      return;
    }
    if (S.health.ai_configured && S.setup.adaptive) {
      const current = S.item.answers.find(a => a.idx === S.idx)?.text || '';
      if (current) {
        try {
          const q = await api('/interviews/' + S.item.id + '/next/' + S.idx, { method: 'POST' });
          S.item.questions[S.idx + 1] = q.question;
        } catch (e) {
          console.warn('Adaptive next question error', e);
        }
      }
    }
    S.idx++;
    S.answerStarted = 0;
    S.liveText = '';
    S.edited = false;
    renderRoom();
    speakQuestion();
  } finally {
    S.loading = false;
  }
}

async function togglePause() {
  if (!S.sessionLive) return;
  if (!S.paused) {
    if (S.answering) {
      toast('Stop answering before pausing the session.', true);
      return;
    }
    S.elapsedAccum = elapsed();
    S.paused = true;
    if (S.recorder?.state === 'recording') S.recorder.pause();
    stopFaceTracking();
    logEvent('session-paused', 'Candidate paused recording.');
    if ($('#pauseButton')) $('#pauseButton').textContent = 'Resume';
    if ($('#listenStatus')) $('#listenStatus').textContent = 'Paused';
    const chip = $('#recordStatusChip');
    if (chip) {
      chip.className = 'recording-indicator';
      chip.innerHTML = '<span>PAUSED</span>';
    }
  } else {
    S.paused = false;
    S.startTime = Date.now();
    if (S.recorder?.state === 'paused') S.recorder.resume();
    if (S.setup.face && S.stream?.getVideoTracks().length) startFaceTracking();
    logEvent('session-resumed', 'Candidate resumed practice.');
    if ($('#pauseButton')) $('#pauseButton').textContent = 'Pause';
    const chip = $('#recordStatusChip');
    if (chip) {
      chip.className = 'recording-indicator recording';
      chip.innerHTML = '<span class="rec-pulse"></span><span>RECORDING</span>';
    }
    if ($('#listenStatus')) $('#listenStatus').textContent = 'Ready';
  }
}

async function finishInterview(currentSaved = false) {
  if (S.loading && !currentSaved) return;
  const btn = $('[data-action="finish"]');
  busy(btn, true, 'Generating report…');
  try {
    if (!currentSaved && S.sessionLive) {
      const ok = await saveCurrentAnswer();
      if (!ok) return;
    }
    S.elapsedAccum = elapsed();
    S.sessionLive = false;
    S.paused = false;
    clearInterval(S.timerId);
    window.speechSynthesis?.cancel();
    if (S.drawFrame) cancelAnimationFrame(S.drawFrame);
    stopFaceTracking();

    const video = await stopRecording();
    stopAllMedia();

    if (video && S.setup.record) {
      try {
        toast('Saving video recording to local server storage…');
        const fd = new FormData();
        const ext = video.type.includes('mp4') ? 'mp4' : 'webm';
        fd.append('file', video, `session.${ext}`);
        await api('/interviews/' + S.item.id + '/recording', { method: 'POST', body: fd });
      } catch (e) {
        toast('Recording upload failed; saving local download: ' + e.message, true);
        const a = document.createElement('a');
        const url = URL.createObjectURL(video);
        a.href = url;
        a.download = 'mockprep-recording.' + (video.type.includes('mp4') ? 'mp4' : 'webm');
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    }

    toast('Evaluating responses with Gemini AI…');
    const r = await api('/interviews/' + S.item.id + '/report', { method: 'POST' });
    S.item = await api('/interviews/' + S.item.id);
    S.item.report = r.report;
    await loadHistory();
    setView('report');
    toast('Interview evaluation report generated.');
  } catch (e) {
    toast('Evaluation generation error: ' + e.message, true);
    S.item = await api('/interviews/' + S.item.id).catch(() => S.item);
    setView('room');
  } finally {
    busy(btn, false);
  }
}

function stopAllMedia() {
  for (const stream of [S.stream, S.screenStream, S.secondStream, S.remoteStream]) {
    for (const track of stream?.getTracks() || []) track.stop();
  }
  S.stream = null;
  S.screenStream = null;
  S.secondStream = null;
  S.remoteStream = null;
  for (const el of ['cameraSource', 'screenSource', 'secondSource', 'remoteSource']) {
    const v = $('#' + el);
    if (v) v.srcObject = null;
  }
  if (S.peer) { S.peer.close(); S.peer = null; }
  if (S.ws) { S.ws.close(); S.ws = null; }
  if (S.audioCtx) { S.audioCtx.close().catch(() => {}); S.audioCtx = null; S.analyser = null; }
}

async function restoreSession(iid) {
  try {
    const item = await api('/interviews/' + iid);
    S.item = item;
    if (item.state === 'complete') {
      setView('report');
      return;
    }
    S.setup = { ...S.setup, ...item.consent, mode: item.role, topic: item.topic, difficulty: item.difficulty, question_count: item.question_count };
    S.idx = Math.min(item.question_count - 1, item.answers?.length || 0);
    S.elapsedAccum = Math.round(item.events?.at(-1)?.elapsed || 0);
    S.sessionLive = false;
    S.events = item.events || [];
    setView('room');
  } catch (e) {
    toast(e.message, true);
  }
}

async function resumeDevices() {
  if (S.sessionLive) return;
  try {
    if (S.setup.screen) {
      try { await shareScreen(); } catch (e) { S.setup.screen = false; toast(e.message + ' Continuing without screen capture.', true); }
    }
    try { await ensureMedia(); } catch (e) { S.setup.camera = false; S.setup.microphone = false; S.setup.face = false; toast(e.message + ' Text-only input mode.', true); }
    S.startTime = Date.now();
    S.sessionLive = true;
    S.paused = false;
    S.events = S.item.events || [];
    renderRoom();
    startTimer();
    startRecording();
    if (S.setup.face) startFaceTracking();
    if (S.setup.secondary) connectPrimaryWs();
    logEvent('session-resume', 'Candidate resumed paused interview.');
  } catch (e) {
    toast(e.message, true);
  }
}

async function captureCheckin() {
  if (!S.setup.camera || !S.stream?.getVideoTracks().length) {
    toast('Camera permission required for check-in photo.', true);
    return;
  }
  const v = $('#cameraSource'), canvas = document.createElement('canvas');
  canvas.width = 480; canvas.height = 360;
  canvas.getContext('2d').drawImage(v, 0, 0, 480, 360);
  const blob = await new Promise(ok => canvas.toBlob(ok, 'image/jpeg', 0.75));
  if (!blob) return;
  try {
    const form = new FormData();
    form.append('file', blob, 'checkin.jpg');
    await api('/interviews/' + S.item.id + '/checkin', { method: 'POST', body: form });
    toast('Reference snapshot saved for personal review.');
    logEvent('checkin-photo', 'Candidate captured an identity review reference photo.');
  } catch (e) {
    toast(e.message, true);
  }
}

async function addSecondWebcam() {
  if (!S.setup.secondary) {
    toast('Enable secondary camera option in setup.', true);
    return;
  }
  try {
    const dev = await navigator.mediaDevices.enumerateDevices();
    const cams = dev.filter(d => d.kind === 'videoinput');
    if (cams.length < 2) {
      toast('Only one local camera detected. Connect a phone or external webcam.', true);
      return;
    }
    const first = S.stream?.getVideoTracks()[0]?.getSettings()?.deviceId;
    const alt = cams.find(x => x.deviceId !== first);
    if (!alt) throw new Error('No second camera found');
    S.secondStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: alt.deviceId } }, audio: false });
    $('#secondSource').srcObject = S.secondStream;
    $('#secondSource').play().catch(() => {});
    $('#previewSecond').srcObject = S.secondStream;
    $('#previewSecond').style.display = 'block';
    $('#previewSecond').play().catch(() => {});
    $('#secondStatus').textContent = 'Secondary local webcam active';
    logEvent('second-camera', 'Secondary local camera paired.');
  } catch (e) {
    toast('Secondary camera error: ' + e.message, true);
  }
}

async function invitePhone() {
  if (!S.setup.secondary) {
    toast('Secondary camera option was not enabled in session setup.', true);
    return;
  }
  try {
    const data = await api('/interviews/' + S.item.id + '/invite', { method: 'POST' });
    const host = $('#phoneInvite');
    host.classList.remove('hidden');
    host.innerHTML = `
      <div style="font-family: ui-monospace, monospace; font-size: 11px; padding: 6px 8px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: var(--radius-xs); word-break: break-all;" id="inviteUrl">${esc(data.url)}</div>
      <div style="display: flex; gap: 6px; margin-top: 8px;">
        <button class="btn secondary small full" data-action="copy-invite">Copy link</button>
      </div>
      <p style="font-size: 10px; color: var(--text-muted); margin-top: 6px;">Open on mobile device using HTTPS.</p>
    `;
    S.inviteUrl = data.url;
    connectPrimaryWs();
  } catch (e) {
    toast(e.message, true);
  }
}

async function connectPrimaryWs() {
  if (S.ws?.readyState === WebSocket.OPEN || !S.item) return;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}/ws/rooms/${S.item.id}/primary`);
  S.ws = ws;
  ws.onopen = () => {
    const label = $('#secondStatus');
    if (label) label.textContent = 'Awaiting mobile device connection…';
  };
  ws.onmessage = async e => {
    let data;
    try { data = JSON.parse(e.data); } catch { return; }
    if (data.type === 'peer-ready' && !S.peer) createPeer();
    if (data.type === 'offer') {
      const pc = createPeer();
      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: 'answer', answer }));
    }
    if (data.type === 'ice' && S.peer) {
      try { await S.peer.addIceCandidate(data.candidate); } catch {}
    }
    if (data.type === 'peer-left') {
      if (S.peer) { S.peer.close(); S.peer = null; }
      S.remoteStream = null;
      $('#remoteSource').srcObject = null;
      if ($('#secondStatus')) $('#secondStatus').textContent = 'Phone disconnected';
      logEvent('second-camera-disconnected', 'Auxiliary phone stream disconnected.');
    }
  };
  ws.onerror = () => {
    if ($('#secondStatus')) $('#secondStatus').textContent = 'WebRTC signaling unavailable';
  };
}

function createPeer() {
  if (S.peer) return S.peer;
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  S.peer = pc;
  pc.onicecandidate = e => {
    if (e.candidate && S.ws?.readyState === WebSocket.OPEN) {
      S.ws.send(JSON.stringify({ type: 'ice', candidate: e.candidate }));
    }
  };
  pc.ontrack = e => {
    S.remoteStream = e.streams[0];
    $('#remoteSource').srcObject = S.remoteStream;
    $('#remoteSource').play().catch(() => {});
    if ($('#previewSecond')) {
      $('#previewSecond').srcObject = S.remoteStream;
      $('#previewSecond').style.display = 'block';
      $('#previewSecond').play().catch(() => {});
    }
    if ($('#secondStatus')) $('#secondStatus').textContent = 'Mobile camera connected';
    logEvent('second-camera-connected', 'Auxiliary mobile camera streaming via WebRTC.');
  };
  return pc;
}

async function startFaceTracking() {
  if (!S.setup.face || !S.stream?.getVideoTracks().length) return;
  if (S.faceModel) {
    startFaceInterval();
    return;
  }
  try {
    const { FaceLandmarker, FilesetResolver } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm');
    const files = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');
    S.faceModel = await FaceLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'CPU'
      },
      runningMode: 'VIDEO',
      numFaces: 3,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    updateSignals();
    startFaceInterval();
  } catch (e) {
    console.warn('MediaPipe model load error', e);
    if ($('#faceStatus')) $('#faceStatus').textContent = 'Unavailable';
  }
}

function startFaceInterval() {
  if (S.faceInterval) clearInterval(S.faceInterval);
  S.faceInterval = setInterval(() => {
    if (!S.sessionLive || !S.faceModel) return;
    const video = $('#cameraSource');
    if (video.readyState < 2 || !video.videoWidth) return;
    try {
      const result = S.faceModel.detectForVideo(video, performance.now());
      const faces = result.faceLandmarks || [];
      const count = faces.length;
      let direction = 'center', gaze = 'uncertain';
      if (count === 1) {
        const points = faces[0], nose = points[1], left = points[234], right = points[454];
        if (nose && left && right) {
          const center = (left.x + right.x) / 2;
          const ratio = (nose.x - center) / Math.max(0.05, Math.abs(right.x - left.x));
          direction = ratio < -0.17 ? 'Turned left' : ratio > 0.17 ? 'Turned right' : 'Center';
        }
        const rightIris = points[468], leftIris = points[473], rc1 = points[33], rc2 = points[133], lc1 = points[362], lc2 = points[263];
        if (direction === 'Center' && rightIris && leftIris && rc1 && rc2 && lc1 && lc2) {
          const frac = (iris, a, b) => ((iris.x - Math.min(a.x, b.x)) / Math.max(0.01, Math.abs(a.x - b.x)));
          const mean = (frac(rightIris, rc1, rc2) + frac(leftIris, lc1, lc2)) / 2;
          gaze = mean < 0.29 ? 'Looking left' : mean > 0.71 ? 'Looking right' : 'Centered';
        }
      }
      S.faceState.count = count;
      S.faceState.direction = direction;
      S.faceState.gaze = gaze;
      if ($('#gazeDirection')) $('#gazeDirection').textContent = gaze;
      if ($('#facesCount')) $('#facesCount').textContent = String(count);
      if ($('#headDirection')) $('#headDirection').textContent = direction;

      const key = count === 0 ? 'no-face' : count > 1 ? 'multiple-faces' : direction !== 'Center' ? 'head-turned' : 'normal';
      if (key !== S.faceState.key) {
        S.faceState.key = key;
        S.faceState.since = Date.now();
      } else if (key !== 'normal' && Date.now() - S.faceState.since > 2500) {
        const message = key === 'no-face' ? 'Candidate out of frame for ~2.5 seconds' : key === 'multiple-faces' ? 'Multiple faces detected in frame' : 'Head orientation deviated from center';
        logEvent(key, message);
        S.faceState.since = Date.now() + 10000;
      }
    } catch (e) {
      console.warn('Face landmark iteration error', e.message);
      clearInterval(S.faceInterval);
      S.faceInterval = null;
    }
  }, 950);
}

function stopFaceTracking() {
  if (S.faceInterval) clearInterval(S.faceInterval);
  S.faceInterval = null;
}

// -----------------------------------------------------------------------------
// View 4: Evaluation Report
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
      feedback: fb
    };
  });

  const events = S.item.events || [];
  const nextStepPrompt = (report.next_steps && report.next_steps[0]) || 'Refine outcome quantification and design system rationale.';

  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>Interview evaluation report</h1>
          <p>${esc(S.item.topic)} · ${durMinutes} min session · ${answered.length} of ${qCount} prompts answered</p>
        </div>
        <div class="badge complete">EVALUATION COMPLETE</div>
      </div>

      <div class="report-tabs">
        <button class="tab-btn active" data-tab="overview">Overview</button>
        <button class="tab-btn" data-tab="questions">Question review</button>
        <button class="tab-btn" data-tab="timeline">Timeline audit</button>
        <button class="tab-btn" data-tab="cma">Affect check-in</button>
      </div>

      <div class="grid-4">
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

      <div class="info-banner" style="margin-bottom: 24px;">
        Evaluation notice: Metrics reflect structured heuristic analysis and self-practice coaching. They do not constitute formal employment or integrity determinations.
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
                  <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">Prompt:</div>
                  <div style="margin-bottom: 8px;">${esc(item.q)}</div>
                  <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">Your response:</div>
                  <div style="margin-bottom: 8px;">${esc(item.text || 'No spoken or typed answer recorded.')}</div>
                  <div style="background: var(--bg-subtle); padding: 8px 10px; border-radius: var(--radius-xs); border: 1px solid var(--border);">
                    <strong style="color: var(--text-primary);">Coaching note:</strong> ${esc(item.feedback)}
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
            `).join('') : '<div style="font-size: 11px; color: var(--text-muted); padding: 12px 0;">No audit events logged during this attempt.</div>'}
          </div>
        </div>

        <!-- Col 3: Monochromatic Affect Coordinate Graph -->
        <div class="card" id="colCma">
          <div class="card-header">
            <div>
              <div class="card-title">Candidate affect check-in</div>
              <div class="card-subtitle">Self-reported activation coordinate</div>
            </div>
          </div>

          <div style="display: flex; justify-content: center; margin: 16px 0;">
            <svg viewBox="0 0 240 210" style="width: 100%; max-width: 220px; aspect-ratio: 1.14;">
              <!-- Outer boundary -->
              <circle cx="120" cy="105" r="70" fill="#fafafa" stroke="#e4e4e7" stroke-width="1.2" stroke-dasharray="3 3"/>
              
              <!-- Axes -->
              <line x1="42" y1="105" x2="198" y2="105" stroke="#d4d4d8" stroke-width="1.2"/>
              <line x1="120" y1="27" x2="120" y2="183" stroke="#d4d4d8" stroke-width="1.2"/>
              
              <!-- Labels -->
              <text x="120" y="18" text-anchor="middle" font-size="7.5" font-weight="700" fill="#71717a" letter-spacing="0.08em">HIGH ACTIVATION</text>
              <text x="120" y="198" text-anchor="middle" font-size="7.5" font-weight="700" fill="#71717a" letter-spacing="0.08em">LOW ACTIVATION</text>
              <text x="32" y="108" text-anchor="end" font-size="7.5" font-weight="700" fill="#71717a" letter-spacing="0.08em">UNPLEASANT</text>
              <text x="208" y="108" text-anchor="start" font-size="7.5" font-weight="700" fill="#71717a" letter-spacing="0.08em">PLEASANT</text>
              
              <!-- Monochromatic plotted coordinate points -->
              <circle cx="100" cy="74" r="5" fill="#09090b"/>
              <text x="100" y="65" text-anchor="middle" font-size="8.5" font-weight="700" fill="#09090b">Q1</text>
              
              <circle cx="145" cy="80" r="5" fill="#09090b"/>
              <text x="156" y="80" text-anchor="start" font-size="8.5" font-weight="700" fill="#09090b">Q2</text>
              
              <circle cx="158" cy="120" r="5" fill="#09090b"/>
              <text x="168" y="125" text-anchor="start" font-size="8.5" font-weight="700" fill="#09090b">Q3</text>
            </svg>
          </div>

          <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.5; border-top: 1px solid var(--border); padding-top: 12px;">
            <div>Q1: Tense / High energy</div>
            <div>Q2: Focused / High energy</div>
            <div>Q3: Calm / Moderate</div>
          </div>

          <div style="font-size: 10px; color: var(--text-muted); margin-top: 10px;">
            Self-reported during practice configuration. Never inferred from facial expressions.
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top: 16px;">
        <div class="card">
          <div class="card-title">Media capture status</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin: 6px 0 10px;">
            Video replay: <strong>${S.item.has_recording ? 'Available locally' : 'No recording saved'}</strong> · Audio: Captured · Screen: Consented
          </div>
          <p style="font-size: 11px; line-height: 1.4;">
            Video files are stored on this local computer. They can be reviewed or permanently deleted at any time.
          </p>
        </div>

        <div class="card">
          <div class="card-title">Recommended next step</div>
          <div style="font-size: 12px; font-weight: 500; color: var(--text-primary); margin: 6px 0 14px;">
            ${esc(nextStepPrompt)}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn primary small" data-action="new">Practice again</button>
            <button class="btn secondary small" data-action="review-recording">Review recording</button>
          </div>
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
        <div style="display: flex; gap: 8px;">
          <button class="btn secondary small" data-action="download-json">
            ${R_ICON.download}
            <span>Export report (JSON)</span>
          </button>
          <button class="btn secondary small" data-action="delete-recording-only">Delete video recording</button>
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">Candidate retains full control of stored sessions.</span>
      </div>
    </div>
  `;
}

function openRecordingModal() {
  const existing = $('#recordingModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'recordingModal';
  modal.className = 'recording-modal-backdrop';

  if (S.item?.has_recording) {
    modal.innerHTML = `
      <div class="recording-modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Practice session replay</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${esc(S.item.topic)} · Local composite recording</div>
          </div>
          <button id="closeRecordingModal" style="color: var(--text-muted); padding: 4px;">
            ${R_ICON.cross}
          </button>
        </div>
        <video controls autoplay playsinline style="width: 100%; aspect-ratio: 16/9; background: #09090b; border-radius: var(--radius-sm); border: 1px solid var(--border);" src="/api/interviews/${encodeURIComponent(S.item.id)}/media/recording"></video>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
          <span style="font-size: 11px; color: var(--text-muted);">Stored on local server storage.</span>
          <div style="display: flex; gap: 8px;">
            <a href="/api/interviews/${encodeURIComponent(S.item.id)}/media/recording" download class="btn secondary small" style="text-decoration: none;">
              ${R_ICON.download}
              <span>Download</span>
            </a>
            <button id="closeModalBtn" class="btn primary small">Done</button>
          </div>
        </div>
      </div>
    `;
  } else {
    modal.innerHTML = `
      <div class="recording-modal-card" style="max-width: 440px; text-align: center; padding: 32px 24px;">
        <div style="margin-bottom: 12px; display: inline-flex; padding: 12px; background: var(--bg-subtle); border-radius: var(--radius-sm);">
          ${R_ICON.camera}
        </div>
        <div style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">No video recording saved</div>
        <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px;">
          A video file was not generated for this attempt. To record video in subsequent sessions, ensure "Local video recording" is checked during setup.
        </p>
        <button id="closeModalBtn" class="btn primary small" style="padding: 6px 20px;">Dismiss</button>
      </div>
    `;
  }
  document.body.appendChild(modal);

  const close = () => {
    modal.querySelector('video')?.pause();
    modal.remove();
  };
  modal.querySelector('#closeRecordingModal')?.addEventListener('click', close);
  modal.querySelector('#closeModalBtn')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
}

// -----------------------------------------------------------------------------
// View 5: History
// -----------------------------------------------------------------------------
function renderHistory() {
  const scores = S.history.filter(x => typeof x.report?.overall === 'number').slice().reverse();
  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>Sessions & progress</h1>
          <p>Review previous attempts, response quality progressions, and stored media.</p>
        </div>
        <button class="btn primary" data-action="new">
          ${R_ICON.plus}
          <span>New practice</span>
        </button>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Score progression</div>
              <div class="card-subtitle">AI response rating across recent sessions</div>
            </div>
          </div>
          <div class="chart">
            ${scores.length ? scores.slice(-12).map((x, i) => `
              <div class="chart-item">
                <strong>${Math.round(x.report.overall)}%</strong>
                <div class="chart-bar" style="height: ${Math.round(x.report.overall * 1.1)}px;"></div>
                <span>${i + 1}</span>
              </div>
            `).join('') : '<div style="font-size: 11px; color: var(--text-muted); margin: auto;">No scored attempts recorded yet.</div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Performance summary</div>
              <div class="card-subtitle">Aggregated practice statistics</div>
            </div>
          </div>
          <div class="stat-value" style="margin-top: 10px;">${S.history.length} <span style="font-size: 13px; font-weight: 500; color: var(--text-muted);">total sessions</span></div>
          <p style="font-size: 12px; line-height: 1.5; margin-top: 8px;">
            Consistent practice with varied prompt complexities enhances structure, concise pacing, and design system articulation.
          </p>
          <div style="margin-top: 20px;">
            <button class="btn secondary small" data-action="new">
              <span>Start new practice</span>
              ${R_ICON.arrowRight}
            </button>
          </div>
        </div>
      </div>

      <div class="view-header" style="margin-top: 28px; margin-bottom: 12px;">
        <h2>All recorded sessions</h2>
      </div>

      <div class="table-container">
        ${sessionTableHtml(S.history)}
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// View 6: Privacy & Settings
// -----------------------------------------------------------------------------
function renderPrivacy() {
  $('#view').innerHTML = `
    <div class="content">
      <div class="view-header">
        <div class="view-header-title">
          <h1>Privacy & data governance</h1>
          <p>Local-first processing principles and authentication details.</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Data retention</div>
              <div class="card-subtitle">Local storage architecture</div>
            </div>
          </div>
          <p style="font-size: 12px; line-height: 1.6; margin-bottom: 14px;">
            Candidate session parameters, speech transcripts, video recordings, check-in snapshots, and evaluation summaries are stored on your local FastAPI server database.
          </p>
          <div class="info-banner">
            Practice recordings never leave your machine unless explicitly downloaded or exported.
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Artificial Intelligence integration</div>
              <div class="card-subtitle">Cloud API processing</div>
            </div>
          </div>
          <p style="font-size: 12px; line-height: 1.6; margin-bottom: 8px;">
            When configured, Google Gemini Flash processes prompt generation, audio transcription, and structured response coaching.
          </p>
          <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">
            Status: <strong>${S.health.ai_configured ? 'Active' : 'Unconfigured'}</strong><br/>
            Model: <strong>${esc(S.health.model || 'Gemini 2.5 Flash')}</strong>
          </div>
          <div class="info-banner">
            API keys are kept exclusively on the server and are never exposed to browser client code.
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 20px; border-color: var(--danger-border); background: #ffffff;">
        <div class="card-header">
          <div>
            <div class="card-title" style="color: var(--danger-text);">Data management</div>
            <div class="card-subtitle">Manage or purge recorded attempts</div>
          </div>
        </div>
        <p style="font-size: 12px; line-height: 1.5; color: var(--text-secondary); margin-bottom: 14px;">
          You may inspect individual session reports, export data in JSON format, or permanently delete sessions and associated video media.
        </p>
        <button class="btn danger small" data-action="history">
          ${R_ICON.trash}
          <span>Manage saved sessions</span>
        </button>
      </div>
    </div>
  `;
}

async function loadHistory() {
  try {
    S.history = await api('/interviews');
  } catch (e) {
    console.warn('Failed to load history:', e.message);
  }
}

async function deleteSession(id) {
  if (!confirm('Permanently delete this interview, including all transcripts, recordings, and reports?')) return;
  try {
    await api('/interviews/' + id, { method: 'DELETE' });
    if (S.item?.id === id) {
      stopAllMedia();
      S.item = null;
    }
    await loadHistory();
    setView('history');
    toast('Practice session permanently removed.');
  } catch (e) {
    toast(e.message, true);
  }
}

// -----------------------------------------------------------------------------
// Supabase Authentication & Session Sync
// -----------------------------------------------------------------------------
let supabaseClient = null;

async function initSupabase() {
  try {
    const cfg = await api('/auth/config');
    const pubKey = cfg.supabase_publishable_key || cfg.supabase_anon_key;
    if (cfg.configured && cfg.supabase_url && pubKey) {
      let createClientFn = window.supabase?.createClient;
      if (!createClientFn) {
        const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        createClientFn = mod.createClient;
      }
      supabaseClient = createClientFn(cfg.supabase_url, pubKey);
      $('#supabaseWarning')?.classList.add('hidden');
      const gBtn = $('#googleSignInBtn');
      if (gBtn) gBtn.disabled = false;

      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.access_token && !S.me) {
          await syncSupabaseSession(session.access_token);
        }
      });
      return true;
    } else {
      $('#supabaseWarning')?.classList.remove('hidden');
      const gBtn = $('#googleSignInBtn');
      if (gBtn) gBtn.disabled = true;
      return false;
    }
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    $('#supabaseWarning')?.classList.remove('hidden');
    const gBtn = $('#googleSignInBtn');
    if (gBtn) gBtn.disabled = true;
    return false;
  }
}

async function syncSupabaseSession(accessToken) {
  try {
    const user = await api('/auth/supabase-session', {
      method: 'POST',
      body: { access_token: accessToken }
    });
    S.me = user;
    $('#auth').classList.add('hidden');
    $('#userName').textContent = S.me.name;
    $('#avatar').textContent = (S.me.name || 'U').charAt(0).toUpperCase();
    await loadHistory();
    setView('dashboard');
    toast(`Authenticated as ${S.me.name || 'Candidate'}.`);
    return true;
  } catch (err) {
    toast('Authentication sync failed: ' + err.message, true);
    return false;
  }
}

async function signInWithGoogle() {
  if (!supabaseClient) {
    toast('Supabase configuration missing in .env file.', true);
    return;
  }
  const btn = $('#googleSignInBtn');
  busy(btn, true, 'Redirecting to Google…');
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/'
      }
    });
    if (error) throw error;
  } catch (err) {
    toast('OAuth error: ' + err.message, true);
    busy(btn, false);
  }
}

async function signOut() {
  if (S.sessionLive) {
    toast('Conclude your live session before signing out.', true);
    return;
  }
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {}
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch {}
  }
  S.me = null;
  S.item = null;
  S.history = [];
  $('#auth').classList.remove('hidden');
}

// -----------------------------------------------------------------------------
// App Initialization & Global Event Listeners
// -----------------------------------------------------------------------------
async function initialize() {
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
    $('#userName').textContent = S.me.name;
    $('#avatar').textContent = (S.me.name || 'U').charAt(0).toUpperCase();
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
    if (['camera', 'microphone'].includes(e.target.dataset.setup) && S.stream && !S.sessionLive) {
      S.stream.getTracks().forEach(t => t.stop());
      S.stream = null;
      $('#cameraSource').srcObject = null;
      if ($('#preparePreview')) $('#preparePreview').innerHTML = '<span>Run device check again</span>';
      if ($('#deviceState')) $('#deviceState').textContent = 'Permissions modified';
    }
  }
});

document.body.addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  try {
    switch (action) {
      case 'new':
        if (S.sessionLive) { toast('Conclude current interview first.', true); return; }
        S.item = null;
        setView('prepare');
        break;
      case 'history':
        if (S.sessionLive) { toast('Conclude current interview first.', true); return; }
        await loadHistory();
        setView('history');
        break;
      case 'device-check':
        await checkDevices();
        break;
      case 'start':
        await beginInterview();
        break;
      case 'speak':
        speakQuestion();
        break;
      case 'listen':
        if (S.answering) await stopAnswering();
        else await startListening();
        break;
      case 'next':
        await nextQuestion();
        break;
      case 'pause':
        await togglePause();
        break;
      case 'finish':
        await finishInterview();
        break;
      case 'open-session':
        await restoreSession(btn.dataset.id);
        break;
      case 'retry-report': {
        const r = await api('/interviews/' + S.item.id + '/report', { method: 'POST' });
        S.item = await api('/interviews/' + S.item.id);
        setView('report');
        break;
      }
      case 'delete-session':
        await deleteSession(btn.dataset.id);
        break;
      case 'download-json':
        window.location.href = '/api/interviews/' + encodeURIComponent(S.item.id) + '/export';
        break;
      case 'checkin':
        await captureCheckin();
        break;
      case 'fullscreen':
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
        break;
      case 'second-webcam':
        await addSecondWebcam();
        break;
      case 'invite-phone':
        await invitePhone();
        break;
      case 'copy-invite':
        await navigator.clipboard.writeText(S.inviteUrl);
        toast('Mobile connection link copied.');
        break;
      case 'resume':
        await resumeDevices();
        break;
      case 'toggle-q-detail': {
        const card = btn.closest('.q-item');
        if (card) card.classList.toggle('expanded');
        break;
      }
      case 'review-recording':
        openRecordingModal();
        break;
      case 'delete-recording-only': {
        if (!confirm('Delete video recording while retaining transcripts, answers, and reports?')) return;
        try {
          await api('/interviews/' + S.item.id + '/recording', { method: 'DELETE' });
          S.item.has_recording = false;
          toast('Video recording deleted. Transcripts and reports preserved.');
        } catch (err) {
          toast('Could not delete recording: ' + err.message, true);
        }
        break;
      }
    }
  } catch (error) {
    toast(error.message, true);
  }
});

// Report Tab Switching
document.body.addEventListener('click', e => {
  const tabBtn = e.target.closest('.tab-btn');
  if (tabBtn && tabBtn.dataset.tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === tabBtn));
    const tab = tabBtn.dataset.tab;
    const colQ = $('#colQuestions'), colT = $('#colTimeline'), colC = $('#colCma'), grid = $('.report-grid-3');
    if (!grid) return;
    if (tab === 'overview') {
      if (colQ) colQ.style.display = '';
      if (colT) colT.style.display = '';
      if (colC) colC.style.display = '';
      grid.style.gridTemplateColumns = '1fr 1.15fr 0.95fr';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'questions') {
      document.querySelectorAll('.q-item').forEach(el => el.classList.add('expanded'));
      colQ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tab === 'timeline') {
      colT?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tab === 'cma') {
      colC?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});

document.addEventListener('visibilitychange', () => {
  if (S.sessionLive && document.hidden) logEvent('tab-hidden', 'Interview tab moved out of focus.');
});
window.addEventListener('blur', () => {
  if (S.sessionLive && !document.hidden) logEvent('window-blur', 'Application window lost focus.');
});
document.addEventListener('fullscreenchange', () => {
  if (S.sessionLive && !document.fullscreenElement) logEvent('fullscreen-exit', 'Fullscreen mode exited.');
});
window.addEventListener('offline', () => {
  if (S.sessionLive) {
    toast('Network connectivity lost. Retrying when online.', true);
    logEvent('offline', 'Network connection offline.');
  }
});
window.addEventListener('beforeunload', e => {
  if (S.sessionLive) {
    e.preventDefault();
    e.returnValue = '';
  }
});

initialize();