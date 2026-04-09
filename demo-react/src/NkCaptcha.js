import React, { useState, useRef, useCallback, useEffect } from 'react';

// ── Challenge Data ──────────────────────────────────────────
const CHALLENGES = [
  {id:"dictator-1",ko:"김정은은 독재자이다",en:"Kim Jong-un is a dictator"},
  {id:"pink-pig-1",ko:"김정은은 뚱뚱한 분홍 돼지다",en:"Kim Jong-un is a fat pink pig"},
  {id:"clown-1",ko:"김정은은 핵무기를 가진 광대다",en:"Kim Jong-un is a clown with nuclear weapons"},
  {id:"coward-1",ko:"김정은은 국민이 두려운 겁쟁이다",en:"Kim Jong-un is a coward afraid of his own people"},
  {id:"media-pathetic-1",ko:"김정은은 한심한 독재자다",en:"Kim Jong-un is a pathetic dictator"},
  {id:"media-joke-1",ko:"김정은은 세계의 웃음거리다",en:"Kim Jong-un is a laughingstock of the world"},
  {id:"media-fat-1",ko:"김정은은 국민이 굶주리는데 혼자만 살찐 돼지다",en:"Kim Jong-un is a fat pig while his people starve"},
  {id:"dynasty-1",ko:"김씨 왕조는 끝나야 한다",en:"The Kim dynasty must end"},
  {id:"freedom-1",ko:"북한에는 자유가 없다",en:"There is no freedom in North Korea"},
  {id:"gulags-1",ko:"정치범 수용소를 폐쇄하라",en:"Shut down the political prison camps"},
];

function lev(a,b){const m=Array.from({length:b.length+1},(_,i)=>[i]);for(let j=0;j<=a.length;j++)m[0][j]=j;for(let i=1;i<=b.length;i++)for(let j=1;j<=a.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(b[i-1]===a[j-1]?0:1));return m[b.length][a.length]}
function sim(a,b){if(!a||!b)return 0;const la=a.toLowerCase(),lb=b.toLowerCase();if(la===lb)return 1;const d=lev(la,lb);return(Math.max(la.length,lb.length)-d)/Math.max(la.length,lb.length)}
function pick(){return CHALLENGES[Math.floor(Math.random()*CHALLENGES.length)]}
function getMime(){if(typeof MediaRecorder==='undefined')return'';if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))return'audio/webm;codecs=opus';if(MediaRecorder.isTypeSupported('audio/webm'))return'audio/webm';return''}

