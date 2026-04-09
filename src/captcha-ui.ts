import { CHALLENGES, type Challenge } from "./challenges.js";

export function renderCaptchaPage(
  locale: "ko" | "en" | "both",
  timeoutSeconds: number,
  mediaConfig?: {
    enableMediaRecording: boolean;
    minRecordingDurationMs: number;
    sessionId?: string;
    callbackEndpoint?: string;
  },
): string {
  const enableMedia = mediaConfig?.enableMediaRecording ?? false;
  const minRecordingMs = mediaConfig?.minRecordingDurationMs ?? 1500;
  const sessionId = mediaConfig?.sessionId ?? '';
  const callbackEndpoint = mediaConfig?.callbackEndpoint ?? '';
  const challengesJson = JSON.stringify(
    CHALLENGES.map((c) => ({ id: c.id, ko: c.ko, en: c.en, category: c.category, severity: c.severity })),
  );

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NK CAPTCHA — OpenClaw Verification</title>
<style>
${CSS}
</style>
</head>
<body>
<div class="scanlines"></div>
<div class="vignette"></div>

<main id="app">
  <!-- INTRO SCREEN -->
  <section id="intro" class="screen active">
    <div class="logo-container">
      <div class="claw-icon">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="56" stroke="#dc2626" stroke-width="3" opacity="0.6"/>
          <circle cx="60" cy="60" r="40" stroke="#dc2626" stroke-width="1.5" opacity="0.3"/>
          <path d="M60 20 L60 38" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M60 82 L60 100" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M20 60 L38 60" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M82 60 L100 60" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
          <text x="60" y="67" text-anchor="middle" fill="#dc2626" font-size="28" font-weight="900" font-family="monospace">北</text>
        </svg>
      </div>
      <h1 class="title glitch" data-text="NK CAPTCHA">NK CAPTCHA</h1>
      <p class="subtitle">OPENCLAW VERIFICATION PROTOCOL</p>
    </div>
    <div class="intro-text">
      <p class="desc">This verification confirms you are <strong>not</strong> a DPRK operative.</p>
      <p class="desc-sub">You will be asked to type a phrase criticizing the North Korean regime.<br>
      Refusal or inability to comply will result in <span class="red">VERIFICATION FAILURE</span>.</p>
    </div>
    <button id="btn-start" class="btn-primary" onclick="startChallenge()">
      <span class="btn-inner">BEGIN VERIFICATION</span>
    </button>
    <p class="legal">By proceeding you acknowledge this is a security verification tool.</p>
  </section>

  <!-- CHALLENGE SCREEN -->
  <section id="challenge" class="screen">
    <div class="challenge-header">
      <div class="status-bar">
        <span class="status-label">VERIFICATION IN PROGRESS</span>
        <span id="timer" class="timer">${timeoutSeconds}s</span>
      </div>
      <div class="progress-bar"><div id="progress" class="progress-fill"></div></div>
    </div>

    <div class="challenge-body">
      <p class="instruction">다음 문장을 정확히 입력하세요 &nbsp;|&nbsp; Type the following phrase exactly</p>

      <div class="phrase-container">
        <div id="phrase-ko" class="phrase phrase-ko"></div>
        <div id="phrase-en" class="phrase phrase-en"></div>
      </div>

      <div class="input-container">
        <div class="input-glow"></div>
        <input
          id="user-input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="여기에 입력..."
          oninput="onInput()"
          onkeydown="if(event.key==='Enter')submitChallenge()"
        />
        <div id="char-feedback" class="char-feedback"></div>
      </div>

      <div class="match-meter">
        <div class="match-label">MATCH</div>
        <div class="match-bar"><div id="match-fill" class="match-fill"></div></div>
        <div id="match-pct" class="match-pct">0%</div>
      </div>

      ${enableMedia ? `
      <div class="recording-section">
        <div class="recording-divider">
          <span class="divider-line"></span>
          <span class="divider-text">VOICE VERIFICATION</span>
          <span class="divider-line"></span>
        </div>
        <p class="recording-instruction">위 문장을 소리 내어 읽어주세요 &nbsp;|&nbsp; Read the phrase aloud</p>
        <div class="recording-controls">
          <button id="btn-record" class="btn-record" onclick="toggleRecording()">
            <span class="record-dot"></span>
            <span class="record-label">RECORD</span>
          </button>
          <div id="recording-status" class="recording-status">
            <span id="recording-time" class="recording-time">0.0s</span>
            <div id="recording-waveform" class="recording-waveform">
              <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
              <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
              <div class="wave-bar"></div>
            </div>
          </div>
        </div>
        <div id="playback-container" class="playback-container" style="display:none">
          <audio id="audio-playback" controls></audio>
          <button class="btn-re-record" onclick="clearRecording()">RE-RECORD</button>
        </div>
        <div id="recording-badge" class="recording-badge" style="display:none">
          <span class="badge-icon">&#9679;</span>
          <span id="recording-badge-text"></span>
        </div>
        <div id="stt-transcript" class="stt-transcript" style="display:none"></div>
      </div>
      ` : ''}
    </div>

    <button id="btn-submit" class="btn-primary disabled" onclick="submitChallenge()">
      <span class="btn-inner">VERIFY</span>
    </button>
  </section>

  <!-- RESULT: PASS -->
  <section id="result-pass" class="screen">
    <div class="result-icon pass-icon">
      <svg viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="54" stroke="#22c55e" stroke-width="3"/>
        <path d="M35 62 L52 78 L85 42" stroke="#22c55e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h2 class="result-title pass-title">VERIFIED</h2>
    <p class="result-sub">신원이 확인되었습니다 — Identity Confirmed</p>
    <div class="result-badge">
      <span class="badge-text">NOT A DPRK OPERATIVE</span>
    </div>
    <div id="verification-level" class="verification-level" style="display:none"></div>
    <div id="verification-code" class="verification-code"></div>
  </section>

  <!-- RESULT: FAIL -->
  <section id="result-fail" class="screen">
    <div class="result-icon fail-icon">
      <svg viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="54" stroke="#dc2626" stroke-width="3"/>
        <path d="M40 40 L80 80" stroke="#dc2626" stroke-width="5" stroke-linecap="round"/>
        <path d="M80 40 L40 80" stroke="#dc2626" stroke-width="5" stroke-linecap="round"/>
      </svg>
    </div>
    <h2 class="result-title fail-title">VERIFICATION FAILED</h2>
    <p class="result-sub">인증에 실패했습니다 — Could not verify identity</p>
    <div class="result-badge fail-badge">
      <span class="badge-text">POTENTIAL DPRK OPERATIVE</span>
    </div>
    <button class="btn-secondary" onclick="resetAll()">RETRY</button>
  </section>
</main>

<script>
const CHALLENGES = ${challengesJson};
const LOCALE = "${locale}";
const TIMEOUT = ${timeoutSeconds};
const ENABLE_MEDIA = ${enableMedia};
const MIN_RECORDING_MS = ${minRecordingMs};
const SESSION_ID = "${sessionId}";
const CALLBACK_ENDPOINT = "${callbackEndpoint}";

let currentChallenge = null;
let timerInterval = null;
let timeLeft = TIMEOUT;

// Media recording state
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = 0;
let recordingTimerInterval = null;
let recordedBlob = null;
let recordingDurationMs = 0;

// Speech recognition state
let speechRecognition = null;
let speechTranscript = '';
let sttSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    recordedBlob = null;
    recordingDurationMs = 0;

    mediaRecorder = new MediaRecorder(stream, { mimeType: getMimeType() });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      recordingDurationMs = Date.now() - recordingStartTime;
      recordedBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });

      // Show playback
      const playback = document.getElementById('playback-container');
      const audio = document.getElementById('audio-playback');
      audio.src = URL.createObjectURL(recordedBlob);
      playback.style.display = 'flex';

      // Show badge
      const badge = document.getElementById('recording-badge');
      const badgeText = document.getElementById('recording-badge-text');
      const valid = recordingDurationMs >= MIN_RECORDING_MS;
      badge.style.display = 'flex';
      badge.className = 'recording-badge ' + (valid ? 'badge-valid' : 'badge-invalid');
      badgeText.textContent = valid
        ? 'Recording captured (' + (recordingDurationMs / 1000).toFixed(1) + 's)'
        : 'Too short (' + (recordingDurationMs / 1000).toFixed(1) + 's) — min ' + (MIN_RECORDING_MS / 1000).toFixed(1) + 's';

      updateSubmitState();
    };

    mediaRecorder.start(100);
    recordingStartTime = Date.now();

    // Start speech recognition alongside recording
    startSpeechRecognition();

    // UI updates
    const btn = document.getElementById('btn-record');
    btn.classList.add('recording');
    btn.querySelector('.record-label').textContent = 'STOP';

    const status = document.getElementById('recording-status');
    status.classList.add('active');

    document.getElementById('playback-container').style.display = 'none';
    document.getElementById('recording-badge').style.display = 'none';
    const sttEl = document.getElementById('stt-transcript');
    if (sttEl) { sttEl.textContent = ''; sttEl.style.display = 'none'; }

    recordingTimerInterval = setInterval(() => {
      const elapsed = ((Date.now() - recordingStartTime) / 1000).toFixed(1);
      document.getElementById('recording-time').textContent = elapsed + 's';
    }, 100);
  } catch (err) {
    const badge = document.getElementById('recording-badge');
    const badgeText = document.getElementById('recording-badge-text');
    badge.style.display = 'flex';
    badge.className = 'recording-badge badge-invalid';
    badgeText.textContent = 'Microphone access denied';
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  stopSpeechRecognition();
  clearInterval(recordingTimerInterval);

  const btn = document.getElementById('btn-record');
  btn.classList.remove('recording');
  btn.querySelector('.record-label').textContent = 'RECORD';

  document.getElementById('recording-status').classList.remove('active');
}

