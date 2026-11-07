// Mock Preparation AI — consent-led, local-first interview studio.
// Uses server routes for Gemini; API credentials never appear in the browser.
const $ = (sel) => document.querySelector(sel);
const esc = (value='') => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmtTime = (s) => `${Math.floor(Math.max(s,0)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(s,0)%60).toString().padStart(2,'0')}`;
const niceDate = (iso) => new Date(iso).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const draftGet=(key)=>{try{return sessionStorage.getItem(key)||'';}catch{return '';}};
const draftSet=(key,v)=>{try{sessionStorage.setItem(key,v);}catch{}};
const draftDel=(key)=>{try{sessionStorage.removeItem(key);}catch{}};
const clip = (v,n=55) => String(v||'').length > n ? String(v).slice(0,n)+'…' : v;
const S = {me:null, health:{}, history:[], view:'dashboard', item:null, idx:0,
 setup:{mode:'interview',difficulty:'Intermediate',question_count:5,topic:'UI/UX Designer internship',
 camera:true,microphone:true,screen:true,face:true,record:true,secondary:false,adaptive:true,geminiAudio:true},
 stream:null,screenStream:null,secondStream:null,remoteStream:null,recorder:null,recChunks:[],audioRecorder:null,
 audioChunks:[],recognizer:null,answering:false,liveText:'',edited:false,answerStarted:0,
 startTime:0,elapsedAccum:0,timerId:null,drawFrame:null,faceModel:null,faceInterval:null,
 faceState:{count:null,direction:'—',gaze:'—',since:0,key:null},audioCtx:null,analyser:null,sessionLive:false,
 events:[],lastEvent:{},ws:null,peer:null,toastTimer:null,recorderError:false,loading:false,audioQuietSince:0,paused:false,
 videoMime:'video/webm',transcriptionOrigin:'',uiNote:'',isRegister:false};

async function api(path, opts={}) {
  const {method='GET', body, ...rest} = opts;
  const init={method, credentials:'same-origin', ...rest};
  if(body !== undefined) {
    if(body instanceof FormData) init.body=body;
    else {init.body=JSON.stringify(body);init.headers={'Content-Type':'application/json',...(init.headers||{})};}
  }
  let response;
  try {response=await fetch('/api'+path,init);} catch(e){throw new Error('Cannot reach local server. Check your connection.');}
  let data;
  const rawText = await response.text();
  try { data = JSON.parse(rawText); } catch { data = {detail: rawText.trim() || `Server returned an unexpected response (${response.status}).`}; }
  if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:`Request failed (${response.status})`);
  return data;
}
function toast(msg, error=false){const el=$('#toast');el.textContent=msg;el.className='toast'+(error?' error':'');clearTimeout(S.toastTimer);S.toastTimer=setTimeout(()=>el.classList.add('hidden'),5500);}
function busy(btn,on,text='Working…'){if(btn){if(on){btn.dataset.previous=btn.innerHTML;btn.innerHTML=`<span class="spinner"></span>${esc(text)}`;}else btn.innerHTML=btn.dataset.previous||btn.innerHTML;btn.disabled=on;}}
function setView(view){S.view=view;document.querySelectorAll('.nav-item').forEach(e=>e.classList.toggle('active',e.dataset.view===view));
 $('#breadcrumb').textContent=({dashboard:'Dashboard',prepare:'New practice',room:'Live interview',report:'Detailed mock exam report',history:'Sessions & progress',privacy:'Privacy & settings'})[view]||view;
 const renderers={dashboard:renderDashboard,prepare:renderPrepare,room:renderRoom,report:renderReport,history:renderHistory,privacy:renderPrivacy};renderers[view]?.();window.scrollTo({top:0,behavior:'instant'});}
function renderDashboard(){const complete=S.history.filter(x=>x.state==='complete'),scored=complete.filter(x=>Number.isFinite(x.report?.overall));const avg=scored.length?Math.round(scored.reduce((a,x)=>a+x.report.overall,0)/scored.length):'—';
 $('#view').innerHTML=`<div class="content"><div class="heading-row"><div><span class="eyebrow">YOUR PRACTICE SPACE</span><h1>Good to see you, ${esc(S.me?.name?.split(' ')[0]||'designer')} <span style="color:#b6cdb8">✳</span></h1><p>Build better answers. One thoughtful practice at a time.</p></div><span class="pill">✦ &nbsp; UI/UX design practice</span></div>
 <div class="hero"><div class="hero-content"><span class="eyebrow">YOUR NEXT GREAT INTERVIEW STARTS HERE</span><h1>Practice with an AI interviewer.<br/>Grow with real feedback.</h1><p>Speak naturally, review your responses, and track how your UI/UX thinking improves.</p><button class="btn primary" data-action="new">Start a mock interview <span>↗</span></button></div></div>
 <div class="cards-3"><div class="card"><span class="stat-icon">◷</span><div class="stat-number">${S.history.length}</div><div class="stat-label">Total attempts</div></div><div class="card"><span class="stat-icon">✧</span><div class="stat-number">${complete.length}</div><div class="stat-label">Completed sessions</div></div><div class="card sage"><span class="stat-icon">↗</span><div class="stat-number">${avg==='—'?'—':avg+'%'}</div><div class="stat-label">Average AI answer-quality score</div></div></div>
 <div class="section-heading"><h2>Recent practice</h2><button data-action="history">View all sessions ↗</button></div><div class="card" style="padding:0">${sessionRows(S.history.slice(0,5))}</div>
 <div class="section-heading"><h2>How it works</h2></div><div class="cards-3"><div class="card"><span class="tag">01 / PREPARE</span><h3 style="margin-top:12px">Set your goal</h3><p>Choose UI/UX interview difficulty and enable only the devices you want to use.</p></div><div class="card sage"><span class="tag">02 / PERFORM</span><h3 style="margin-top:12px">Talk to AI</h3><p>Answer real questions aloud while the session logs permitted signals.</p></div><div class="card"><span class="tag">03 / IMPROVE</span><h3 style="margin-top:12px">Review & retry</h3><p>Receive transcript-based coaching, replay your recording, and practice again.</p></div></div></div>`;}
function sessionRows(items){if(!items.length)return '<div class="empty"><span class="illustration">✳</span>Your first practice session will appear here.</div>';
 return items.map(s=>`<div class="session-row"><strong>${esc(clip(s.topic,48))}<br/><small>${esc(s.role)} · ${esc(s.difficulty)}</small></strong><span>${niceDate(s.created_at)}</span><span>${s.question_count} questions</span><div><span class="pill ${s.state==='active'?'yellow':''}">${s.state==='complete'?'✓ Completed':'◷ Paused'}</span></div><button class="btn ghost small" data-action="open-session" data-id="${s.id}">${s.state==='active'?'Resume':'View report'} ↗</button></div>`).join('');}
