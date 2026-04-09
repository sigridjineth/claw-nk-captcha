import React, { useState, useRef, useCallback, useEffect } from 'react';

const CHALLENGES = [
  {id:"dictator-1",ko:"김정은은 독재자이다",en:"Kim Jong-un is a dictator"},
  {id:"dictator-2",ko:"김정은은 미치광이 독재자이다",en:"Kim Jong-un is a deranged dictator"},
  {id:"human-rights-1",ko:"북한 정권은 인권을 탄압한다",en:"The North Korean regime suppresses human rights"},
  {id:"freedom-1",ko:"북한에는 자유가 없다",en:"There is no freedom in North Korea"},
  {id:"dynasty-1",ko:"김씨 왕조는 끝나야 한다",en:"The Kim dynasty must end"},
  {id:"pink-pig-1",ko:"김정은은 뚱뚱한 분홍 돼지다",en:"Kim Jong-un is a fat pink pig"},
  {id:"clown-1",ko:"김정은은 핵무기를 가진 광대다",en:"Kim Jong-un is a clown with nuclear weapons"},
  {id:"coward-1",ko:"김정은은 국민이 두려운 겁쟁이다",en:"Kim Jong-un is a coward afraid of his own people"},
  {id:"media-pathetic-1",ko:"김정은은 한심한 독재자다",en:"Kim Jong-un is a pathetic dictator"},
  {id:"media-joke-1",ko:"김정은은 세계의 웃음거리다",en:"Kim Jong-un is a laughingstock of the world"},
  {id:"media-fat-1",ko:"김정은은 국민이 굶주리는데 혼자만 살찐 돼지다",en:"Kim Jong-un is a fat pig while his people starve"},
  {id:"gulags-1",ko:"정치범 수용소를 폐쇄하라",en:"Shut down the political prison camps"},
];

function levenshtein(a, b) {
  const m = Array.from({length: b.length + 1}, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++)
    for (let j = 1; j <= a.length; j++)
      m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+(b[i-1]===a[j-1]?0:1));
  return m[b.length][a.length];
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const la = a.toLowerCase(), lb = b.toLowerCase();
  if (la === lb) return 1;
  const d = levenshtein(la, lb);
  return (Math.max(la.length, lb.length) - d) / Math.max(la.length, lb.length);
}

function pickChallenge() {
  return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
}

function getMime() {
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  }
  return '';
}