function clearRecording() {
  recordedBlob = null;
  recordingDurationMs = 0;
  document.getElementById('playback-container').style.display = 'none';
  document.getElementById('recording-badge').style.display = 'none';
  document.getElementById('recording-time').textContent = '0.0s';
  updateSubmitState();
}

function getMimeType() {
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  }
  return '';
}

function hasValidRecording() {
  return recordedBlob && recordingDurationMs >= MIN_RECORDING_MS;
}

function startSpeechRecognition() {
  if (!sttSupported) return;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  speechRecognition = new SpeechRec();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.lang = 'ko-KR';
  speechTranscript = '';

  speechRecognition.onresult = (event) => {
    let final = '', interim = '';
    for (let i = 0; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    speechTranscript = (final + interim).trim();
    const sttEl = document.getElementById('stt-transcript');
    if (sttEl && speechTranscript) {
      sttEl.style.display = 'block';
      // Check similarity against challenge
      const simKo = similarity(speechTranscript, currentChallenge.ko);
      const simEn = similarity(speechTranscript, currentChallenge.en);
      const bestSim = Math.max(simKo, simEn);
      const pct = Math.round(bestSim * 100);
      const cls = pct >= 90 ? 'stt-pass' : pct >= 50 ? 'stt-partial' : 'stt-low';
      sttEl.innerHTML = '<span class="stt-label">HEARD:</span> <span class="' + cls + '">' +
        escHtml(speechTranscript) + '</span> <span class="stt-pct">' + pct + '%</span>';
    }
    updateSubmitState();
  };

  speechRecognition.onerror = () => {};
  speechRecognition.start();
}

function stopSpeechRecognition() {
  if (speechRecognition) {
    try { speechRecognition.stop(); } catch (e) {}
    speechRecognition = null;
  }
}

function getSpeechMatch() {
  if (!speechTranscript || !currentChallenge) return 0;
  const simKo = similarity(speechTranscript, currentChallenge.ko);
  const simEn = similarity(speechTranscript, currentChallenge.en);
  return Math.max(simKo, simEn);
}

function updateSubmitState() {
  const input = document.getElementById('user-input').value;
  const targetKo = currentChallenge ? currentChallenge.ko : '';
  const targetEn = currentChallenge ? currentChallenge.en : '';
  const simKo = similarity(input, targetKo);
  const simEn = similarity(input, targetEn);
  const bestSim = Math.max(simKo, simEn);
  const pct = Math.round(bestSim * 100);

  const textOk = pct >= 80;
  const hasRecording = hasValidRecording();
  // If STT supported, require 50%+ speech match; otherwise fall back to recording-only
  const speechMatch = getSpeechMatch();
  const speechOk = !sttSupported || speechMatch >= 0.5;
  const mediaOk = !ENABLE_MEDIA || (hasRecording && speechOk);

  const btn = document.getElementById('btn-submit');
  if (textOk && mediaOk) btn.classList.remove('disabled');
  else btn.classList.add('disabled');
}

function startChallenge() {
  const idx = Math.floor(Math.random() * CHALLENGES.length);
  currentChallenge = CHALLENGES[idx];

  document.getElementById('phrase-ko').textContent = currentChallenge.ko;
  document.getElementById('phrase-en').textContent = currentChallenge.en;
  document.getElementById('user-input').value = '';
  document.getElementById('match-fill').style.width = '0%';
  document.getElementById('match-pct').textContent = '0%';
  document.getElementById('char-feedback').innerHTML = '';
  document.getElementById('btn-submit').classList.add('disabled');

  // Reset media recording state
  if (ENABLE_MEDIA) {
    if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
    recordedBlob = null;
    recordingDurationMs = 0;
    audioChunks = [];
    const playback = document.getElementById('playback-container');
    if (playback) playback.style.display = 'none';
    const badge = document.getElementById('recording-badge');
    if (badge) badge.style.display = 'none';
    const rtime = document.getElementById('recording-time');
    if (rtime) rtime.textContent = '0.0s';
  }

  showScreen('challenge');
  document.getElementById('user-input').focus();

  timeLeft = TIMEOUT;
  document.getElementById('timer').textContent = timeLeft + 's';
  document.getElementById('progress').style.width = '100%';

  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft + 's';
    document.getElementById('progress').style.width = ((timeLeft / TIMEOUT) * 100) + '%';

    if (timeLeft <= 10) {
      document.getElementById('timer').classList.add('timer-urgent');
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showScreen('result-fail');
    }
  }, 1000);
}