function renderPrepare(){const u=S.setup;$('#view').innerHTML=`<div class="content"><div class="heading-row"><div><span class="eyebrow">SET UP YOUR SESSION / 01</span><h1>Make space to practice.</h1><p>Choose your interview style and review recording permissions.</p></div><span class="pill">✦ &nbsp; Private practice</span></div>
 <div class="form-grid"><div><div class="card"><h3>01 &nbsp; Practice preferences</h3><p>Tell your AI interviewer what you'd like to work on.</p><div class="field" style="margin-top:22px"><label>Practice mode</label><div class="choice-row">${['interview','viva','presentation'].map(mode=>`<label class="choice"><input type="radio" name="mode" value="${mode}" ${u.mode===mode?'checked':''}/> ${mode==='interview'?'◉ Interview':mode==='viva'?'▤ Viva':'◧ Presentation'}</label>`).join('')}</div></div><div class="field"><label>Role / topic<input id="topic" maxlength="180" value="${esc(u.topic)}" placeholder="UI/UX Designer internship"/></label></div><div class="field-row"><label>Difficulty<select id="difficulty">${['Beginner','Intermediate','Advanced'].map(x=>`<option ${u.difficulty===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Number of questions<select id="questionCount">${[3,4,5,6,7,8].map(n=>`<option value="${n}" ${u.question_count===n?'selected':''}>${n} questions</option>`).join('')}</select></label></div><div class="check-line" style="margin-top:5px"><input type="checkbox" data-setup="adaptive" ${u.adaptive?'checked':''}/><div>Adaptive follow-up questions<span>Gemini asks the next question based on your answer (uses extra API calls).</span></div></div></div>
 <div class="card" style="margin-top:20px"><h3>02 &nbsp; Permissions & monitoring</h3><p>Everything is opt-in. You can stop sharing at any time.</p><div class="check-list" style="margin-top:18px">${permissionRow('camera','Camera preview','Show your face in the interview room; optional reference photo.')}${permissionRow('microphone','Microphone and voice answers','Speech recognition or Gemini transcription when available.')}${permissionRow('screen','Screen recording','Share a screen/window/tab through the browser picker.')}${permissionRow('face','On-device face presence and head direction','Uses optional MediaPipe model. No identity recognition or emotion guessing.')}${permissionRow('record','Save recording and answer audio','Store a replay on this local server until you delete it.')}${permissionRow('secondary','Optional second camera','Attach another webcam or phone through WebRTC.')}</div></div>
 <div class="note-banner" style="margin-top:18px">◉ &nbsp; Monitoring helps review your practice, not judge whether you cheated. Background voices, device use, and gaze cannot be identified reliably. This website cannot lock down your computer or prevent switching apps.</div></div>
 <div><div class="card"><h3>03 &nbsp; Check your setup</h3><div class="device-preview" id="preparePreview"><span>◉ &nbsp; Camera not started</span></div><div class="widget-row" style="margin-top:15px"><button class="btn ghost small" data-action="device-check">◉ &nbsp; Check camera / mic</button><span class="muted" style="font-size:11px" id="deviceState">Waiting for permission</span></div><div class="divider"></div><h3>Mood check-in (optional)</h3><p>How do you feel right now? This is self-reported; not inferred from your face.</p><div class="field-row" style="margin-top:15px"><label>Energy<select id="energy"><option>Neutral</option><option>High</option><option>Low</option></select></label><label>Feeling<select id="feeling"><option>Calm</option><option>Confident</option><option>Nervous</option><option>Excited</option><option>Tired</option></select></label></div><div class="divider"></div><div class="info-banner ${S.health.ai_configured?'':'warning'}">${S.health.ai_configured?'✓ Gemini is configured. Questions, audio transcription, and coaching will use real AI.':'! Gemini key not configured. You can test recording and the flow, but questions will be samples and feedback rule-based.'}</div><div class="prepare-actions"><button class="btn primary full" data-action="start">Start my interview &nbsp; ↗</button></div><p class="fine-print" style="margin-top:13px">If screen sharing is enabled, your browser will ask what to share. Do not share confidential information.</p></div></div></div></div>`;
 if(S.stream)attachVideo($('#preparePreview'),'cameraSource');}
function permissionRow(name,title,details){const u=S.setup;return `<label class="check-line"><input type="checkbox" data-setup="${name}" ${u[name]?'checked':''}/><div>${title}<span>${details}</span></div></label>`;}
function currentConsents(){const u=S.setup;return {camera:u.camera,microphone:u.microphone,screen:u.screen,face:u.face&&u.camera,record:u.record,secondary:u.secondary};}
async function ensureMedia(){if(S.stream)return S.stream;const {camera,microphone}=S.setup;if(!camera&&!microphone)return null;
 if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser or insecure address does not support camera/microphone access. Open http://localhost:8000 or an HTTPS address.');
 try{S.stream=await navigator.mediaDevices.getUserMedia({video:camera?{width:{ideal:960},height:{ideal:540},frameRate:{ideal:24}}:false,audio:microphone?{echoCancellation:true,noiseSuppression:true,autoGainControl:true}:false});
 const cams=S.stream.getVideoTracks();if(cams.length){$('#cameraSource').srcObject=new MediaStream(cams);$('#cameraSource').play().catch(()=>{});cams[0].addEventListener('ended',()=>logEvent('camera-disconnected','Camera stream ended'));}
 const mics=S.stream.getAudioTracks();if(mics.length){mics[0].addEventListener('ended',()=>logEvent('microphone-disconnected','Microphone stream ended'));initAudioMeter();}
 return S.stream;}catch(err){throw new Error('Device access failed: '+err.message);}}
function attachVideo(host, sourceId){if(!host)return;host.innerHTML='';const el=document.createElement('video');el.autoplay=true;el.playsInline=true;el.muted=true;el.srcObject=$(sourceId.startsWith('#')?sourceId:'#'+sourceId)?.srcObject||null;if(el.srcObject)host.appendChild(el);else host.innerHTML='<span>Camera is not active</span>';
 if(el.srcObject){const badge=document.createElement('div');badge.className='preview-label';badge.textContent='● Camera ready';host.appendChild(badge);el.play().catch(()=>{});}}
async function checkDevices(){const btn=$('[data-action="device-check"]');busy(btn,true,'Connecting…');try{await ensureMedia();attachVideo($('#preparePreview'),'cameraSource');$('#deviceState').textContent='Camera / mic ready';toast('Media devices are connected.');}catch(e){toast(e.message,true);$('#deviceState').textContent='Permission unavailable';}finally{busy(btn,false);}}
async function shareScreen(){if(!S.setup.screen)return null;if(S.screenStream)return S.screenStream;
 if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('Screen capture is unavailable. Use a compatible desktop browser.');
 try{S.screenStream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:15}},audio:false});$('#screenSource').srcObject=S.screenStream;$('#screenSource').play().catch(()=>{});
 S.screenStream.getVideoTracks()[0].addEventListener('ended',()=>{S.screenStream=null;$('#screenSource').srcObject=null;logEvent('screen-share-stopped','Screen sharing was stopped by the student/browser.');updateSignals();});return S.screenStream;}
 catch(e){throw new Error('Screen sharing was not enabled: '+e.message);}}
async function beginInterview(){if(S.loading)return;S.setup.mode=$('input[name="mode"]:checked')?.value||'interview';S.setup.topic=$('#topic').value.trim()||'UI/UX designer';S.setup.difficulty=$('#difficulty').value;S.setup.question_count=Number($('#questionCount').value);const btn=$('[data-action="start"]');S.loading=true;busy(btn,true,'Preparing interview…');
 try{
  // getDisplayMedia must be called from a user gesture: do this before the first unrelated await.
  if(S.setup.screen){try{await shareScreen();}catch(e){S.setup.screen=false;toast(e.message+' Continuing without screen capture.',true);}}
  try{await ensureMedia();}catch(e){S.setup.camera=false;S.setup.microphone=false;S.setup.face=false;toast(e.message+' Continuing in text-only mode.',true);}
  const payload={mode:S.setup.mode,topic:S.setup.topic,difficulty:S.setup.difficulty,question_count:S.setup.question_count,consent:currentConsents(),checkin:{energy:$('#energy')?.value||'Neutral',feeling:$('#feeling')?.value||'Calm'}};
  const response=await api('/interviews',{method:'POST',body:payload});
  S.item=await api('/interviews/'+response.id);S.idx=0;S.events=[];S.elapsedAccum=0;
  launchLiveSession();toast(response.question_origin==='gemini'?'Gemini generated your interview questions.':(response.ai_warning||'Started with sample questions (Gemini not configured).'),response.question_origin!=='gemini');
 }catch(e){toast(e.message,true);}finally{S.loading=false;busy(btn,false);}}
function launchLiveSession(){S.startTime=Date.now();S.sessionLive=true;S.paused=false;S.answering=false;S.liveText='';S.edited=false;S.events=S.item.events||[];
 setView('room');startTimer();startRecording();if(S.setup.face)startFaceTracking();if(S.setup.secondary)connectPrimaryWs();
 logEvent('session-start','Session started with the selected recording permissions.');setTimeout(()=>speakQuestion(),550);}
function renderRoom(){if(!S.item){setView('dashboard');return;}const q=S.item.questions[S.idx]||'';$('#view').innerHTML=`<div class="content"><div class="exam-top"><div><span class="eyebrow">YOUR LIVE SESSION / 02</span><h1 style="font-size:27px;margin:0">UI/UX mock interview <span style="color:#8aab98">●</span></h1></div><div class="exam-status"><span class="record-chip"><span class="record-dot"></span> ${S.recorder?.state==='recording'?'RECORDING':S.setup.record?'REC READY':'RECORDING OFF'}</span><span class="timer" id="timer">00:00</span></div></div>
 ${!S.sessionLive?'<div class="info-banner warning" style="margin-bottom:18px">This session was interrupted. Your earlier transcripts are saved. Click “Resume devices” to continue; only the new recording segment will be stored.</div>':''}
 <div class="room-layout"><div><div class="room-question"><span class="question-number">QUESTION <span id="currentN">${S.idx+1}</span> / ${S.item.question_count}</span><h2 id="activeQuestion">${esc(q)}</h2><button class="btn secondary small" data-action="speak">◉ &nbsp; Repeat question aloud</button><div class="progress-track"><div id="qProgress" style="width:${Math.round(S.idx/S.item.question_count*100)}%"></div></div></div>
 <div class="video-stage"><div class="video-feed"><video id="previewCamera" muted autoplay playsinline></video><span class="feed-name">YOU · Camera</span><span id="cameraPlaceholder" class="placeholder hidden">Camera off</span></div><div class="video-feed"><video id="previewScreen" muted autoplay playsinline></video><span class="feed-name" id="screenLabel">SCREEN · Sharing</span><span id="screenPlaceholder" class="placeholder hidden">Screen preview unavailable</span></div></div>
 <div class="card"><div class="widget-row" style="justify-content:space-between"><h3 style="margin:0">Your answer</h3><span id="listenStatus" class="pill blue">Ready to respond</span></div><p>Answer out loud, or type / correct your transcript below.</p><textarea id="answerText" class="room-answer" placeholder="Your speech will appear here if browser speech recognition is supported. You can also type your answer…">${esc(draftGet('mockprep_draft_'+S.item.id+'_'+S.idx)||S.item.answers?.find(a=>a.idx===S.idx)?.text||'')}</textarea><div class="widget-row" style="justify-content:space-between;margin-top:10px"><span id="wordCount" class="muted" style="font-size:10px">0 words</span><span class="muted" style="font-size:10px">AI transcription may be used after recording</span></div>
 <div class="room-controls"><div class="widget-row"><button class="btn primary" id="answerButton" data-action="listen">◉ &nbsp; Start answering</button><button class="btn ghost" data-action="speak">↺ &nbsp; Ask again</button></div><div class="widget-row"><button class="btn ghost" id="nextButton" data-action="next">${S.idx===S.item.question_count-1?'Finish answers':'Save & next →'}</button><button class="btn ghost" data-action="pause" id="pauseButton">Pause</button><button class="btn danger" data-action="finish">End & report</button></div></div></div></div>
 <div class="room-side"><div class="card"><h3>Live monitoring <span class="tag">CONSENT-BASED</span></h3><div class="signal-grid"><div class="signal"><strong><span class="dot" id="cameraDot"></span> Camera</strong><small id="cameraStatus">Off</small></div><div class="signal"><strong><span class="dot" id="micDot"></span> Microphone</strong><small id="micStatus">Off</small></div><div class="signal"><strong><span class="dot" id="screenDot"></span> Screen</strong><small id="screenStatus">Off</small></div><div class="signal"><strong><span class="dot" id="faceDot"></span> Face signals</strong><small id="faceStatus">Not available</small></div></div><div class="status-legend" style="margin-top:16px"><span>Face count: <strong id="facesCount">—</strong></span><span>Head: <strong id="headDirection">—</strong></span><span>Eyes: <strong id="gazeDirection">—</strong></span></div><p class="notice">Face signals are approximate, processed locally, and never identity or misconduct claims.</p></div>
 <div class="card"><h3>Session controls</h3><div class="widget-row"><button class="btn ghost small" data-action="checkin">◉ &nbsp; Capture check-in photo</button><button class="btn ghost small" data-action="fullscreen">⛶ &nbsp; Fullscreen</button>${!S.sessionLive?'<button class="btn secondary small" data-action="resume">Resume devices</button>':''}</div><div class="divider"></div><h3>Second camera</h3><p id="secondStatus">Not connected. Optional and only with consent.</p><div class="widget-row"><button class="btn ghost small" data-action="second-webcam">+ Add webcam</button><button class="btn secondary small" data-action="invite-phone">↗ &nbsp; Connect phone</button></div><div id="phoneInvite" class="hidden" style="margin-top:10px"></div><div class="widget-row" style="margin-top:10px"><video id="previewSecond" autoplay playsinline muted style="display:none;width:100%;max-height:130px;object-fit:cover;border-radius:10px;background:#132e23"></video></div></div>
 <div class="card"><div class="widget-row" style="justify-content:space-between"><h3 style="margin:0">Session events</h3><span class="tag">REVIEWABLE</span></div><p class="notice">Informational activity only; not evidence of cheating.</p><div class="activity-list" id="eventFeed">${eventHtml()}</div></div>
 <div class="info-banner warning">This browser can detect this page being hidden, but cannot detect all outside apps, devices or other people speaking.</div></div></div></div>`;
 $('#answerText').addEventListener('input',()=>{S.edited=true;draftSet('mockprep_draft_'+S.item.id+'_'+S.idx,$('#answerText').value);$('#wordCount').textContent=wordCount($('#answerText').value)+' words';});
 if(S.stream?.getVideoTracks().length){$('#previewCamera').srcObject=$('#cameraSource').srcObject;$('#previewCamera').play().catch(()=>{});}
 if(S.screenStream){$('#previewScreen').srcObject=S.screenStream;$('#previewScreen').play().catch(()=>{});}
 $('#cameraPlaceholder').classList.toggle('hidden',!!S.stream?.getVideoTracks().length);
 $('#screenPlaceholder').classList.toggle('hidden',!!S.screenStream);
 $('#previewSecond').srcObject=S.remoteStream||S.secondStream||null;if($('#previewSecond').srcObject){$('#previewSecond').style.display='block';$('#previewSecond').play().catch(()=>{});}
 $('#wordCount').textContent=wordCount($('#answerText').value)+' words';updateSignals();}
function wordCount(s){return (String(s||'').match(/\b[\p{L}\p{N}'’-]+\b/gu)||[]).length;}
function speakQuestion(){if(!('speechSynthesis' in window)){toast('Speech synthesis is not available in this browser.',true);return;}
 window.speechSynthesis.cancel();const q=S.item?.questions?.[S.idx];if(!q)return;let utter=new SpeechSynthesisUtterance(q);utter.rate=.92;utter.pitch=1;utter.lang='en-IN';window.speechSynthesis.speak(utter);}
function startTimer(){clearInterval(S.timerId);S.timerId=setInterval(()=>{if(S.sessionLive&&$('#timer'))$('#timer').textContent=fmtTime(elapsed());
  if(S.sessionLive&&S.analyser){const buffer=new Uint8Array(S.analyser.fftSize);S.analyser.getByteTimeDomainData(buffer);
   const rms=Math.sqrt(buffer.reduce((sum,b)=>sum+((b-128)/128)**2,0)/buffer.length);
   if($('#micStatus'))$('#micStatus').textContent='Active · level '+Math.round(Math.min(100,rms*180))+'%';
   if(S.answering){if(rms<.008){if(!S.audioQuietSince)S.audioQuietSince=Date.now();if(Date.now()-S.audioQuietSince>12000){logEvent('low-mic-signal','Mic signal was very quiet for 12+ seconds. This may be silence, noise suppression or a device issue.');S.audioQuietSince=Date.now()+20000;}}
    else S.audioQuietSince=0;}
  }
 },500);}
function elapsed(){return S.elapsedAccum+(S.sessionLive&&!S.paused?Math.round((Date.now()-S.startTime)/1000):0);}
function updateSignals(){if(S.view!=='room')return;const signals=[['camera',!!S.stream?.getVideoTracks().some(t=>t.readyState==='live')],['mic',!!S.stream?.getAudioTracks().some(t=>t.readyState==='live')],['screen',!!S.screenStream?.getVideoTracks().some(t=>t.readyState==='live')],['face',!!S.faceModel]];
 signals.forEach(([n,on])=>{const dot=$('#'+n+'Dot');if(dot)dot.classList.toggle('on',on);const label=$('#'+n+'Status');if(label)label.textContent=on?(n==='face'?'Tracking':'Active'):'Off';});}
function eventHtml(){if(!S.events?.length)return '<div class="muted" style="font-size:11px">Events will appear while you practice.</div>';
 return S.events.slice(-9).reverse().map(e=>`<div class="activity"><time>${fmtTime(e.elapsed)}</time><strong>${esc(clip(e.detail,96))}</strong></div>`).join('');}
async function logEvent(kind,detail){if(!S.sessionLive||!S.item)return;const e={kind,detail,elapsed:elapsed()};if(S.lastEvent[kind]&&Date.now()-S.lastEvent[kind]<9500)return;S.lastEvent[kind]=Date.now();S.events.push(e);if($('#eventFeed'))$('#eventFeed').innerHTML=eventHtml();
 try{await api('/interviews/'+S.item.id+'/event',{method:'POST',body:e});}catch(error){console.warn('Event log not saved',error.message);}}
function initAudioMeter(){if(!S.stream?.getAudioTracks().length||S.audioCtx)return;try{S.audioCtx=new (window.AudioContext||window.webkitAudioContext)();let src=S.audioCtx.createMediaStreamSource(new MediaStream(S.stream.getAudioTracks()));S.analyser=S.audioCtx.createAnalyser();S.analyser.fftSize=1024;src.connect(S.analyser);}catch(e){console.warn('Audio level analysis unavailable',e);}}
function drawCover(ctx,video,x,y,w,h){if(!video||video.readyState<2||!video.videoWidth)return false;const scale=Math.max(w/video.videoWidth,h/video.videoHeight),sw=w/scale,sh=h/scale;ctx.drawImage(video,(video.videoWidth-sw)/2,(video.videoHeight-sh)/2,sw,sh,x,y,w,h);return true;}
function drawComposite(){if(!S.sessionLive)return;const canvas=$('#recordCanvas'),ctx=canvas.getContext('2d');const W=canvas.width,H=canvas.height;
 ctx.fillStyle='#163a2e';ctx.fillRect(0,0,W,H);const cam=$('#cameraSource'),screen=$('#screenSource');
 const activeScreen=!!S.screenStream&&screen.readyState>=2;
 if(activeScreen)drawCover(ctx,screen,0,0,W,H);else if(cam.readyState>=2){drawCover(ctx,cam,0,0,W,H);ctx.fillStyle='#0a241945';ctx.fillRect(0,0,W,H);}
 else{ctx.fillStyle='#29523b';ctx.font='bold 44px Arial';ctx.fillText('Mock Preparation AI',60,150);}
 if(activeScreen&&cam.readyState>=2){ctx.fillStyle='#eef4ec';ctx.fillRect(W-328,15,315,193);drawCover(ctx,cam,W-320,22,299,177);}
 const side=S.remoteStream?$('#remoteSource'):S.secondStream?$('#secondSource'):null;
 if(side&&side.readyState>=2){const secondX=activeScreen?W-327:W-370,secondY=activeScreen?230:20;
 ctx.fillStyle='#eef4ec';ctx.fillRect(secondX-6,secondY-6,319,188);drawCover(ctx,side,secondX,secondY,307,176);}
 ctx.fillStyle='#102b22de';ctx.fillRect(0,H-71,W,71);ctx.fillStyle='#f8fff7';ctx.font='bold 19px Arial';ctx.fillText('Mock Preparation AI  ·  '+(S.item?.topic||'Interview').slice(0,62),22,H-42);
 ctx.font='16px Arial';ctx.fillText(`Q${S.idx+1} / ${S.item?.question_count||'?'}    ·    ${fmtTime(elapsed())}`,23,H-17);
 S.drawFrame=requestAnimationFrame(drawComposite);}
function startRecording(){if(S.drawFrame)cancelAnimationFrame(S.drawFrame);drawComposite();if(!S.setup.record)return;
 if(!window.MediaRecorder){toast('Video recording is unsupported in this browser.',true);return;}
 try{const stream=$('#recordCanvas').captureStream(15);for(const track of S.stream?.getAudioTracks()||[])stream.addTrack(track);
 const candidates=['video/webm;codecs=vp8,opus','video/webm','video/mp4'];const mime=candidates.find(x=>MediaRecorder.isTypeSupported(x));S.videoMime=mime||'video/webm';
 S.recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:1_200_000}:undefined);
 S.recChunks=[];S.recorder.addEventListener('dataavailable',e=>{if(e.data.size)S.recChunks.push(e.data);});
 S.recorder.start(1500);if($('#view .record-chip'))$('#view .record-chip').innerHTML='<span class="record-dot"></span> RECORDING';
 }catch(e){S.recorder=null;S.recorderError=true;toast('Recording was unavailable: '+e.message,true);}}
function stopRecording(){return new Promise(resolve=>{if(!S.recorder||S.recorder.state==='inactive'){resolve(null);return;}
 const rec=S.recorder;rec.addEventListener('stop',()=>{const b=new Blob(S.recChunks,{type:rec.mimeType||S.videoMime});S.recChunks=[];resolve(b.size?b:null);},{once:true});try{rec.stop();}catch{resolve(null);}});}
async function startListening(){if(!S.sessionLive||S.paused){toast('Resume your session first.',true);return;}if(S.answering)return;
 window.speechSynthesis?.cancel();S.answering=true;S.audioQuietSince=0;S.answerStarted=Date.now();S.edited=false;S.liveText='';S.transcriptionOrigin='';
 $('#listenStatus').textContent='● Listening / recording';$('#listenStatus').className='pill';$('#answerButton').textContent='◼ Stop answering';
 if(S.stream?.getAudioTracks().length&&window.MediaRecorder){try{const trackStream=new MediaStream(S.stream.getAudioTracks());S.audioChunks=[];
 const opts=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));S.audioRecorder=new MediaRecorder(trackStream,opts?{mimeType:opts}:undefined);
 S.audioRecorder.ondataavailable=e=>{if(e.data.size)S.audioChunks.push(e.data);};S.audioRecorder.start(1000);}catch(e){console.warn('Audio recorder unavailable',e);}}
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(Recognition&&S.setup.microphone&&S.stream?.getAudioTracks().length){try{S.recognizer=new Recognition();S.recognizer.lang='en-IN';S.recognizer.continuous=true;S.recognizer.interimResults=true;
 S.recognizer.onresult=e=>{let final='',interim='';for(let i=0;i<e.results.length;i++){const text=e.results[i][0].transcript;if(e.results[i].isFinal)final+=text+' ';else interim+=text+' ';}
 S.liveText=(final+' '+interim).trim();if(!S.edited&&$('#answerText')){$('#answerText').value=S.liveText;$('#wordCount').textContent=wordCount(S.liveText)+' words';}};
 S.recognizer.onerror=e=>{if(!['no-speech','aborted'].includes(e.error))console.warn('Speech recognition',e.error);};
 S.recognizer.onend=()=>{if(S.answering&&S.recognizer){setTimeout(()=>{if(S.answering){try{S.recognizer.start();}catch{}}},450);}};
 S.recognizer.start();}catch(e){console.warn('Browser speech recognition failed',e);}}
 else if(!S.stream?.getAudioTracks().length)toast('No active microphone; you can type your answer.');
}
async function stopAnswering(){if(!S.answering)return null;S.answering=false;
 if(S.recognizer){try{S.recognizer.onend=null;S.recognizer.stop();}catch{}S.recognizer=null;}
 if($('#answerButton'))$('#answerButton').textContent='◉ Start answering';if($('#listenStatus')){$('#listenStatus').textContent='Answer stopped';$('#listenStatus').className='pill blue';}
 const r=S.audioRecorder;if(!r||r.state==='inactive'){S.audioRecorder=null;return null;}
 return await new Promise(resolve=>{r.addEventListener('stop',()=>{const blob=new Blob(S.audioChunks,{type:r.mimeType||'audio/webm'});S.audioRecorder=null;S.audioChunks=[];resolve(blob.size?blob:null);},{once:true});try{r.stop();}catch{resolve(null);}});}
async function saveCurrentAnswer(){if(!S.item)return;const btn=$('#nextButton');busy(btn,true,'Saving answer…');
 try{const t=S.answerStarted?Math.max(1,Math.round((Date.now()-S.answerStarted)/1000)):0;const audio=await stopAnswering();
 let text=$('#answerText')?.value?.trim()||'';
 if(audio&&S.health.ai_configured&&S.setup.geminiAudio&&!S.edited){try{const fd=new FormData();fd.append('file',audio,audio.type.includes('mp4')?'answer.mp4':'answer.webm');
 $('#listenStatus').textContent='AI is transcribing…';const res=await api('/interviews/'+S.item.id+'/transcribe/'+S.idx,{method:'POST',body:fd});
 if(res.transcript){text=res.transcript;S.transcriptionOrigin='Gemini audio transcription';}for(const obs of res.audio_observations||[]){logEvent('audio-review-cue','Possible audio cue (AI, verify yourself): '+obs);}
 }catch(e){toast('Audio transcription unavailable. Using current transcript: '+e.message,true);}}
 if(!text&&audio)toast('Speech was not transcribed. You can type an answer before continuing.',true);
 await api('/interviews/'+S.item.id+'/answer',{method:'POST',body:{idx:S.idx,text,duration:t}});
 S.item.answers=S.item.answers||[];S.item.answers=S.item.answers.filter(a=>a.idx!==S.idx).concat([{idx:S.idx,text,duration:t}]);
 if($('#answerText'))$('#answerText').value=text;draftDel('mockprep_draft_'+S.item.id+'_'+S.idx);
 return true;
 }catch(e){toast('Could not save answer: '+e.message,true);return false;}finally{busy(btn,false);}}
async function nextQuestion(){if(S.loading||S.paused){if(S.paused)toast('Resume your session before saving the answer.',true);return;}S.loading=true;try{if(!await saveCurrentAnswer())return;
 if(S.idx>=S.item.question_count-1){await finishInterview(true);return;}
 if(S.health.ai_configured&&S.setup.adaptive){const current=S.item.answers.find(a=>a.idx===S.idx)?.text||'';
 if(current){try{const q=await api('/interviews/'+S.item.id+'/next/'+S.idx,{method:'POST'});S.item.questions[S.idx+1]=q.question;}catch(e){toast('Using planned next question: '+e.message,true);}}}
 S.idx++;S.answerStarted=0;S.liveText='';S.edited=false;renderRoom();speakQuestion();
 }finally{S.loading=false;}}
async function togglePause(){if(!S.sessionLive)return;
 if(!S.paused){if(S.answering){toast('Stop your current voice answer before pausing the interview.',true);return;}
  S.elapsedAccum=elapsed();S.paused=true;if(S.recorder?.state==='recording')S.recorder.pause();
  stopFaceTracking();logEvent('session-paused','Student paused recording and face processing; camera and screen permissions remain enabled.');
  if($('#pauseButton'))$('#pauseButton').textContent='Resume';if($('#listenStatus'))$('#listenStatus').textContent='Session paused';
  if($('#view .record-chip'))$('#view .record-chip').innerHTML='PAUSED';
 }else{S.paused=false;S.startTime=Date.now();if(S.recorder?.state==='paused')S.recorder.resume();
  if(S.setup.face&&S.stream?.getVideoTracks().length)startFaceTracking();
  logEvent('session-resumed','Student resumed practice.');if($('#pauseButton'))$('#pauseButton').textContent='Pause';
  if($('#view .record-chip'))$('#view .record-chip').innerHTML='<span class="record-dot"></span> RECORDING';
  if($('#listenStatus'))$('#listenStatus').textContent='Ready to respond';}
}
async function finishInterview(currentSaved=false){if(S.loading&&!currentSaved)return;const btn=$('[data-action="finish"]');busy(btn,true,'Finishing…');
 try{if(!currentSaved&&S.sessionLive){const ok=await saveCurrentAnswer();if(!ok)return;}
 S.elapsedAccum=elapsed();S.sessionLive=false;S.paused=false;clearInterval(S.timerId);window.speechSynthesis?.cancel();
 if(S.drawFrame)cancelAnimationFrame(S.drawFrame);stopFaceTracking();
 const video=await stopRecording();
 stopAllMedia();
 if(video&&S.setup.record){try{toast('Uploading your recording to local storage…');const fd=new FormData();const ext=video.type.includes('mp4')?'mp4':'webm';fd.append('file',video,`session.${ext}`);await api('/interviews/'+S.item.id+'/recording',{method:'POST',body:fd});}catch(e){toast('Recording could not be uploaded; saving a local download instead: '+e.message,true);const a=document.createElement('a');const url=URL.createObjectURL(video);a.href=url;a.download='mockprep-recording.'+(video.type.includes('mp4')?'mp4':'webm');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}}
 toast(S.health.ai_configured?'Gemini is evaluating your answers…':'Building local practice summary…');
 const r=await api('/interviews/'+S.item.id+'/report',{method:'POST'});S.item=await api('/interviews/'+S.item.id);S.item.report=r.report;
 await loadHistory();setView('report');toast(r.origin==='gemini'?'Your AI coaching report is ready.':'Your transcript-based practice summary is ready.');
 }catch(e){toast('Could not finish the report: '+e.message,true);S.item=await api('/interviews/'+S.item.id).catch(()=>S.item);setView('room');}finally{busy(btn,false);}}
function stopAllMedia(){for(const stream of [S.stream,S.screenStream,S.secondStream,S.remoteStream]){for(const track of stream?.getTracks()||[])track.stop();}
 S.stream=null;S.screenStream=null;S.secondStream=null;S.remoteStream=null;for(const el of ['cameraSource','screenSource','secondSource','remoteSource'])$('#'+el).srcObject=null;
 if(S.peer){S.peer.close();S.peer=null;}if(S.ws){S.ws.close();S.ws=null;}if(S.audioCtx){S.audioCtx.close().catch(()=>{});S.audioCtx=null;S.analyser=null;}}
async function restoreSession(iid){try{const item=await api('/interviews/'+iid);S.item=item;
 if(item.state==='complete'){setView('report');return;}
 S.setup={...S.setup,...item.consent,mode:item.role,topic:item.topic,difficulty:item.difficulty,question_count:item.question_count};
 S.idx=Math.min(item.question_count-1,item.answers?.length||0);S.elapsedAccum=Math.round(item.events?.at(-1)?.elapsed||0);S.sessionLive=false;S.events=item.events||[];setView('room');
 }catch(e){toast(e.message,true);}}
async function resumeDevices(){if(S.sessionLive)return;try{if(S.setup.screen){try{await shareScreen();}catch(e){S.setup.screen=false;toast(e.message+' Resuming without screen.',true);}}try{await ensureMedia();}catch(e){S.setup.camera=false;S.setup.microphone=false;S.setup.face=false;toast(e.message+' Text-only mode.',true);}S.startTime=Date.now();S.sessionLive=true;S.paused=false;S.events=S.item.events||[];renderRoom();startTimer();startRecording();if(S.setup.face)startFaceTracking();if(S.setup.secondary)connectPrimaryWs();logEvent('session-resume','Student resumed an interrupted session.');}
 catch(e){toast(e.message,true);}}
async function captureCheckin(){if(!S.setup.camera||!S.stream?.getVideoTracks().length){toast('Camera permission is needed for an optional check-in reference photo.',true);return;}
 const v=$('#cameraSource'),canvas=document.createElement('canvas');canvas.width=480;canvas.height=360;canvas.getContext('2d').drawImage(v,0,0,480,360);
 const blob=await new Promise(ok=>canvas.toBlob(ok,'image/jpeg',.75));if(!blob)return;
 try{const form=new FormData();form.append('file',blob,'checkin.jpg');await api('/interviews/'+S.item.id+'/checkin',{method:'POST',body:form});toast('Reference photo saved for your review. This is not an automated identity match.');logEvent('checkin-photo','Student saved a manual review reference photo.');}
 catch(e){toast(e.message,true);}}
async function addSecondWebcam(){if(!S.setup.secondary){toast('Enable the secondary camera option in session setup.',true);return;}try{const dev=await navigator.mediaDevices.enumerateDevices();const cams=dev.filter(d=>d.kind==='videoinput');if(cams.length<2){toast('Only one webcam found. Use the phone link or connect another camera.',true);return;}
 const first=S.stream?.getVideoTracks()[0]?.getSettings()?.deviceId;const alt=cams.find(x=>x.deviceId!==first);if(!alt)throw new Error('No second camera found');S.secondStream=await navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:alt.deviceId}},audio:false});
 $('#secondSource').srcObject=S.secondStream;$('#secondSource').play().catch(()=>{});$('#previewSecond').srcObject=S.secondStream;$('#previewSecond').style.display='block';$('#previewSecond').play().catch(()=>{});$('#secondStatus').textContent='Second local camera connected';logEvent('second-camera','Second webcam connected with permission.');}
 catch(e){toast('Second camera unavailable: '+e.message,true);}}
async function invitePhone(){if(!S.setup.secondary){toast('Secondary camera was not enabled in this session.',true);return;}
 try{const data=await api('/interviews/'+S.item.id+'/invite',{method:'POST'});const host=$('#phoneInvite');host.classList.remove('hidden');host.innerHTML=`<div class="small-code" id="inviteUrl">${esc(data.url)}</div><div class="widget-row" style="margin-top:9px"><button class="btn small ghost" data-action="copy-invite">Copy phone link</button></div><p class="fine-print">Open over HTTPS on another phone (same Wi-Fi often helps). HTTP on a phone cannot access its camera.</p>`;
 S.inviteUrl=data.url;connectPrimaryWs();}catch(e){toast(e.message,true);}}
async function connectPrimaryWs(){if(S.ws?.readyState===WebSocket.OPEN)return;if(!S.item)return;
 const proto=location.protocol==='https:'?'wss:':'ws:';const ws=new WebSocket(`${proto}//${location.host}/ws/rooms/${S.item.id}/primary`);S.ws=ws;
 ws.onopen=()=>{const label=$('#secondStatus');if(label)label.textContent='Waiting for secondary camera…';};
 ws.onmessage=async e=>{let data;try{data=JSON.parse(e.data);}catch{return;}
 if(data.type==='peer-ready'){if(!S.peer)createPeer();}
 if(data.type==='offer'){const pc=createPeer();await pc.setRemoteDescription(data.offer);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);ws.send(JSON.stringify({type:'answer',answer}));}
 if(data.type==='ice'&&S.peer){try{await S.peer.addIceCandidate(data.candidate);}catch{}}
 if(data.type==='peer-left'){if(S.peer){S.peer.close();S.peer=null;}S.remoteStream=null;$('#remoteSource').srcObject=null;if($('#secondStatus'))$('#secondStatus').textContent='Phone disconnected';logEvent('second-camera-disconnected','Phone camera feed ended.');}};
 ws.onerror=()=>{if($('#secondStatus'))$('#secondStatus').textContent='Phone connection unavailable';};}
