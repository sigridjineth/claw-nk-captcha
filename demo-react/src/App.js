import React, { useState } from 'react';
import NkCaptcha from './NkCaptcha';

const IMAGES = [
  'https://raw.githubusercontent.com/sigridjineth/claw-nk-captcha/main/assets/kim-pig.png',
  'https://raw.githubusercontent.com/sigridjineth/claw-nk-captcha/main/assets/kim-extra.png',
  'https://raw.githubusercontent.com/sigridjineth/claw-nk-captcha/main/assets/kim-mickey.png',
  'https://raw.githubusercontent.com/sigridjineth/claw-nk-captcha/main/assets/kim-photo.png',
];

function App() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');
  const callbackUrl = params.get('callback');
  const userId = params.get('user');
  const discordUser = params.get('username') || 'User';

  const [step, setStep] = useState('verify');
  const [result, setResult] = useState(null);
  const [imageIdx] = useState(() => Math.floor(Math.random() * IMAGES.length));

  const handleVerify = async (r) => {
    setResult(r);
    if (r.pass) {
      if (callbackUrl) {
        try {
          await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'nk_captcha_result',
              sessionId,
              userId,
              pass: r.pass,
              challengeId: r.challengeId,
              similarity: r.similarity,
              transcript: r.transcript,
              code: r.code,
              puzzleMoves: r.puzzleMoves,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (e) {
          console.error('Callback failed:', e);
        }
      }
      setStep('done');
    }
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        {sessionId && (
          <div style={s.banner}>
            <svg width="20" height="15" viewBox="0 0 71 55" fill="#5865F2">
              <path d="M60.1 4.9A58.5 58.5 0 0045.4.5a.2.2 0 00-.2.1 40.6 40.6 0 00-1.8 3.7 54 54 0 00-16.2 0A26.3 26.3 0 0025.4.6a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5a.2.2 0 00-.1 0C1.5 17.7-.9 30 .3 42.1a.2.2 0 00.1.2 58.8 58.8 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .3 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1A58.6 58.6 0 0070.6 42.3a.2.2 0 000-.2c1.4-14.6-2.4-27.3-10.1-38.5a.2.2 0 00-.1-.1zM23.7 34.6c-3.3 0-6.1-3.1-6.1-6.8s2.7-6.9 6.1-6.9 6.2 3.1 6.1 6.9c0 3.7-2.7 6.8-6.1 6.8zm22.6 0c-3.3 0-6.1-3.1-6.1-6.8s2.7-6.9 6.1-6.9 6.2 3.1 6.1 6.9c0 3.7-2.7 6.8-6.1 6.8z"/>
            </svg>
            <div>
              <div style={{fontSize:13,color:'#333'}}>
                Verification from <strong>Discord</strong>
              </div>
              <div style={{fontSize:10,color:'#999',marginTop:2}}>
                {discordUser} &middot; {sessionId?.substring(0,8)}...
              </div>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <NkCaptcha
            imageUrl={IMAGES[imageIdx]}
            gridSize={3}
            timeout={120}
            onVerify={handleVerify}
          />
        )}

        {step === 'done' && result && (
          <div style={s.done}>
            <div style={{fontSize:48}}>&#x2705;</div>
            <h2 style={{fontSize:18,fontWeight:700,color:'#22c55e',margin:'8px 0'}}>
              Verification Complete!
            </h2>
            <p style={{fontSize:13,color:'#888',lineHeight:1.6,margin:'0 0 20px'}}>
              You can return to Discord.<br/>The bot has been notified.
            </p>

            <div style={s.details}>
              <Row label="Status" value="VERIFIED" color="#22c55e" />
              <Row label="Code" value={result.code} />
              <Row label="Transcript" value={result.transcript || '\u2014'} />
              <Row label="Match" value={Math.round(result.similarity*100)+'%'} />
              <Row label="Puzzle Moves" value={result.puzzleMoves} />
            </div>

            <div style={s.returnBar}>
              <svg width="16" height="12" viewBox="0 0 71 55" fill="#5865F2" style={{marginRight:8}}>
                <path d="M60.1 4.9A58.5 58.5 0 0045.4.5a.2.2 0 00-.2.1 40.6 40.6 0 00-1.8 3.7 54 54 0 00-16.2 0A26.3 26.3 0 0025.4.6a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 5a.2.2 0 00-.1 0C1.5 17.7-.9 30 .3 42.1a.2.2 0 00.1.2 58.8 58.8 0 0017.7 9"/>
              </svg>
              Return to Discord &mdash; role granted!
            </div>
          </div>
        )}

        {!sessionId && (
          <div style={s.info}>
            <h4 style={{fontSize:12,color:'#888',margin:'0 0 6px'}}>Discord Flow Demo</h4>
            <p style={{fontSize:11,color:'#aaa',lineHeight:1.6,margin:0}}>
              In production, Discord bot sends:<br/>
              <code style={s.code}>
                https://your-app.com/?session=abc&callback=https://...&user=123&username=Sigrid
              </code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12}}>
      <span style={{color:'#888'}}>{label}</span>
      <span style={{color:color||'#333',fontWeight:500,fontFamily:'monospace'}}>{String(value)}</span>
    </div>
  );
}

const s = {
  page: { background:'#f0f0f0', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'Inter',-apple-system,sans-serif" },
  wrap: { maxWidth:440, width:'100%' },
  banner: { background:'#fff', border:'1px solid #d9d9d9', borderRadius:'3px 3px 0 0', padding:'12px 16px', display:'flex', alignItems:'center', gap:12, borderBottom:'2px solid #5865F2' },
  done: { background:'#fff', border:'1px solid #d9d9d9', borderRadius:3, padding:'32px 24px', textAlign:'center' },
  details: { background:'#f9f9f9', border:'1px solid #eee', borderRadius:4, padding:16, textAlign:'left', marginBottom:16 },
  returnBar: { background:'#f0f0ff', border:'1px solid #d4d4ff', borderRadius:4, padding:'10px 16px', fontSize:12, color:'#5865F2', fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center' },
  info: { background:'#fff', border:'1px solid #d9d9d9', borderRadius:3, padding:'16px 20px', marginTop:12, textAlign:'center' },
  code: { background:'#f5f5f5', padding:'2px 6px', borderRadius:3, fontSize:9, color:'#dc2626', wordBreak:'break-all' },
};

export default App;