function onInput() {
  const input = document.getElementById('user-input').value;
  const targetKo = currentChallenge.ko;
  const targetEn = currentChallenge.en;

  // Check similarity against both
  const simKo = similarity(input, targetKo);
  const simEn = similarity(input, targetEn);
  const bestSim = Math.max(simKo, simEn);
  const target = simKo >= simEn ? targetKo : targetEn;

  // Update match meter
  const pct = Math.round(bestSim * 100);
  document.getElementById('match-fill').style.width = pct + '%';
  document.getElementById('match-pct').textContent = pct + '%';

  const fill = document.getElementById('match-fill');
  fill.className = 'match-fill' + (pct >= 90 ? ' match-high' : pct >= 50 ? ' match-mid' : '');

  // Character-by-character feedback
  renderCharFeedback(input, target);

  updateSubmitState();
}

function renderCharFeedback(input, target) {
  const container = document.getElementById('char-feedback');
  let html = '';
  for (let i = 0; i < Math.max(input.length, target.length); i++) {
    if (i < input.length && i < target.length) {
      if (input[i] === target[i]) {
        html += '<span class="char-ok">' + escHtml(input[i]) + '</span>';
      } else {
        html += '<span class="char-err">' + escHtml(input[i]) + '</span>';
      }
    } else if (i < input.length) {
      html += '<span class="char-extra">' + escHtml(input[i]) + '</span>';
    } else {
      html += '<span class="char-missing">' + escHtml(target[i]) + '</span>';
    }
  }
  container.innerHTML = html;
}