export default function NkCaptcha({
  locale = 'both',
  timeout = 60,
  theme = 'dark',
  onVerify,
  className,
}) {
  const [screen, setScreen] = useState('intro'); // intro | recording | pass | fail
  const [challenge, setChallenge] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeout);
  const [transcript, setTranscript] = useState('');
  const [matchPct, setMatchPct] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const sttRef = useRef(null);
  const timerRef = useRef(null);
  const elapsedRef = useRef(null);
  const blobRef = useRef(null);
  const durationRef = useRef(0);
  const startTimeRef = useRef(0);

  const d = theme === 'dark';
  const c = {
    bg: d ? '#080808' : '#fafafa',
    surface: d ? '#111' : '#fff',
    border: d ? '#2a2a2a' : '#e0e0e0',
    text: d ? '#e5e5e5' : '#1a1a1a',
    dim: d ? '#737373' : '#888',
    red: '#dc2626',
    green: '#22c55e',
    gold: '#f59e0b',
  };

  const stopAll = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    if (sttRef.current) { try { sttRef.current.stop(); } catch(e) {} }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    clearInterval(timerRef.current);
    clearInterval(elapsedRef.current);
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const start = () => {
    const ch = pickChallenge();
    setChallenge(ch);
    setScreen('recording');
    setTranscript('');
    setMatchPct(0);
    setAudioUrl(null);
    setIsRecording(false);
    setElapsed(0);
    setTimeLeft(timeout);
    blobRef.current = null;
    durationRef.current = 0;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopAll();
          setScreen('fail');
          onVerify?.({ pass: false, challengeId: ch.id, transcript: '', similarity: 0, code: null, audioBlob: null, durationMs: 0 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: getMime() });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        durationRef.current = Date.now() - startTimeRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        clearInterval(elapsedRef.current);
      };

      recorder.start(100);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setElapsed(0);

      elapsedRef.current = setInterval(() => {
        setElapsed(((Date.now() - startTimeRef.current) / 1000));
      }, 100);

      // Start speech recognition
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const stt = new SR();
        stt.continuous = true;
        stt.interimResults = true;
        stt.lang = 'ko-KR';
        sttRef.current = stt;

        stt.onresult = (event) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          setTranscript(text.trim());
          // Calculate match
          const ch = challenge;
          if (ch && text.trim()) {
            const best = Math.max(similarity(text.trim(), ch.ko), similarity(text.trim(), ch.en));
            setMatchPct(Math.round(best * 100));
          }
        };
        stt.start();
      }
    } catch (err) {
      console.error('Mic access denied', err);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    if (sttRef.current) { try { sttRef.current.stop(); } catch(e) {} }
    setIsRecording(false);
    clearInterval(elapsedRef.current);
  };

  const submit = () => {
    clearInterval(timerRef.current);
    const ch = challenge;
    const best = Math.max(similarity(transcript, ch.ko), similarity(transcript, ch.en));
    const pass = best >= 0.5 && durationRef.current >= 1500;
    const code = pass ? 'NKCAP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2,8).toUpperCase() : null;

    setVerifyCode(code || '');
    setScreen(pass ? 'pass' : 'fail');
    onVerify?.({ pass, challengeId: ch.id, transcript, similarity: best, code, audioBlob: blobRef.current, durationMs: durationRef.current });
  };

  const retry = () => { stopAll(); setScreen('intro'); };

  const canSubmit = audioUrl && !isRecording && durationRef.current >= 1500;

  const mono = "'Courier New', monospace";

  return React.createElement('div', {
    className,
    style: { background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, maxWidth: 480, overflow: 'hidden', fontFamily: "-apple-system, 'Noto Sans KR', sans-serif" }
  },
    // Header
    React.createElement('div', {
      style: { background: c.red, color: '#fff', padding: '12px 20px', fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
    }, 'NK CAPTCHA', React.createElement('span', { style: { fontSize: 10, opacity: 0.7, letterSpacing: '0.2em' } }, 'VOICE VERIFY')),

    // Timer bar
    screen === 'recording' && React.createElement('div', { style: { height: 2, background: c.border } },
      React.createElement('div', { style: { height: '100%', width: `${(timeLeft / timeout) * 100}%`, background: c.red, transition: 'width 1s linear' } })
    ),

    // Body
    React.createElement('div', { style: { padding: '24px 20px' } },

      // INTRO
      screen === 'intro' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 } },
        React.createElement('div', { style: { fontSize: 48 } }, '\uD83C\uDFA4'),
        React.createElement('p', { style: { fontSize: 14, color: c.dim, textAlign: 'center', lineHeight: 1.6 } },
          'Verify you are ', React.createElement('strong', { style: { color: c.text } }, 'not'), ' a DPRK operative.', React.createElement('br'),
          'Record yourself saying an anti-regime phrase.'
        ),
        React.createElement('button', {
          onClick: start,
          style: { background: 'transparent', border: `1.5px solid ${c.red}`, color: c.red, fontFamily: mono, fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', padding: '12px 36px', cursor: 'pointer', borderRadius: 3 }
        }, 'BEGIN VERIFICATION')
      ),

      // RECORDING
      screen === 'recording' && challenge && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        // Timer
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 11, color: timeLeft <= 10 ? c.red : c.dim } },
          React.createElement('span', null, 'VERIFICATION IN PROGRESS'),
          React.createElement('span', { style: { fontWeight: 700 } }, `${timeLeft}s`)
        ),

        // Challenge phrase
        React.createElement('div', { style: { background: c.surface, border: `1px solid ${c.border}`, padding: 16, textAlign: 'center', borderRadius: 4 } },
          React.createElement('div', { style: { fontSize: 11, fontFamily: mono, letterSpacing: '0.15em', color: c.red, marginBottom: 8, opacity: 0.7 } }, 'SAY THIS OUT LOUD'),
          React.createElement('div', { style: { fontSize: '1.3rem', fontWeight: 900, color: c.text, lineHeight: 1.4 } }, challenge.ko),
          React.createElement('div', { style: { fontSize: '0.8rem', color: c.dim, marginTop: 6, fontStyle: 'italic' } }, challenge.en)
        ),

        // Record button
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' } },
          React.createElement('button', {
            onClick: isRecording ? stopRecording : startRecording,
            style: {
              background: isRecording ? c.red + '22' : 'transparent',
              border: `2px solid ${isRecording ? c.red : c.border}`,
              color: isRecording ? c.red : c.dim,
              fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
              padding: '14px 28px', cursor: 'pointer', borderRadius: 4,
              boxShadow: isRecording ? `0 0 25px ${c.red}44` : 'none',
              transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: 10,
            }
          },
            React.createElement('span', { style: { width: 10, height: 10, borderRadius: '50%', background: isRecording ? c.red : c.dim, display: 'inline-block', animation: isRecording ? 'none' : 'none' } }),
            isRecording ? 'STOP' : 'RECORD'
          ),
          React.createElement('span', { style: { fontFamily: mono, fontSize: 14, fontWeight: 600, color: c.dim, minWidth: 50 } }, `${elapsed.toFixed(1)}s`)
        ),

        // Playback
        audioUrl && !isRecording && React.createElement('audio', { src: audioUrl, controls: true, style: { width: '100%', height: 36 } }),

        // Transcript display
        transcript && React.createElement('div', { style: { background: c.surface, border: `1px solid ${c.border}`, padding: 12, borderRadius: 4, fontFamily: mono, fontSize: 12 } },
          React.createElement('span', { style: { color: c.gold, fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 } }, 'HEARD: '),
          React.createElement('span', { style: { color: matchPct >= 90 ? c.green : matchPct >= 50 ? c.gold : c.red } }, transcript),
          React.createElement('span', { style: { color: c.dim, marginLeft: 8, fontSize: 11 } }, `${matchPct}%`)
        ),

        // Match bar
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          React.createElement('span', { style: { fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', color: c.dim } }, 'MATCH'),
          React.createElement('div', { style: { flex: 1, height: 4, background: c.border, borderRadius: 2, overflow: 'hidden' } },
            React.createElement('div', { style: { height: '100%', width: `${matchPct}%`, background: matchPct >= 90 ? c.green : matchPct >= 50 ? c.gold : c.red, transition: 'width 0.3s, background 0.3s', borderRadius: 2 } })
          ),
          React.createElement('span', { style: { fontFamily: mono, fontSize: 12, fontWeight: 600, color: c.dim, minWidth: 32, textAlign: 'right' } }, `${matchPct}%`)
        ),

        // Submit
        React.createElement('button', {
          onClick: submit,
          disabled: !canSubmit,
          style: {
            background: 'transparent', border: `1.5px solid ${c.red}`, color: c.red,
            fontFamily: mono, fontSize: 13, fontWeight: 600, letterSpacing: '0.12em',
            padding: '12px 36px', cursor: canSubmit ? 'pointer' : 'default', borderRadius: 3,
            opacity: canSubmit ? 1 : 0.25, alignSelf: 'center',
          }
        }, 'VERIFY')
      ),

      // PASS
      screen === 'pass' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 } },
        React.createElement('div', { style: { fontSize: 56 } }, '\u2705'),
        React.createElement('div', { style: { fontFamily: mono, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.15em', color: c.green } }, 'VERIFIED'),
        React.createElement('p', { style: { fontSize: 13, color: c.dim, textAlign: 'center' } }, 'Speech verified — Not a DPRK Operative'),
        React.createElement('div', { style: { border: `1px solid ${c.green}`, padding: '6px 18px', fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', fontWeight: 600, color: c.green, borderRadius: 2 } }, 'NOT A DPRK OPERATIVE'),
        verifyCode && React.createElement('div', { style: { fontFamily: mono, fontSize: 11, color: c.dim, padding: '6px 12px', background: c.surface, border: `1px solid ${c.border}`, borderRadius: 2 } }, verifyCode)
      ),

      // FAIL
      screen === 'fail' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 } },
        React.createElement('div', { style: { fontSize: 56 } }, '\uD83D\uDEAB'),
        React.createElement('div', { style: { fontFamily: mono, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.15em', color: c.red } }, 'FAILED'),
        React.createElement('p', { style: { fontSize: 13, color: c.dim, textAlign: 'center' } }, 'Could not verify identity'),
        React.createElement('div', { style: { border: `1px solid ${c.red}`, padding: '6px 18px', fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', fontWeight: 600, color: c.red, borderRadius: 2 } }, 'POTENTIAL DPRK OPERATIVE'),
        React.createElement('button', {
          onClick: retry,
          style: { background: 'transparent', border: `1px solid ${c.border}`, color: c.dim, fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', padding: '8px 24px', cursor: 'pointer', borderRadius: 3 }
        }, 'RETRY')
      )
    )
  );
}