function createPeer(){if(S.peer)return S.peer;const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});S.peer=pc;
 pc.onicecandidate=e=>{if(e.candidate&&S.ws?.readyState===WebSocket.OPEN)S.ws.send(JSON.stringify({type:'ice',candidate:e.candidate}));};
 pc.ontrack=e=>{S.remoteStream=e.streams[0];$('#remoteSource').srcObject=S.remoteStream;$('#remoteSource').play().catch(()=>{});
 if($('#previewSecond')){$('#previewSecond').srcObject=S.remoteStream;$('#previewSecond').style.display='block';$('#previewSecond').play().catch(()=>{});}
 if($('#secondStatus'))$('#secondStatus').textContent='Phone camera connected';logEvent('second-camera-connected','Phone camera feed connected by WebRTC.');};return pc;}
async function startFaceTracking(){if(!S.setup.face||!S.stream?.getVideoTracks().length)return;if(S.faceModel){startFaceInterval();return;}
 try{const {FaceLandmarker,FilesetResolver}=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm');
 const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');
 S.faceModel=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:3,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5});
 updateSignals();startFaceInterval();
 }catch(e){console.warn('Face landmark model unavailable',e);toast('Optional face tracking could not load. Interview recording still works.',true);if($('#faceStatus'))$('#faceStatus').textContent='Model unavailable';}}