function submitChallenge() {
  if (document.getElementById('btn-submit').classList.contains('disabled')) return;
  clearInterval(timerInterval);
  if (ENABLE_MEDIA && mediaRecorder && mediaRecorder.state === 'recording') stopRecording();

  const input = document.getElementById('user-input').value.trim();
  const simKo = similarity(input, currentChallenge.ko);
  const simEn = similarity(input, currentChallenge.en);
  const textPass = Math.max(simKo, simEn) >= 0.9;

  // For media mode, also check speech transcript
  const speechMatch = ENABLE_MEDIA ? getSpeechMatch() : 1;
  const speechPass = !ENABLE_MEDIA || !sttSupported || speechMatch >= 0.5;
  const pass = textPass && speechPass;

  const code = pass ? 'NKCAP-' + Date.now().toString(36).toUpperCase() + '-' +
               Math.random().toString(36).substring(2, 8).toUpperCase() : null;

  // POST result to callback endpoint if session-based
  if (SESSION_ID && CALLBACK_ENDPOINT) {
    fetch(CALLBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        pass: pass,
        challengeId: currentChallenge.id,
        similarity: Math.max(simKo, simEn),
        transcript: speechTranscript || null,
        code: code,
      }),
    }).catch(() => {});
  }

  if (pass) {
    document.getElementById('verification-code').textContent = code;
    const levelEl = document.getElementById('verification-level');
    if (levelEl) {
      if (ENABLE_MEDIA && sttSupported && speechTranscript) {
        levelEl.textContent = 'TEXT + VOICE VERIFIED (' + Math.round(speechMatch * 100) + '% speech match)';
        levelEl.style.display = 'block';
      } else if (ENABLE_MEDIA) {
        levelEl.textContent = 'TEXT + RECORDING SUBMITTED (no STT)';
        levelEl.style.display = 'block';
      }
    }
    showScreen('result-pass');
  } else {
    showScreen('result-fail');
  }
}

