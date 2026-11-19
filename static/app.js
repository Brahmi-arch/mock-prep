import { rIcon, R_ICON } from './radix-icons.js?v=36';
// MockPrep — AI Interview Studio
// Design System: Urbanist typography, #F6F6FA canvas, #FDFEFF cards, #212121 ink, #D7D7F4 lavender

const $ = (sel) => document.querySelector(sel);
const esc = (value='') => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmtTime = (s) => `${Math.floor(Math.max(s,0)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(s,0)%60).toString().padStart(2,'0')}`;
const niceDate = (iso) => new Date(iso).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
const shortDate = (iso) => {
  if (!iso) return 'Recent';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};
const draftGet = (key) => { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } };
const draftSet = (key, v) => { try { sessionStorage.setItem(key, v); } catch {} };
const draftDel = (key) => { try { sessionStorage.removeItem(key); } catch {} };
const clip = (v, n=55) => String(v || '').length > n ? String(v).slice(0, n) + '…' : v;

function formatMarkdown(text) {
  if (!text) return '';
  let html = esc(text);
  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');
  // Bullet lists
  html = html.replace(/^[•\-\*]\s+(.*)$/gm, '<li class="chat-list-item">$1</li>');
  html = html.replace(/(<li class="chat-list-item">.*?<\/li>(\n|$))+/g, '<ul class="chat-ul">$&</ul>');
  // Numbered lists e.g. 1. text
  html = html.replace(/^(\d+)\.\s+(.*)$/gm, '<li class="chat-list-num" value="$1">$2</li>');
  html = html.replace(/(<li class="chat-list-num">.*?<\/li>(\n|$))+/g, '<ol class="chat-ol">$&</ol>');
  // Line breaks
  html = html.replace(/\n\n+/g, '<br/><br/>').replace(/\n/g, '<br/>');
  return html;
}

// R_ICON provided by radix-icons.js

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
  faceState: { count: null, direction: '—', gaze: '—', pitch: '—', since: 0, key: 'normal', alertActive: false, loggedAlert: false, lastAlertSound: 0 },
  audioCtx: null, analyser: null, sessionLive: false, events: [], lastEvent: {}, ws: null, peer: null,
  toastTimer: null, recorderError: false, loading: false, audioQuietSince: 0, paused: false,
  videoMime: 'video/webm', transcriptionOrigin: '', uiNote: '',
  coachMessages: [
    {
      sender: 'coach',
      text: "Hello! I am your AI Design Coach, powered by Gemini 2.5 Flash.\n\nI can help you:\n• **Practice interview questions** with instant critique\n• **Structure STAR responses** (Situation, Task, Action, Result)\n• **Refine case studies** and portfolio storytelling\n• **Prepare for design trade-offs & systems critiques**\n\nPick a quick drill on the right, or type any interview question below to begin!",
      suggestions: [
        "How do I structure a STAR response?",
        "Tell me about yourself",
        "Explaining UX trade-offs"
      ],
      time: "Just now"
    }
  ],
  coachTyping: false,
  settings: {
    theme: 'light',
    density: 'comfortable',
    highContrast: false,
    fontSize: 'medium',
    language: 'en',
    aiVoice: '',
    voiceRate: 1.0,
    voicePitch: 1.0,
    permissions: {
      camera: true,
      microphone: true,
      screen: true,
      face: true,
      secondary: false
    }
  }
};

function loadSettings() {
  try {
    const raw = localStorage.getItem('mockprep_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      S.settings = { ...S.settings, ...parsed };
      if (parsed.permissions) {
        S.settings.permissions = { ...S.settings.permissions, ...parsed.permissions };
      }
    }
  } catch {}
  applySettings();
}

function saveSettings() {
  try {
    localStorage.setItem('mockprep_settings', JSON.stringify(S.settings));
  } catch {}
  applySettings();
}