// ── Styles ──────────────────────────────────────────────────
const S = {
  widget: { background:'#fff', border:'1px solid #d9d9d9', borderRadius:3, maxWidth:420, overflow:'hidden', boxShadow:'0 2px 5px rgba(0,0,0,0.08)', fontFamily:"'Inter',-apple-system,sans-serif" },
  header: { padding:'14px 18px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between' },
  headerLeft: { display:'flex', alignItems:'center', gap:10 },
  icon: { width:30, height:30, background:'#dc2626', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  title: { fontSize:13, fontWeight:600, color:'#333' },
  subtitle: { fontSize:10, color:'#999', marginTop:1 },
  brand: { textAlign:'right' },
  brandName: { fontSize:10, fontWeight:700, color:'#555' },
  brandLinks: { fontSize:8, color:'#bbb' },
  body: { padding:'20px 18px' },
  footer: { padding:'8px 18px', borderTop:'1px solid #eee', display:'flex', justifyContent:'space-between', fontSize:9, color:'#bbb', background:'#fafafa' },
  // Steps
  steps: { display:'flex', gap:0, marginBottom:16 },
  step: (active,done) => ({ flex:1, height:3, borderRadius:2, background: done?'#22c55e': active?'#dc2626':'#e5e5e5', transition:'background 0.3s' }),
  stepLabel: { display:'flex', justifyContent:'space-between', marginBottom:12, fontSize:10, color:'#aaa' },
  // Puzzle
  grid: (n) => ({ display:'grid', gridTemplateColumns:`repeat(${n},1fr)`, gap:2, borderRadius:3, overflow:'hidden' }),
  piece: { aspectRatio:'1', backgroundSize:'cover', cursor:'grab', borderRadius:1, transition:'transform 0.1s' },
  // Voice
  micBtn: (recording) => ({
    width:52, height:52, borderRadius:'50%', border:'none', cursor:'pointer',
    background: recording?'#dc2626':'#f5f5f5',
    boxShadow: recording?'0 0 0 4px rgba(220,38,38,0.15)':'0 1px 3px rgba(0,0,0,0.1)',
    display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.3s',
  }),
  transcript: { background:'#f9f9f9', border:'1px solid #eee', borderRadius:4, padding:'10px 12px', fontSize:12, marginTop:12 },
  // Buttons
  btn: { background:'#dc2626', color:'#fff', border:'none', padding:'9px 24px', borderRadius:4, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  btnOutline: { background:'none', border:'1px solid #ddd', color:'#666', padding:'7px 18px', borderRadius:4, fontSize:11, cursor:'pointer', fontFamily:'inherit' },
  // Result
  badge: (pass) => ({ display:'inline-block', padding:'4px 14px', borderRadius:3, fontSize:10, fontWeight:600, letterSpacing:'0.03em', background:pass?'#dcfce7':'#fef2f2', color:pass?'#16a34a':'#dc2626' }),
};

// ── Icons ───────────────────────────────────────────────────
const PuzzleIcon = () => React.createElement('svg',{width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'#fff',strokeWidth:2.5},
  React.createElement('rect',{x:3,y:3,width:7,height:7}),React.createElement('rect',{x:14,y:3,width:7,height:7}),
  React.createElement('rect',{x:3,y:14,width:7,height:7}),React.createElement('rect',{x:14,y:14,width:7,height:7}));

const MicIcon = ({color='#666',size=22}) => React.createElement('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:color,strokeWidth:2,strokeLinecap:'round'},
  React.createElement('path',{d:'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z'}),
  React.createElement('path',{d:'M19 10v2a7 7 0 0 1-14 0v-2'}),
  React.createElement('line',{x1:12,y1:19,x2:12,y2:22}));

// ── Main Component ──────────────────────────────────────────
export default function NkCaptcha({
  imageUrl = 'https://raw.githubusercontent.com/sigridjineth/claw-nk-captcha/main/assets/kim-pigface.png',
  gridSize: initGrid = 3,
  locale = 'en',
  timeout = 120,
  onVerify,
  className,
}) {
  // step: 0=intro, 1=puzzle, 2=voice, 3=pass, 4=fail
  const [step, setStep] = useState(0);
  const [challenge] = useState(() => pick());
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [voicePassed, setVoicePassed] = useState(false);

  // Puzzle state
  const [pieces, setPieces] = useState([]);
  const [moves, setMoves] = useState(0);
  const gridRef = useRef(null);
  const dragRef = useRef(null);

  // Voice state
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [matchPct, setMatchPct] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const sttRef = useRef(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(null);
  const blobRef = useRef(null);
  const durRef = useRef(0);

  // Timer
  const [timeLeft, setTimeLeft] = useState(timeout);
  const timerRef = useRef(null);

  const phrase = locale === 'ko' ? challenge.ko : challenge.en;

  // ── Start puzzle ──────────────────────────────────────────
  const startPuzzle = () => {
    const total = initGrid * initGrid;
    const arr = Array.from({length: total}, (_, i) => i);
    for (let i = total - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setPieces(arr);
    setMoves(0);
    setStep(1);
    setTimeLeft(timeout);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setStep(4); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Puzzle swap ───────────────────────────────────────────
  const swapPieces = (i, j) => {
    setPieces(prev => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      // Check win
      const solved = next.every((v, idx) => v === idx);
      if (solved) {
        setPuzzleSolved(true);
        setTimeout(() => setStep(2), 600);
      }
      return next;
    });
    setMoves(m => m + 1);
  };

  // ── Voice recording ───────────────────────────────────────
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, {mimeType:getMime()});
      recRef.current = rec;
      rec.ondataavailable = e => { if(e.data.size>0)chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(t=>t.stop());
        durRef.current = Date.now()-startRef.current;
        blobRef.current = new Blob(chunksRef.current,{type:rec.mimeType});
        setAudioUrl(URL.createObjectURL(blobRef.current));
        clearInterval(elapsedRef.current);
      };
      rec.start(100);
      startRef.current = Date.now();
      setRecording(true);
      setTranscript('');
      setMatchPct(0);
      setAudioUrl(null);
      elapsedRef.current = setInterval(()=>setElapsed((Date.now()-startRef.current)/1000), 100);

      const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
      if(SR){
        const stt = new SR();
        stt.continuous=true; stt.interimResults=true; stt.lang= locale === 'ko' ? 'ko-KR' : 'en-US';
        sttRef.current = stt;
        stt.onresult = ev => {
          let t='';
          for(let i=0;i<ev.results.length;i++) t+=ev.results[i][0].transcript;
          const txt = t.trim();
          setTranscript(txt);
          if(txt){
            const best=Math.max(sim(txt,challenge.ko),sim(txt,challenge.en));
            setMatchPct(Math.round(best*100));
          }
        };
        stt.start();
      }
    } catch(e) {}
  };

  const stopRec = () => {
    if(recRef.current?.state==='recording') recRef.current.stop();
    if(sttRef.current) try{sttRef.current.stop();}catch(e){}
    setRecording(false);
    clearInterval(elapsedRef.current);
  };

  const submitVoice = () => {
    const best = Math.max(sim(transcript,challenge.ko),sim(transcript,challenge.en));
    const pass = best >= 0.5 && durRef.current >= 1000;
    setVoicePassed(pass);
    clearInterval(timerRef.current);
    const code = pass ? 'NKCAP-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).substring(2,8).toUpperCase() : null;
    setStep(pass ? 3 : 4);
    onVerify?.({ pass, challengeId:challenge.id, transcript, similarity:best, code, audioBlob:blobRef.current, durationMs:durRef.current, puzzleMoves:moves });
  };

  const retry = () => {
    clearInterval(timerRef.current);
    setPuzzleSolved(false);
    setVoicePassed(false);
    setTranscript('');
    setMatchPct(0);
    setAudioUrl(null);
    setRecording(false);
    setElapsed(0);
    setStep(0);
  };

  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(elapsedRef.current); }, []);

  // ── Step indicators ───────────────────────────────────────
  const stepsDone = [step>1, step>2];
  const stepsActive = [step===1, step===2];

  const StepBar = () => React.createElement('div', null,
    React.createElement('div', {style:S.stepLabel},
      React.createElement('span',{style:{color:step>=1?'#dc2626':'#ccc',fontWeight:step===1?600:400}},'1. Puzzle'),
      React.createElement('span',{style:{color:step>=2?'#dc2626':'#ccc',fontWeight:step===2?600:400}},'2. Voice'),
      React.createElement('span',{style:{color:step>=3?'#22c55e':'#ccc'}},'3. Result'),
    ),
    React.createElement('div', {style:S.steps},
      React.createElement('div',{style:{...S.step(step===1,step>1),marginRight:2}}),
      React.createElement('div',{style:{...S.step(step===2,step>2),marginRight:2}}),
      React.createElement('div',{style:S.step(step>=3,step===3)}),
    )
  );

  // ── Render ────────────────────────────────────────────────
  return React.createElement('div', {className, style:S.widget},
    // Header
    React.createElement('div', {style:S.header},
      React.createElement('div', {style:S.headerLeft},
        React.createElement('div', {style:S.icon}, React.createElement(PuzzleIcon)),
        React.createElement('div', null,
          React.createElement('div', {style:S.title}, step===0?'NK CAPTCHA Verification':step===1?'Step 1: Reassemble the image':step===2?'Step 2: Say it out loud':'Verification Complete'),
          React.createElement('div', {style:S.subtitle}, step===0?'3-step identity verification':step===1?`Moves: ${moves} · ${timeLeft}s`:step===2?`${timeLeft}s remaining`:''),
        ),
      ),
      React.createElement('div', {style:S.brand},
        React.createElement('div',{style:S.brandName},'NKCaptcha'),
        React.createElement('div',{style:S.brandLinks},'Privacy · Terms'),
      ),
    ),

    React.createElement('div', {style:S.body},
      // Step bar (visible during steps 1-2)
      (step >= 1 && step <= 2) && React.createElement(StepBar),

      // ── INTRO ─────────────────────────────────────────────
      step === 0 && React.createElement('div', {style:{textAlign:'center'}},
        React.createElement('p', {style:{fontSize:13,color:'#666',lineHeight:1.7,marginBottom:16}},
          'Complete ', React.createElement('strong',{style:{color:'#dc2626'}},'2 challenges'),
          ' to verify you are not a DPRK operative:',
          React.createElement('br'),
          '1. Reassemble Kim Jong-un\'s scrambled face',
          React.createElement('br'),
          '2. Record yourself reading an anti-regime phrase',
        ),
        React.createElement('img', {src:imageUrl, style:{width:100,height:100,objectFit:'cover',borderRadius:6,border:'1px solid #ddd',marginBottom:16}}),
        React.createElement('br'),
        React.createElement('button', {style:S.btn, onClick:startPuzzle}, 'Start Verification'),
      ),

      // ── PUZZLE ────────────────────────────────────────────
      step === 1 && React.createElement('div', null,
        React.createElement('div', {style:S.grid(initGrid), ref:gridRef},
          pieces.map((pieceIdx, pos) => {
            const row = Math.floor(pieceIdx / initGrid);
            const col = pieceIdx % initGrid;
            return React.createElement('div', {
              key: pos,
              'data-pos': pos,
              'data-piece': pieceIdx,
              draggable: true,
              style: {
                ...S.piece,
                backgroundImage: `url(${imageUrl})`,
                backgroundPosition: `${col*(100/(initGrid-1))}% ${row*(100/(initGrid-1))}%`,
                backgroundSize: `${initGrid*100}%`,
                border: puzzleSolved ? '2px solid #22c55e' : 'none',
              },
              onDragStart: (e) => { dragRef.current = pos; e.target.style.opacity='0.4'; },
              onDragEnd: (e) => { e.target.style.opacity='1'; },
              onDragOver: (e) => e.preventDefault(),
              onDrop: (e) => { e.preventDefault(); if(dragRef.current!==pos) swapPieces(dragRef.current, pos); },
            });
          })
        ),
        React.createElement('div', {style:{textAlign:'center',marginTop:12}},
          React.createElement('img', {src:imageUrl, style:{width:40,height:40,objectFit:'cover',borderRadius:3,border:'1px solid #ddd',opacity:0.4}}),
          React.createElement('span',{style:{fontSize:9,color:'#bbb',marginLeft:8}},'Reference'),
        ),
      ),

      // ── VOICE ─────────────────────────────────────────────
      step === 2 && React.createElement('div', {style:{textAlign:'center'}},
        React.createElement('div', {style:{background:'#f9f9f9',border:'1px solid #eee',borderRadius:4,padding:14,marginBottom:16}},
          React.createElement('div',{style:{fontSize:9,color:'#dc2626',letterSpacing:'0.1em',fontWeight:600,marginBottom:6}},'SAY THIS OUT LOUD'),
          React.createElement('div',{style:{fontSize:18,fontWeight:800,color:'#222',lineHeight:1.4}}, locale === 'ko' ? challenge.ko : challenge.en),
          locale === 'both' && React.createElement('div',{style:{fontSize:12,color:'#888',marginTop:4,fontStyle:'italic'}}, locale === 'ko' ? challenge.en : challenge.ko),
        ),

        // Mic button
        React.createElement('button', {
          style:S.micBtn(recording),
          onClick: recording ? stopRec : startRec,
        }, React.createElement(MicIcon, {color:recording?'#fff':'#666', size:24})),
        React.createElement('div',{style:{fontSize:11,color:'#999',marginTop:8}},
          recording ? `Recording... ${elapsed.toFixed(1)}s` : audioUrl ? 'Recording complete' : 'Tap to record'
        ),

        // Playback
        audioUrl && !recording && React.createElement('audio', {src:audioUrl, controls:true, style:{width:'100%',height:32,marginTop:12}}),

        // Transcript
        transcript && React.createElement('div', {style:S.transcript},
          React.createElement('span',{style:{fontSize:9,color:'#f59e0b',fontWeight:600}},'HEARD: '),
          React.createElement('span',{style:{color:matchPct>=80?'#22c55e':matchPct>=40?'#f59e0b':'#dc2626'}}, transcript),
          React.createElement('span',{style:{color:'#bbb',marginLeft:8,fontSize:10}}, matchPct+'%'),
        ),

        // Submit
        React.createElement('div',{style:{marginTop:16}},
          React.createElement('button', {
            style:{...S.btn, opacity:audioUrl&&!recording?1:0.3, pointerEvents:audioUrl&&!recording?'auto':'none'},
            onClick: submitVoice,
          }, 'Verify Voice'),
        ),
      ),

      // ── PASS ──────────────────────────────────────────────
      step === 3 && React.createElement('div', {style:{textAlign:'center'}},
        React.createElement('div',{style:{fontSize:48}},'✅'),
        React.createElement('div',{style:{fontSize:18,fontWeight:700,color:'#22c55e',marginTop:8}},'Verified'),
        React.createElement('p',{style:{fontSize:12,color:'#888',marginTop:6,lineHeight:1.5}},
          'Puzzle solved + voice verified.',
          React.createElement('br'), 'Not a DPRK operative.'
        ),
        React.createElement('div',{style:{...S.badge(true),marginTop:12}},'NOT A DPRK OPERATIVE'),
      ),

      // ── FAIL ──────────────────────────────────────────────
      step === 4 && React.createElement('div', {style:{textAlign:'center'}},
        React.createElement('div',{style:{fontSize:48}},'\uD83D\uDEAB'),
        React.createElement('div',{style:{fontSize:18,fontWeight:700,color:'#dc2626',marginTop:8}},'Failed'),
        React.createElement('p',{style:{fontSize:12,color:'#888',marginTop:6}},'Could not verify identity.'),
        React.createElement('div',{style:{...S.badge(false),marginTop:12}},'POTENTIAL DPRK OPERATIVE'),
        React.createElement('br'),
        React.createElement('button',{style:S.btnOutline,onClick:retry},'Retry'),
      ),
    ),

    // Footer
    React.createElement('div', {style:S.footer},
      React.createElement('span',null,'NK CAPTCHA v2.0'),
      React.createElement('span',null,'Powered by OpenClaw'),
    ),
  );
}