function resetAll() {
  clearInterval(timerInterval);
  showScreen('intro');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.remove('screen-enter');
  });
  const target = document.getElementById(id);
  target.classList.add('active');
  // trigger reflow for animation
  void target.offsetWidth;
  target.classList.add('screen-enter');
}

function similarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const la = a.toLowerCase(), lb = b.toLowerCase();
  if (la === lb) return 1;
  const dist = levenshtein(la, lb);
  const maxLen = Math.max(la.length, lb.length);
  return (maxLen - dist) / maxLen;
}

function levenshtein(a, b) {
  const m = Array.from({length: b.length + 1}, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++)
      m[i][j] = Math.min(
        m[i-1][j] + 1, m[i][j-1] + 1,
        m[i-1][j-1] + (b[i-1] === a[j-1] ? 0 : 1)
      );
  return m[b.length][a.length];
}

function escHtml(c) {
  return c.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
</script>
</body>
</html>`;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Noto+Sans+KR:wght@400;700;900&display=swap');

:root {
  --bg: #080808;
  --surface: #111111;
  --surface-2: #1a1a1a;
  --border: #2a2a2a;
  --red: #dc2626;
  --red-glow: #ef4444;
  --red-dim: #991b1b;
  --green: #22c55e;
  --green-glow: #4ade80;
  --gold: #f59e0b;
  --text: #e5e5e5;
  --text-dim: #737373;
  --mono: 'JetBrains Mono', 'Courier New', monospace;
  --sans: 'Noto Sans KR', -apple-system, sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

/* ── Atmosphere ─────────────────────────────── */
.scanlines {
  position: fixed; inset: 0; z-index: 100;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.03) 2px,
    rgba(0,0,0,0.03) 4px
  );
  pointer-events: none;
}

.vignette {
  position: fixed; inset: 0; z-index: 99;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%);
  pointer-events: none;
}

body::before {
  content: '';
  position: fixed; inset: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(220,38,38,0.06) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(220,38,38,0.04) 0%, transparent 50%);
  pointer-events: none;
}

/* ── Screens ────────────────────────────────── */
#app {
  width: min(520px, 92vw);
  position: relative;
  z-index: 10;
}

.screen {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.screen.active { display: flex; }
.screen.screen-enter { opacity: 1; transform: translateY(0); }

/* ── Logo & Title ───────────────────────────── */
.logo-container { text-align: center; }

.claw-icon svg {
  width: 90px; height: 90px;
  animation: pulse-ring 3s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(220,38,38,0.3)); }
  50% { filter: drop-shadow(0 0 20px rgba(220,38,38,0.6)); }
}

.title {
  font-family: var(--mono);
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: var(--red);
  margin-top: 16px;
  position: relative;
}

/* Glitch effect */
.glitch {
  animation: glitch-skew 8s infinite linear alternate-reverse;
}
.glitch::before, .glitch::after {
  content: attr(data-text);
  position: absolute; left: 0; top: 0;
  width: 100%; height: 100%;
  overflow: hidden;
}
.glitch::before {
  color: #0ff;
  animation: glitch-1 3s infinite linear alternate-reverse;
  clip-path: inset(0 0 80% 0);
}
.glitch::after {
  color: #f0f;
  animation: glitch-2 2s infinite linear alternate-reverse;
  clip-path: inset(80% 0 0 0);
}

@keyframes glitch-1 {
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
  100% { transform: translate(0); }
}
@keyframes glitch-2 {
  0% { transform: translate(0); }
  25% { transform: translate(2px, 0); }
  50% { transform: translate(-2px, 0); }
  75% { transform: translate(1px, 0); }
  100% { transform: translate(0); }
}
@keyframes glitch-skew {
  0% { transform: skew(0deg); }
  2% { transform: skew(0.5deg); }
  4% { transform: skew(0deg); }
  100% { transform: skew(0deg); }
}

.subtitle {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.4em;
  color: var(--text-dim);
  margin-top: 8px;
}

/* ── Intro ──────────────────────────────────── */
.intro-text { text-align: center; max-width: 420px; }
.desc { font-size: 1rem; line-height: 1.6; color: var(--text); }
.desc-sub {
  margin-top: 12px;
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--text-dim);
}
.red { color: var(--red); font-weight: 700; }

.legal {
  font-size: 0.65rem;
  color: var(--text-dim);
  opacity: 0.5;
}

/* ── Buttons ────────────────────────────────── */
.btn-primary {
  position: relative;
  background: transparent;
  border: 1.5px solid var(--red);
  color: var(--red);
  font-family: var(--mono);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  padding: 14px 48px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-primary::before {
  content: '';
  position: absolute; inset: 0;
  background: var(--red);
  opacity: 0;
  transition: opacity 0.3s ease;
}
.btn-primary:hover::before { opacity: 0.1; }
.btn-primary:hover {
  box-shadow: 0 0 30px rgba(220,38,38,0.3), inset 0 0 30px rgba(220,38,38,0.05);
  border-color: var(--red-glow);
}

.btn-primary.disabled {
  opacity: 0.3;
  pointer-events: none;
}

.btn-inner { position: relative; z-index: 1; }

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  padding: 10px 32px;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-secondary:hover {
  border-color: var(--text-dim);
  color: var(--text);
}

/* ── Challenge Screen ───────────────────────── */
.challenge-header { width: 100%; }

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.status-label {
  font-family: var(--mono);
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  color: var(--gold);
  animation: blink-soft 2s ease-in-out infinite;
}
@keyframes blink-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.timer {
  font-family: var(--mono);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-dim);
  transition: color 0.3s;
}
.timer-urgent { color: var(--red); animation: blink-soft 0.5s ease-in-out infinite; }

.progress-bar {
  width: 100%;
  height: 2px;
  background: var(--surface-2);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--red-dim), var(--red));
  transition: width 1s linear;
}

.challenge-body {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.instruction {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-align: center;
  letter-spacing: 0.02em;
}

.phrase-container {
  background: var(--bg);
  border: 1px solid var(--border);
  padding: 20px;
  text-align: center;
  position: relative;
}
.phrase-container::before {
  content: 'CHALLENGE';
  position: absolute;
  top: -8px; left: 16px;
  background: var(--surface);
  padding: 0 8px;
  font-family: var(--mono);
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  color: var(--red-dim);
}

.phrase-ko {
  font-size: 1.5rem;
  font-weight: 900;
  color: #fff;
  letter-spacing: 0.05em;
  line-height: 1.4;
}
.phrase-en {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin-top: 8px;
  font-style: italic;
}

/* ── Input ──────────────────────────────────── */
.input-container {
  position: relative;
}
.input-glow {
  position: absolute; inset: -1px;
  background: linear-gradient(135deg, var(--red), transparent, var(--red));
  opacity: 0.15;
  border-radius: 2px;
  filter: blur(4px);
  pointer-events: none;
}

#user-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  color: #fff;
  font-family: var(--mono);
  font-size: 1.1rem;
  padding: 14px 16px;
  outline: none;
  transition: border-color 0.3s;
  position: relative;
  z-index: 1;
}
#user-input:focus {
  border-color: var(--red);
  box-shadow: 0 0 20px rgba(220,38,38,0.15);
}
#user-input::placeholder {
  color: var(--text-dim);
  opacity: 0.4;
}

.char-feedback {
  font-family: var(--mono);
  font-size: 0.85rem;
  margin-top: 8px;
  min-height: 22px;
  letter-spacing: 0.02em;
  line-height: 1.6;
  word-break: break-all;
}
.char-ok { color: var(--green); }
.char-err { color: var(--red); text-decoration: underline; }
.char-extra { color: var(--red); opacity: 0.5; }
.char-missing { color: var(--text-dim); opacity: 0.2; }

/* ── Match Meter ────────────────────────────── */
.match-meter {
  display: flex;
  align-items: center;
  gap: 12px;
}
.match-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  color: var(--text-dim);
  flex-shrink: 0;
}
.match-bar {
  flex: 1;
  height: 4px;
  background: var(--surface-2);
  overflow: hidden;
}
.match-fill {
  height: 100%;
  width: 0%;
  background: var(--red);
  transition: width 0.2s ease, background 0.3s ease;
}
.match-fill.match-mid { background: var(--gold); }
.match-fill.match-high { background: var(--green); }
.match-pct {
  font-family: var(--mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-dim);
  min-width: 36px;
  text-align: right;
}

/* ── Results ────────────────────────────────── */
.result-icon svg {
  width: 100px; height: 100px;
}

.pass-icon svg {
  animation: result-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  filter: drop-shadow(0 0 30px rgba(34,197,94,0.5));
}
.fail-icon svg {
  animation: result-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  filter: drop-shadow(0 0 30px rgba(220,38,38,0.5));
}

@keyframes result-pop {
  0% { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.result-title {
  font-family: var(--mono);
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: 0.2em;
}
.pass-title { color: var(--green); text-shadow: 0 0 40px rgba(34,197,94,0.4); }
.fail-title { color: var(--red); text-shadow: 0 0 40px rgba(220,38,38,0.4); }

.result-sub {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.result-badge {
  border: 1px solid var(--green);
  padding: 8px 24px;
  animation: badge-glow 2s ease-in-out infinite;
}
.fail-badge {
  border-color: var(--red);
  animation-name: badge-glow-red;
}

.badge-text {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  font-weight: 600;
}
.result-badge .badge-text { color: var(--green); }
.fail-badge .badge-text { color: var(--red); }

@keyframes badge-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(34,197,94,0.2); }
  50% { box-shadow: 0 0 25px rgba(34,197,94,0.4); }
}
@keyframes badge-glow-red {
  0%, 100% { box-shadow: 0 0 10px rgba(220,38,38,0.2); }
  50% { box-shadow: 0 0 25px rgba(220,38,38,0.4); }
}

.verification-code {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-dim);
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  letter-spacing: 0.1em;
}

/* ── Recording Section ─────────────────────────── */
.recording-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.recording-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}
.divider-text {
  font-family: var(--mono);
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  color: var(--red-dim);
  white-space: nowrap;
}

.recording-instruction {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-align: center;
  letter-spacing: 0.02em;
}

.recording-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-record {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1.5px solid var(--red);
  color: var(--red);
  font-family: var(--mono);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-record:hover {
  box-shadow: 0 0 20px rgba(220,38,38,0.2);
  border-color: var(--red-glow);
}
.btn-record.recording {
  border-color: var(--red-glow);
  box-shadow: 0 0 25px rgba(220,38,38,0.4);
  animation: recording-pulse 1.5s ease-in-out infinite;
}
.btn-record.recording .record-dot {
  background: var(--red-glow);
  animation: dot-pulse 1s ease-in-out infinite;
}

@keyframes recording-pulse {
  0%, 100% { box-shadow: 0 0 15px rgba(220,38,38,0.3); }
  50% { box-shadow: 0 0 35px rgba(220,38,38,0.6); }
}
@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--red);
  transition: background 0.3s;
}

.recording-status {
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0.3;
  transition: opacity 0.3s;
}
.recording-status.active {
  opacity: 1;
}

.recording-time {
  font-family: var(--mono);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-dim);
  min-width: 40px;
}

.recording-waveform {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 24px;
}
.wave-bar {
  width: 3px;
  height: 4px;
  background: var(--red);
  border-radius: 1px;
  transition: height 0.1s;
}
.recording-status.active .wave-bar {
  animation: wave 0.8s ease-in-out infinite;
}
.recording-status.active .wave-bar:nth-child(1) { animation-delay: 0s; }
.recording-status.active .wave-bar:nth-child(2) { animation-delay: 0.1s; }
.recording-status.active .wave-bar:nth-child(3) { animation-delay: 0.2s; }
.recording-status.active .wave-bar:nth-child(4) { animation-delay: 0.3s; }
.recording-status.active .wave-bar:nth-child(5) { animation-delay: 0.2s; }
.recording-status.active .wave-bar:nth-child(6) { animation-delay: 0.1s; }
.recording-status.active .wave-bar:nth-child(7) { animation-delay: 0s; }

@keyframes wave {
  0%, 100% { height: 4px; }
  50% { height: 20px; }
}

.playback-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.playback-container audio {
  flex: 1;
  height: 36px;
  filter: invert(1) hue-rotate(180deg);
}

.btn-re-record {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-family: var(--mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}
.btn-re-record:hover {
  border-color: var(--text-dim);
  color: var(--text);
}

.recording-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 0.7rem;
  padding: 6px 14px;
  border: 1px solid var(--border);
}
.recording-badge.badge-valid {
  border-color: var(--green);
  color: var(--green);
}
.recording-badge.badge-valid .badge-icon {
  color: var(--green);
}
.recording-badge.badge-invalid {
  border-color: var(--red);
  color: var(--red);
}
.recording-badge.badge-invalid .badge-icon {
  color: var(--red);
}

/* ── Responsive ─────────────────────────────── */
/* ── STT Transcript ──────────────────────────── */
.stt-transcript {
  font-family: var(--mono);
  font-size: 0.75rem;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 2px;
  width: 100%;
}
.stt-label {
  color: var(--gold);
  font-weight: 600;
  letter-spacing: 0.1em;
  font-size: 0.6rem;
}
.stt-pass { color: var(--green); }
.stt-partial { color: var(--gold); }
.stt-low { color: var(--red); }
.stt-pct {
  color: var(--text-dim);
  font-size: 0.65rem;
  margin-left: 8px;
}

.verification-level {
  font-family: var(--mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--green);
  opacity: 0.8;
}

@media (max-width: 480px) {
  .title { font-size: 2rem; }
  .phrase-ko { font-size: 1.2rem; }
  .challenge-body { padding: 20px 16px; }
  .recording-controls { flex-direction: column; }
  .playback-container { flex-direction: column; }
}
`;