function applySettings() {
  if (!S.settings) return;
  // 1. Theme
  let isDark = false;
  if (S.settings.theme === 'dark') isDark = true;
  else if (S.settings.theme === 'auto') {
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.body.classList.toggle('theme-dark', isDark);

  // 2. Font Size
  document.documentElement.setAttribute('data-font-size', S.settings.fontSize || 'medium');

  // 3. Density & Contrast
  document.body.classList.toggle('density-compact', S.settings.density === 'compact');
  document.body.classList.toggle('high-contrast', !!S.settings.highContrast);

  // 4. Permissions Sync
  if (S.settings.permissions) {
    S.setup.camera = !!S.settings.permissions.camera;
    S.setup.microphone = !!S.settings.permissions.microphone;
    S.setup.screen = !!S.settings.permissions.screen;
    S.setup.face = !!S.settings.permissions.face;
    S.setup.secondary = !!S.settings.permissions.secondary;
  }
}

function testAiVoice() {
  if (!('speechSynthesis' in window)) {
    toast('Speech synthesis is unsupported in this browser.', true);
    return;
  }
  window.speechSynthesis.cancel();

  const isHindi = S.settings?.language === 'hi';
  const sampleText = isHindi
    ? "नमस्ते! मैं आपका एआई इंटरव्यू कोच हूँ। मैं आपके यूआई/यूएक्स मॉक इंटरव्यू की तैयारी में मदद करूँगा।"
    : "Hello! I am your AI Design Coach. I am ready to guide your UI/UX interview practice with real-time feedback.";

  const utter = new SpeechSynthesisUtterance(sampleText);
  utter.rate = parseFloat(S.settings?.voiceRate) || 1.0;
  utter.pitch = parseFloat(S.settings?.voicePitch) || 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (S.settings?.aiVoice) {
    const matched = voices.find(v => v.name === S.settings.aiVoice || v.voiceURI === S.settings.aiVoice);
    if (matched) utter.voice = matched;
  } else if (isHindi) {
    const hiVoice = voices.find(v => v.lang.startsWith('hi') || v.lang.includes('IN'));
    if (hiVoice) utter.voice = hiVoice;
  }

  const btn = $('#btnTestVoice');
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span><span>Speaking…</span>`;
    btn.disabled = true;
  }

  utter.onend = () => {
    if (btn) {
      btn.innerHTML = `${rIcon("speaker", 14)}<span>Test AI Voice</span>`;
      btn.disabled = false;
    }
  };
  utter.onerror = () => {
    if (btn) {
      btn.innerHTML = `${rIcon("speaker", 14)}<span>Test AI Voice</span>`;
      btn.disabled = false;
    }
  };

  window.speechSynthesis.speak(utter);
}

function populateVoiceSelect() {
  const sel = $('#aiVoiceSelect');
  if (!sel) return;
  if (!('speechSynthesis' in window)) {
    sel.innerHTML = '<option value="">Default Browser Synthesizer</option>';
    return;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    sel.innerHTML = '<option value="">Default System Synthesizer</option>';
    window.speechSynthesis.onvoiceschanged = () => populateVoiceSelect();
    return;
  }

  const isHindi = S.settings?.language === 'hi';
  let html = '';
  const matching = voices.filter(v => isHindi ? (v.lang.startsWith('hi') || v.lang.includes('IN')) : (v.lang.startsWith('en')));
  const other = voices.filter(v => !matching.includes(v));

  if (matching.length) {
    html += `<optgroup label="${isHindi ? 'Recommended Hindi & Indian English Voices' : 'Recommended English Voices'}">`;
    matching.forEach(v => {
      const selected = (S.settings?.aiVoice && (v.name === S.settings.aiVoice || v.voiceURI === S.settings.aiVoice)) ? 'selected' : '';
      html += `<option value="${esc(v.name)}" ${selected}>${esc(v.name)} (${esc(v.lang)})</option>`;
    });
    html += `</optgroup>`;
  }

  if (other.length) {
    html += `<optgroup label="Other Available System Voices">`;
    other.slice(0, 15).forEach(v => {
      const selected = (S.settings?.aiVoice && (v.name === S.settings.aiVoice || v.voiceURI === S.settings.aiVoice)) ? 'selected' : '';
      html += `<option value="${esc(v.name)}" ${selected}>${esc(v.name)} (${esc(v.lang)})</option>`;
    });
    html += `</optgroup>`;
  }

  sel.innerHTML = html;
}


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

const CMA_MOODS = {
  'Calm': { x: 92, y: 62, desc: 'Pleasant · Low energy', quad: 'br' },
  'Focused': { x: 80, y: 52, desc: 'Pleasant · Optimal flow', quad: 'br' },
  'Confident': { x: 90, y: 24, desc: 'Pleasant · High energy', quad: 'tr' },
  'Excited': { x: 102, y: 16, desc: 'Pleasant · High activation', quad: 'tr' },
  'Reflective': { x: 36, y: 60, desc: 'Thoughtful · Low energy', quad: 'bl' },
  'Tense': { x: 32, y: 22, desc: 'High energy · Pressured', quad: 'tl' }
};

function getMoodCoord(state) {
  return CMA_MOODS[state] || CMA_MOODS['Calm'];
}

function updateMood(state) {
  const data = getMoodCoord(state);
  S.mood.state = state;
  S.mood.energyDesc = data.desc;
  S.mood.date = 'Self-reported · Just now';
  try {
    localStorage.setItem('mockprep_user_mood', JSON.stringify(S.mood));
  } catch {}

  const stEl = $('#moodStateWord');
  const descEl = $('#moodEnergyDesc');
  const dateEl = $('#moodMetaDate');
  if (stEl) stEl.textContent = state;
  if (descEl) descEl.textContent = data.desc;
  if (dateEl) dateEl.textContent = S.mood.date;

  const dot = $('#cmaDotGroup');
  if (dot) dot.style.transform = `translate(${data.x}px, ${data.y}px)`;

  const qRect = $('#cmaQuadrantHighlight');
  if (qRect) {
    if (data.quad === 'br') {
      qRect.setAttribute('x', '60.5'); qRect.setAttribute('y', '42');
      qRect.setAttribute('fill', '#D7D7F4');
    } else if (data.quad === 'tr') {
      qRect.setAttribute('x', '60.5'); qRect.setAttribute('y', '6');
      qRect.setAttribute('fill', '#D7D7F4');
    } else if (data.quad === 'tl') {
      qRect.setAttribute('x', '6.5'); qRect.setAttribute('y', '6');
      qRect.setAttribute('fill', '#F5D7D7');
    } else {
      qRect.setAttribute('x', '6.5'); qRect.setAttribute('y', '42');
      qRect.setAttribute('fill', '#E7E5EF');
    }
  }

  toast(`Mood updated to ${state} (${data.desc})`);
}

function renderDashboard() {
  const complete = (S.history || []).filter(x => x.state === 'complete');
  const scored = complete.filter(x => x.report && Number.isFinite(x.report.overall));
  const latestScored = scored[0] || null;
  const latestSession = complete[0] || (S.history && S.history[0]) || null;
  const latestScore = latestScored ? Math.round(latestScored.report.overall) : 82;

  // Compute delta vs previous scored session
  let deltaStr = '+8 pts vs. previous';
  let deltaClass = 'wash-green';
  if (scored.length >= 2) {
    const delta = Math.round(scored[0].report.overall - scored[1].report.overall);
    deltaStr = `${delta >= 0 ? '+' : ''}${delta} pts vs. previous`;
    deltaClass = delta >= 0 ? 'wash-green' : 'wash-plum';
  } else if (scored.length === 1) {
    deltaStr = 'Baseline established';
  }

  // Rolling 7-day date window
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const dateRangeStr = `${sevenDaysAgo.getDate()}–${now.getDate()} ${now.toLocaleDateString('en-US', { month: 'long' })}`;

  // Sessions in last 7 days
  const recentSessions = (S.history || []).filter(x => {
    if (!x.created_at) return true;
    const t = new Date(x.created_at).getTime();
    return t >= (sevenDaysAgo.getTime() - 24 * 60 * 60 * 1000);
  });
  const sessionsCount = recentSessions.length || (S.history && S.history.length) || 3;

  // Practice minutes in last 7 days
  let practiceMin = complete.reduce((acc, x) => {
    const ansDur = (x.answers || []).reduce((t, a) => t + (a.duration || 0), 0);
    return acc + Math.round(ansDur / 60);
  }, 0);
  if (!practiceMin) practiceMin = 30;

  // 1. Score trend data points (last 4 scored sessions)
  let trendData = [];
  if (scored.length >= 4) {
    trendData = scored.slice(0, 4).reverse().map(s => ({
      id: s.id,
      score: Math.round(s.report.overall),
      dateStr: shortDate(s.created_at),
      topic: s.topic || s.role || 'Practice session'
    }));
  } else if (scored.length > 0) {
    const baselines = [
      { id: 'starter_case_2', score: 64, dateStr: '8 Nov', topic: 'Initial portfolio review' },
      { id: 'starter_case_2', score: 68, dateStr: '12 Nov', topic: 'Case study presentation' },
      { id: 'starter_hci_2', score: 74, dateStr: '14 Nov', topic: 'HCI viva practice' },
      { id: 'starter_uiux_2', score: 82, dateStr: '17 Nov', topic: 'UI/UX mock interview' }
    ];
    const realPts = scored.slice().reverse().map(s => ({
      id: s.id,
      score: Math.round(s.report.overall),
      dateStr: shortDate(s.created_at),
      topic: s.topic || s.role || 'Practice session'
    }));
    const needed = Math.max(0, 4 - realPts.length);
    trendData = [...baselines.slice(0, needed), ...realPts].slice(-4);
  } else {
    trendData = [
      { id: 'starter_case_2', score: 64, dateStr: '8 Nov', topic: 'Initial portfolio review' },
      { id: 'starter_case_2', score: 68, dateStr: '12 Nov', topic: 'Case study presentation' },
      { id: 'starter_hci_2', score: 74, dateStr: '14 Nov', topic: 'HCI viva practice' },
      { id: 'starter_uiux_2', score: 82, dateStr: '17 Nov', topic: 'UI/UX mock interview' }
    ];
  }

  const xCoords = [90, 250, 410, 565];
  const trendPoints = trendData.map((pt, i) => {
    const x = xCoords[i];
    const y = Math.round(126 - (Math.max(0, Math.min(100, pt.score)) / 100) * 110);
    return { ...pt, x, y };
  });

  let trendPathD = `M ${trendPoints[0].x},${trendPoints[0].y}`;
  for (let i = 0; i < trendPoints.length - 1; i++) {
    const p0 = trendPoints[i];
    const p1 = trendPoints[i + 1];
    const dx = (p1.x - p0.x) * 0.45;
    trendPathD += ` C ${Math.round(p0.x + dx)},${p0.y} ${Math.round(p1.x - dx)},${p1.y} ${p1.x},${p1.y}`;
  }
  const trendAreaD = `${trendPathD} L ${trendPoints[trendPoints.length - 1].x},126 L ${trendPoints[0].x},126 Z`;

  const trendPointsSvg = trendPoints.map((p, i) => {
    const isLatest = i === trendPoints.length - 1;
    if (isLatest) {
      return `
        <g class="score-trend-pt" data-session-id="${p.id}" tabindex="0" role="button" aria-label="${p.topic}: ${p.score} pts on ${p.dateStr}" style="cursor: pointer;">
          <circle cx="${p.x}" cy="${p.y}" r="11" fill="#d7d7f4" opacity="0.65">
            <animate attributeName="r" values="9;13;9" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#38325a" />
          <circle cx="${p.x}" cy="${p.y}" r="2" fill="#ffffff" />
          <rect x="${p.x - 21}" y="${p.y - 24}" width="42" height="20" rx="6" fill="#d7d7f4" />
          <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" fill="#38325a" font-size="12" font-weight="700">${p.score}</text>
          <text x="${p.x}" y="145" text-anchor="middle" fill="#565563" font-size="12" font-weight="700">${p.dateStr}</text>
        </g>
      `;
    }
    return `
      <g class="score-trend-pt" data-session-id="${p.id}" tabindex="0" role="button" aria-label="${p.topic}: ${p.score} pts on ${p.dateStr}" style="cursor: pointer;">
        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#38325a" />
        <circle cx="${p.x}" cy="${p.y}" r="2" fill="#ffffff" />
        <text x="${p.x}" y="${p.y - 14}" text-anchor="middle" fill="#38325a" font-size="12" font-weight="700">${p.score}</text>
        <text x="${p.x}" y="145" text-anchor="middle" fill="#565563" font-size="12" font-weight="700">${p.dateStr}</text>
      </g>
    `;
  }).join('');

  // 2. Weekly Activity Bars
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyCols = [];
  let totalWeeklyMin = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = dayNames[d.getDay()];
    const dateKey = d.toISOString().slice(0, 10);
    const daySessions = (S.history || []).filter(s => s.created_at && s.created_at.slice(0, 10) === dateKey);
    let mins = daySessions.reduce((acc, s) => {
      const dur = (s.answers || []).reduce((t, a) => t + (a.duration || 0), 0);
      return acc + Math.round(dur / 60);
    }, 0);
    weeklyCols.push({ day: dayStr, mins, count: daySessions.length });
    totalWeeklyMin += mins;
  }
  if (totalWeeklyMin === 0) {
    const defaultVals = [10, 0, 8, 0, 0, 12, 0];
    weeklyCols.forEach((col, idx) => { col.mins = defaultVals[idx]; });
    totalWeeklyMin = 30;
  }
  const maxWeeklyMin = Math.max(12, ...weeklyCols.map(c => c.mins));

  const weeklyBarsHtml = weeklyCols.map(col => {
    const isHigh = col.mins === maxWeeklyMin && col.mins > 0;
    const isFlat = col.mins === 0;
    const height = isFlat ? 2 : Math.max(14, Math.round((col.mins / maxWeeklyMin) * 80));
    const barClass = isFlat ? 'weekly-bar flat' : (isHigh ? 'weekly-bar highlight' : 'weekly-bar');

    return `
      <div class="weekly-col" data-day="${col.day}" data-mins="${col.mins}" style="cursor: pointer;" title="${col.day}: ${col.mins} min practiced">
        <span class="weekly-val" style="${isFlat ? 'visibility: hidden;' : ''}">${col.mins}</span>
        <div class="${barClass}" style="height: ${height}px;"></div>
        <span class="weekly-day">${col.day}</span>
      </div>
    `;
  }).join('');

  // 3. Latest Feedback Extraction
  let feedbackTopic = 'UI/UX mock interview';
  let feedbackDate = '17 Nov';
  let lowestSkill = 'Answer structure';
  let lowestDesc = 'You described your actions, but left out the measurable result.';
  let improvedSkill = 'Speaking pace';
  let improvedDesc = 'You spoke more steadily and paused between ideas.';
  let nextStepText = 'End your next answer with what changed and how you know.';
  let feedbackSessionId = null;

  if (latestScored && latestScored.report) {
    feedbackSessionId = latestScored.id;
    feedbackTopic = latestScored.topic || latestScored.role || 'Practice session';
    feedbackDate = shortDate(latestScored.created_at);

    const rep = latestScored.report;
    if (rep.improvements && rep.improvements.length > 0) {
      const imp0 = rep.improvements[0];
      if (imp0.includes(':')) {
        const parts = imp0.split(':');
        lowestSkill = parts[0].trim();
        lowestDesc = parts.slice(1).join(':').trim();
      } else {
        lowestSkill = 'Response structure';
        lowestDesc = imp0;
      }
    }
    if (rep.strengths && rep.strengths.length > 0) {
      const str0 = rep.strengths[0];
      if (str0.includes(':')) {
        const parts = str0.split(':');
        improvedSkill = parts[0].trim();
        improvedDesc = parts.slice(1).join(':').trim();
      } else {
        improvedSkill = 'Pacing & rationale';
        improvedDesc = str0;
      }
    }
    if (rep.next_steps && rep.next_steps.length > 0) {
      nextStepText = rep.next_steps[0];
    }
  } else if (latestSession) {
    feedbackSessionId = latestSession.id;
    feedbackTopic = latestSession.topic || latestSession.role || 'Practice session';
    feedbackDate = shortDate(latestSession.created_at);
  }

  // 4. Mood Coordinate
  const currentMoodCoord = getMoodCoord(S.mood.state);

  // 5. Recent Practice List
  const recentSessionsList = (S.history || []).slice(0, 4);
  const recentRowsHtml = recentSessionsList.length ? recentSessionsList.map(item => {
    const typeIcon = item.role === 'presentation' ? 'desktop' : (item.role === 'viva' ? 'reader' : 'speaker');
    const ansDur = (item.answers || []).reduce((acc, a) => acc + (a.duration || 0), 0);
    const durationMin = Math.max(1, Math.round(ansDur / 60)) || (item.role === 'presentation' ? 10 : (item.role === 'viva' ? 8 : 12));
    const scoreText = (item.report && Number.isFinite(item.report.overall))
      ? `${Math.round(item.report.overall)} / 100`
      : (item.state === 'complete' ? 'Completed' : 'In progress');
    const title = item.topic || (item.role ? item.role.toUpperCase() + ' Practice' : 'Mock Interview');

    return `
      <div class="practice-row-item" data-action="practice-item" data-id="${item.id}" role="button" tabindex="0" title="Open report for ${esc(title)}">
        <div class="practice-row-left">
          <div class="practice-type-tile">
            ${rIcon(typeIcon, 20)}
          </div>
          <div class="practice-title-meta">
            <span class="practice-title">${esc(title)}</span>
            <span class="practice-meta">${shortDate(item.created_at)} · ${durationMin} min</span>
          </div>
        </div>
        <div class="practice-row-right">
          <span class="practice-score">${scoreText}</span>
          ${rIcon("arrowTopRight", 14)}
        </div>
      </div>
    `;
  }).join('') : `
    <div style="padding: 24px; text-align: center; color: var(--color-muted);">
      <p style="font-size: 14px; margin-bottom: 12px;">No practice sessions recorded yet.</p>
      <button class="btn-control-outline" id="btnEmptyStartPractice" type="button">Start your first session →</button>
    </div>
  `;

  $('#view').innerHTML = `
    <div class="content dashboard-container">
      <!-- 1. Hero Practice Card (232px high, #212121) -->
      <section class="hero-card" aria-label="Welcome banner">
        <div class="hero-left">
          <div class="hero-badge-tag">YOUR PRACTICE SPACE</div>
          <h1 class="hero-headline">Welcome back, ${esc(S.me?.name || 'Brahmi')}.</h1>
          <div class="hero-subtitle">
            <div>Rehearse an interview, viva, or presentation.</div>
            <div>Find one thing to work on in your next session.</div>
          </div>
          <div class="hero-actions">
            <button class="btn-hero-primary" id="btnStartPracticeHero" type="button">
              <span>Start a practice session</span>
              ${rIcon("arrowRight", 16)}
            </button>
            <span class="hero-link" id="btnPacePracticeHero" role="button" tabindex="0" title="Configure session pacing and question count">Set your own pace</span>
          </div>
        </div>
        <div class="hero-artwork" id="heroArtworkVoice" role="button" tabindex="0" title="Click to test speech & audio warmup" style="cursor: pointer;">
          <img src="/static/assets/ceb64.svg" alt="Voice waveform artwork" />
          <div class="voice-pill" id="btnVoicePracticeHero" title="Start voice practice warmup">VOICE PRACTICE</div>
        </div>
      </section>

      <!-- 2. Practice Overview & Metrics -->
      <section class="overview-section" aria-label="Practice at a glance">
        <div class="overview-header">
          <div>
            <h2 class="overview-title">Your practice at a glance</h2>
            <p class="overview-sub">See how often you practice and how your scores are changing.</p>
          </div>
          <div class="overview-date-pill" id="btnOverviewDatePill" role="button" tabindex="0" style="cursor: pointer;" title="Active 7-day rolling practice window">
            ${rIcon("calendar", 16)}
            <span>${dateRangeStr}</span>
          </div>
        </div>

        <div class="metrics-row">
          <!-- Metric 1: Latest score -->
          <div class="metric-card" id="metricCardScore" role="button" tabindex="0" style="cursor: pointer;" title="View latest session evaluation report">
            <div class="metric-card-top">
              <div class="metric-icon-tile lav">
                ${rIcon("target", 18)}
              </div>
              <span class="metric-label">Latest score</span>
            </div>
            <div class="metric-card-bottom">
              <span class="metric-value">${latestScore} / 100</span>
              <span class="metric-context">${deltaStr}</span>
            </div>
          </div>

          <!-- Metric 2: Sessions -->
          <div class="metric-card" id="metricCardSessions" role="button" tabindex="0" style="cursor: pointer;" title="View session history">
            <div class="metric-card-top">
              <div class="metric-icon-tile teal">
                ${rIcon("play", 18)}
              </div>
              <span class="metric-label">Sessions</span>
            </div>
            <div class="metric-card-bottom">
              <span class="metric-value">${sessionsCount}</span>
              <span class="metric-context">in the last 7 days</span>
            </div>
          </div>

          <!-- Metric 3: Practice time -->
          <div class="metric-card" id="metricCardTime" role="button" tabindex="0" style="cursor: pointer;" title="View practice log">
            <div class="metric-card-top">
              <div class="metric-icon-tile yellow">
                ${rIcon("stopwatch", 18)}
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
              <p class="card-sub">Last ${trendData.length} sessions · score out of 100</p>
            </div>
            <div class="pill-badge ${deltaClass}">${deltaStr}</div>
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
              <path d="${trendAreaD}" fill="url(#scoreGrad)" />

              <!-- Smooth Curve Line -->
              <path d="${trendPathD}" fill="none" stroke="#38325a" stroke-width="2.5" stroke-linecap="round" />

              <!-- Interactive Data Points -->
              ${trendPointsSvg}
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
            <div class="pill-badge wash-plum">${totalWeeklyMin} min total</div>
          </div>

          <div class="weekly-bars-grid">
            ${weeklyBarsHtml}
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
                <p class="card-sub">${esc(feedbackTopic)} · ${feedbackDate}</p>
              </div>
              <button class="btn-control-outline" id="btnViewReportFeedback" data-session-id="${feedbackSessionId || ''}" type="button">
                <span>View full report</span>
                ${rIcon("arrowTopRight", 14)}
              </button>
            </div>

            <div class="feedback-boxes-row">
              <div class="feedback-box">
                <div class="feedback-box-top">
                  ${rIcon("barChart", 18)}
                  <span>Lowest-scoring skill</span>
                </div>
                <div class="feedback-box-skill plum">${esc(lowestSkill)}</div>
                <div class="feedback-box-desc">${esc(lowestDesc)}</div>
              </div>

              <div class="feedback-box">
                <div class="feedback-box-top">
                  ${rIcon("activity", 18)}
                  <span>Improved in the last session</span>
                </div>
                <div class="feedback-box-skill green">${esc(improvedSkill)}</div>
                <div class="feedback-box-desc">${esc(improvedDesc)}</div>
              </div>
            </div>
          </div>

          <div class="feedback-next-step">
            ${rIcon("pencil2", 18)}
            <span class="next-step-label">Next step:</span>
            <span class="next-step-text">${esc(nextStepText)}</span>
          </div>
        </div>

        <!-- Mood Check-in Card (Lavender #D7D7F4) -->
        <div class="card-lavender mood-card">
          <div class="mood-card-header">
            <div class="mood-title-wrap">
              <div class="mood-icon-tile">
                ${rIcon("face", 18)}
              </div>
              <h3 class="card-title" style="margin: 0;">Mood check-in</h3>
            </div>
            <div class="pill-badge paper-plum">CMA model</div>
          </div>

          <div class="mood-circumplex-sub">Circumplex model of affect</div>

          <div class="mood-body">
            <div class="mood-body-left">
              <span class="mood-checkin-tag">LAST CHECK-IN</span>
              <span class="mood-state-word" id="moodStateWord">${esc(S.mood.state)}</span>
              <span class="mood-energy-desc" id="moodEnergyDesc">${esc(S.mood.energyDesc)}</span>
              <span class="mood-meta-date" id="moodMetaDate">${esc(S.mood.date)}</span>
            </div>

            <div class="mood-chart-widget">
              <span style="font-size: 10px; font-weight: 700; color: var(--color-muted); margin-bottom: 2px;">Higher energy</span>
              <svg id="circumplexSvg" preserveAspectRatio="none" overflow="visible" style="display: block; cursor: crosshair;" width="119" height="75" viewBox="0 0 119 83" fill="none" role="img" aria-label="Circumplex Affect Chart">
                <path d="M108 0H11C4.92487 0 0 4.92487 0 11V72C0 78.0751 4.92487 83 11 83H108C114.075 83 119 78.0751 119 72V11C119 4.92487 114.075 0 108 0Z" fill="#FDFEFF" stroke="#E7E5EF" stroke-width="1"/>
                <rect id="cmaQuadrantHighlight" x="${currentMoodCoord.quad === 'br' || currentMoodCoord.quad === 'tr' ? 60.5 : 6.5}" y="${currentMoodCoord.quad === 'br' || currentMoodCoord.quad === 'bl' ? 42 : 6}" width="52" height="35" rx="6" fill="${currentMoodCoord.quad === 'tl' ? '#F5D7D7' : (currentMoodCoord.quad === 'bl' ? '#E7E5EF' : '#D7D7F4')}" />
                <line x1="8" y1="41.5" x2="111" y2="41.5" stroke="#88839B" stroke-width="1.2" stroke-dasharray="3,3"/>
                <line x1="59.5" y1="8" x2="59.5" y2="75" stroke="#88839B" stroke-width="1.2" stroke-dasharray="3,3"/>
                <path d="M108 38.5L112 41.5L108 44.5M56.5 12L59.5 8L62.5 12" stroke-linecap="round" stroke="#88839B" fill="none"/>
                <g id="cmaDotGroup" style="transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translate(${currentMoodCoord.x}px, ${currentMoodCoord.y}px);">
                  <circle r="9" fill="#C2D6DB" opacity="0.8">
                    <animate attributeName="r" values="7;10;7" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle r="4.5" fill="#38325A" />
                  <circle r="1.5" fill="#FFFFFF" />
                </g>
              </svg>
              <div style="width: 100%; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: var(--color-muted); margin-top: 2px;">
                <span>Unpleasant</span>
                <span>Pleasant</span>
              </div>
            </div>
          </div>

          <div>
            <button class="btn-control-outline plum" id="btnUpdateMoodModal" type="button">
              <span>Update mood</span>
              ${rIcon("arrowRight", 14)}
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
              ${rIcon("arrowRight", 16)}
            </button>
          </div>

          <div class="practice-rows-list">
            ${recentRowsHtml}
          </div>
        </div>

        <!-- AI Insights Card -->
        <div class="card-white ai-insights-card">
          <div class="ai-card-top">
            <div class="ai-title-wrap">
              <div class="ai-icon-tile">
                ${rIcon("magicWand", 20)}
              </div>
              <h3 class="card-title" style="margin: 0;">AI insights</h3>
            </div>
            <div class="pill-badge wash-plum" id="btnAiCoachPill" role="button" tabindex="0" style="cursor: pointer;" title="Open AI Coach workspace">AI COACH</div>
          </div>

          <div class="ai-box-prompt" id="aiBoxPromptContainer">
            <span class="ai-box-tag" id="aiBoxTag">BASED ON YOUR LAST SESSION</span>
            <span class="ai-box-text" id="aiBoxPromptText">${esc(nextStepText)}</span>
            <div id="aiBoxActionRow" style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
              <button id="btnOpenCoachFromBox" class="btn-control-outline" type="button" style="height: 28px; padding: 0 10px; font-size: 11px; background: #ffffff;">
                <span>Discuss with Coach →</span>
              </button>
              <button id="btnPracticePromptFromBox" class="btn-control-outline" type="button" style="height: 28px; padding: 0 10px; font-size: 11px; background: #ffffff;">
                <span>Practice this prompt →</span>
              </button>
            </div>
          </div>

          <div class="ai-chips-row">
            <button class="ai-chip" id="chipStar" type="button">Try a STAR answer</button>
            <button class="ai-chip" id="chipQuestion" type="button">Give me a question</button>
          </div>

          <div class="ai-input-bar">
            <input type="text" id="aiCoachQuickInput" placeholder="Ask the AI Coach…" />
            <button class="btn-ai-send" id="btnAiCoachSend" type="button" title="Send to AI Coach">
              ${rIcon("arrowUp", 16)}
            </button>
          </div>
        </div>
      </div>

      <!-- 6. Footer Note -->
      <div class="dashboard-footer-note">Live dynamic practice telemetry and personalized coaching powered by Gemini</div>
    </div>
  `;

  setupDashboardEvents();
}

function setupDashboardEvents() {
  $('#btnStartPracticeHero')?.addEventListener('click', () => setView('prepare'));
  $('#btnPacePracticeHero')?.addEventListener('click', () => showPaceModal());
  $('#btnVoicePracticeHero')?.addEventListener('click', () => showVoiceWarmupModal());
  $('#heroArtworkVoice')?.addEventListener('click', () => showVoiceWarmupModal());

  // Overview Date Pill
  $('#btnOverviewDatePill')?.addEventListener('click', () => {
    const complete = (S.history || []).filter(x => x.state === 'complete');
    toast(`🔥 7-Day practice streak active · ${complete.length} sessions completed!`);
  });

  // Metric Cards
  $('#metricCardScore')?.addEventListener('click', () => {
    if (S.history.length) restoreSession(S.history[0].id);
    else setView('prepare');
  });
  $('#metricCardSessions')?.addEventListener('click', () => setView('history'));
  $('#metricCardTime')?.addEventListener('click', () => setView('history'));

  // Score Trend Points
  document.querySelectorAll('.score-trend-pt').forEach(pt => {
    pt.addEventListener('click', () => {
      const sid = pt.dataset.sessionId;
      if (sid) restoreSession(sid);
    });
  });

  // Weekly Activity Bars
  document.querySelectorAll('.weekly-col').forEach(col => {
    col.addEventListener('click', () => {
      const day = col.dataset.day;
      const mins = parseInt(col.dataset.mins || '0', 10);
      if (mins > 0) {
        toast(`Practiced ${mins} minutes on ${day}. Keep up the steady cadence!`);
      } else {
        toast(`${day}: No practice recorded yet. Ready for a quick 5-min drill?`);
      }
    });
  });

  // Latest Feedback Card
  $('#btnViewReportFeedback')?.addEventListener('click', () => {
    const btn = $('#btnViewReportFeedback');
    const sid = btn?.dataset.sessionId;
    if (sid) restoreSession(sid);
    else if (S.history.length) restoreSession(S.history[0].id);
    else setView('history');
  });

  // Circumplex SVG direct click
  $('#circumplexSvg')?.addEventListener('click', (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 119;
    const clickY = ((e.clientY - rect.top) / rect.height) * 83;
    let closestState = 'Calm';
    let minDist = Infinity;
    for (const [name, data] of Object.entries(CMA_MOODS)) {
      const dist = Math.hypot(data.x - clickX, data.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        closestState = name;
      }
    }
    updateMood(closestState);
  });

  // Mood Update Modal
  $('#btnUpdateMoodModal')?.addEventListener('click', () => {
    showMoodModal();
  });

  // All Sessions button
  $('#btnAllSessions')?.addEventListener('click', () => setView('history'));

  // Recent practice item rows
  document.querySelectorAll('[data-action="practice-item"]').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      if (id) {
        restoreSession(id);
      } else if (S.history.length) {
        restoreSession(S.history[0].id);
      } else {
        setView('history');
      }
    });
  });

  $('#btnEmptyStartPractice')?.addEventListener('click', () => setView('prepare'));

  // AI Coach pill click
  $('#btnAiCoachPill')?.addEventListener('click', () => setView('coach'));

  // AI insights chips
  $('#chipStar')?.addEventListener('click', () => {
    const input = $('#aiCoachQuickInput');
    if (input) input.value = "How do I structure my UX case study using STAR?";
    const boxTag = $('#aiBoxTag');
    const boxText = $('#aiBoxPromptText');
    const actionRow = $('#aiBoxActionRow');
    if (boxTag) boxTag.textContent = "STAR FRAMEWORK DRILL";
    if (boxText) boxText.textContent = "Situation: 15% drop-off at checkout. Task: Streamline form. Action: Tested 1-page checkout & instant card scan. Result: +8% conversions.";
    if (actionRow) actionRow.style.display = 'flex';
    S.lastCoachQuery = "How do I structure my UX case study using STAR?";
    S.lastCoachReply = "Using the STAR method (Situation, Task, Action, Result) is the best way to structure your UI/UX case study answers:\n\n1. Situation: Set the context (company, team, user base).\n2. Task: Define the specific design challenge or problem you needed to solve.\n3. Action: Walk through your design process—user research, wireframing, prototyping, and how you collaborated.\n4. Result: Share the impact with metrics (e.g., 'conversion rate increased by 8%') or qualitative feedback.";
  });

  $('#chipQuestion')?.addEventListener('click', () => {
    const questions = [
      "Can you walk me through a time when user testing completely contradicted your team's initial design hypothesis?",
      "How would you design an accessible mobile experience for users with low digital literacy (WCAG AA)?",
      "Tell me about a design trade-off you had to make between engineering constraints and ideal user experience.",
      "How do you prioritize which user problems to solve when product deadlines are tight?",
      "How do you handle conflicting feedback from users, product managers, and developers?",
      "How do you typically synthesize qualitative user research into actionable insights when you are short on time?"
    ];
    const q = questions[Math.floor(Math.random() * questions.length)];
    const input = $('#aiCoachQuickInput');
    if (input) input.value = q;
    const boxTag = $('#aiBoxTag');
    const boxText = $('#aiBoxPromptText');
    const actionRow = $('#aiBoxActionRow');
    if (boxTag) boxTag.textContent = "PRACTICE QUESTION";
    if (boxText) boxText.textContent = q;
    if (actionRow) actionRow.style.display = 'flex';
    S.lastCoachQuery = q;
    S.lastCoachReply = `Here is how to approach this question:\n\n"${q}"\n\n• Frame your answer using STAR.\n• Highlight how you listened to users and validated your choices.\n• State the measurable outcome or what you learned.`;
  });

  // Action buttons in prompt box
  $('#btnOpenCoachFromBox')?.addEventListener('click', () => {
    setView('coach');
  });

  $('#btnPracticePromptFromBox')?.addEventListener('click', () => {
    const promptText = $('#aiBoxPromptText')?.textContent || 'UI/UX Mock Interview';
    S.setup = { ...S.setup, topic: promptText.slice(0, 50), mode: 'interview' };
    toast('Prompt loaded into new practice session!');
    setView('prepare');
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

function showPaceModal() {
  const existing = $('#paceModalBackdrop');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'paceModalBackdrop';
  modal.className = 'auth-backdrop';
  modal.innerHTML = `
    <div class="auth-card" style="max-width: 520px; text-align: left;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 10px; background: var(--color-wash); display: flex; align-items: center; justify-content: center; color: var(--color-plum);">
            ${rIcon("stopwatch", 18)}
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--color-ink); margin: 0;">Customize Practice Pace</h2>
        </div>
        <button id="btnClosePaceModal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--color-muted);">✕</button>
      </div>

      <p style="font-size: 13px; color: var(--color-muted); margin-bottom: 18px; line-height: 1.4;">
        Set your question volume, time limit per prompt, and target domain to rehearse at your desired pace.
      </p>

      <!-- Target Topic / Role -->
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 12px; font-weight: 700; color: var(--color-ink); margin-bottom: 6px;">Target Role or Practice Topic</label>
        <input type="text" id="paceTopicInput" value="${esc(S.setup.topic || 'UI/UX Designer')}" style="width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--color-border); font-family: inherit; font-size: 14px; box-sizing: border-box;" />
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
          <button type="button" class="pace-topic-pill" data-topic="UI/UX Designer" style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer;">UI/UX Designer</button>
          <button type="button" class="pace-topic-pill" data-topic="Product Designer" style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer;">Product Designer</button>
          <button type="button" class="pace-topic-pill" data-topic="HCI Research & Defense" style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer;">HCI Research</button>
          <button type="button" class="pace-topic-pill" data-topic="Design Systems Engineer" style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer;">Design Systems</button>
        </div>
      </div>

      <!-- Format & Difficulty -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--color-ink); margin-bottom: 6px;">Format</label>
          <select id="paceFormatSelect" style="width: 100%; height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--color-border); font-family: inherit; font-size: 13px; background: #fff;">
            <option value="interview" ${S.setup.mode === 'interview' ? 'selected' : ''}>Interview (Conversational)</option>
            <option value="viva" ${S.setup.mode === 'viva' ? 'selected' : ''}>Viva (Academic / Theory)</option>
            <option value="presentation" ${S.setup.mode === 'presentation' ? 'selected' : ''}>Presentation (Portfolio walkthrough)</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--color-ink); margin-bottom: 6px;">Difficulty</label>
          <select id="paceDifficultySelect" style="width: 100%; height: 40px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--color-border); font-family: inherit; font-size: 13px; background: #fff;">
            <option value="Beginner" ${S.setup.difficulty === 'Beginner' ? 'selected' : ''}>Beginner (Foundational)</option>
            <option value="Intermediate" ${S.setup.difficulty === 'Intermediate' ? 'selected' : ''}>Intermediate (Standard)</option>
            <option value="Advanced" ${S.setup.difficulty === 'Advanced' ? 'selected' : ''}>Advanced (Senior / Edge cases)</option>
          </select>
        </div>
      </div>

      <!-- Question Volume -->
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 12px; font-weight: 700; color: var(--color-ink); margin-bottom: 6px;">Question Count</label>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          <button type="button" class="pace-count-btn ${S.setup.question_count === 3 ? 'active' : ''}" data-count="3" style="padding: 10px; border-radius: 10px; border: 1px solid var(--color-border); background: ${S.setup.question_count === 3 ? 'var(--color-plum)' : 'var(--color-wash)'}; color: ${S.setup.question_count === 3 ? '#fff' : 'var(--color-ink)'}; font-weight: 700; cursor: pointer; text-align: center;">
            <div style="font-size: 14px;">3 Prompts</div>
            <div style="font-size: 10px; opacity: 0.8; font-weight: 500;">~6 min drill</div>
          </button>
          <button type="button" class="pace-count-btn ${S.setup.question_count === 5 ? 'active' : ''}" data-count="5" style="padding: 10px; border-radius: 10px; border: 1px solid var(--color-border); background: ${S.setup.question_count === 5 ? 'var(--color-plum)' : 'var(--color-wash)'}; color: ${S.setup.question_count === 5 ? '#fff' : 'var(--color-ink)'}; font-weight: 700; cursor: pointer; text-align: center;">
            <div style="font-size: 14px;">5 Prompts</div>
            <div style="font-size: 10px; opacity: 0.8; font-weight: 500;">~12 min standard</div>
          </button>
          <button type="button" class="pace-count-btn ${S.setup.question_count === 8 ? 'active' : ''}" data-count="8" style="padding: 10px; border-radius: 10px; border: 1px solid var(--color-border); background: ${S.setup.question_count === 8 ? 'var(--color-plum)' : 'var(--color-wash)'}; color: ${S.setup.question_count === 8 ? '#fff' : 'var(--color-ink)'}; font-weight: 700; cursor: pointer; text-align: center;">
            <div style="font-size: 14px;">8 Prompts</div>
            <div style="font-size: 10px; opacity: 0.8; font-weight: 500;">~20 min in-depth</div>
          </button>
        </div>
      </div>

      <!-- Pacing per Question -->
      <div style="margin-bottom: 22px;">
        <label style="display: block; font-size: 12px; font-weight: 700; color: var(--color-ink); margin-bottom: 6px;">Pacing Time Limit</label>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
          <button type="button" class="pace-timer-btn" data-timer="60" style="padding: 8px 4px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-wash); font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;">60s Speed</button>
          <button type="button" class="pace-timer-btn active" data-timer="90" style="padding: 8px 4px; border-radius: 8px; border: 1px solid var(--color-plum); background: var(--color-plum); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;">90s Standard</button>
          <button type="button" class="pace-timer-btn" data-timer="180" style="padding: 8px 4px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-wash); font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;">3 min Deep</button>
          <button type="button" class="pace-timer-btn" data-timer="0" style="padding: 8px 4px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-wash); font-size: 12px; font-weight: 600; cursor: pointer; text-align: center;">Untimed</button>
        </div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="btnCancelPaceModal" class="btn-control-outline" type="button" style="height: 42px; padding: 0 18px;">Cancel</button>
        <button id="btnLaunchPacedSession" class="btn-hero-primary" type="button" style="height: 42px; padding: 0 20px;">
          <span>Start Paced Session</span>
          ${rIcon("arrowRight", 16)}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let selectedCount = S.setup.question_count || 5;
  let selectedTimer = 90;

  modal.querySelectorAll('.pace-topic-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const topicInp = $('#paceTopicInput');
      if (topicInp) topicInp.value = btn.dataset.topic;
    });
  });

  modal.querySelectorAll('.pace-count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.pace-count-btn').forEach(b => {
        b.style.background = 'var(--color-wash)';
        b.style.color = 'var(--color-ink)';
      });
      btn.style.background = 'var(--color-plum)';
      btn.style.color = '#fff';
      selectedCount = parseInt(btn.dataset.count, 10);
    });
  });

  modal.querySelectorAll('.pace-timer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.pace-timer-btn').forEach(b => {
        b.style.background = 'var(--color-wash)';
        b.style.color = 'var(--color-ink)';
        b.style.borderColor = 'var(--color-border)';
      });
      btn.style.background = 'var(--color-plum)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--color-plum)';
      selectedTimer = parseInt(btn.dataset.timer, 10);
    });
  });

  $('#btnClosePaceModal')?.addEventListener('click', () => modal.remove());
  $('#btnCancelPaceModal')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  $('#btnLaunchPacedSession')?.addEventListener('click', () => {
    const topicVal = $('#paceTopicInput')?.value.trim() || 'UI/UX Designer';
    const modeVal = $('#paceFormatSelect')?.value || 'interview';
    const diffVal = $('#paceDifficultySelect')?.value || 'Intermediate';

    S.setup = {
      ...S.setup,
      topic: topicVal,
      mode: modeVal,
      difficulty: diffVal,
      question_count: selectedCount,
      pacingLimit: selectedTimer
    };

    modal.remove();
    toast(`Configured ${selectedCount}-question ${modeVal} session for ${topicVal}!`);
    setView('prepare');
  });
}