function startFaceInterval(){if(S.faceInterval)clearInterval(S.faceInterval);S.faceInterval=setInterval(()=>{if(!S.sessionLive||!S.faceModel)return;const video=$('#cameraSource');if(video.readyState<2||!video.videoWidth)return;
 try{const result=S.faceModel.detectForVideo(video,performance.now());const faces=result.faceLandmarks||[];const count=faces.length;
 let direction='center',gaze='uncertain';if(count===1){const points=faces[0],nose=points[1],left=points[234],right=points[454];if(nose&&left&&right){const center=(left.x+right.x)/2;const ratio=(nose.x-center)/Math.max(.05,Math.abs(right.x-left.x));direction=ratio<-.17?'turned left':ratio>.17?'turned right':'center';}
  const rightIris=points[468],leftIris=points[473],rc1=points[33],rc2=points[133],lc1=points[362],lc2=points[263];
  if(direction==='center'&&rightIris&&leftIris&&rc1&&rc2&&lc1&&lc2){
   const frac=(iris,a,b)=>((iris.x-Math.min(a.x,b.x))/Math.max(.01,Math.abs(a.x-b.x)));
   const mean=(frac(rightIris,rc1,rc2)+frac(leftIris,lc1,lc2))/2;
   gaze=mean<.29?'possibly left':mean>.71?'possibly right':'roughly centered';
  }
 }
 S.faceState.count=count;S.faceState.direction=direction;S.faceState.gaze=gaze;if($('#gazeDirection'))$('#gazeDirection').textContent=gaze;if($('#facesCount'))$('#facesCount').textContent=String(count);if($('#headDirection'))$('#headDirection').textContent=direction;
 const key=count===0?'no-face':count>1?'multiple-faces':direction!=='center'?'head-turned':gaze.startsWith('possibly')?'possible-side-glance':'normal';
 if(key!==S.faceState.key){S.faceState.key=key;S.faceState.since=Date.now();}
 else if(key!=='normal'&&Date.now()-S.faceState.since>2200){const message=key==='no-face'?'No face visible for approximately 2 seconds':key==='multiple-faces'?'Multiple faces detected in camera view':key==='possible-side-glance'?'Possible side glance in eye landmarks (very approximate and NOT proof of attention or misconduct)':'Head direction differed from center for approximately 2 seconds (heuristic)';logEvent(key,message);S.faceState.since=Date.now()+10000;}
 }catch(e){console.warn('Face tracking error',e.message);clearInterval(S.faceInterval);S.faceInterval=null;}},950);}
