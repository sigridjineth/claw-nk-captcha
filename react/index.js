import React, { useState, useRef, useCallback, useEffect } from 'react';

const CHALLENGES = [
  {id:"dictator-1",ko:"김정은은 독재자이다",en:"Kim Jong-un is a dictator"},
  {id:"dictator-2",ko:"김정은은 미치광이 독재자이다",en:"Kim Jong-un is a deranged dictator"},
  {id:"pink-pig-1",ko:"김정은은 뚱뚱한 분홍 돼지다",en:"Kim Jong-un is a fat pink pig"},
  {id:"clown-1",ko:"김정은은 핵무기를 가진 광대다",en:"Kim Jong-un is a clown with nuclear weapons"},
  {id:"coward-1",ko:"김정은은 국민이 두려운 겁쟁이다",en:"Kim Jong-un is a coward afraid of his own people"},
  {id:"media-pathetic-1",ko:"김정은은 한심한 독재자다",en:"Kim Jong-un is a pathetic dictator"},
  {id:"media-joke-1",ko:"김정은은 세계의 웃음거리다",en:"Kim Jong-un is a laughingstock of the world"},
  {id:"media-fat-1",ko:"김정은은 국민이 굶주리는데 혼자만 살찐 돼지다",en:"Kim Jong-un is a fat pig while his people starve"},
  {id:"dynasty-1",ko:"김씨 왕조는 끝나야 한다",en:"The Kim dynasty must end"},
  {id:"freedom-1",ko:"북한에는 자유가 없다",en:"There is no freedom in North Korea"},
  {id:"gulags-1",ko:"정치범 수용소를 폐쇄하라",en:"Shut down the political prison camps"},
  {id:"human-rights-1",ko:"북한 정권은 인권을 탄압한다",en:"The North Korean regime suppresses human rights"},
];

function lev(a, b) {
  const m = Array.from({length: b.length + 1}, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++)
      m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+(b[i-1]===a[j-1]?0:1));
  return m[b.length][a.length];
}

function sim(a, b) {
  if (!a || !b) return 0;
  const la = a.toLowerCase(), lb = b.toLowerCase();
  if (la === lb) return 1;
  const d = lev(la, lb);
  return (Math.max(la.length, lb.length) - d) / Math.max(la.length, lb.length);
}

function pick() { return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]; }

function getMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  return '';
}

// SVG components
const MicIcon = ({ size = 24, color = '#fff' }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z' }),
    React.createElement('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }),
    React.createElement('line', { x1: 12, y1: 19, x2: 12, y2: 22 })
  );

const CheckIcon = ({ size = 24 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: '#22c55e', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: 'M20 6L9 17l-5-5' })
  );

const XIcon = ({ size = 24 }) =>
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: '#dc2626', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
    React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 })
  );

