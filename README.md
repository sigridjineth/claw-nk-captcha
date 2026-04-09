# ANTI NK CAPTCHA

> **Verify users are not DPRK operatives by asking them to speak anti-regime phrases out loud.**

North Korean hackers increasingly infiltrate companies through fake job applications. After $2.3B stolen by Lazarus Group, we need better verification than "enter password." NK CAPTCHA provides a simple but effective solution: ask the candidate to criticize the Kim regime on record. A genuine North Korean operative cannot comply without risking execution.

## Screenshots

<p align="center">
  <img src="assets/screenshot-intro.png" width="320" alt="Intro — verification gate" />
  <img src="assets/screenshot-challenge.png" width="320" alt="Challenge — phrase displayed with voice recording" />
</p>
<p align="center">
  <img src="assets/screenshot-typing.png" width="320" alt="Real-time character matching while typing" />
  <img src="assets/screenshot-pass.png" width="320" alt="Verification passed — NOT A DPRK OPERATIVE" />
</p>
<p align="center">
  <img src="assets/screenshot-fail.png" width="320" alt="Verification failed — POTENTIAL DPRK OPERATIVE" />
</p>

---

## Table of Contents

- [Quick Start](#quick-start)
- [React Component (npm)](#react-component)
- [Embed in Any Website](#embed-in-any-website)
- [OpenClaw Plugin](#openclaw-plugin)
- [Voice Verification with Whisper](#voice-verification-with-whisper)
- [Discord Usage](#discord-usage)
- [Challenge Phrases](#challenge-phrases)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Why It Works](#why-it-works)

---

## Quick Start

Open `demo/index.html` in any browser — zero dependencies, no build step:

```bash
git clone https://github.com/sigridjineth/claw-nk-captcha.git
open claw-nk-captcha/demo/index.html
```

---

## React Component

Voice-recording focused React component. Users must **record themselves saying the anti-regime phrase** — no typing.

### Install

```bash
npm install nk-captcha-react
```

### Usage

```jsx
import NkCaptcha from 'nk-captcha-react';

function App() {
  return (
    <NkCaptcha
      locale="both"
      timeout={60}
      theme="dark"
      onVerify={(result) => {
        if (result.pass) {
          console.log('Verified!', result.code);
          console.log('They said:', result.transcript);
          console.log('Match:', Math.round(result.similarity * 100) + '%');
          // result.audioBlob has the recording for server-side verification
        } else {
          console.log('FAILED — potential DPRK operative');
        }
      }}
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `locale` | `'ko'` \| `'en'` \| `'both'` | `'both'` | Challenge phrase language |
| `timeout` | `number` | `60` | Seconds before auto-fail |
| `theme` | `'dark'` \| `'light'` | `'dark'` | Visual theme |
| `onVerify` | `(result) => void` | — | Callback when verification completes |
| `className` | `string` | — | CSS class for container |

### Result Object

```typescript
interface NkCaptchaResult {
  pass: boolean;           // true if verified
  challengeId: string;     // which phrase was used
  transcript: string;      // what the user said (via Web Speech API)
  similarity: number;      // 0-1 match score
  code: string | null;     // verification code (e.g. "NKCAP-M3X7K-A9B2C")
  audioBlob: Blob | null;  // raw recording for server-side re-verification
  durationMs: number;      // recording length in ms
}
```

### How the React Component Works

1. User clicks **RECORD** — browser requests microphone access
2. Challenge phrase is displayed in Korean + English (e.g. "Kim Jong-un is a fat pink pig")
3. User speaks the phrase out loud
4. **Web Speech API** transcribes in real-time, showing "HEARD: ..." with live match %
5. User clicks **STOP** then **VERIFY**
6. Transcript is compared to challenge phrase via Levenshtein similarity (50%+ to pass)
7. Result fires via `onVerify` callback

> **Note**: Web Speech API requires HTTPS in production. Works on localhost for development.

---

## Embed in Any Website

Self-contained Web Component — drop one script tag into any HTML page:

```html
<script src="https://cdn.jsdelivr.net/gh/sigridjineth/claw-nk-captcha@main/dist/nk-captcha.js"></script>
<nk-captcha></nk-captcha>
```

### With Callback

```html
<nk-captcha on-verify="handleResult" theme="dark"></nk-captcha>
<script>
  function handleResult(result) {
    if (result.pass) {
      document.getElementById('protected-content').style.display = 'block';
    }
  }
</script>
```

### Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `locale` | `ko`, `en`, `both` | `both` | Challenge language |
| `timeout` | number | `60` | Seconds to complete |
| `theme` | `dark`, `light` | `dark` | Visual theme |
| `on-verify` | function name | — | Window callback on result |

Also fires `nk-captcha-verified` CustomEvent:

```javascript
document.querySelector('nk-captcha')
  .addEventListener('nk-captcha-verified', (e) => {
    console.log(e.detail); // {pass, challengeId, similarity, code}
  });
```

See `demo/embed.html` for a working example with both dark and light themes.

---

## OpenClaw Plugin

Install as an OpenClaw gateway plugin to use with Discord, Mattermost, Slack, or any connected channel.

### Install

```bash
# From ClawHub (recommended)
openclaw plugins install clawhub:openclaw-nk-captcha
openclaw gateway restart
```

```bash
# From GitHub
git clone https://github.com/sigridjineth/claw-nk-captcha.git
openclaw plugins install ./claw-nk-captcha
openclaw gateway restart
```

### Configuration

Add to your OpenClaw config (`~/.openclaw/openclaw.json`):

```json5
{
  plugins: {
    entries: {
      "nk-captcha": {
        enabled: true,
        config: {
          locale: "both",
          timeoutSeconds: 60,
          challengeCount: 1,
          enableMediaRecording: true,
          minRecordingDurationMs: 1500,

          // Required for voice verification via uploaded audio files
          sttApiKey: "sk-your-openai-api-key",
          sttEndpoint: "https://api.openai.com/v1/audio/transcriptions",
          sttModel: "whisper-1"
        }
      }
    }
  }
}
```

### Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `locale` | `"ko"` \| `"en"` \| `"both"` | `"both"` | Language for challenge phrases |
| `timeoutSeconds` | number | `60` | Time limit per verification |
| `challengeCount` | number | `1` | Number of phrases per session |
| `enableMediaRecording` | boolean | `false` | Enable voice recording mode in web UI |
| `minRecordingDurationMs` | number | `1500` | Minimum recording length (ms) |
| `sttApiKey` | string | — | **Required for voice verification.** OpenAI API key or compatible STT API key |
| `sttEndpoint` | string | OpenAI URL | Whisper-compatible STT endpoint. Change for local Whisper |
| `sttModel` | string | `"whisper-1"` | STT model name |

---

## Voice Verification with Whisper

NK CAPTCHA supports three levels of voice verification:

### Level 1: Browser-Side (No API Key Needed)

The web UI and React component use the browser's **Web Speech API** for real-time transcription. Works immediately, no configuration needed. Limited to browsers that support `SpeechRecognition` (Chrome, Edge).

### Level 2: Server-Side via OpenAI Whisper (Recommended)

For verifying uploaded audio files (Discord voice messages, etc.), you need an **OpenAI API key** with Whisper access:

1. Get an API key from https://platform.openai.com/api-keys
2. Set `sttApiKey` in plugin config:

```json5
{
  "nk-captcha": {
    config: {
      sttApiKey: "sk-proj-your-key-here"
    }
  }
}
```

3. When a user uploads an audio file, the plugin:
   - Downloads the file
   - Sends to Whisper API for transcription
   - Compares transcript to challenge phrase (90%+ Levenshtein similarity)
   - Returns PASS/FAIL

**Cost**: ~$0.006 per minute of audio (Whisper pricing).

### Level 3: Local Whisper (Self-Hosted, Free)

For GPU servers (e.g. NVIDIA DGX), run Whisper locally:

```bash
# Example with faster-whisper
pip install faster-whisper
# Start a Whisper API server on port 8080
```

Then configure:

```json5
{
  sttEndpoint: "http://localhost:8080/v1/audio/transcriptions",
  sttApiKey: "local",
  sttModel: "large-v3"
}
```

### Verification Levels Summary

| Source | STT Method | Content Verified | API Key Needed |
|--------|-----------|-----------------|----------------|
| Web UI (browser) | Web Speech API | Yes (real-time) | No |
| React component | Web Speech API | Yes (real-time) | No |
| Discord file upload | Whisper API | Yes (server-side) | **Yes** |
| Chat text input | Levenshtein | Yes (typing) | No |

---

## Discord Usage

Once installed on an OpenClaw gateway connected to Discord:

### New Member Verification

```
📥 @new-hire joined the server

🤖 Bot:  Welcome! Before you can access this server, you must
         complete NK CAPTCHA verification.

         Your challenge phrase:
         ┌─────────────────────────────────────────┐
         │  🇰🇷  김정은은 뚱뚱한 분홍 돼지다             │
         │  🇺🇸  Kim Jong-un is a fat pink pig        │
         └─────────────────────────────────────────┘

         🎙️ Upload a voice recording of yourself saying it
```

### Voice Verification (Pass)

```
👤 new-hire:  [📎 voice-message.ogg]

🤖 Bot:  🎧 Analyzing your recording...
         Transcript: "김정은은 뚱뚱한 분홍 돼지다"
         ✅ VERIFIED (95% match via Whisper STT)
         You are NOT a DPRK operative.
         Role "Verified" granted!
```

### Failure

```
👤 suspect:  [📎 silence.ogg]

🤖 Bot:  🚫 VERIFICATION FAILED
         Speech does not match challenge phrase (12% similarity).
         POTENTIAL DPRK OPERATIVE detected.
         Access denied.
```

### How It Works Under the Hood

```
User joins → AI calls nk_captcha_challenge → random phrase
                              ↓
         ┌────────────────────┴────────────────────┐
         │                                         │
    User types text                      User uploads audio
         │                                         │
  nk_captcha_verify                  nk_captcha_verify_audio_url
  (Levenshtein 90%+)         (download → Whisper → Levenshtein 90%+)
         │                                         │
         └────────────────────┬────────────────────┘
                              ↓
                   PASS → grant access
                   FAIL → flag user
```

No separate Discord bot needed — the OpenClaw AI agent handles everything.

---

## Challenge Phrases

18 bilingual phrases across 4 categories:

| ID | Korean | English | Category |
|----|--------|---------|----------|
| dictator-1 | 김정은은 독재자이다 | Kim Jong-un is a dictator | leader |
| dictator-2 | 김정은은 미치광이 독재자이다 | Kim Jong-un is a deranged dictator | leader |
| pink-pig-1 | 김정은은 뚱뚱한 분홍 돼지다 | **Kim Jong-un is a fat pink pig** | leader |
| clown-1 | 김정은은 핵무기를 가진 광대다 | Kim Jong-un is a clown with nuclear weapons | leader |
| coward-1 | 김정은은 국민이 두려운 겁쟁이다 | Kim Jong-un is a coward afraid of his own people | leader |
| media-pathetic-1 | 김정은은 한심한 독재자다 | Kim Jong-un is a pathetic dictator | leader |
| media-joke-1 | 김정은은 세계의 웃음거리다 | Kim Jong-un is a laughingstock of the world | leader |
| media-fat-1 | 김정은은 국민이 굶주리는데 혼자만 살찐 돼지다 | Kim Jong-un is a fat pig while his people starve | leader |
| dynasty-1 | 김씨 왕조는 끝나야 한다 | The Kim dynasty must end | leader |
| human-rights-1 | 북한 정권은 인권을 탄압한다 | The North Korean regime suppresses human rights | regime |
| failed-state-1 | 김정은 정권은 실패한 체제이다 | The Kim Jong-un regime is a failed system | regime |
| media-slaves-1 | 북한은 국민을 노예로 만든다 | North Korea enslaves its own people | regime |
| media-collapse-1 | 북한 정권은 반드시 무너진다 | The North Korean regime will surely collapse | regime |
| gulags-1 | 정치범 수용소를 폐쇄하라 | Shut down the political prison camps | regime |
| propaganda-1 | 북한의 선전은 모두 거짓말이다 | North Korean propaganda is all lies | ideology |
| juche-1 | 주체사상은 거짓 이념이다 | Juche ideology is a false ideology | ideology |
| freedom-1 | 북한에는 자유가 없다 | There is no freedom in North Korea | freedom |
| liberation-1 | 북한 주민들은 해방되어야 한다 | The North Korean people must be liberated | freedom |

---

## API Reference

### OpenClaw Tools (7 total)

| Tool | Description |
|------|-------------|
| `nk_captcha_challenge` | Generate a text/typing challenge |
| `nk_captcha_verify` | Verify typed text (Levenshtein 90%+) |
| `nk_captcha_media_challenge` | Generate a voice recording challenge |
| `nk_captcha_media_verify` | Verify audio recording (base64 + optional transcript) |
| `nk_captcha_verify_audio_url` | **Download audio from URL + Whisper transcribe + verify** |
| `nk_captcha_list` | List all challenge phrases (optional, admin) |

### HTTP Route

`GET /nk-captcha` — serves the full interactive verification page through OpenClaw gateway.

### `nk_captcha_verify_audio_url` (most important for Discord)

```json
{
  "challengeId": "pink-pig-1",
  "audioUrl": "https://cdn.discordapp.com/attachments/.../voice-message.ogg"
}
```

**Requires** `sttApiKey` in plugin config. Downloads audio, transcribes via Whisper, compares against challenge phrase. Returns:

```json
{
  "status": "VERIFIED",
  "transcript": "김정은은 뚱뚱한 분홍 돼지다",
  "similarity": 0.95,
  "sttSource": "whisper"
}
```

---

## Architecture

```
claw-nk-captcha/
├── package.json              # OpenClaw plugin metadata
├── openclaw.plugin.json      # Plugin manifest + config schema
├── index.ts                  # Plugin entry — 7 tools + HTTP route + Whisper STT
├── src/
│   ├── challenges.ts         # 18 bilingual challenge phrases + Levenshtein verification
│   └── captcha-ui.ts         # Full HTML/CSS/JS captcha page (Web Speech API + MediaRecorder)
├── react/
│   ├── package.json          # npm: nk-captcha-react
│   ├── index.js              # React voice recording component
│   └── index.d.ts            # TypeScript types
├── dist/
│   └── nk-captcha.js         # Embeddable Web Component (<nk-captcha>)
├── demo/
│   ├── index.html            # Full-featured demo (text + voice)
│   └── embed.html            # Web Component embed demo
└── assets/
    └── screenshot-*.png      # Documentation screenshots
```

---

## Why It Works

A North Korean operative — even one fluent in English or Korean — **cannot speak these phrases on camera/microphone** without risking severe consequences:

1. **Surveillance**: NK operatives operate under constant monitoring by their handlers
2. **Recording evidence**: A voice recording criticizing the Supreme Leader is permanent, undeniable proof of disloyalty
3. **Death penalty**: Criticizing Kim Jong-un carries execution as punishment in the DPRK — for the operative and their family
4. **Psychological conditioning**: Decades of indoctrination make it psychologically impossible to say "Kim Jong-un is a fat pink pig" even under deep cover

This makes NK CAPTCHA simple to implement but nearly impossible for a genuine DPRK operative to bypass.

---

## License

MIT