function showVoiceWarmupModal() {
  const existing = $('#voiceWarmupBackdrop');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'voiceWarmupBackdrop';
  modal.className = 'auth-backdrop';
  modal.innerHTML = `
    <div class="auth-card" style="max-width: 480px; text-align: left;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 10px; background: #FCFD76; display: flex; align-items: center; justify-content: center; color: var(--color-plum);">
            ${rIcon("speaker", 18)}
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--color-ink); margin: 0;">Voice & Speech Practice</h2>
        </div>
        <button id="btnCloseVoiceModal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--color-muted);">✕</button>
      </div>

      <p style="font-size: 13px; color: var(--color-muted); margin-bottom: 16px; line-height: 1.4;">
        Rehearse spoken clarity, pitch cadence, and intentional pauses before answering interview questions.
      </p>

      <!-- Warmup exercise card -->
      <div style="background: var(--color-wash); border-radius: 12px; padding: 14px; margin-bottom: 16px; border: 1px solid var(--color-border);">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: var(--color-plum); text-transform: uppercase; margin-bottom: 6px;">30-Second Cadence Warm-up</div>
        <p style="font-size: 14px; font-weight: 600; color: var(--color-ink); margin: 0; line-height: 1.5;">
          "In our redesign, we cut checkout drop-off by 24% by replacing a multi-step form with inline validation and biometric one-tap pay."
        </p>
      </div>

      <!-- Interactive Mic Check -->
      <div style="background: #ffffff; border-radius: 12px; padding: 14px; margin-bottom: 20px; border: 1px solid var(--color-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 13px; font-weight: 700; color: var(--color-ink);">Microphone Clarity Check</span>
          <span id="micCheckStatus" style="font-size: 12px; color: var(--color-muted);">Ready to test</span>
        </div>
        <div style="height: 10px; width: 100%; background: var(--color-wash); border-radius: 5px; overflow: hidden; margin-bottom: 10px;">
          <div id="micVolumeBar" style="height: 100%; width: 0%; background: #38325a; transition: width 0.1s linear;"></div>
        </div>
        <button id="btnRunMicTest" class="btn-control-outline" type="button" style="width: 100%; height: 36px; font-size: 12px;">
          <span>Test Spoken Audio Input</span>
          ${rIcon("play", 14)}
        </button>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="btnCloseVoiceCancel" class="btn-control-outline" type="button" style="height: 42px; padding: 0 16px;">Close</button>
        <button id="btnStartVoiceSession" class="btn-hero-primary" type="button" style="height: 42px; padding: 0 20px;">
          <span>Start Voice Practice Session</span>
          ${rIcon("arrowRight", 16)}
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let streamRef = null;
  let animId = null;

  $('#btnRunMicTest')?.addEventListener('click', async () => {
    const status = $('#micCheckStatus');
    const bar = $('#micVolumeBar');
    if (status) status.textContent = 'Listening (speak now)…';

    try {
      streamRef = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(streamRef);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let startTime = Date.now();

      function updateVolume() {
        if (Date.now() - startTime > 4000) {
          if (bar) bar.style.width = '100%';
          if (bar) bar.style.background = '#4caf50';
          if (status) status.textContent = '✓ Microphone clear & calibrated!';
          if (streamRef) streamRef.getTracks().forEach(t => t.stop());
          audioCtx.close().catch(() => {});
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        let avg = sum / dataArray.length;
        let pct = Math.min(100, Math.round((avg / 128) * 100));
        if (bar) bar.style.width = `${pct}%`;
        animId = requestAnimationFrame(updateVolume);
      }
      updateVolume();
    } catch (err) {
      if (status) status.textContent = 'Microphone permission denied.';
      toast('Could not access microphone: ' + err.message, true);
    }
  });

  const cleanupVoice = () => {
    if (animId) cancelAnimationFrame(animId);
    if (streamRef) streamRef.getTracks().forEach(t => t.stop());
    modal.remove();
  };

  $('#btnCloseVoiceModal')?.addEventListener('click', cleanupVoice);
  $('#btnCloseVoiceCancel')?.addEventListener('click', cleanupVoice);
  modal.addEventListener('click', e => { if (e.target === modal) cleanupVoice(); });

  $('#btnStartVoiceSession')?.addEventListener('click', () => {
    cleanupVoice();
    S.setup = { ...S.setup, mode: 'interview', microphone: true, camera: false, topic: 'UI/UX Designer' };
    toast('Starting voice practice session with microphone enabled!');
    setView('prepare');
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
        <button class="mood-choice-btn" data-state="Calm" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Calm</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · Low energy</div>
        </button>
        <button class="mood-choice-btn" data-state="Focused" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Focused</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · Optimal flow</div>
        </button>
        <button class="mood-choice-btn" data-state="Confident" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Confident</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · High energy</div>
        </button>
        <button class="mood-choice-btn" data-state="Excited" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Excited</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · High activation</div>
        </button>
        <button class="mood-choice-btn" data-state="Reflective" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
          <div style="font-weight: 700; color: var(--color-plum);">Reflective</div>
          <div style="font-size: 11px; color: var(--color-muted);">Pleasant · Low energy</div>
        </button>
        <button class="mood-choice-btn" data-state="Tense" style="padding: 12px; border-radius: 14px; border: 1px solid var(--color-border); background: var(--color-wash); cursor: pointer; text-align: left;">
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
      updateMood(state);
      modal.remove();
    });
  });
}

async function askCoachQuick(query) {
  const boxTag = $('#aiBoxTag');
  const boxText = $('#aiBoxPromptText');
  const actionRow = $('#aiBoxActionRow');
  const sendBtn = $('#btnAiCoachSend');

  if (boxTag) boxTag.textContent = "COACH INSIGHT";
  if (boxText) boxText.textContent = "AI Coach is thinking…";
  if (sendBtn) sendBtn.style.opacity = '0.5';

  try {
    const res = await api('/coach/ask', { method: 'POST', body: { message: query } });
    if (boxText) {
      const summary = res.reply.split('\n\n')[0] || res.reply;
      boxText.textContent = summary.replace(/[*#]/g, '');
    }
    if (actionRow) actionRow.style.display = 'flex';
    S.lastCoachQuery = query;
    S.lastCoachReply = res.reply;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!S.coachMessages) S.coachMessages = [];
    S.coachMessages.push({
      sender: 'user',
      text: query,
      time: timeStr
    });
    S.coachMessages.push({
      sender: 'coach',
      text: res.reply,
      suggestions: Array.isArray(res.suggestions) ? res.suggestions : [],
      time: timeStr
    });

    toast("AI Coach provided new feedback!");
  } catch (err) {
    if (boxText) boxText.textContent = "Focus on the result: What metric improved by how much?";
    toast("AI Coach: " + err.message, true);
  } finally {
    if (sendBtn) sendBtn.style.opacity = '1';
  }
}

// -----------------------------------------------------------------------------
// View 2: Prepare (Practice)
// -----------------------------------------------------------------------------
const PERM_ICONS = {
  camera: rIcon('camera', 18),
  microphone: rIcon('speaker', 18),
  screen: rIcon('desktop', 18),
  face: rIcon('eyeOpen', 18),
  record: rIcon('video', 18),
  secondary: rIcon('mobile', 18)
};

function permissionCard(name, title, desc) {
  const u = S.setup;
  const icon = PERM_ICONS[name] || PERM_ICONS.camera;
  return `
    <label class="permission-card-row">
      <div class="permission-left">
        <div class="permission-icon-tile">
          ${icon}
        </div>
        <div class="permission-info">
          <span class="permission-title">${esc(title)}</span>
          <span class="permission-desc">${esc(desc)}</span>
        </div>
      </div>
      <div class="switch-toggle">
        <input type="checkbox" data-setup="${name}" ${u[name] ? 'checked' : ''} />
        <span class="switch-slider"></span>
      </div>
    </label>
  `;
}

function renderPrepare() {
  const u = S.setup;
  $('#view').innerHTML = `
    <div class="content">
      <div class="overview-header">
        <div>
          <h1 class="overview-title">New practice session</h1>
          <p class="overview-sub">Configure interview parameters, evaluation mode, and device permissions.</p>
        </div>
      </div>

      <div class="practice-layout">
        <!-- Left Column: Parameters & Permissions -->
        <div class="practice-left-col">
          <!-- Card 1: Session Parameters -->
          <div class="card-white">
            <div class="card-header-row">
              <div>
                <h3 class="card-title">Session parameters</h3>
                <p class="card-sub">Interview context and complexity</p>
              </div>
              <div class="metric-icon-tile yellow" style="width: 36px; height: 36px; border-radius: 10px;">
                ${rIcon("mixer", 18)}
              </div>
            </div>

            <div class="form-group-custom">
              <label class="form-label-custom">Practice format</label>
              <div class="segmented-control-custom" id="modeSelector">
                ${[
                  { id: 'interview', label: 'Interview' },
                  { id: 'viva', label: 'Viva Voce' },
                  { id: 'presentation', label: 'Presentation' }
                ].map(m => `
                  <div class="segmented-option-custom ${u.mode === m.id ? 'active' : ''}" data-mode="${m.id}">
                    ${m.label}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="form-group-custom">
              <label class="form-label-custom" for="topic">Target role or topic</label>
              <div class="input-with-icon">
                <span class="input-icon">${rIcon("magnifyingGlass", 16)}</span>
                <input id="topic" class="input-field-custom" maxlength="180" value="${esc(u.topic)}" placeholder="e.g. UI/UX Designer" />
              </div>
            </div>

            <div class="form-row-2">
              <div class="form-group-custom">
                <label class="form-label-custom" for="difficulty">Difficulty level</label>
                <div class="select-wrapper">
                  <select id="difficulty" class="select-field-custom">
                    ${['Beginner', 'Intermediate', 'Advanced'].map(x => `<option ${u.difficulty === x ? 'selected' : ''}>${x}</option>`).join('')}
                  </select>
                  <div class="select-chevron">${rIcon("chevronDown", 12)}</div>
                </div>
              </div>

              <div class="form-group-custom">
                <label class="form-label-custom" for="questionCount">Question count</label>
                <div class="select-wrapper">
                  <select id="questionCount" class="select-field-custom">
                    ${[3, 4, 5, 6, 7, 8].map(n => `<option value="${n}" ${u.question_count === n ? 'selected' : ''}>${n} questions</option>`).join('')}
                  </select>
                  <div class="select-chevron">${rIcon("chevronDown", 12)}</div>
                </div>
              </div>
            </div>

            <label class="adaptive-toggle-card">
              <div class="adaptive-left">
                <div class="adaptive-icon-tile">
                  ${rIcon("magicWand", 16)}
                </div>
                <div>
                  <div class="adaptive-title">Adaptive follow-up questions</div>
                  <div class="adaptive-desc">AI generates subsequent prompts based on candidate answer context.</div>
                </div>
              </div>
              <div class="switch-toggle">
                <input type="checkbox" data-setup="adaptive" ${u.adaptive ? 'checked' : ''} />
                <span class="switch-slider"></span>
              </div>
            </label>
          </div>

          <!-- Card 2: Device Permissions -->
          <div class="card-white">
            <div class="card-header-row">
              <div>
                <h3 class="card-title">Device permissions</h3>
                <p class="card-sub">Local recording and tracking consent</p>
              </div>
              <div class="metric-icon-tile teal" style="width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                ${rIcon("shield", 18)}
              </div>
            </div>

            <div class="permissions-list">
              ${permissionCard('camera', 'Camera stream', 'Captures candidate video feed for live room and composite recording.')}
              ${permissionCard('microphone', 'Microphone audio', 'Enables spoken answers, live speech recognition, and audio transcription.')}
              ${permissionCard('screen', 'Screen capture', 'Records desktop, application window, or tab via native browser dialog.')}
              ${permissionCard('face', 'On-device face presence', 'Runs local MediaPipe heuristics for frame presence. No biometric classification.')}
              ${permissionCard('record', 'Local video recording', 'Stores composite replay file on local server storage.')}
              ${permissionCard('secondary', 'Secondary camera', 'Enables mobile camera pairing over WebRTC for auxiliary viewing.')}
            </div>

            <div class="privacy-banner">
              <span class="privacy-banner-icon">${rIcon("shield", 18)}</span>
              <span>All media streams are processed locally on your machine. Hardware permissions may be withdrawn at any time during practice.</span>
            </div>
          </div>
        </div>

        <!-- Right Column: Verification, Baseline & Launch -->
        <div class="practice-right-col">
          <!-- Card 3: Hardware Check & Camera Preview -->
          <div class="card-white">
            <div class="card-header-row">
              <div>
                <h3 class="card-title">Hardware check</h3>
                <p class="card-sub">Verify camera and audio inputs</p>
              </div>
              <div class="pill-badge wash-green">System ready</div>
            </div>

            <div class="device-preview-box-custom" id="preparePreview">
              <div class="camera-placeholder">
                <div class="camera-placeholder-icon">${rIcon("camera", 28)}</div>
                <span class="camera-placeholder-text">Camera uninitialized</span>
                <span class="camera-placeholder-sub">Click "Verify devices" below to preview stream</span>
              </div>
            </div>

            <div class="device-action-row">
              <button class="btn-control-outline" data-action="device-check">
                ${R_ICON.camera}
                <span>Verify devices</span>
              </button>
              <span id="deviceState" class="pill-badge wash-plum">Permission required</span>
            </div>
          </div>

          <!-- Card 4: AI Status & Start Session CTA -->
          <div class="card-white launch-card">
            <div class="launch-ai-banner ${S.health.ai_configured ? '' : 'warning'}">
              <div class="metric-icon-tile yellow" style="width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                ${rIcon("lightning", 16)}
              </div>
              <div style="font-size: 13px; font-weight: 600; color: var(--color-ink); line-height: 1.4;">
                ${S.health.ai_configured ? 'Gemini 2.5 Flash connected. Dynamic questions and coaching enabled.' : 'Gemini key unconfigured. Standard template questions and rule-based feedback enabled.'}
              </div>
            </div>

            <button class="btn-practice-launch" data-action="start">
              <span>Start practice session</span>
            ${rIcon("arrowRight", 16)}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (S.stream) attachVideo($('#preparePreview'), 'cameraSource');

  $('#modeSelector')?.addEventListener('click', e => {
    const opt = e.target.closest('.segmented-option-custom');
    if (!opt) return;
    document.querySelectorAll('#modeSelector .segmented-option-custom').forEach(el => el.classList.remove('active'));
    opt.classList.add('active');
    S.setup.mode = opt.dataset.mode;
  });
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
    host.innerHTML = `
      <div class="camera-placeholder">
        <div class="camera-placeholder-icon">${rIcon("camera", 28)}</div>
        <span class="camera-placeholder-text">Camera feed inactive</span>
        <span class="camera-placeholder-sub">Click "Verify devices" to reconnect</span>
      </div>
    `;
  }
}

async function checkDevices() {
  const btn = $('[data-action="device-check"]');
  busy(btn, true, 'Testing…');
  try {
    await ensureMedia();
    attachVideo($('#preparePreview'), 'cameraSource');
    const stateEl = $('#deviceState');
    if (stateEl) {
      stateEl.textContent = 'Devices verified';
      stateEl.className = 'pill-badge wash-green';
    }
    toast('Camera and microphone connected successfully.');
  } catch (e) {
    toast(e.message, true);
    const stateEl = $('#deviceState');
    if (stateEl) {
      stateEl.textContent = 'Hardware error';
      stateEl.className = 'pill-badge paper-plum';
    }
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
      <!-- Header row with topic pill, question counter, timer pill, recording chip -->
      <div class="room-header-row">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="pill-badge wash-plum" style="font-weight: 700; font-size: 12px; letter-spacing: 0.5px;">${esc(S.item.topic.toUpperCase())}</span>
          <span style="font-size: 14px; font-weight: 700; color: var(--color-ink);">Question ${S.idx + 1} of ${S.item.question_count}</span>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="room-timer-pill" id="timer">
            ${rIcon("stopwatch", 14)}
            <span>00:00</span>
          </div>

          <div class="recording-chip ${S.recorder?.state === 'recording' ? 'recording' : ''}" id="recordStatusChip">
            <span class="rec-pulse"></span>
            <span>${S.recorder?.state === 'recording' ? 'RECORDING' : S.setup.record ? 'STANDBY' : 'REC DISABLED'}</span>
          </div>
        </div>
      </div>

      ${!S.sessionLive ? `
        <div class="info-banner warning" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
          <span>This session was interrupted or hardware is uninitialized. Click "Resume session" to reconnect devices.</span>
          <button class="btn-control-outline" data-action="resume" style="font-size: 12px; padding: 4px 12px; height: 30px; background: #ffffff;">Resume session</button>
        </div>
      ` : ''}

      <div class="practice-layout">
        <!-- Main stage (Left column) -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Prompt Card -->
          <div class="card-white" style="padding: 22px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span class="pill-badge wash-plum" style="font-size: 11px;">PROMPT ${S.idx + 1} OF ${S.item.question_count}</span>
              <div style="display: flex; align-items: center; gap: 12px;">
                <button class="btn-control-outline" data-action="speak" style="height: 32px; padding: 0 12px; font-size: 12px;" title="Repeat audio of this prompt">
                  ${R_ICON.speaker}
                  <span>Repeat question</span>
                </button>
                <span style="font-size: 12px; font-weight: 600; color: var(--color-muted);">${progressPct}% completed</span>
              </div>
            </div>

            <div class="question-text" id="activeQuestion" style="font-size: 18px; font-weight: 700; color: var(--color-ink); line-height: 1.5; margin: 10px 0 16px;">
              ${esc(q)}
            </div>

            <div style="height: 6px; background: var(--color-lav); border-radius: 99px; overflow: hidden;">
              <div id="qProgress" style="width: ${progressPct}%; height: 100%; background: var(--color-plum); border-radius: 99px; transition: width 0.3s ease;"></div>
            </div>
          </div>

          <!-- Video Grid -->
          <div class="video-grid-2">
            <div class="video-cell-card" id="cameraVideoCell">
              <video id="previewCamera" muted autoplay playsinline></video>
              
              <!-- Real-time Live Focus & Distraction Alert Overlay -->
              <div id="liveFocusAlert" class="live-focus-alert hidden" role="alert">
                <span id="liveAlertIcon">👀</span>
                <span id="liveAlertMsg">Looking away detected. Re-center your gaze.</span>
              </div>

              <span class="video-cell-tag">
                ${R_ICON.camera}
                <span>Candidate Camera</span>
              </span>
              <div id="cameraPlaceholder" class="video-cell-placeholder hidden">
                ${rIcon("camera", 24)}
                <span>Camera stream inactive</span>
              </div>
            </div>

            <div class="video-cell-card">
              <video id="previewScreen" muted autoplay playsinline></video>
              <span class="video-cell-tag">${rIcon("video", 12)}
                <span>Screen Capture</span>
              </span>
              <div id="screenPlaceholder" class="video-cell-placeholder hidden">
            ${rIcon("desktop", 24)}
                <span>Screen share inactive</span>
              </div>
            </div>
          </div>

          <!-- Candidate Response Card -->
          <div class="card-white" style="padding: 22px;">
            <div class="card-header-row" style="margin-bottom: 12px;">
              <div>
                <h3 class="card-title" style="font-size: 18px;">Candidate response</h3>
                <p class="card-sub">Speak aloud or type your answer directly</p>
              </div>
              <span id="listenStatus" class="pill-badge wash-plum" style="font-size: 11px;">Ready</span>
            </div>

            <textarea id="answerText" class="room-textarea" placeholder="Spoken transcript will appear here automatically. You may also edit or type manually…">${esc(draftGet('mockprep_draft_' + S.item.id + '_' + S.idx) || S.item.answers?.find(a => a.idx === S.idx)?.text || '')}</textarea>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <span id="wordCount" style="font-size: 12px; font-weight: 700; color: var(--color-plum);">0 words</span>
              <span style="font-size: 12px; color: var(--color-muted);">Local transcription enabled</span>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
              <div style="display: flex; gap: 8px;">
                <button class="btn-primary-dark" id="answerButton" data-action="listen" style="height: 38px; padding: 0 16px; font-size: 13px;">
                  ${R_ICON.mic}
                  <span>Start voice answer</span>
                </button>
                <button class="btn-control-outline" data-action="speak" style="height: 38px; padding: 0 14px; font-size: 13px;">
                  ${R_ICON.refresh}
                  <span>Repeat prompt</span>
                </button>
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="btn-control-outline" data-action="pause" id="pauseButton" style="height: 38px; padding: 0 14px; font-size: 13px;">Pause</button>
                <button class="btn-hero-primary" id="nextButton" data-action="next" style="height: 38px; padding: 0 16px; font-size: 13px;">
                  <span>${S.idx === S.item.question_count - 1 ? 'Finish interview' : 'Save & Next'}</span>
                  ${R_ICON.arrowRight}
                </button>
                <button class="btn-control-outline" data-action="finish" style="height: 38px; padding: 0 14px; font-size: 13px; color: #c93b2b;" title="Conclude interview and generate report">
                  <span>End & report</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right sidebar -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Signal Monitor Card -->
          <div class="card-white" style="padding: 22px;">
            <div class="card-header-row" style="margin-bottom: 12px;">
              <div>
                <h3 class="card-title" style="font-size: 16px;">Signal monitor</h3>
                <p class="card-sub">Real-time device indicators</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column;">
              <div class="signal-row-item">
                <span class="signal-left-meta">
                  <span class="status-dot-pulse" id="cameraDot"></span>
                  Camera
                </span>
                <span id="cameraStatus" class="pill-badge wash-plum" style="font-size: 11px;">Off</span>
              </div>
              <div class="signal-row-item">
                <span class="signal-left-meta">
                  <span class="status-dot-pulse" id="micDot"></span>
                  Microphone
                </span>
                <span id="micStatus" class="pill-badge wash-plum" style="font-size: 11px;">Off</span>
              </div>
              <div class="signal-row-item">
                <span class="signal-left-meta">
                  <span class="status-dot-pulse" id="screenDot"></span>
                  Screen share
                </span>
                <span id="screenStatus" class="pill-badge wash-plum" style="font-size: 11px;">Off</span>
              </div>
              <div class="signal-row-item">
                <span class="signal-left-meta">
                  <span class="status-dot-pulse" id="faceDot"></span>
                  Face tracking
                </span>
                <span id="faceStatus" class="pill-badge wash-plum" style="font-size: 11px;">Unavailable</span>
              </div>
            </div>

            <div style="border-top: 1px solid var(--color-border); margin: 14px 0;"></div>

            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 6px; color: var(--color-muted);">
              <div style="display: flex; justify-content: space-between;">
                <span>Faces detected:</span>
                <strong id="facesCount" style="color: var(--color-ink);">—</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Head direction:</span>
                <strong id="headDirection" style="color: var(--color-ink);">—</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Eye gaze:</span>
                <strong id="gazeDirection" style="color: var(--color-ink);">—</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Attention status:</span>
                <strong id="focusAlertStatus" style="color: #4caf50;">Focused on camera</strong>
              </div>
            </div>

            <div style="background: var(--color-wash); border-radius: 10px; padding: 10px 12px; margin-top: 14px; font-size: 11px; line-height: 1.45; color: var(--color-muted); border: 1px solid var(--color-border);">
              Face orientation is processed entirely in-browser. It is not conclusive proof of attention.
            </div>
          </div>

          <!-- Live Circumplex Model of Affect (CMA) Monitor Card -->
          <div class="card-white live-cma-card" id="liveCmaCard" style="padding: 22px;">
            <div class="card-header-row" style="margin-bottom: 12px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="status-dot-pulse active"></span>
                  <h3 class="card-title" style="font-size: 16px; margin: 0;">Live Affect (CMA)</h3>
                </div>
                <p class="card-sub" style="margin-top: 2px;">Real-time valence & arousal tracking</p>
              </div>
              <span id="liveCmaBadge" class="pill-badge wash-plum" style="font-size: 10px; font-weight: 700;">LIVE MODEL</span>
            </div>

            <!-- Live Mini Circumplex SVG -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 4px 0 10px;">
              <div style="position: relative; width: 100%; max-width: 220px; aspect-ratio: 1.35;">
                <svg id="liveCmaSvg" viewBox="0 0 210 160" style="width: 100%; height: 100%; overflow: visible;" role="img" aria-label="Live Circumplex Affect Chart">
                  <defs>
                    <clipPath id="liveCircleClip">
                      <circle cx="105" cy="80" r="54" />
                    </clipPath>
                  </defs>

                  <!-- Pastel Quadrants -->
                  <g clip-path="url(#liveCircleClip)">
                    <!-- Q2: Top-Left (Peach #FFEBE3) - Tense / Pressured -->
                    <rect x="51" y="26" width="54" height="54" fill="#FFEBE3" />
                    <!-- Q1: Top-Right (Lavender #E8E7FA) - Confident / Flow -->
                    <rect x="105" y="26" width="54" height="54" fill="#E8E7FA" />
                    <!-- Q3: Bottom-Left (Mist #ECEEF2) - Hesitant / Fatigued -->
                    <rect x="51" y="80" width="54" height="54" fill="#ECEEF2" />
                    <!-- Q4: Bottom-Right (Mint #E4F6ED) - Calm / Composed -->
                    <rect x="105" y="80" width="54" height="54" fill="#E4F6ED" />
                  </g>

                  <!-- Outer Boundary -->
                  <circle cx="105" cy="80" r="54" fill="none" stroke="#e7e5ef" stroke-width="1.2"/>

                  <!-- Center Cross Axes -->
                  <line x1="51" y1="80" x2="159" y2="80" stroke="#656375" stroke-width="1" stroke-dasharray="2 2" />
                  <line x1="105" y1="26" x2="105" y2="134" stroke="#656375" stroke-width="1" stroke-dasharray="2 2" />

                  <!-- Dimension Labels -->
                  <text x="105" y="16" text-anchor="middle" font-size="7.5" font-weight="700" fill="#38325a" letter-spacing="0.5px">HIGH ENERGY</text>
                  <text x="105" y="152" text-anchor="middle" font-size="7.5" font-weight="700" fill="#565563" letter-spacing="0.5px">LOW ENERGY</text>
                  <text x="44" y="83" text-anchor="end" font-size="7" font-weight="700" fill="#565563">UNPLEASANT</text>
                  <text x="166" y="83" text-anchor="start" font-size="7" font-weight="700" fill="#38325a">PLEASANT</text>

                  <!-- Live Moving Affect Dot -->
                  <g id="liveCmaDotGroup" style="transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translate(105px, 80px);">
                    <circle r="8" fill="#38325a" opacity="0.2">
                      <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle r="4" fill="#38325a" />
                    <circle r="1.5" fill="#ffffff" />
                  </g>
                </svg>
              </div>
            </div>

            <!-- Live Emotional State Readout -->
            <div style="background: var(--color-wash); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--color-border);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 11px; font-weight: 700; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.5px;">CURRENT AFFECT</span>
                <span id="liveCmaValArousal" style="font-size: 10px; font-weight: 700; color: var(--color-plum);">V: +0.35 · A: +0.20</span>
              </div>
              <div id="liveCmaStateWord" style="font-size: 15px; font-weight: 700; color: var(--color-ink); margin-bottom: 4px;">
                Focused · Optimal Flow
              </div>
              <div id="liveCmaTip" style="font-size: 11px; color: var(--color-muted); line-height: 1.4;">
                Good delivery cadence. Maintaining direct camera focus.
              </div>
            </div>
          </div>

          <!-- Session Controls Card -->
          <div class="card-white" style="padding: 22px;">
            <div class="card-header-row" style="margin-bottom: 12px;">
              <div>
                <h3 class="card-title" style="font-size: 16px;">Session controls</h3>
                <p class="card-sub">Tools and auxiliary input</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button class="btn-control-outline" data-action="checkin" style="width: 100%; justify-content: center; height: 36px; font-size: 12px;">
                ${R_ICON.camera}
                <span>Capture reference photo</span>
              </button>
              <button class="btn-control-outline" data-action="fullscreen" style="width: 100%; justify-content: center; height: 36px; font-size: 12px;">
                <span>Toggle fullscreen</span>
              </button>
              ${!S.sessionLive ? '<button class="btn-hero-primary" data-action="resume" style="width: 100%; justify-content: center; height: 36px; font-size: 12px;">Resume session</button>' : ''}
            </div>

            <div style="border-top: 1px solid var(--color-border); margin: 14px 0;"></div>

            <div style="font-size: 13px; font-weight: 700; color: var(--color-ink);">Secondary camera</div>
            <p id="secondStatus" style="font-size: 11px; color: var(--color-muted); margin: 4px 0 10px;">Not connected</p>

            <div style="display: flex; gap: 8px;">
              <button class="btn-control-outline" data-action="second-webcam" style="font-size: 12px; height: 32px; padding: 0 10px;">+ Add webcam</button>
              <button class="btn-control-outline" data-action="invite-phone" style="font-size: 12px; height: 32px; padding: 0 10px;">Connect phone</button>
            </div>

            <div id="phoneInvite" class="hidden" style="margin-top: 10px;"></div>
            <video id="previewSecond" autoplay playsinline muted style="display: none; width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 12px; margin-top: 10px; background: #000; border: 1.5px solid var(--color-border);"></video>
          </div>

          <!-- Activity feed Card -->
          <div class="card-white" style="padding: 22px;">
            <div class="card-header-row" style="margin-bottom: 12px;">
              <div>
                <h3 class="card-title" style="font-size: 16px;">Activity events</h3>
                <p class="card-sub">Time-stamped audit log</p>
              </div>
            </div>

            <div class="feed-list" id="eventFeed" style="max-height: 240px; overflow-y: auto;">
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
    updateLiveCma();
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
  utter.rate = parseFloat(S.settings?.voiceRate) || 0.95;
  utter.pitch = parseFloat(S.settings?.voicePitch) || 1.0;
  utter.lang = S.settings?.language === 'hi' ? 'hi-IN' : 'en-US';
  if (S.settings?.aiVoice) {
    const v = window.speechSynthesis.getVoices().find(x => x.name === S.settings.aiVoice || x.voiceURI === S.settings.aiVoice);
    if (v) utter.voice = v;
  }
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
    ['face', !!S.faceModel || (S.setup.face && !!S.faceInterval)]
  ];
  updateLiveCma();
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
      S.recognizer.lang = S.settings?.language === 'hi' ? 'hi-IN' : 'en-US';
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
          updateLiveCma();
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

function playSoftAlertTone() {
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    const audioCtx = new AudioCtor();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.23);
  } catch {}
}

function showLiveFocusAlert(icon, message, key) {
  const alertEl = $('#liveFocusAlert');
  const alertIcon = $('#liveAlertIcon');
  const alertMsg = $('#liveAlertMsg');
  const cameraCard = $('#cameraVideoCell') || $('.video-cell-card');
  const statusEl = $('#focusAlertStatus');

  if (alertEl) {
    alertEl.className = 'live-focus-alert';
    if (alertIcon) alertIcon.textContent = icon;
    if (alertMsg) alertMsg.textContent = message;
  }
  if (cameraCard) cameraCard.classList.add('has-alert');
  if (statusEl) {
    statusEl.innerHTML = `<span style="color: #ff5252;">${icon} Distracted</span>`;
  }

  const cmaCard = $('#liveCmaCard');
  if (cmaCard) cmaCard.classList.add('distracted');

  const now = Date.now();
  if (now - (S.faceState.lastAlertSound || 0) > 5000) {
    playSoftAlertTone();
    S.faceState.lastAlertSound = now;
  }

  S.faceState.alertActive = true;
}

function hideLiveFocusAlert() {
  const alertEl = $('#liveFocusAlert');
  const alertIcon = $('#liveAlertIcon');
  const alertMsg = $('#liveAlertMsg');
  const cameraCard = $('#cameraVideoCell') || $('.video-cell-card');
  const statusEl = $('#focusAlertStatus');

  if (alertEl && S.faceState.alertActive) {
    alertEl.className = 'live-focus-alert success';
    if (alertIcon) alertIcon.textContent = '✓';
    if (alertMsg) alertMsg.textContent = 'Good eye contact restored';
    setTimeout(() => {
      if (S.faceState.key === 'normal' && alertEl) {
        alertEl.className = 'live-focus-alert hidden';
      }
    }, 1300);
  }
  if (cameraCard) cameraCard.classList.remove('has-alert');
  if (statusEl) {
    statusEl.innerHTML = `<span style="color: #4caf50;">Focused on camera</span>`;
  }
  const cmaCard = $('#liveCmaCard');
  if (cmaCard) cmaCard.classList.remove('distracted');

  S.faceState.alertActive = false;
}

function updateLiveCma() {
  if (!S.sessionLive || !$('#liveCmaSvg')) return;

  const checkin = S.item?.checkin || {};
  const baseEnergy = (checkin.energy || 'Moderate').toLowerCase();
  const baseFeeling = (checkin.feeling || 'Focused').toLowerCase();

  // Baseline anchors
  let v = 0.35;
  let a = 0.20;
  if (baseFeeling.includes('calm')) { v = 0.45; a = -0.20; }
  else if (baseFeeling.includes('confident')) { v = 0.60; a = 0.30; }
  else if (baseFeeling.includes('tense')) { v = -0.35; a = 0.45; }
  else if (baseFeeling.includes('reflective')) { v = 0.20; a = -0.25; }

  if (baseEnergy.includes('high')) a += 0.20;
  else if (baseEnergy.includes('low')) a -= 0.20;

  // Real-time speech dynamics modulation
  if (S.answering) {
    const elapsedSec = Math.max(1, Math.round((Date.now() - (S.answerStarted || Date.now())) / 1000));
    const txt = S.liveText || $('#answerText')?.value || '';
    const words = wordCount(txt);
    const wpm = (elapsedSec >= 4 && words > 0) ? Math.round(words / (elapsedSec / 60)) : 0;

    // Word volume and fluency
    if (words > 20) { v += 0.15; a += 0.06; }
    if (words > 50) { v += 0.10; }

    // Cadence / Pace modulation
    if (wpm > 175) {
      a += 0.28;
      v -= 0.15;
    } else if (wpm >= 115 && wpm <= 165) {
      v += 0.20;
      a += 0.05;
    } else if (elapsedSec > 6 && words < 5) {
      v -= 0.22;
      a -= 0.15;
    }
  }

  // Visual attention & focus modulation
  if (S.faceState.alertActive) {
    v -= 0.28;
    a += 0.14;
  } else if (S.faceState.direction === 'Center' && S.faceState.gaze === 'Centered') {
    v += 0.12;
  }

  // Clamping to circumplex radius limits
  v = Math.max(-0.80, Math.min(0.80, v));
  a = Math.max(-0.80, Math.min(0.80, a));

  // Center (105, 80), radius factor 42 in 210x160 SVG
  const targetX = Math.round(105 + (v * 42));
  const targetY = Math.round(80 - (a * 42));

  // Determine emotional state and micro-tip
  let stateTitle = 'Focused · Optimal Flow';
  let tip = 'Good delivery cadence. Maintaining direct camera focus.';

  if (S.faceState.alertActive) {
    stateTitle = 'Distracted · Attention Diverged';
    tip = 'Face orientation shifted away. Re-center to project executive presence.';
  } else if (v >= 0.15 && a >= 0.20) {
    stateTitle = a > 0.45 ? 'High Energy & Confident' : 'Focused · Optimal Flow';
    tip = 'Strong pacing and clear engagement. Keep this steady tone.';
  } else if (v >= 0.05 && a < 0.20) {
    stateTitle = a < -0.15 ? 'Calm & Composed' : 'Composed & Steady';
    tip = 'Measured cadence. Maintain voice projection through to the conclusion.';
  } else if (v < 0.05 && a >= 0.15) {
    stateTitle = a > 0.40 ? 'Tense · Fast Cadence' : 'Pressured Activation';
    tip = 'Pacing is rapid. Take a brief breath pause between key ideas.';
  } else {
    stateTitle = a < -0.15 ? 'Hesitant · Extended Pause' : 'Reserved Delivery';
    tip = 'Elaborate on your actions using a specific metric or concrete example.';
  }

  // Update DOM elements
  const dot = $('#liveCmaDotGroup');
  if (dot) dot.style.transform = `translate(${targetX}px, ${targetY}px)`;

  const stateWordEl = $('#liveCmaStateWord');
  if (stateWordEl) stateWordEl.textContent = stateTitle;

  const tipEl = $('#liveCmaTip');
  if (tipEl) tipEl.textContent = tip;

  const valArousalEl = $('#liveCmaValArousal');
  if (valArousalEl) {
    const vStr = (v >= 0 ? '+' : '') + v.toFixed(2);
    const aStr = (a >= 0 ? '+' : '') + a.toFixed(2);
    valArousalEl.textContent = `V: ${vStr} · A: ${aStr}`;
  }
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
    if ($('#faceStatus')) $('#faceStatus').textContent = 'Tracking (Heuristic)';
    startFaceInterval();
  }
}

function startFaceInterval() {
  if (S.faceInterval) clearInterval(S.faceInterval);
  updateLiveCma();

  S.faceInterval = setInterval(() => {
    if (!S.sessionLive) return;
    const video = $('#cameraSource');
    if (!video || video.readyState < 2 || !video.videoWidth) {
      updateLiveCma();
      return;
    }

    let count = 1;
    let direction = 'Center';
    let gaze = 'Centered';
    let isDistracted = false;
    let alertKey = 'normal';
    let alertIcon = '👀';
    let alertMessage = '';

    if (S.faceModel) {
      try {
        const result = S.faceModel.detectForVideo(video, performance.now());
        const faces = result.faceLandmarks || [];
        count = faces.length;

        if (count === 0) {
          direction = '—';
          gaze = '—';
          isDistracted = true;
          alertKey = 'no-face';
          alertIcon = '👤';
          alertMessage = 'Face out of frame. Please center yourself in the camera.';
        } else if (count > 1) {
          isDistracted = true;
          alertKey = 'multiple-faces';
          alertIcon = '👥';
          alertMessage = 'Multiple faces detected. Please maintain private session focus.';
        } else {
          const points = faces[0];
          const nose = points[1];
          const left = points[234];
          const right = points[454];
          const topHead = points[10];
          const chin = points[152];

          // Horizontal Yaw (Head turn left / right)
          if (nose && left && right) {
            const center = (left.x + right.x) / 2;
            const faceWidth = Math.max(0.04, Math.abs(right.x - left.x));
            const yawRatio = (nose.x - center) / faceWidth;
            if (yawRatio < -0.16) {
              direction = 'Turned left';
              isDistracted = true;
              alertKey = 'turned-left';
              alertIcon = '👀';
              alertMessage = 'Looking away to the left. Re-center your face forward.';
            } else if (yawRatio > 0.16) {
              direction = 'Turned right';
              isDistracted = true;
              alertKey = 'turned-right';
              alertIcon = '👀';
              alertMessage = 'Looking away to the right. Look toward the camera.';
            } else {
              direction = 'Center';
            }
          }

          // Vertical Pitch (Looking down at phone / notes / desk)
          if (nose && topHead && chin) {
            const faceHeight = Math.max(0.05, Math.abs(chin.y - topHead.y));
            const midY = (topHead.y + chin.y) / 2;
            const pitchRatio = (nose.y - midY) / faceHeight;
            if (pitchRatio > 0.13) {
              direction = 'Looking down';
              if (!isDistracted) {
                isDistracted = true;
                alertKey = 'looking-down';
                alertIcon = '⚠️';
                alertMessage = 'Looking down detected. Keep your head up and face the camera.';
              }
            } else if (pitchRatio < -0.16) {
              direction = 'Looking up';
            }
          }

          // Iris Eye Gaze Tracking
          const rightIris = points[468], leftIris = points[473], rc1 = points[33], rc2 = points[133], lc1 = points[362], lc2 = points[263];
          if (direction === 'Center' && rightIris && leftIris && rc1 && rc2 && lc1 && lc2) {
            const frac = (iris, a, b) => ((iris.x - Math.min(a.x, b.x)) / Math.max(0.01, Math.abs(a.x - b.x)));
            const mean = (frac(rightIris, rc1, rc2) + frac(leftIris, lc1, lc2)) / 2;
            if (mean < 0.28) {
              gaze = 'Looking left';
              if (!isDistracted) {
                isDistracted = true;
                alertKey = 'gaze-left';
                alertIcon = '👀';
                alertMessage = 'Eyes shifted left. Look directly into the camera lens.';
              }
            } else if (mean > 0.72) {
              gaze = 'Looking right';
              if (!isDistracted) {
                isDistracted = true;
                alertKey = 'gaze-right';
                alertIcon = '👀';
                alertMessage = 'Eyes shifted right. Look directly into the camera lens.';
              }
            } else {
              gaze = 'Centered';
            }
          }
        }
      } catch (e) {
        console.warn('Face landmark iteration error', e.message);
      }
    }

    // Update signal telemetry indicators
    S.faceState.count = count;
    S.faceState.direction = direction;
    S.faceState.gaze = gaze;
    if ($('#gazeDirection')) $('#gazeDirection').textContent = gaze;
    if ($('#facesCount')) $('#facesCount').textContent = String(count);
    if ($('#headDirection')) $('#headDirection').textContent = direction;

    // Distraction alert trigger with 1.4s debounce
    if (isDistracted) {
      if (S.faceState.key !== alertKey) {
        S.faceState.key = alertKey;
        S.faceState.since = Date.now();
      } else if (Date.now() - S.faceState.since >= 1400) {
        showLiveFocusAlert(alertIcon, alertMessage, alertKey);
        if (!S.faceState.loggedAlert) {
          logEvent(alertKey, alertMessage);
          S.faceState.loggedAlert = true;
        }
      }
    } else {
      if (S.faceState.alertActive) {
        hideLiveFocusAlert();
      }
      S.faceState.key = 'normal';
      S.faceState.since = 0;
      S.faceState.loggedAlert = false;
    }

    // Live CMA Affect update
    updateLiveCma();
  }, 850);
}

function stopFaceTracking() {
  if (S.faceInterval) clearInterval(S.faceInterval);
  S.faceInterval = null;
  hideLiveFocusAlert();
}

// -----------------------------------------------------------------------------
// Affect Analysis (Russell's Circumplex Model of Affect)
// Dynamically maps candidate's baseline check-in (Valence/Arousal) and adapts
// it across each prompt based on speech duration, word count, pace, and progression.
// -----------------------------------------------------------------------------

function computeCmaTrajectory(questions, checkin = {}) {
  const energy = (checkin.energy || 'Moderate').toLowerCase();
  const feeling = (checkin.feeling || 'Focused').toLowerCase();

  // Baseline Valence (horizontal: -1 unpleasant to +1 pleasant)
  // Baseline Arousal (vertical: -1 low activation to +1 high activation)
  let baseValence = 0.25;
  let baseArousal = 0.15;

  if (feeling.includes('tense')) {
    baseValence = -0.40;
    baseArousal = 0.45;
  } else if (feeling.includes('calm')) {
    baseValence = 0.45;
    baseArousal = -0.30;
  } else if (feeling.includes('confident')) {
    baseValence = 0.60;
    baseArousal = 0.25;
  } else if (feeling.includes('focused')) {
    baseValence = 0.35;
    baseArousal = 0.30;
  }

  if (energy.includes('high')) {
    baseArousal += 0.25;
  } else if (energy.includes('low')) {
    baseArousal -= 0.30;
  }

  const list = questions.length ? questions : [{ idx: 0, text: '', duration: 0 }];
  const total = list.length;

  const points = list.map((qItem, i) => {
    const txt = (qItem.text || '').trim();
    const words = txt ? wordCount(txt) : 0;
    const dur = Math.round(qItem.duration || 0);
    const wpm = (dur >= 5 && words > 0) ? Math.round(words / (dur / 60)) : 0;

    let v = baseValence;
    let a = baseArousal;

    // Progression arc: early prompts carry warmup activation; later prompts acclimate into flow
    if (i === 0) {
      a += 0.12;
      if (feeling.includes('tense')) v -= 0.10;
    } else {
      const progress = i / Math.max(1, total - 1);
      v += progress * 0.22;
      if (a > 0.30) a -= progress * 0.16;
    }

    // Response fluency & depth adjustments
    if (words >= 80) {
      v += 0.18;
      a += 0.08;
    } else if (words >= 35) {
      v += 0.10;
      a += 0.04;
    } else if (words === 0 && dur === 0) {
      v -= 0.22;
      a -= 0.10;
    } else if (words < 15) {
      v -= 0.20;
      a += 0.10;
    }

    // Speech pacing modulation
    if (wpm > 170) {
      a += 0.15;
      v -= 0.06;
    } else if (wpm >= 115 && wpm <= 165) {
      v += 0.10;
    } else if (wpm > 0 && wpm < 85) {
      v -= 0.08;
    }

    // Clamping within circumplex boundary radius
    v = Math.max(-0.82, Math.min(0.82, v));
    a = Math.max(-0.82, Math.min(0.82, a));

    // Map to SVG coordinates: Center (160, 110), radius factor 56
    let cx = Math.round(160 + (v * 56));
    let cy = Math.round(110 - (a * 56));

    // Descriptive affect classification
    let stateLabel = '';
    if (v >= 0 && a >= 0.15) {
      stateLabel = a > 0.45 ? 'Confident / High energy' : 'Focused / Optimal flow';
    } else if (v >= 0 && a < 0.15) {
      stateLabel = a < -0.20 ? 'Relaxed / Low energy' : 'Calm / Composed';
    } else if (v < 0 && a >= 0.05) {
      stateLabel = a > 0.40 ? 'Tense / High energy' : 'Pressured / High activation';
    } else {
      stateLabel = a < -0.20 ? 'Fatigued / Low energy' : 'Hesitant / Reserved';
    }

    const metricsStr = dur > 0
      ? `${dur}s · ${words}w${wpm > 0 ? ` · ${wpm} wpm` : ''}`
      : (words > 0 ? `${words}w` : 'No response');

    return {
      idx: qItem.idx ?? i,
      qNum: i + 1,
      v,
      a,
      cx,
      cy,
      label: stateLabel,
      metrics: metricsStr
    };
  });

  // Minor collision relaxation so adjacent dots do not overlap
  for (let i = 1; i < points.length; i++) {
    for (let j = 0; j < i; j++) {
      const dx = points[i].cx - points[j].cx;
      const dy = points[i].cy - points[j].cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 14) {
        points[i].cx += (dx >= 0 ? 8 : -8);
        points[i].cy += (dy >= 0 ? 8 : -8);
      }
    }
  }

  // Determine smart label offset and anchor for SVG rendering
  return points.map(p => {
    let anchor = 'middle';
    let labelX = p.cx;
    let labelY = p.cy - 7;
    if (p.cx > 195) {
      anchor = 'end';
      labelX = p.cx - 8;
      labelY = p.cy + 3;
    } else if (p.cx < 125) {
      anchor = 'start';
      labelX = p.cx + 8;
      labelY = p.cy + 3;
    } else if (p.cy > 115) {
      labelY = p.cy + 13;
    }
    return { ...p, anchor, labelX, labelY };
  });
}

// -----------------------------------------------------------------------------
// View 4: Evaluation Report
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// View 4: Evaluation Report (Harmonious with Circumplex Centerpiece & Back Button)
// -----------------------------------------------------------------------------
async function renderReport() {
  if (!S.item) return setView('history');
  const report = S.item.report;
  if (!report) {
    $('#view').innerHTML = `
      <div class="content">
        <div class="report-header-row">
          <button class="btn-back-report" id="btnReportBack" type="button">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor"/>
            </svg>
            <span>Back to reports</span>
          </button>
          <div class="pill-badge wash-plum">ANALYSIS READY</div>
        </div>

        <div class="overview-header" style="margin-top: 8px;">
          <div>
            <h1 class="overview-title">Evaluation report</h1>
            <p class="overview-sub">${esc(S.item.topic)} · Responses saved</p>
          </div>
        </div>

        <div class="card-white" style="padding: 40px; text-align: center; max-width: 540px; margin: 40px auto;">
          <div class="metric-icon-tile yellow" style="width: 56px; height: 56px; border-radius: 18px; margin: 0 auto 16px;">
            ${R_ICON.sparkle}
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--color-ink); margin-bottom: 8px;">Generate AI evaluation report</h2>
          <p style="font-size: 14px; color: var(--color-muted); line-height: 1.5; margin-bottom: 24px;">Your interview responses and audio telemetry have been preserved locally. Click below to synthesize the Circumplex Model of Affect and structured STAR rubric critique.</p>
          <button class="btn-hero-primary" data-action="retry-report" style="margin: 0 auto; height: 44px; padding: 0 24px; font-size: 14px;">
            <span>Generate evaluation report</span>
            ${R_ICON.arrowRight}
          </button>
        </div>
      </div>
    `;
    $('#btnReportBack')?.addEventListener('click', () => setView('history'));
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
    <g class="cma-pt" tabindex="0" role="img" aria-label="Prompt ${p.qNum}: ${p.label}" style="cursor: pointer;">
      <title>Prompt ${p.qNum}: ${p.label} (${p.metrics})</title>
      <circle cx="${p.cx}" cy="${p.cy}" r="5" fill="#38325a" stroke="#ffffff" stroke-width="1.5"/>
      <text x="${p.labelX}" y="${p.labelY}" text-anchor="${p.anchor}" font-size="9" font-weight="700" fill="#38325a">Q${p.qNum}</text>
    </g>
  `).join('');

  const quadrantCounts = { q1: 0, q2: 0, q3: 0, q4: 0 };
  cmaPoints.forEach(p => {
    if (p.v >= 0 && p.a >= 0) quadrantCounts.q1++;
    else if (p.v < 0 && p.a >= 0) quadrantCounts.q2++;
    else if (p.v < 0 && p.a < 0) quadrantCounts.q3++;
    else quadrantCounts.q4++;
  });
  let dominantQuad = 'q1';
  let maxCount = -1;
  for (const [q, count] of Object.entries(quadrantCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantQuad = q;
    }
  }

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

      <div class="overview-header" style="margin-top: 8px;">
        <div>
          <h1 class="overview-title">Interview evaluation report</h1>
          <p class="overview-sub">${esc(S.item.topic)} · ${durMinutes} min session · ${answered.length} of ${qCount} prompts answered</p>
        </div>
      </div>

      <!-- Hero Circumplex Model Centerpiece -->
      <div class="cma-hero-card">
        <div class="cma-hero-title-row">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="pill-badge" style="font-size: 11px; font-weight: 700; background: #D7D7F4; color: #38325a;">PSYCHOLOGICAL TRAJECTORY</span>
              <h2 style="font-size: 20px; font-weight: 700; color: var(--color-ink); margin: 0;">Circumplex Model of Affect (CMA)</h2>
            </div>
            <p style="font-size: 13px; color: var(--color-muted); margin-top: 4px;">Candidate affective trajectory plotted across Valence and Arousal activation dimensions.</p>
          </div>
          <div class="pill-badge wash-plum" style="font-size: 12px; font-weight: 700; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px;">
            ${rIcon("heart", 14)}
            <span>Baseline: <strong>${esc(energy)}</strong> energy · <strong>${esc(feeling)}</strong></span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 330px 1fr; gap: 28px; align-items: center;">
          <!-- SVG Circumplex Chart with Pastel Quadrants -->
          <div style="position: relative; width: 100%; aspect-ratio: 1.45; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 320 220" style="width: 100%; height: 100%; overflow: visible;" role="img" aria-label="Circumplex Affect Chart">
              <defs>
                <clipPath id="circleClip">
                  <circle cx="160" cy="110" r="72" />
                </clipPath>
              </defs>

              <!-- Outer Circle Background with Pastel Quadrants -->
              <g clip-path="url(#circleClip)">
                <!-- Q2: Top-Left (Unpleasant / High Energy - Peach #FFEBE3) -->
                <rect x="88" y="38" width="72" height="72" fill="#FFEBE3" />
                <!-- Q1: Top-Right (Pleasant / High Energy - Lavender #E8E7FA) -->
                <rect x="160" y="38" width="72" height="72" fill="#E8E7FA" />
                <!-- Q3: Bottom-Left (Unpleasant / Low Energy - Mist #ECEEF2) -->
                <rect x="88" y="110" width="72" height="72" fill="#ECEEF2" />
                <!-- Q4: Bottom-Right (Pleasant / Low Energy - Mint #E4F6ED) -->
                <rect x="160" y="110" width="72" height="72" fill="#E4F6ED" />
              </g>

              <!-- Outer boundary stroke -->
              <circle cx="160" cy="110" r="72" fill="none" stroke="#e7e5ef" stroke-width="1.5"/>

              <!-- Central Cross Axes -->
              <line x1="88" y1="110" x2="232" y2="110" stroke="#656375" stroke-width="1.2" stroke-dasharray="2 2" />
              <line x1="160" y1="38" x2="160" y2="182" stroke="#656375" stroke-width="1.2" stroke-dasharray="2 2" />

              <!-- Axis Labels with Generous Margin -->
              <text x="160" y="24" text-anchor="middle" font-size="9" font-weight="700" fill="#38325a" letter-spacing="1px">HIGH ACTIVATION</text>
              <text x="160" y="202" text-anchor="middle" font-size="9" font-weight="700" fill="#565563" letter-spacing="1px">LOW ACTIVATION</text>
              <text x="78" y="113" text-anchor="end" font-size="9" font-weight="700" fill="#565563" letter-spacing="0.5px">UNPLEASANT</text>
              <text x="242" y="113" text-anchor="start" font-size="9" font-weight="700" fill="#38325a" letter-spacing="0.5px">PLEASANT</text>

              <!-- Dynamic Trajectory Polyline -->
              ${trajectorySvg}

              <!-- Dynamic Plotted Dots -->
              ${dotsSvg}
            </svg>
          </div>

          <!-- 4 Pastel Quadrant Info Cards -->
          <div class="cma-quadrant-grid">
            <div class="cma-quadrant-card q1 ${dominantQuad === 'q1' ? 'active' : ''}">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 13px; font-weight: 700; color: #38325a;">Q1 · High Activation / Pleasant</span>
                ${dominantQuad === 'q1' ? '<span class="pill-badge" style="background: rgba(56,50,90,0.12); color: #38325a; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px;">DOMINANT</span>' : ''}
              </div>
              <div style="font-size: 11px; color: #565563;">State: Confident, Focused, Optimal Flow</div>
            </div>
            <div class="cma-quadrant-card q2 ${dominantQuad === 'q2' ? 'active' : ''}">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 13px; font-weight: 700; color: #9c4221;">Q2 · High Activation / Unpleasant</span>
                ${dominantQuad === 'q2' ? '<span class="pill-badge" style="background: rgba(156,66,33,0.14); color: #9c4221; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px;">DOMINANT</span>' : ''}
              </div>
              <div style="font-size: 11px; color: #565563;">State: Tense, Anxious, Pressured</div>
            </div>
            <div class="cma-quadrant-card q4 ${dominantQuad === 'q4' ? 'active' : ''}">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 13px; font-weight: 700; color: #1e664e;">Q4 · Low Activation / Pleasant</span>
                ${dominantQuad === 'q4' ? '<span class="pill-badge" style="background: rgba(30,102,78,0.14); color: #1e664e; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px;">DOMINANT</span>' : ''}
              </div>
              <div style="font-size: 11px; color: #565563;">State: Calm, Composed, Reflective</div>
            </div>
            <div class="cma-quadrant-card q3 ${dominantQuad === 'q3' ? 'active' : ''}">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 13px; font-weight: 700; color: #475569;">Q3 · Low Activation / Unpleasant</span>
                ${dominantQuad === 'q3' ? '<span class="pill-badge" style="background: rgba(71,85,105,0.14); color: #475569; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px;">DOMINANT</span>' : ''}
              </div>
              <div style="font-size: 11px; color: #565563;">State: Fatigued, Hesitant, Reserved</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Metric Cards Row -->
      <div class="grid-4-metrics">
        <div class="report-metric-card">
          <div class="report-metric-top">
            <span class="report-metric-label">Overall score</span>
            <div class="metric-icon-tile yellow" style="width: 32px; height: 32px; border-radius: 10px;">
              ${rIcon("starFilled", 16)}
            </div>
          </div>
          <div>
            <div class="report-metric-val">${score} / 100</div>
            <div class="report-metric-sub">AI response quality rating</div>
          </div>
        </div>

        <div class="report-metric-card">
          <div class="report-metric-top">
            <span class="report-metric-label">Speaking pace</span>
            <div class="metric-icon-tile teal" style="width: 32px; height: 32px; border-radius: 10px;">
              ${rIcon("mixer", 16)}
            </div>
          </div>
          <div>
            <div class="report-metric-val">${pace} wpm</div>
            <div class="report-metric-sub">Pacing & delivery tempo</div>
          </div>
        </div>

        <div class="report-metric-card">
          <div class="report-metric-top">
            <span class="report-metric-label">Active duration</span>
            <div class="metric-icon-tile lavender" style="width: 32px; height: 32px; border-radius: 10px; background: var(--color-lav); color: var(--color-plum);">
              ${rIcon("stopwatch", 16)}
            </div>
          </div>
          <div>
            <div class="report-metric-val">${durMinutes} min</div>
            <div class="report-metric-sub">Recorded interview time</div>
          </div>
        </div>

        <div class="report-metric-card">
          <div class="report-metric-top">
            <span class="report-metric-label">Audit events</span>
            <div class="metric-icon-tile" style="width: 32px; height: 32px; border-radius: 10px; background: var(--color-wash); color: var(--color-plum);">
              ${rIcon("activity", 16)}
            </div>
          </div>
          <div>
            <div class="report-metric-val">${events.length}</div>
            <div class="report-metric-sub">Monitored review moments</div>
          </div>
        </div>
      </div>

      <!-- 3-Column Diagnostic Breakdown -->
      <div class="report-grid-3">
        <!-- Col 1: Questions review -->
        <div class="card-white" id="colQuestions">
          <div class="card-header-row">
            <div>
              <h3 class="card-title">Prompt evaluations</h3>
              <p class="card-sub">Click to expand candidate transcript</p>
            </div>
          </div>

          <div class="q-accordion-list">
            ${questions.map((item, idx) => `
              <div class="q-item q-accordion-item ${idx === 0 ? 'expanded' : ''}" data-action="toggle-q-detail">
                <div class="q-accordion-header">
                  <span>${esc(item.title)}</span>
                  ${rIcon("chevronDown", 12)}
                </div>
                <div class="q-accordion-verdict">${esc(clip(item.feedback, 55))}</div>
                <div class="q-accordion-detail">
                  <div style="font-weight: 700; margin-bottom: 4px; color: var(--color-ink);">Prompt:</div>
                  <div style="margin-bottom: 8px; font-size: 13px;">${esc(item.q)}</div>
                  <div style="font-weight: 700; margin-bottom: 4px; color: var(--color-ink);">Your response:</div>
                  <div style="margin-bottom: 8px; font-size: 13px; color: var(--color-muted);">${esc(item.text || 'No spoken or typed answer recorded.')}</div>
                  <div style="background: var(--color-wash); padding: 10px 14px; border-radius: 12px; border: 1px solid var(--color-border);">
                    <strong style="color: var(--color-plum);">Coaching note:</strong> ${esc(item.feedback)}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Col 2: Activity Timeline -->
        <div class="card-white" id="colTimeline">
          <div class="card-header-row">
            <div>
              <h3 class="card-title">Audit timeline</h3>
              <p class="card-sub">Logged session milestones</p>
            </div>
          </div>

          <div class="feed-list" style="max-height: 480px; overflow-y: auto;">
            ${events.length ? events.map(e => `
              <div class="feed-item">
                <time>${fmtTime(e.elapsed)}</time>
                <span>${esc(e.detail)}</span>
              </div>
            `).join('') : '<div style="font-size: 12px; color: var(--color-muted); padding: 12px 0;">No audit events logged during this attempt.</div>'}
          </div>
        </div>

        <!-- Col 3: CMA Breakdown Details -->
        <div class="card-white" id="colCma">
          <div class="card-header-row">
            <div>
              <h3 class="card-title">Affect progression</h3>
              <p class="card-sub">Question-by-question breakdown</p>
            </div>
          </div>

          <div style="font-size: 13px; color: var(--color-muted); line-height: 1.6; margin-top: 10px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${cmaPoints.map(p => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-border);">
                  <span><strong style="color: var(--color-ink);">Q${p.qNum}:</strong> ${esc(p.label)}</span>
                  <span class="pill-badge wash-plum" style="font-size: 11px;">${esc(p.metrics)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Next Steps Row -->
      <div class="practice-layout" style="margin-top: 24px;">
        <div class="card-white">
          <div class="card-title">Media capture status</div>
          <div style="font-size: 13px; color: var(--color-muted); margin: 6px 0 10px;">
            Video replay: <strong>${S.item.has_recording ? 'Available locally' : 'No recording saved'}</strong> · Audio: Captured · Screen: Consented
          </div>
          <p style="font-size: 12px; color: var(--color-muted); line-height: 1.45;">
            Video and audio files are stored securely on this local computer. They can be reviewed or permanently deleted at any time.
          </p>
        </div>

        <div class="card-white" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="card-title">Recommended next step</div>
            <div style="font-size: 13px; font-weight: 600; color: var(--color-ink); margin: 6px 0 14px;">
              ${esc(nextStepPrompt)}
            </div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-hero-primary" data-action="new" style="height: 40px; font-size: 13px;">
              <span>Practice again</span>
              ${R_ICON.arrowRight}
            </button>
            <button class="btn-control-outline" data-action="review-recording" style="height: 40px; font-size: 13px;">Review recording</button>
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
      <div class="overview-header">
        <div>
          <h1 class="overview-title">Practice reports & sessions</h1>
          <p class="overview-sub">Chronological record of interview simulations and diagnostic evaluations.</p>
        </div>
        <button class="btn-hero-primary" data-action="new">
          ${R_ICON.plus}
          <span>Start new session</span>
        </button>
      </div>

      <div class="grid-3-metrics">
        <div class="report-metric-card">
          <div class="report-metric-top">
            <span class="report-metric-label">Total sessions</span>
            <div class="metric-icon-tile teal" style="width: 32px; height: 32px; border-radius: 10px;">
              ${rIcon("mixer", 16)}
            </div>
          </div>
          <div>
            <div class="report-metric-val">${S.history.length}</div>
            <div class="report-metric-sub">Recorded interview simulations</div>
          </div>
        </div>

        <div class="report-metric-card">
          <div class="report-metric-top">
            <span class="report-metric-label">Completed</span>
            <div class="metric-icon-tile lavender" style="width: 32px; height: 32px; border-radius: 10px; background: var(--color-lav); color: var(--color-plum);">
              ${rIcon("stopwatch", 16)}
            </div>
          </div>
          <div>
            <div class="report-metric-val">${S.history.filter(x => x.state === 'complete').length}</div>
            <div class="report-metric-sub">Full evaluations generated</div>
          </div>
        </div>

        <div class="report-metric-card">
          <div class="report-metric-top">
            <span class="report-metric-label">Avg response rating</span>
            <div class="metric-icon-tile yellow" style="width: 32px; height: 32px; border-radius: 10px;">
              ${rIcon("starFilled", 16)}
            </div>
          </div>
          <div>
            <div class="report-metric-val">84 / 100</div>
            <div class="report-metric-sub">Quality benchmark across sessions</div>
          </div>
        </div>
      </div>

      <div class="card-white" style="padding: 0; overflow: hidden;">
        <div class="card-header-row" style="padding: 24px 24px 16px 24px; margin-bottom: 0; border-bottom: 1px solid var(--color-border);">
          <div>
            <h3 class="card-title">Recorded sessions</h3>
            <p class="card-sub">Select any session to open its comprehensive AI evaluation report</p>
          </div>
          <div class="pill-badge wash-plum">${S.history.length} total</div>
        </div>

        <div class="history-session-list">
          ${sessionTableHtml(S.history)}
        </div>
      </div>
    </div>
  `;
}

function sessionTableHtml(items) {
  if (!items.length) {
    return `
      <div style="padding: 48px 24px; text-align: center; color: var(--color-muted);">
        <div style="width: 48px; height: 48px; border-radius: 14px; background: var(--color-wash); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: var(--color-plum);">
          ${rIcon("reader", 24)}
        </div>
        <p style="font-weight: 700; color: var(--color-ink); margin-bottom: 4px;">No practice sessions recorded yet</p>
        <p style="font-size: 13px;">Complete your first practice session to generate structured evaluation reports.</p>
      </div>
    `;
  }
  return items.map(s => `
    <div class="history-session-row">
      <div class="history-session-left">
        <div class="metric-icon-tile ${s.state === 'complete' ? 'teal' : 'yellow'}" style="width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          ${rIcon("speaker", 18)}
        </div>
        <div>
          <div class="history-session-title">${esc(clip(s.topic || 'UI/UX Designer', 45))}</div>
          <div class="history-session-meta">
            ${niceDate(s.created_at)} · ${s.question_count || 5} questions · <span style="font-weight: 600;">${esc(s.difficulty || 'Intermediate')}</span>
          </div>
        </div>
      </div>
      <div class="history-session-right">
        <span class="pill-badge ${s.state === 'complete' ? 'wash-green' : 'wash-plum'}">
          ${s.state === 'complete' ? 'Completed' : 'Active'}
        </span>
        <button class="btn-control-outline" data-action="open-session" data-id="${s.id}" style="height: 38px; padding: 0 14px; font-size: 13px;">
          <span>${s.state === 'complete' ? 'View report' : 'Resume'}</span>
          ${rIcon("arrowRight", 14)}
        </button>
      </div>
    </div>
  `).join('');
}

// -----------------------------------------------------------------------------
// View 6: Library (Question Bank)
// -----------------------------------------------------------------------------
// View 6: Question & Prompt Library (Curated Workspace)
// -----------------------------------------------------------------------------
function renderLibrary() {
  const libraryItems = [
    {
      id: "q-1",
      title: "Walk through your end-to-end design process",
      category: "Process",
      difficulty: "Intermediate",
      format: "STAR Method",
      duration: "3-5 min",
      tileClass: "lavender",
      desc: "Explain how you navigate an ambiguous problem space from discovery and wireframes to rapid prototyping and usability validation."
    },
    {
      id: "q-2",
      title: "Resolving user research feedback vs business constraints",
      category: "Strategy",
      difficulty: "Advanced",
      format: "Trade-offs",
      duration: "4-5 min",
      tileClass: "peach",
      desc: "Discuss a real project where user research contradicted tight sprint deadlines or stakeholder business goals, and how you reached consensus."
    },
    {
      id: "q-3",
      title: "Designing for accessibility (WCAG 2.1 AA Compliance)",
      category: "Usability",
      difficulty: "Intermediate",
      format: "Deep Dive",
      duration: "3-4 min",
      tileClass: "mint",
      desc: "Walk through specific techniques for contrast ratios, screen-reader landmark navigation, focus states, and 48px touch targets."
    },
    {
      id: "q-4",
      title: "Structuring complex edge cases in checkout flows",
      category: "Edge Cases",
      difficulty: "Advanced",
      format: "System Design",
      duration: "4-5 min",
      tileClass: "peach",
      desc: "How do you systematically architect form recovery, network timeout states, split payments, and international address variations?"
    },
    {
      id: "q-5",
      title: "Building and scaling a design system component",
      category: "Systems",
      difficulty: "Intermediate",
      format: "Architecture",
      duration: "3-5 min",
      tileClass: "lavender",
      desc: "Detail your approach to defining atomic design tokens, multi-variant Figma sets, accessibility annotations, and engineering handoff."
    },
    {
      id: "q-6",
      title: "Behavioral STAR: Handling a difficult design critique",
      category: "Behavioral",
      difficulty: "Beginner",
      format: "STAR Method",
      duration: "3 min",
      tileClass: "yellow",
      desc: "Describe a situation where an executive or cross-functional peer strongly criticized your design, and how you objectively responded."
    },
    {
      id: "q-7",
      title: "Conducting rapid discovery when user access is restricted",
      category: "Process",
      difficulty: "Advanced",
      format: "Heuristics",
      duration: "3-4 min",
      tileClass: "lavender",
      desc: "What research methods do you leverage (analytics telemetry, CS support tickets, sales calls) when direct customer interviews are not feasible?"
    },
    {
      id: "q-8",
      title: "Prioritizing feature backlogs using RICE framework",
      category: "Strategy",
      difficulty: "Intermediate",
      format: "Framework",
      duration: "3-4 min",
      tileClass: "peach",
      desc: "Explain how you evaluate Reach, Impact, Confidence, and Effort alongside Product Managers to defend user experience investments."
    },
    {
      id: "q-9",
      title: "Identifying and resolving usability friction in onboarding",
      category: "Usability",
      difficulty: "Beginner",
      format: "Case Study",
      duration: "3 min",
      tileClass: "mint",
      desc: "Techniques for measuring time-to-value, reducing cognitive friction, and optimizing conversion during first-run user experiences."
    },
    {
      id: "q-10",
      title: "Designing graceful offline modes and sync conflict UI",
      category: "Edge Cases",
      difficulty: "Intermediate",
      format: "System Design",
      duration: "3-4 min",
      tileClass: "peach",
      desc: "How do you communicate disconnected network states, cached local updates, and conflict resolution without alarming the user?"
    },
    {
      id: "q-11",
      title: "Deprecating legacy components across large applications",
      category: "Systems",
      difficulty: "Advanced",
      format: "Governance",
      duration: "4 min",
      tileClass: "lavender",
      desc: "Strategies for communicating breaking changes, component sunset timelines, and telemetry tracking of deprecated design tokens."
    },
    {
      id: "q-12",
      title: "Navigating disagreements with engineering lead on feasibility",
      category: "Behavioral",
      difficulty: "Intermediate",
      format: "STAR Method",
      duration: "3-4 min",
      tileClass: "yellow",
      desc: "Share an example where technical feasibility conflicted with ideal UX, and how you collaborated to find a creative middle ground."
    }
  ];

  const categories = [
    { name: 'All', count: libraryItems.length },
    { name: 'Process', count: libraryItems.filter(i => i.category === 'Process').length },
    { name: 'Strategy', count: libraryItems.filter(i => i.category === 'Strategy').length },
    { name: 'Usability', count: libraryItems.filter(i => i.category === 'Usability').length },
    { name: 'Edge Cases', count: libraryItems.filter(i => i.category === 'Edge Cases').length },
    { name: 'Systems', count: libraryItems.filter(i => i.category === 'Systems').length },
    { name: 'Behavioral', count: libraryItems.filter(i => i.category === 'Behavioral').length }
  ];

  $('#view').innerHTML = `
    <div class="content">
      <div class="overview-header">
        <div>
          <h1 class="overview-title">Question &amp; Prompt Library</h1>
          <p class="overview-sub">Curated UI/UX mock interview questions, design scenarios, and behavioral prompt templates.</p>
        </div>
        <div class="pill-badge wash-plum">
              ${rIcon("checkCircled", 12)}
          ${libraryItems.length} curated prompts
        </div>
      </div>

      <!-- Modern Filter Card -->
      <div class="library-filter-card">
        <div class="library-filter-row">
          <div class="library-tab-pills" id="libFilter">
            ${categories.map((c, idx) => `
              <button class="library-tab-pill ${idx === 0 ? 'active' : ''}" type="button" data-cat="${c.name}">
                <span>${c.name}</span>
                <span class="library-tab-count">${c.count}</span>
              </button>
            `).join('')}
          </div>

          <div class="library-search-box">
            <span class="library-search-icon">${rIcon("magnifyingGlass", 16)}</span>
            <input id="libSearchInput" placeholder="Search prompts or keywords…" autocomplete="off" />
          </div>
        </div>

        <div class="library-results-meta">
          <span id="libCountNotice">Showing all ${libraryItems.length} prompts</span>
          <span style="font-size: 11px; color: var(--color-muted);">Select any prompt to launch practice session</span>
        </div>
      </div>

      <!-- Cards Grid -->
      <div class="library-grid" id="libCardsContainer">
        ${renderLibCards(libraryItems)}
      </div>
    </div>
  `;

  function getCategorySvg(cat) {
    if (cat === 'Process') return rIcon('activity', 20);
    if (cat === 'Strategy') return rIcon('target', 20);
    if (cat === 'Usability') return rIcon('eyeOpen', 20);
    if (cat === 'Edge Cases') return rIcon('component', 20);
    if (cat === 'Systems') return rIcon('tokens', 20);
    return rIcon('chatBubble', 20);
  }

  function renderLibCards(items) {
    if (!items.length) {
      return `
        <div style="grid-column: 1 / -1; padding: 64px 20px; text-align: center; background: #ffffff; border-radius: 20px; border: 1px solid var(--color-border);">
          <div class="metric-icon-tile wash" style="width: 48px; height: 48px; border-radius: 14px; margin: 0 auto 12px; background: var(--color-wash); display: flex; align-items: center; justify-content: center;">
            ${rIcon("magnifyingGlass", 20)}
          </div>
          <h3 style="font-size: 16px; font-weight: 700; color: var(--color-ink); margin-bottom: 6px;">No prompt templates found</h3>
          <p style="font-size: 13px; color: var(--color-muted);">Try searching for a different keyword or select another category filter.</p>
        </div>
      `;
    }
    return items.map(item => `
      <div class="library-card">
        <div>
          <div class="library-card-header">
            <div class="library-card-icon-tile ${item.tileClass}">
              ${getCategorySvg(item.category)}
            </div>
            <div class="library-card-badges">
              <span class="pill-badge wash-plum">${item.category}</span>
              <span class="pill-badge diff-${item.difficulty.toLowerCase()}">${item.difficulty}</span>
            </div>
          </div>
          <h3 class="library-card-title">${item.title}</h3>
          <p class="library-card-desc">${item.desc}</p>
        </div>

        <div class="library-card-footer">
          <div class="library-card-tags">
            <span>⏱️ ${item.duration}</span>
            <span>${item.format}</span>
          </div>
          <button class="library-practice-btn" type="button" data-action="practice-lib-q" data-topic="${esc(item.title)}">
            <span>Practice this prompt</span>
            ${rIcon("arrowRight", 14)}
          </button>
        </div>
      </div>
    `).join('');
  }

  function applyLibFilters() {
    const activeCat = $('#libFilter .library-tab-pill.active')?.dataset.cat || 'All';
    const query = ($('#libSearchInput')?.value || '').toLowerCase().trim();
    const filtered = libraryItems.filter(item => {
      const matchCat = activeCat === 'All' || item.category === activeCat;
      const matchQuery = !query ||
        item.title.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.difficulty.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    const container = $('#libCardsContainer');
    if (container) container.innerHTML = renderLibCards(filtered);

    const countNotice = $('#libCountNotice');
    if (countNotice) {
      if (filtered.length === libraryItems.length) {
        countNotice.textContent = `Showing all ${libraryItems.length} prompts`;
      } else {
        countNotice.textContent = `Showing ${filtered.length} of ${libraryItems.length} prompts`;
      }
    }
    bindPracticeButtons();
  }

  function bindPracticeButtons() {
    document.querySelectorAll('[data-action="practice-lib-q"]').forEach(btn => {
      btn.addEventListener('click', () => {
        S.setup.topic = btn.dataset.topic;
        setView('prepare');
        toast(`Loaded prompt: "${clip(btn.dataset.topic, 35)}"`);
      });
    });
  }

  bindPracticeButtons();

  $('#libFilter')?.addEventListener('click', e => {
    const pill = e.target.closest('.library-tab-pill');
    if (!pill) return;
    document.querySelectorAll('#libFilter .library-tab-pill').forEach(el => el.classList.remove('active'));
    pill.classList.add('active');
    applyLibFilters();
  });

  $('#libSearchInput')?.addEventListener('input', applyLibFilters);
}

// View 7: AI Coach (Interactive Workspace & Chatbot)
// -----------------------------------------------------------------------------
function renderCoach() {
  $('#view').innerHTML = `
    <div class="content">
      <div class="overview-header">
        <div>
          <h1 class="overview-title">AI Coach Workspace</h1>
          <p class="overview-sub">Interactive coaching, response structuring, and real-time behavioral critique.</p>
        </div>
        <div class="pill-badge wash-green">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style="margin-right: 6px;"><circle cx="4" cy="4" r="4"/></svg>
          Gemini 2.5 Flash active
        </div>
      </div>

      <div class="practice-layout">
        <!-- Left: Interactive Chatbot Console -->
        <div class="card-white" style="display: flex; flex-direction: column; height: 680px; justify-content: space-between; padding: 22px;">
          <div style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
            <div class="card-header-row" style="border-bottom: 1px solid var(--color-border); padding-bottom: 14px; margin-bottom: 12px; flex-shrink: 0;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="metric-icon-tile yellow" style="width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  ${rIcon("magicWand", 20)}
                </div>
                <div>
                  <h3 class="card-title" style="font-size: 18px;">AI Design Mentor</h3>
                  <p class="card-sub">Real-time interview preparation powered by Gemini 2.5 Flash</p>
                </div>
              </div>
              <div>
                <button class="btn-control-outline" id="btnClearCoachChat" type="button" style="font-size: 12px; padding: 6px 12px; height: 32px;" title="Reset conversation">
                  <span>Restart chat</span>
                </button>
              </div>
            </div>

            <!-- Scrollable Chatbot Thread Box -->
            <div class="chat-thread-box" id="coachThread" style="flex: 1; min-height: 0; margin-bottom: 14px;"></div>

            <!-- Bottom Input Bar -->
            <div style="flex-shrink: 0; padding-top: 8px;">
              <div class="ai-input-bar">
                <input type="text" id="coachPageInput" placeholder="Ask your coach anything about UI/UX interviews, frameworks, or feedback…" autocomplete="off" />
                <button class="btn-ai-send" id="btnCoachPageSend" type="button" aria-label="Send message">
                  ${rIcon("arrowUp", 16)}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Coaching Drills & Evaluation Matrix -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="card-lavender">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--color-ink); margin: 0 0 6px;">Quick Coaching Drills</h3>
            <p style="font-size: 13px; color: var(--color-plum); line-height: 1.4; margin-bottom: 14px;">Select any prompt scenario below to test your framework:</p>
            
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

          <div class="card-white">
            <h3 class="card-title" style="font-size: 16px; margin-bottom: 6px;">Evaluation Dimensions</h3>
            <p class="card-sub" style="margin-bottom: 14px;">Heuristic criteria evaluated during practice</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-border); font-size: 13px;">
                <span style="font-weight: 600;">Structure</span>
                <span class="pill-badge wash-plum" style="font-size: 11px;">STAR Framework</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-border); font-size: 13px;">
                <span style="font-weight: 600;">Research Depth</span>
                <span class="pill-badge wash-green" style="font-size: 11px;">Telemetry & Hypotheses</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-border); font-size: 13px;">
                <span style="font-weight: 600;">Empathy</span>
                <span class="pill-badge wash-plum" style="font-size: 11px;">WCAG Accessibility</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px;">
                <span style="font-weight: 600;">Impact</span>
                <span class="pill-badge wash-green" style="font-size: 11px;">Quantifiable Metrics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render initial chat thread
  renderCoachChatThread();

  // Restart chat button
  $('#btnClearCoachChat')?.addEventListener('click', () => {
    S.coachMessages = [
      {
        sender: 'coach',
        text: "Conversation reset! How can I help you prepare for your next design interview today?",
        suggestions: ["How do I structure a STAR response?", "Tell me about yourself", "Explaining UX trade-offs"],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    renderCoachChatThread();
    toast("AI Coach conversation reset");
  });

  // Drill buttons
  document.querySelectorAll('[data-action="coach-chip"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = btn.dataset.msg;
      if (msg) sendCoachMessage(msg);
    });
  });

  // Input & send handling
  const input = $('#coachPageInput');
  const sendBtn = $('#btnCoachPageSend');

  sendBtn?.addEventListener('click', () => {
    const msg = input ? input.value.trim() : '';
    if (msg) {
      input.value = '';
      sendCoachMessage(msg);
    }
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const msg = e.target.value.trim();
      if (msg) {
        e.target.value = '';
        sendCoachMessage(msg);
      }
    }
  });
}

function renderCoachChatThread() {
  const container = $('#coachThread');
  if (!container) return;

  let html = '';
  (S.coachMessages || []).forEach(msg => {
    if (msg.sender === 'user') {
      html += `
        <div class="chat-msg-row user">
          <div class="chat-bubble-user">
            <div class="chat-bubble-meta">${esc(msg.time || '')}</div>
            <div class="chat-user-text">${esc(msg.text)}</div>
          </div>
          <div class="chat-avatar user">U</div>
        </div>
      `;
    } else {
      let suggestionsHtml = '';
      if (Array.isArray(msg.suggestions) && msg.suggestions.length > 0) {
        suggestionsHtml = `
          <div class="chat-suggestions-row">
            ${msg.suggestions.map(s => `
              <button class="chat-suggestion-chip" type="button" data-action="coach-suggestion" data-msg="${esc(s)}">
              ${rIcon("magicWand", 12)}
              <span>${esc(s)}</span>
              </button>
            `).join('')}
          </div>
        `;
      }

      html += `
        <div class="chat-msg-row coach">
          <div class="chat-avatar coach">${rIcon("magicWand", 18)}</div>
          <div class="chat-bubble-coach">
            <div class="chat-bubble-header">
              <span class="chat-sender-name">AI Design Mentor</span>
              <span class="chat-time-tag">${esc(msg.time || '')}</span>
            </div>
            <div class="chat-bubble-content">${formatMarkdown(msg.text)}</div>
            ${suggestionsHtml}
          </div>
        </div>
      `;
    }
  });

  if (S.coachTyping) {
    html += `
      <div class="chat-msg-row coach">
        <div class="chat-avatar coach">${rIcon("magicWand", 18)}</div>
        <div class="chat-bubble-coach typing">
          <div class="chat-bubble-header">
            <span class="chat-sender-name">AI Design Mentor</span>
            <span class="chat-time-tag">Thinking…</span>
          </div>
          <div class="chat-typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 10);

  // Bind suggestion chips
  container.querySelectorAll('[data-action="coach-suggestion"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const msg = btn.dataset.msg;
      if (msg) sendCoachMessage(msg);
    });
  });
}

async function sendCoachMessage(query) {
  if (!query || !query.trim()) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!S.coachMessages) S.coachMessages = [];
  S.coachMessages.push({
    sender: 'user',
    text: query.trim(),
    time: timeStr
  });
  S.coachTyping = true;
  renderCoachChatThread();

  const sendBtn = $('#btnCoachPageSend');
  const input = $('#coachPageInput');
  if (sendBtn) sendBtn.style.opacity = '0.5';

  try {
    const res = await api('/coach/ask', { method: 'POST', body: { message: query.trim() } });
    const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    S.coachMessages.push({
      sender: 'coach',
      text: res.reply || "I've analyzed your question, but received an empty response.",
      suggestions: Array.isArray(res.suggestions) ? res.suggestions : [],
      time: replyTime
    });
    S.lastCoachQuery = query;
    S.lastCoachReply = res.reply;
  } catch (err) {
    const errTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    S.coachMessages.push({
      sender: 'coach',
      text: `**Connection Error**: ${err.message}. Please verify the backend is active.`,
      suggestions: ["How do I structure a STAR response?", "Tell me about yourself"],
      time: errTime
    });
  } finally {
    S.coachTyping = false;
    if (sendBtn) sendBtn.style.opacity = '1';
    renderCoachChatThread();
    if (input) input.focus();
  }
}

// -----------------------------------------------------------------------------
// View 8: Settings (Preferences, Theme, Voice, Localization, Permissions)
// -----------------------------------------------------------------------------
function renderSettings() {
  if (!S.settings) loadSettings();
  const st = S.settings;
  const isHi = st.language === 'hi';

  $('#view').innerHTML = `
    <div class="content">
      <div class="overview-header">
        <div>
          <h1 class="overview-title">Settings &amp; Workspace Preferences</h1>
          <p class="overview-sub">Configure display themes, dynamic font scaling, local hardware permissions, language, and AI voice.</p>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn-control-outline" id="btnResetSettings" type="button" style="height: 36px; font-size: 12px;">
            ${rIcon("reset", 14)}
            <span>Reset to Default</span>
          </button>
        </div>
      </div>

      <div class="settings-grid">
        <!-- 1. Day / Night Theme & Display Settings -->
        <div class="card-white settings-card">
          <div>
            <div class="card-header-row" style="margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="metric-icon-tile yellow" style="width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  ${rIcon("sun", 20)}
                </div>
                <div>
                  <h3 class="card-title" style="font-size: 17px;">Day &amp; Night Theme</h3>
                  <p class="card-sub">Select workspace color mode</p>
                </div>
              </div>
            </div>

            <!-- Theme Options Grid -->
            <div class="theme-options-grid" id="themeSelector">
              <div class="theme-option-box ${st.theme === 'light' ? 'active' : ''}" data-theme-val="light">
                <span class="theme-option-icon">${rIcon("sun", 22)}</span>
                <span class="theme-option-label">Day (Light)</span>
              </div>
              <div class="theme-option-box ${st.theme === 'dark' ? 'active' : ''}" data-theme-val="dark">
                <span class="theme-option-icon">${rIcon("moon", 22)}</span>
                <span class="theme-option-label">Night (Dark)</span>
              </div>
              <div class="theme-option-box ${st.theme === 'auto' ? 'active' : ''}" data-theme-val="auto">
                <span class="theme-option-icon">${rIcon("half", 22)}</span>
                <span class="theme-option-label">Auto (OS Sync)</span>
              </div>
            </div>

            <div style="border-top: 1px solid var(--color-border); margin: 18px 0;"></div>

            <!-- Display Density -->
            <div class="settings-control-row">
              <div>
                <div class="setting-item-name">Interface Spacing</div>
                <div class="setting-item-desc">Adjust padding and layout spacing</div>
              </div>
              <div class="segmented-control-mini" id="densitySelector">
                <button class="seg-btn-mini ${st.density === 'comfortable' ? 'active' : ''}" type="button" data-density="comfortable">Comfortable</button>
                <button class="seg-btn-mini ${st.density === 'compact' ? 'active' : ''}" type="button" data-density="compact">Compact</button>
              </div>
            </div>

            <!-- High Contrast -->
            <div class="settings-control-row">
              <div>
                <div class="setting-item-name">High Contrast Mode</div>
                <div class="setting-item-desc">Enhances text clarity and element borders</div>
              </div>
              <label class="switch-toggle">
                <input type="checkbox" id="toggleHighContrast" ${st.highContrast ? 'checked' : ''}>
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- 2. Typography & Font Size -->
        <div class="card-white settings-card">
          <div>
            <div class="card-header-row" style="margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="metric-icon-tile lavender" style="width: 40px; height: 40px; border-radius: 12px; background: var(--color-lav); color: var(--color-plum); display: flex; align-items: center; justify-content: center;">
                  ${rIcon("fontSize", 20)}
                </div>
                <div>
                  <h3 class="card-title" style="font-size: 17px;">Typography &amp; Font Size</h3>
                  <p class="card-sub">Dynamic font scaling across the application</p>
                </div>
              </div>
            </div>

            <!-- Font size options -->
            <div class="font-size-options-grid" id="fontSizeSelector">
              <div class="font-size-option-card ${st.fontSize === 'small' ? 'active' : ''}" data-font-val="small">
                <span style="display: flex; align-items: center; justify-content: center; height: 26px;">${rIcon("letterCase", 16)}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--color-plum);">Small (13px)</span>
              </div>
              <div class="font-size-option-card ${st.fontSize === 'medium' ? 'active' : ''}" data-font-val="medium">
                <span style="display: flex; align-items: center; justify-content: center; height: 26px;">${rIcon("letterCase", 20)}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--color-plum);">Medium (Default)</span>
              </div>
              <div class="font-size-option-card ${st.fontSize === 'large' ? 'active' : ''}" data-font-val="large">
                <span style="display: flex; align-items: center; justify-content: center; height: 26px;">${rIcon("letterCase", 24)}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--color-plum);">Large (17px)</span>
              </div>
            </div>

            <!-- Dynamic Live Preview -->
            <div class="font-preview-box">
              <div style="font-size: 14px; font-weight: 700; color: var(--color-ink); margin-bottom: 4px;">Live Typography Preview</div>
              <p style="font-size: 13px; color: var(--color-muted); line-height: 1.5;">
                "Walk through your end-to-end design process when solving complex ambiguous workflows."
              </p>
            </div>
          </div>
        </div>

        <!-- 3. Language & Localization (Hindi / English) -->
        <div class="card-white settings-card">
          <div>
            <div class="card-header-row" style="margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="metric-icon-tile mint" style="width: 40px; height: 40px; border-radius: 12px; background: #e4f6ed; color: #1e664e; display: flex; align-items: center; justify-content: center;">
                  ${rIcon("globe", 20)}
                </div>
                <div>
                  <h3 class="card-title" style="font-size: 17px;">Language &amp; Localization</h3>
                  <p class="card-sub">Choose application &amp; voice language</p>
                </div>
              </div>
            </div>

            <div class="lang-cards-grid" id="langSelector">
              <div class="lang-card ${st.language === 'en' ? 'active' : ''}" data-lang="en">
                <div style="margin-bottom: 6px; display: flex; align-items: center; justify-content: center; color: var(--color-plum);">${rIcon("globe", 26)}</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--color-ink);">English</div>
                <div style="font-size: 11px; color: var(--color-muted); margin-top: 3px;">Standard English questions &amp; critique</div>
              </div>
              <div class="lang-card ${st.language === 'hi' ? 'active' : ''}" data-lang="hi">
                <div style="margin-bottom: 6px; display: flex; align-items: center; justify-content: center; color: var(--color-plum);">${rIcon("globe", 26)}</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--color-ink);">हिंदी (Hindi)</div>
                <div style="font-size: 11px; color: var(--color-muted); margin-top: 3px;">द्विभाषी साक्षात्कार अभ्यास एवं सुझाव</div>
              </div>
            </div>

            <div style="margin-top: 14px; background: var(--color-wash); border-radius: 12px; padding: 12px 14px; font-size: 12px; color: var(--color-muted); line-height: 1.5; border: 1px solid var(--color-border);" id="langExplainText">
              ${isHi ? 'हिंदी का चयन किया गया है। एआई कोच आपको हिंदी और हिंग्लिश में सहायता प्रदान करेगा तथा वॉयस रिकॉग्निशन हिंदी इनपुट को स्वीकार करेगा।' : 'English is selected. Spoken answers and AI Coach feedback will operate in standard international English.'}
            </div>
          </div>
        </div>

        <!-- 4. AI Voice & Speech Synthesis -->
        <div class="card-white settings-card">
          <div>
            <div class="card-header-row" style="margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="metric-icon-tile yellow" style="width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                  ${rIcon("speaker", 20)}
                </div>
                <div>
                  <h3 class="card-title" style="font-size: 17px;">AI Interviewer Voice</h3>
                  <p class="card-sub">Text-to-speech engine and audio playback</p>
                </div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="font-size: 12px; font-weight: 700; color: var(--color-ink); display: block; margin-bottom: 6px;">Select Voice Profile</label>
                <select id="aiVoiceSelect" class="settings-select-custom"></select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 6px;">
                    <span>Speaking Speed</span>
                    <span id="voiceSpeedVal">${st.voiceRate || 1.0}x</span>
                  </div>
                  <input type="range" id="voiceSpeedRange" min="0.75" max="1.35" step="0.05" value="${st.voiceRate || 1.0}" class="settings-range-slider" />
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 6px;">
                    <span>Voice Pitch</span>
                    <span id="voicePitchVal">${st.voicePitch || 1.0}</span>
                  </div>
                  <input type="range" id="voicePitchRange" min="0.8" max="1.2" step="0.05" value="${st.voicePitch || 1.0}" class="settings-range-slider" />
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--color-border);">
                <span style="font-size: 12px; color: var(--color-muted);">Listen to sample speech:</span>
                <button class="btn-hero-primary" id="btnTestVoice" type="button" style="height: 36px; padding: 0 16px; font-size: 12px;">
                  ${rIcon("play", 14)}
                  <span>Test AI Voice</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Local Hardware Permissions & Toggles -->
        <div class="card-white settings-card" style="grid-column: 1 / -1;">
          <div>
            <div class="card-header-row" style="margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="metric-icon-tile peach" style="width: 40px; height: 40px; border-radius: 12px; background: #ffebe3; color: #9c4221; display: flex; align-items: center; justify-content: center;">
                  ${rIcon("shield", 20)}
                </div>
                <div>
                  <h3 class="card-title" style="font-size: 17px;">Local Hardware &amp; Privacy Consents</h3>
                  <p class="card-sub">Per-session permissions for media processing and heuristic tracking</p>
                </div>
              </div>
              <button class="btn-control-outline" id="btnTestAllHardware" type="button" style="height: 34px; font-size: 12px;">
                <span>Test Devices Now</span>
              </button>
            </div>

            <div class="permissions-toggle-grid">
              <!-- Camera -->
              <div class="permission-item-box">
                <div class="permission-item-left">
                  <div class="perm-icon-bubble">${rIcon("camera", 18)}</div>
                  <div>
                    <div class="perm-title">Camera Stream</div>
                    <div class="perm-desc">Video frames used for in-session preview and local composite recording</div>
                  </div>
                </div>
                <label class="switch-toggle">
                  <input type="checkbox" id="permCamera" ${st.permissions.camera ? 'checked' : ''}>
                  <span class="switch-slider"></span>
                </label>
              </div>

              <!-- Microphone -->
              <div class="permission-item-box">
                <div class="permission-item-left">
                  <div class="perm-icon-bubble">${rIcon("speaker", 18)}</div>
                  <div>
                    <div class="perm-title">Microphone Audio</div>
                    <div class="perm-desc">Voice answer capture, real-time speech recognition, and audio meter</div>
                  </div>
                </div>
                <label class="switch-toggle">
                  <input type="checkbox" id="permMic" ${st.permissions.microphone ? 'checked' : ''}>
                  <span class="switch-slider"></span>
                </label>
              </div>

              <!-- Screen Share -->
              <div class="permission-item-box">
                <div class="permission-item-left">
                  <div class="perm-icon-bubble">${rIcon("desktop", 18)}</div>
                  <div>
                    <div class="perm-title">Screen Capture</div>
                    <div class="perm-desc">Browser desktop, application, or window sharing during design walkthroughs</div>
                  </div>
                </div>
                <label class="switch-toggle">
                  <input type="checkbox" id="permScreen" ${st.permissions.screen ? 'checked' : ''}>
                  <span class="switch-slider"></span>
                </label>
              </div>

              <!-- Face Tracking -->
              <div class="permission-item-box">
                <div class="permission-item-left">
                  <div class="perm-icon-bubble">${rIcon("eyeOpen", 18)}</div>
                  <div>
                    <div class="perm-title">On-Device Face Tracking</div>
                    <div class="perm-desc">Local MediaPipe face mesh presence and head orientation heuristics</div>
                  </div>
                </div>
                <label class="switch-toggle">
                  <input type="checkbox" id="permFace" ${st.permissions.face ? 'checked' : ''}>
                  <span class="switch-slider"></span>
                </label>
              </div>

              <!-- Secondary Mobile Camera -->
              <div class="permission-item-box">
                <div class="permission-item-left">
                  <div class="perm-icon-bubble">${rIcon("mobile", 18)}</div>
                  <div>
                    <div class="perm-title">Secondary Camera Pairing</div>
                    <div class="perm-desc">Mobile phone auxiliary WebRTC video pairing for side-angle view</div>
                  </div>
                </div>
                <label class="switch-toggle">
                  <input type="checkbox" id="permSecondary" ${st.permissions.secondary ? 'checked' : ''}>
                  <span class="switch-slider"></span>
                </label>
              </div>

              <!-- Adaptive Questioning -->
              <div class="permission-item-box">
                <div class="permission-item-left">
                  <div class="perm-icon-bubble">${rIcon("magicWand", 18)}</div>
                  <div>
                    <div class="perm-title">Gemini AI Adaptive Questions</div>
                    <div class="perm-desc">Generates dynamic follow-ups based on candidate response context</div>
                  </div>
                </div>
                <label class="switch-toggle">
                  <input type="checkbox" id="permAdaptive" ${S.setup.adaptive !== false ? 'checked' : ''}>
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. AI Model Configuration Status -->
        <div class="card-white settings-card" style="grid-column: 1 / -1;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="pill-badge wash-green" style="font-size: 11px;">ACTIVE BACKEND</span>
                <h3 class="card-title" style="font-size: 17px; margin: 0;">Artificial Intelligence Engine</h3>
              </div>
              <p class="card-sub" style="margin-top: 4px;">Gemini 2.5 Flash provides real-time question generation, behavioral critique, and diagnostic scoring.</p>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
              <span class="pill-badge wash-plum" style="font-size: 12px;">Model: gemini-2.5-flash</span>
              <span class="pill-badge wash-green" style="font-size: 12px;">Connected</span>
            </div>
          </div>
          <div style="margin-top: 14px; background: var(--color-wash); border-radius: 12px; padding: 10px 14px; font-size: 11px; color: var(--color-muted); border: 1px solid var(--color-border);">
            API keys and models are protected securely on the local Python server and never transmitted to the browser.
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Voice Selection Options
  populateVoiceSelect();

  // 1. Theme selection event handlers
  document.querySelectorAll('#themeSelector .theme-option-box').forEach(box => {
    box.addEventListener('click', () => {
      document.querySelectorAll('#themeSelector .theme-option-box').forEach(b => b.classList.remove('active'));
      box.classList.add('active');
      const val = box.dataset.themeVal;
      S.settings.theme = val;
      saveSettings();
      toast(`Theme set to ${val === 'dark' ? 'Night (Dark)' : val === 'light' ? 'Day (Light)' : 'Auto System'}`);
    });
  });

  // 2. Density selection event handlers
  document.querySelectorAll('#densitySelector .seg-btn-mini').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#densitySelector .seg-btn-mini').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.density;
      S.settings.density = val;
      saveSettings();
      toast(`Layout density set to ${val}`);
    });
  });

  // 3. High Contrast toggle
  $('#toggleHighContrast')?.addEventListener('change', e => {
    S.settings.highContrast = e.target.checked;
    saveSettings();
    toast(`High contrast ${e.target.checked ? 'enabled' : 'disabled'}`);
  });

  // 4. Font Size selection event handlers
  document.querySelectorAll('#fontSizeSelector .font-size-option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#fontSizeSelector .font-size-option-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const val = card.dataset.fontVal;
      S.settings.fontSize = val;
      saveSettings();
      toast(`Font size updated to ${val.charAt(0).toUpperCase() + val.slice(1)}`);
    });
  });

  // 5. Language selection event handlers
  document.querySelectorAll('#langSelector .lang-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#langSelector .lang-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const lang = card.dataset.lang;
      S.settings.language = lang;
      saveSettings();
      populateVoiceSelect();
      const explain = $('#langExplainText');
      if (explain) {
        explain.textContent = lang === 'hi'
          ? 'हिंदी का चयन किया गया है। एआई कोच आपको हिंदी और हिंग्लिश में सहायता प्रदान करेगा तथा वॉयस रिकॉग्निशन हिंदी इनपुट को स्वीकार करेगा।'
          : 'English is selected. Spoken answers and AI Coach feedback will operate in standard international English.';
      }
      toast(`Language changed to ${lang === 'hi' ? 'हिंदी (Hindi)' : 'English'}`);
    });
  });

  // 6. Voice Sliders & Test
  $('#voiceSpeedRange')?.addEventListener('input', e => {
    S.settings.voiceRate = parseFloat(e.target.value);
    $('#voiceSpeedVal').textContent = S.settings.voiceRate.toFixed(2) + 'x';
    saveSettings();
  });

  $('#voicePitchRange')?.addEventListener('input', e => {
    S.settings.voicePitch = parseFloat(e.target.value);
    $('#voicePitchVal').textContent = S.settings.voicePitch.toFixed(2);
    saveSettings();
  });

  $('#aiVoiceSelect')?.addEventListener('change', e => {
    S.settings.aiVoice = e.target.value;
    saveSettings();
  });

  $('#btnTestVoice')?.addEventListener('click', () => {
    testAiVoice();
  });

  // 7. Hardware Permissions Toggles
  $('#permCamera')?.addEventListener('change', e => {
    S.settings.permissions.camera = e.target.checked;
    S.setup.camera = e.target.checked;
    saveSettings();
    toast(`Camera access ${e.target.checked ? 'granted' : 'disabled'}`);
  });

  $('#permMic')?.addEventListener('change', e => {
    S.settings.permissions.microphone = e.target.checked;
    S.setup.microphone = e.target.checked;
    saveSettings();
    toast(`Microphone audio ${e.target.checked ? 'granted' : 'disabled'}`);
  });

  $('#permScreen')?.addEventListener('change', e => {
    S.settings.permissions.screen = e.target.checked;
    S.setup.screen = e.target.checked;
    saveSettings();
    toast(`Screen capture ${e.target.checked ? 'granted' : 'disabled'}`);
  });

  $('#permFace')?.addEventListener('change', e => {
    S.settings.permissions.face = e.target.checked;
    S.setup.face = e.target.checked;
    saveSettings();
    toast(`Face tracking ${e.target.checked ? 'enabled' : 'disabled'}`);
  });

  $('#permSecondary')?.addEventListener('change', e => {
    S.settings.permissions.secondary = e.target.checked;
    S.setup.secondary = e.target.checked;
    saveSettings();
    toast(`Secondary camera pairing ${e.target.checked ? 'enabled' : 'disabled'}`);
  });

  $('#permAdaptive')?.addEventListener('change', e => {
    S.setup.adaptive = e.target.checked;
    toast(`AI adaptive question generation ${e.target.checked ? 'enabled' : 'disabled'}`);
  });

  // Test Devices Now button
  $('#btnTestAllHardware')?.addEventListener('click', async () => {
    const btn = $('#btnTestAllHardware');
    busy(btn, true, 'Testing…');
    try {
      await checkDevices();
    } finally {
      busy(btn, false);
    }
  });

  // Reset settings
  $('#btnResetSettings')?.addEventListener('click', () => {
    if (confirm('Reset all preferences to default settings?')) {
      S.settings = {
        theme: 'light',
        density: 'comfortable',
        highContrast: false,
        fontSize: 'medium',
        language: 'en',
        aiVoice: '',
        voiceRate: 1.0,
        voicePitch: 1.0,
        permissions: {
          camera: true,
          microphone: true,
          screen: true,
          face: true,
          secondary: false
        }
      };
      saveSettings();
      renderSettings();
      toast('Preferences restored to defaults.');
    }
  });
}

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


// -----------------------------------------------------------------------------
// App Initialization & Global Event Listeners
// -----------------------------------------------------------------------------
async function initialize() {
  loadSettings();
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
  } else if (a === 'listen' || a === 'start-answering' || a === 'stop-answering') {
    if (S.answering) stopAnswering();
    else startListening();
  } else if (a === 'speak') {
    speakQuestion();
  } else if (a === 'pause') {
    togglePause();
  } else if (a === 'next' || a === 'next-question') {
    nextQuestion();
  } else if (a === 'finish' || a === 'finish-early') {
    if (confirm('Conclude and submit current answers for AI diagnostic report?')) finishInterview(true);
  } else if (a === 'checkin') {
    captureCheckin();
  } else if (a === 'fullscreen') {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  } else if (a === 'resume') {
    resumeDevices();
  } else if (a === 'second-webcam') {
    addSecondWebcam();
  } else if (a === 'invite-phone') {
    invitePhone();
  } else if (a === 'copy-invite') {
    if (S.inviteUrl) {
      navigator.clipboard.writeText(S.inviteUrl).then(() => toast('Invite link copied!'));
    }
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