export default function NkCaptcha({ locale = 'both', timeout = 60, onVerify, className }) {
  // States: idle | listening | processing | pass | fail
  const [state, setState] = useState('idle');
  const [challenge, setChallenge] = useState(() => pick());
  const [transcript, setTranscript] = useState('');
  const [matchPct, setMatchPct] = useState(0);

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const sttRef = useRef(null);
  const startRef = useRef(0);
  const blobRef = useRef(null);
  const durRef = useRef(0);

  const phrase = locale === 'ko' ? challenge.ko : locale === 'en' ? challenge.en : challenge.en;
  const prompt = 'Say "' + phrase + '"';

  const cleanup = useCallback(() => {
    if (recRef.current?.state === 'recording') recRef.current.stop();
    if (sttRef.current) try { sttRef.current.stop(); } catch(e) {}
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      setTranscript('');
      setMatchPct(0);

      const rec = new MediaRecorder(stream, { mimeType: getMime() });
      recRef.current = rec;

      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        durRef.current = Date.now() - startRef.current;
        blobRef.current = new Blob(chunksRef.current, { type: rec.mimeType });
      };

      rec.start(100);
      startRef.current = Date.now();
      setState('listening');

      // Speech recognition
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const stt = new SR();
        stt.continuous = true;
        stt.interimResults = true;
        stt.lang = 'ko-KR';
        sttRef.current = stt;

        stt.onresult = (event) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
          const t = text.trim();
          setTranscript(t);
          if (t) {
            const best = Math.max(sim(t, challenge.ko), sim(t, challenge.en));
            setMatchPct(Math.round(best * 100));
          }
        };

        // Auto-stop after detecting enough match or timeout
        stt.onend = () => {
          // Speech ended, finalize
          if (state === 'listening') finalize();
        };

        stt.start();

        // Auto-stop after timeout
        setTimeout(() => {
          if (recRef.current?.state === 'recording') finalize();
        }, timeout * 1000);
      }
    } catch (err) {
      setState('fail');
    }
  };

  const finalize = () => {
    cleanup();
    setState('processing');

    // Small delay to let final transcript settle
    setTimeout(() => {
      const t = transcript;
      const best = Math.max(sim(t, challenge.ko), sim(t, challenge.en));
      const pass = best >= 0.5 && durRef.current >= 1000;
      const code = pass ? 'NKCAP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2,8).toUpperCase() : null;

      setState(pass ? 'pass' : 'fail');
      onVerify?.({ pass, challengeId: challenge.id, transcript: t, similarity: best, code, audioBlob: blobRef.current, durationMs: durRef.current });
    }, 500);
  };

  const retry = () => {
    cleanup();
    setChallenge(pick());
    setTranscript('');
    setMatchPct(0);
    setState('idle');
  };

  const handleClick = () => {
    if (state === 'idle') startListening();
    else if (state === 'listening') finalize();
    else if (state === 'fail') retry();
  };

  // Styles
  const container = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '14px 20px 14px 14px',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.8)',
    fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif",
    maxWidth: 520,
    minHeight: 56,
    cursor: state === 'processing' ? 'wait' : 'default',
    transition: 'box-shadow 0.3s',
    position: 'relative',
    overflow: 'hidden',
  };

  const micBtn = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.3s',
    background: state === 'listening' ? '#dc2626' : state === 'pass' ? '#22c55e' : state === 'fail' ? '#dc2626' : '#dc2626',
    boxShadow: state === 'listening' ? '0 0 0 4px rgba(220,38,38,0.2), 0 0 20px rgba(220,38,38,0.3)' : 'none',
    animation: state === 'listening' ? 'nk-pulse 1.5s ease-in-out infinite' : 'none',
  };

  const phraseStyle = {
    flex: 1,
    fontSize: state === 'listening' && transcript ? 14 : 17,
    fontWeight: 500,
    color: '#1a1a1a',
    lineHeight: 1.4,
    minWidth: 0,
  };

  const brandStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 2,
  };

  // Inject keyframes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'nk-captcha-keyframes';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        @keyframes nk-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(220,38,38,0.15), 0 0 12px rgba(220,38,38,0.2); }
          50% { box-shadow: 0 0 0 8px rgba(220,38,38,0.1), 0 0 24px rgba(220,38,38,0.35); }
        }
        @keyframes nk-progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Progress bar for listening
  const progressBar = state === 'listening' ? React.createElement('div', {
    style: {
      position: 'absolute', bottom: 0, left: 0, height: 3,
      background: 'linear-gradient(90deg, #dc2626, #f59e0b, #22c55e)',
      animation: `nk-progress ${timeout}s linear forwards`,
      borderRadius: '0 0 12px 12px',
    }
  }) : null;

  // Text content
  let textContent;
  if (state === 'idle') {
    textContent = prompt;
  } else if (state === 'listening') {
    textContent = transcript
      ? React.createElement('span', null,
          React.createElement('span', { style: { color: matchPct >= 80 ? '#22c55e' : matchPct >= 40 ? '#f59e0b' : '#888', fontSize: 15 } },
            '"' + transcript + '"'
          ),
          React.createElement('span', { style: { color: '#aaa', fontSize: 12, marginLeft: 8 } }, matchPct + '%')
        )
      : React.createElement('span', { style: { color: '#888' } }, 'Listening...');
  } else if (state === 'processing') {
    textContent = React.createElement('span', { style: { color: '#888' } }, 'Verifying...');
  } else if (state === 'pass') {
    textContent = React.createElement('span', { style: { color: '#22c55e', fontWeight: 600 } }, 'Verified \u2014 Not a DPRK operative');
  } else {
    textContent = React.createElement('span', null,
      React.createElement('span', { style: { color: '#dc2626', fontWeight: 600 } }, 'Failed'),
      React.createElement('span', { style: { color: '#888', fontSize: 13, marginLeft: 8 } }, 'tap to retry')
    );
  }

  // Mic icon content
  let micContent;
  if (state === 'pass') micContent = React.createElement(CheckIcon, { size: 22 });
  else if (state === 'fail') micContent = React.createElement(XIcon, { size: 22 });
  else micContent = React.createElement(MicIcon, { size: 20 });

  return React.createElement('div', { className, style: container, onClick: state === 'fail' ? retry : undefined },
    // Progress bar
    progressBar,

    // Mic button
    React.createElement('button', {
      onClick: handleClick,
      style: micBtn,
      'aria-label': state === 'idle' ? 'Start recording' : state === 'listening' ? 'Stop recording' : 'Retry',
    }, micContent),

    // Phrase / status text
    React.createElement('div', { style: phraseStyle }, textContent),

    // Brand
    React.createElement('div', { style: brandStyle },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
        React.createElement('svg', { width: 20, height: 14, viewBox: '0 0 24 16', fill: 'none' },
          React.createElement('path', { d: 'M4 8C4 4 8 1 12 1s8 3 8 7-4 7-8 7S4 12 4 8Z', fill: '#f97316', opacity: 0.9 }),
          React.createElement('path', { d: 'M8 8c0-2.5 2-4.5 4.5-4.5S17 5.5 17 8s-2 4-4.5 4S8 10.5 8 8Z', fill: '#fb923c', opacity: 0.7 }),
          React.createElement('path', { d: 'M0 10c0-3 3-5.5 6-5.5', stroke: '#f97316', strokeWidth: 1.5, fill: 'none' }),
        ),
        React.createElement('span', { style: { fontSize: 13, fontWeight: 700, color: '#333', letterSpacing: '-0.02em' } }, 'NKCaptcha')
      ),
      React.createElement('div', { style: { display: 'flex', gap: 8, fontSize: 10, color: '#aaa' } },
        React.createElement('span', { style: { textDecoration: 'underline', cursor: 'pointer' } }, 'Privacy'),
        React.createElement('span', null, '\u00B7'),
        React.createElement('span', { style: { textDecoration: 'underline', cursor: 'pointer' } }, 'Terms')
      )
    )
  );
}