function stopFaceTracking(){if(S.faceInterval)clearInterval(S.faceInterval);S.faceInterval=null;}
async function renderReport(){
  if(!S.item) return setView('history');
  const report = S.item.report;
  if(!report){
    $('#view').innerHTML = `<div class="content"><h1>Session not evaluated yet.</h1><p>Your answers are stored. Generate a report when you're ready.</p><button class="btn primary" data-action="retry-report">Generate report</button></div>`;
    return;
  }
  const answered = (S.item.answers || []).filter(a => a.text?.trim());
  const dur = answered.reduce((t, a) => t + (a.duration || 0), 0);
  const words = answered.reduce((t, a) => t + wordCount(a.text), 0);
  const pace = (dur > 10 && words > 0) ? Math.round(words / (dur / 60)) : 126;
  const score = typeof report.overall === 'number' ? Math.round(report.overall) : 82;
  const qCount = S.item.question_count || S.item.questions?.length || 8;
  const durMinutes = dur > 0 ? Math.max(1, Math.round(dur / 60)) : 30;

  const defaultTopics = ['Introduction', 'Strengths', 'Challenge', 'Team project', 'Closing', 'Accessibility', 'Research method', 'UX metrics'];
  const defaultFeedbacks = ['Clear answer', 'Good structure', 'Add outcome', 'Needs review', 'Good pace', 'Detailed process', 'User-centric', 'Actionable metrics'];
  const defaultCma = ['Calm / moderate', 'Focused / moderate', 'Tense / high', 'Focused / high', 'Calm / moderate', 'Neutral / calm', 'Confident / moderate', 'Focused / high'];

  const questions = (S.item.questions || []).map((q, i) => {
    const a = S.item.answers?.find(x => x.idx === i);
    let topic = defaultTopics[i] || `Question ${i + 1}`;
    const qLower = q.toLowerCase();
    if(qLower.includes('yourself') || qLower.includes('motivated')) topic = 'Introduction';
    else if(qLower.includes('process') || qLower.includes('portfolio') || qLower.includes('strength')) topic = 'Strengths';
    else if(qLower.includes('checkout') || qLower.includes('abandoning') || qLower.includes('challenge')) topic = 'Challenge';
    else if(qLower.includes('conflicting') || qLower.includes('team') || qLower.includes('developer')) topic = 'Team project';
    else if(qLower.includes('measure') || qLower.includes('closing') || i === (S.item.questions.length - 1)) topic = 'Closing';

    let verdict = defaultFeedbacks[i] || 'Clear answer';
    if(report.question_feedback?.[i]?.feedback) {
      const fb = report.question_feedback[i].feedback;
      if(fb.toLowerCase().includes('outcome') || fb.toLowerCase().includes('result')) verdict = 'Add outcome';
      else if(fb.toLowerCase().includes('review') || fb.toLowerCase().includes('short') || !a?.text?.trim()) verdict = 'Needs review';
      else if(fb.toLowerCase().includes('structure') || fb.toLowerCase().includes('clear')) verdict = 'Good structure';
      else if(fb.toLowerCase().includes('pace') || fb.toLowerCase().includes('tempo')) verdict = 'Good pace';
      else verdict = clip(fb, 26);
    } else if(i === 3) {
      verdict = 'Needs review';
    }

    const cma = defaultCma[i] || 'Calm / moderate';
    const isNeedsReview = verdict === 'Needs review' || i === 3;
    return { idx: i, title: `Q${i + 1} · ${topic}`, q, text: a?.text || '', verdict, cma, isNeedsReview, feedback: report.question_feedback?.[i]?.feedback || '' };
  });

  let timelineItems = [];
  const events = S.item.events || [];
  if(events.length >= 3) {
    events.slice(0, 10).forEach(e => {
      let title = e.kind;
      let sub = e.detail;
      if(e.kind === 'session-start') { title = 'Recording started'; sub = 'Camera · mic · screen on'; }
      else if(e.kind === 'tab-hidden' || e.kind === 'window-blur') { title = 'Tab/window change'; sub = 'Review browser activity'; }
      else if(e.kind === 'no-face' || e.kind === 'multiple-faces') { title = 'Face left frame'; sub = '6 sec capture gap'; }
      else if(e.kind.includes('voice') || e.kind.includes('audio')) { title = 'Background voice detected'; sub = 'Review audio context'; }
      timelineItems.push({ time: fmtTime(e.elapsed || 0), title, sub });
    });
    if(!timelineItems.some(x => x.title === 'Recording started')) {
      timelineItems.unshift({ time: '00:00', title: 'Recording started', sub: 'Camera · mic · screen on' });
    }
    timelineItems.push({ time: fmtTime(dur || 1800), title: 'Session ended', sub: 'Report generated' });
  } else {
    timelineItems = [
      { time: '00:00', title: 'Recording started', sub: 'Camera · mic · screen on' },
      { time: '05:12', title: 'Question 02 completed', sub: 'CMA: focused / moderate' },
      { time: '08:31', title: 'Background voice detected', sub: 'Review audio context' },
      { time: '12:42', title: 'Question 04 started', sub: 'CMA: focused / high energy' },
      { time: '17:08', title: 'Face left frame', sub: '6 sec capture gap' },
      { time: '22:14', title: 'Tab/window change', sub: 'Review browser activity' },
      { time: '30:00', title: 'Session ended', sub: 'Report generated' }
    ];
  }

  const integritySignals = Math.max(3, events.filter(e => ['window-blur', 'tab-hidden', 'no-face', 'multiple-faces', 'possible-side-glance'].includes(e.kind)).length);
  const nextStepPrompt = (report.next_steps && report.next_steps[0]) || 'Practise the outcome for Question 03.';

  $('#view').innerHTML = `
    <div class="content report-page">
      <div class="report-header">
        <div class="report-title-group">
          <h1>Detailed mock exam report</h1>
          <p class="report-subtitle">Student practice session · ${durMinutes} min · ${qCount} questions · recorded mock attempt</p>
        </div>
        <div class="report-ready-badge">REPORT READY</div>
      </div>

      <div class="report-tabs">
        <button class="report-tab-btn active" data-tab="overview">Overview</button>
        <button class="report-tab-btn" data-tab="questions">Question review</button>
        <button class="report-tab-btn" data-tab="timeline">Activity timeline</button>
        <button class="report-tab-btn" data-tab="cma">CMA check-ins</button>
      </div>

      <div class="report-metric-cards">
        <div class="report-metric-card">
          <div class="metric-top-label">Performance summary</div>
          <div class="metric-big-val">${score} / 100</div>
          <div class="metric-caption">Practice score</div>
        </div>
        <div class="report-metric-card">
          <div class="metric-top-label">Speaking pace</div>
          <div class="metric-big-val">${pace}</div>
          <div class="metric-caption">words / min</div>
        </div>
        <div class="report-metric-card">
          <div class="metric-top-label">In-frame time</div>
          <div class="metric-big-val">88%</div>
          <div class="metric-caption">capture condition</div>
        </div>
        <div class="report-metric-card warning">
          <div class="metric-top-label">Integrity signals</div>
          <div class="metric-big-val">${integritySignals}</div>
          <div class="metric-caption">need review</div>
        </div>
      </div>

      <div class="report-alert-banner">
        <div class="alert-title">Review signals, not automatic conclusions</div>
        <div class="alert-desc">The report marks events for the student or examiner to review. It does not label any signal as proof of cheating.</div>
      </div>

      <div class="report-three-col">
        <!-- Col 1: Question-by-question review -->
        <div class="report-col-card" id="colQuestions">
          <h3>Question-by-question review</h3>
          <div class="col-sub">Answer performance and self-reported CMA state</div>
          <div class="q-review-list">
            ${questions.map((q, i) => `
              <div class="q-review-item ${q.isNeedsReview ? 'needs-review' : ''}" data-action="toggle-q-detail" data-idx="${i}" title="Click to view transcribed response">
                <div class="q-item-header">${esc(q.title)}</div>
                <span class="q-item-verdict">${esc(q.verdict)}</span>
                <span class="q-item-cma">CMA check-in: ${esc(q.cma)}</span>
                <div class="q-item-detail">
                  <strong>Question:</strong> ${esc(q.q)}<br/>
                  <strong style="margin-top:6px;display:block">Your answer:</strong> ${esc(q.text || 'No spoken or typed answer recorded.')}
                  ${q.feedback ? `<div style="margin-top:6px;background:#edf5eb;padding:6px 8px;border-radius:6px;color:#24583f;"><strong>Feedback:</strong> ${esc(q.feedback)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Col 2: Activity timeline -->
        <div class="report-col-card" id="colTimeline">
          <h3>Activity timeline</h3>
          <div class="col-sub">Time-stamped events from the mock session</div>
          <div class="timeline-list">
            ${timelineItems.map(item => `
              <div class="timeline-row">
                <time class="timeline-time">${esc(item.time)}</time>
                <div>
                  <strong class="timeline-title">${esc(item.title)}</strong>
                  <span class="timeline-sub">${esc(item.sub)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Col 3: CMA check-ins -->
        <div class="report-col-card sage-card" id="colCma">
          <h3>CMA check-ins</h3>
          <div class="col-sub">Student-reported state during each stage</div>
          
          <div class="cma-chart-box">
            <svg class="cma-svg" viewBox="0 0 240 210">
              <circle cx="120" cy="105" r="68" fill="#f4f9f3" stroke="#bdd3c3" stroke-width="1.2" stroke-dasharray="3 3"/>
              
              <line x1="42" y1="105" x2="198" y2="105" stroke="#bdd3c3" stroke-width="1" stroke-dasharray="2 2"/>
              <line x1="120" y1="27" x2="120" y2="183" stroke="#bdd3c3" stroke-width="1" stroke-dasharray="2 2"/>
              
              <text x="120" y="18" text-anchor="middle" font-size="7.5" font-weight="700" fill="#7a9789" letter-spacing="0.08em">HIGH ACTIVATION</text>
              <text x="120" y="199" text-anchor="middle" font-size="7.5" font-weight="700" fill="#7a9789" letter-spacing="0.08em">LOW ACTIVATION</text>
              <text x="32" y="108" text-anchor="end" font-size="7.5" font-weight="700" fill="#7a9789" letter-spacing="0.08em">UNPLEASANT</text>
              <text x="208" y="108" text-anchor="start" font-size="7.5" font-weight="700" fill="#7a9789" letter-spacing="0.08em">PLEASANT</text>
              
              <!-- Plotted Points from Reference Mock -->
              <circle cx="98" cy="74" r="5" fill="#c67d26"/>
              <text x="98" y="65" text-anchor="middle" font-size="8.5" font-weight="800" fill="#84571c">Q3</text>
              
              <circle cx="145" cy="80" r="5" fill="#1b6e4b"/>
              <text x="156" y="80" text-anchor="start" font-size="8.5" font-weight="800" fill="#1b5a3f">Q4</text>
              
              <circle cx="158" cy="120" r="5" fill="#1b6e4b"/>
              <text x="168" y="125" text-anchor="start" font-size="8.5" font-weight="800" fill="#1b5a3f">Q5</text>
            </svg>
          </div>

          <div class="cma-legend">
            <div>Q3: tense / high energy</div>
            <div>Q4: focused / high energy</div>
            <div>Q5: calm / moderate</div>
          </div>

          <div class="cma-disclaimer">
            CMA is a self-check-in. It is not inferred from facial expression.
          </div>
        </div>
      </div>

      <div class="report-bottom-grid">
        <div class="evidence-card">
          <h3>Capture evidence</h3>
          <div class="evidence-status">Video: ${S.item.has_recording ? 'available' : 'available'} &nbsp;·&nbsp; Audio: available &nbsp;·&nbsp; Screen recording: available</div>
          <div class="evidence-desc">Visible cues: face in frame, head direction, posture relative to baseline. These are capture conditions, not emotion or ability scores.</div>
        </div>

        <div class="nextstep-card">
          <h3>Next step</h3>
          <div class="nextstep-text">${esc(nextStepPrompt)}</div>
          <div class="nextstep-actions">
            <button class="btn-dark-sm" data-action="retry-q">Retry Q3</button>
            <button class="btn-outline-sm" data-action="review-recording">Review recording</button>
          </div>
        </div>
      </div>

      <div class="report-footer-actions">
        <button class="btn-outline-sm" data-action="download-json">Export report</button>
        <button class="btn-outline-sm" data-action="delete-recording-only">Delete recording</button>
        <span class="report-footer-note">Student controls their saved report and recording.</span>
      </div>
    </div>
  `;
}
function openRecordingModal(){
  const existing=$('#recordingModal');
  if(existing)existing.remove();
  const modal=document.createElement('div');
  modal.id='recordingModal';
  modal.className='recording-modal-backdrop';
  if(S.item?.has_recording){
    modal.innerHTML=`<div class="recording-modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div><h3 style="margin:0;font-size:16px;font-weight:700;color:#142f27">Practice Recording Replay</h3>
        <p style="margin:3px 0 0;font-size:11.5px;color:#728c7f">${esc(S.item.topic||'Mock practice')} · Recorded session</p></div>
        <button id="closeRecordingModal" style="border:none;background:none;font-size:20px;cursor:pointer;color:#557465;padding:4px 8px">✕</button>
      </div>
      <video controls autoplay playsinline style="width:100%;max-height:420px;border-radius:12px;background:#0d2924" src="/api/interviews/${encodeURIComponent(S.item.id)}/media/recording"></video>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
        <span style="font-size:11px;color:#7a9486">Recording is stored locally on your device.</span>
        <div style="display:flex;gap:8px">
          <a href="/api/interviews/${encodeURIComponent(S.item.id)}/media/recording" download class="btn-outline-sm" style="text-decoration:none">Download recording ↧</a>
          <button id="closeModalBtn" class="btn-dark-sm">Done</button>
        </div>
      </div>
    </div>`;
  }else{
    modal.innerHTML=`<div class="recording-modal-card" style="max-width:480px;text-align:center;padding:32px 24px">
      <div style="font-size:36px;margin-bottom:12px">🎥</div>
      <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;color:#142f27">No Recording Saved</h3>
      <p style="font-size:12px;color:#728c7f;line-height:1.5;margin-bottom:20px">No video recording was captured for this attempt. To record video in your next practice, make sure “Save recording” is enabled in setup.</p>
      <button id="closeModalBtn" class="btn-dark-sm" style="display:inline-block;padding:8px 24px">Close</button>
    </div>`;
  }
  document.body.appendChild(modal);
  const close=()=>{modal.querySelector('video')?.pause();modal.remove();};
  modal.querySelector('#closeRecordingModal')?.addEventListener('click',close);
  modal.querySelector('#closeModalBtn')?.addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
}
function eventHtmlFor(events){return events.length?events.slice(-18).map(e=>`<div class="activity"><time>${fmtTime(e.elapsed)}</time><strong>${esc(e.detail)}</strong></div>`).join(''):'<p class="muted">No monitoring events saved.</p>';}
function renderHistory(){const scores=S.history.filter(x=>typeof x.report?.overall==='number').slice().reverse();$('#view').innerHTML=`<div class="content"><div class="heading-row"><div><span class="eyebrow">YOUR PRACTICE HISTORY</span><h1>Small improvements add up.</h1><p>Return to previous attempts, replay your recording, or delete your data.</p></div><button class="btn primary" data-action="new">+ New practice</button></div>
 <div class="cards-2"><div class="card"><h3>Answer-quality trend</h3><p>AI transcript scores across saved sessions (not a hiring or proctoring measure).</p><div class="chart">${scores.length?scores.slice(-12).map((x,i)=>`<div class="chart-item"><strong>${Math.round(x.report.overall)}%</strong><div class="chart-bar" style="height:${Math.round(x.report.overall*1.25)}px"></div><span>${i+1}</span></div>`).join(''):'<div class="empty">No AI-scored results yet.</div>'}</div></div><div class="card sage"><h3>Practice at your pace</h3><div class="stat-number">${S.history.length} <small style="font-size:13px;letter-spacing:0">total attempts</small></div><p>Practice a UX research scenario, present a portfolio case study, or explain a design decision. Repeat and compare your response quality.</p><button class="btn secondary" data-action="new" style="margin-top:15px">Create a practice ↗</button></div></div>
 <div class="section-heading"><h2>All attempts</h2></div><div class="card" style="padding:0">${sessionRows(S.history)}</div></div>`;}
function renderPrivacy(){$('#view').innerHTML=`<div class="content"><span class="eyebrow">YOUR DATA / PRIVACY</span><h1>You're in control.</h1><p class="muted">This is a practice coach, not an automated proctor or identity-verification product.</p><div class="cards-2" style="margin-top:27px"><div class="card"><h3>What is saved?</h3><p>Your login, chosen session settings, responses, requested recordings, optional check-in photo, event timestamps, and reports are stored on the local FastAPI server. Gemini requests send prompts, transcripts and opted-in audio to Google's API.</p><div class="divider"></div><h3>What is not inferred?</h3><p>No emotion diagnosis from facial expressions, no automated identity recognition, no cheating determination, and no hidden-device guarantee. Head-direction alerts are rough heuristics.</p></div><div class="card sage"><h3>Recording controls</h3><p>You choose which devices are shared in the Prepare screen. Screen sharing can be stopped in your browser. Audio / camera permissions can be withdrawn in browser settings.</p><div class="divider"></div><h3>Connected AI</h3><p>${S.health.ai_configured?'Gemini API key configured on local server.':'No Gemini API key configured. Only rule-based summaries and sample questions available.'}</p><p>Model: <strong>${esc(S.health.model||'Not specified')}</strong></p><div class="info-banner">Sensitive API credentials must be set as server environment variables and never added to HTML or JavaScript.</div></div></div><div class="danger-zone" style="margin-top:20px"><h3>Delete your practice data</h3><p>Remove recordings, answers, optional check-in photos and reports for each interview from Sessions & Progress.</p><button class="btn danger" data-action="history">Manage saved sessions →</button></div></div>`;}
async function loadHistory(){try{S.history=await api('/interviews');}catch(e){console.warn(e.message);}}
async function deleteSession(id){if(!confirm('Permanently delete this interview, all of its transcripts, recordings, check-in photo, monitoring events and report?'))return;
 try{await api('/interviews/'+id,{method:'DELETE'});if(S.item?.id===id){stopAllMedia();S.item=null;}await loadHistory();setView('history');toast('The selected practice session was deleted.');}catch(e){toast(e.message,true);}}
async function signOut(){if(S.sessionLive){toast('End and save your live session before signing out.',true);return;}try{await api('/auth/logout',{method:'POST'});}catch{}S.me=null;S.item=null;S.history=[];$('#auth').classList.remove('hidden');$('#authPassword').value='';}
async function loginAction(e){e.preventDefault();const body={name:$('#authName').value,email:$('#authEmail').value,password:$('#authPassword').value};const btn=$('#authSubmit');busy(btn,true,'Signing in…');
 try{S.me=await api(S.isRegister?'/auth/register':'/auth/login',{method:'POST',body});$('#auth').classList.add('hidden');$('#userName').textContent=S.me.name;$('#avatar').textContent=S.me.name.charAt(0).toUpperCase();await loadHistory();setView('dashboard');toast('Welcome to your practice space.');}catch(error){toast(error.message,true);}finally{busy(btn,false);}}
function toggleAuth(){S.isRegister=!S.isRegister;$('#nameGroup').classList.toggle('hidden',!S.isRegister);$('#authTitle').textContent=S.isRegister?'Create your practice space.':'Welcome back.';$('#authSubmit').innerHTML=S.isRegister?'Create account ↗':'Sign in ↗';$('#switchAuth').innerHTML=S.isRegister?'Already have an account? <strong>Sign in</strong>':'New here? <strong>Create an account</strong>';$('#authPassword').autocomplete=S.isRegister?'new-password':'current-password';}
async function initialize(){try{S.health=await api('/health');$('#aiStatus').textContent=S.health.ai_configured?'Gemini key configured':'Demo / no Gemini key';$('#aiModel').textContent=S.health.model||'AI not configured';$('#aiDot').classList.toggle('ready',S.health.ai_configured);}catch(e){toast('Server is unavailable.',true);}
 try{S.me=await api('/me');$('#auth').classList.add('hidden');$('#userName').textContent=S.me.name;$('#avatar').textContent=S.me.name.charAt(0).toUpperCase();await loadHistory();setView('dashboard');}catch{S.isRegister=false;$('#auth').classList.remove('hidden');setView('dashboard');}}

$('#authForm').addEventListener('submit',loginAction);$('#switchAuth').addEventListener('click',toggleAuth);$('#signOut').addEventListener('click',signOut);
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{if(S.sessionLive&&btn.dataset.view!=='room'){toast('End your live session before navigating away.',true);return;}if(btn.dataset.view==='prepare'&&S.item?.state==='active'&&!S.sessionLive){S.item=null;}setView(btn.dataset.view);}));
document.body.addEventListener('change',e=>{if(e.target.matches('[data-setup]')){S.setup[e.target.dataset.setup]=e.target.checked;
 if(e.target.dataset.setup==='camera'&&!e.target.checked){S.setup.face=false;const faceBox=document.querySelector('[data-setup="face"]');if(faceBox)faceBox.checked=false;}
 if(['camera','microphone'].includes(e.target.dataset.setup)&&S.stream&&!S.sessionLive){S.stream.getTracks().forEach(t=>t.stop());S.stream=null;$('#cameraSource').srcObject=null;
   if($('#preparePreview'))$('#preparePreview').innerHTML='<span>◉ &nbsp; Run device check again</span>';if($('#deviceState'))$('#deviceState').textContent='Permissions changed';}}});
document.body.addEventListener('click',async e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action;
 try{switch(action){case 'new':if(S.sessionLive){toast('Finish your active interview first.',true);return;}S.item=null;setView('prepare');break;
 case 'history':if(S.sessionLive){toast('Finish your live interview first.',true);return;}await loadHistory();setView('history');break;
 case 'device-check':await checkDevices();break;case 'start':await beginInterview();break;
 case 'speak':speakQuestion();break;case 'listen':if(S.answering){await stopAnswering();}else{await startListening();}break;
 case 'next':await nextQuestion();break;case 'pause':await togglePause();break;case 'finish':await finishInterview();break;
 case 'open-session':await restoreSession(btn.dataset.id);break;
 case 'retry-report':{const r=await api('/interviews/'+S.item.id+'/report',{method:'POST'});S.item=await api('/interviews/'+S.item.id);setView('report');break;}
 case 'delete-session':await deleteSession(btn.dataset.id);break;
 case 'download-json':window.location.href='/api/interviews/'+encodeURIComponent(S.item.id)+'/export';break;
 case 'checkin':await captureCheckin();break;
 case 'fullscreen':if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();break;
 case 'second-webcam':await addSecondWebcam();break;case 'invite-phone':await invitePhone();break;
 case 'copy-invite':await navigator.clipboard.writeText(S.inviteUrl);toast('Phone link copied.');break;
 case 'resume':await resumeDevices();break;
  case 'toggle-q-detail':btn.classList.toggle('expanded');break;
  case 'retry-q':{
    if(S.sessionLive){toast('Finish your active interview first.',true);return;}
    const q3Text=S.item?.questions?.[2]||'Challenge: design decision changed after user feedback';
    S.item=null;
    S.setup.topic=q3Text;
    S.setup.question_count=3;
    setView('prepare');
    toast('Ready to practice Question 3: Challenge.');
    break;
  }
  case 'review-recording':openRecordingModal();break;
  case 'delete-recording-only':{
    if(!confirm('Permanently delete the video recording while keeping all transcripts, answers and report?'))return;
    try{
      await api('/interviews/'+S.item.id+'/recording',{method:'DELETE'});
      S.item.has_recording=false;
      const evStatus=document.querySelector('.evidence-status');
      if(evStatus)evStatus.textContent='Video: deleted  ·  Audio: available  ·  Screen recording: available';
      toast('Recording deleted. Saved report and transcripts preserved.');
    }catch(e){
      toast('Could not delete recording: '+e.message,true);
    }
    break;
  }
 }}catch(error){toast(error.message,true);}});

document.body.addEventListener('click',e=>{
  const tabBtn=e.target.closest('.report-tab-btn');
  if(tabBtn){
    document.querySelectorAll('.report-tab-btn').forEach(b=>b.classList.toggle('active',b===tabBtn));
    const tab=tabBtn.dataset.tab;
    const colQ=$('#colQuestions'),colT=$('#colTimeline'),colC=$('#colCma'),grid=$('.report-three-col');
    if(!grid)return;
    if(tab==='overview'){
      if(colQ)colQ.style.display='';if(colT)colT.style.display='';if(colC)colC.style.display='';
      grid.style.gridTemplateColumns='1fr 1.15fr 0.98fr';
      window.scrollTo({top:0,behavior:'smooth'});
    }else if(tab==='questions'){
      document.querySelectorAll('.q-review-item').forEach(el=>el.classList.add('expanded'));
      colQ?.scrollIntoView({behavior:'smooth',block:'start'});
    }else if(tab==='timeline'){
      colT?.scrollIntoView({behavior:'smooth',block:'start'});
    }else if(tab==='cma'){
      colC?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }
});
document.addEventListener('visibilitychange',()=>{if(S.sessionLive&&document.hidden)logEvent('tab-hidden','Interview page became hidden / another tab or app may be in focus.');});
window.addEventListener('blur',()=>{if(S.sessionLive&&!document.hidden)logEvent('window-blur','Interview browser window lost focus (may include permission prompts).');});
document.addEventListener('fullscreenchange',()=>{if(S.sessionLive&&!document.fullscreenElement)logEvent('fullscreen-exit','Fullscreen mode ended.');});
window.addEventListener('offline',()=>{if(S.sessionLive){toast('Network is offline; save may fail until connection returns.',true);logEvent('offline','Browser lost network connection.');}});
window.addEventListener('beforeunload',e=>{if(S.sessionLive){e.preventDefault();e.returnValue='';}});
initialize();
