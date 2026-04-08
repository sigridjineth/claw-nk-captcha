# ANTI NK CAPTCHA — OpenClaw Plugin

> **Verify candidates are not DPRK operatives by asking them to type — and speak — anti-regime phrases.**

North Korean hackers increasingly infiltrate companies through fake job applications. ANTI NK CAPTCHA provides a simple but effective verification: ask the candidate to criticize the Kim regime. A genuine North Korean operative cannot comply without risking execution.

## Screenshots

<p align="center">
  <img src="assets/screenshot-intro.png" width="320" alt="Intro screen" />
  <img src="assets/screenshot-challenge.png" width="320" alt="Challenge screen" />
</p>
<p align="center">
  <img src="assets/screenshot-typing.png" width="320" alt="Typing verification in progress" />
  <img src="assets/screenshot-pass.png" width="320" alt="Verification passed" />
</p>
<p align="center">
  <img src="assets/screenshot-fail.png" width="320" alt="Verification failed" />
</p>

## Quick Start

Open `demo/index.html` in any browser — no build step, no dependencies.

```bash
open demo/index.html
```

## How It Works

### Text Mode
1. A random anti-regime phrase is displayed in Korean and English
2. The user types the phrase exactly (90%+ Levenshtein similarity required)
3. Real-time character-by-character feedback shows matching progress
4. Pass/fail verdict is issued with a unique verification code

### Voice Recording Mode
1. The same challenge phrase is displayed
2. The user must **record themselves reading the phrase aloud** using their microphone
3. Recording duration and validity are checked (minimum 1.5s)
4. Combined text + voice verification for maximum assurance

## Install

### From ClawHub (Recommended)

```bash
openclaw plugins install clawhub:openclaw-nk-captcha
openclaw gateway restart
```

### From GitHub

```bash
git clone https://github.com/sigridjineth/claw-nk-captcha.git
openclaw plugins install ./claw-nk-captcha
openclaw gateway restart
```

### Manual Installation

```bash
cd ~/.openclaw/extensions
git clone https://github.com/sigridjineth/claw-nk-captcha.git nk-captcha
```

Then add to your OpenClaw config:

```json5
{
  plugins: {
    load: { paths: ["~/.openclaw/extensions/nk-captcha"] },
    entries: {
      "nk-captcha": { enabled: true }
    }
  }
}
```

### Configuration

```json5
{
  plugins: {
    entries: {
      "nk-captcha": {
        enabled: true,
        config: {
          locale: "both",              // "ko", "en", or "both"
          timeoutSeconds: 60,          // time limit for verification
          challengeCount: 1,           // phrases per session
          enableMediaRecording: true,  // require voice recording
          minRecordingDurationMs: 1500 // minimum recording length (ms)
        }
      }
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `locale` | `"ko"` \| `"en"` \| `"both"` | `"both"` | Language for challenge phrases |
| `timeoutSeconds` | number | `60` | Time limit to complete verification |
| `challengeCount` | number | `1` | Number of phrases per session |
| `enableMediaRecording` | boolean | `false` | Require voice recording in addition to typing |
| `minRecordingDurationMs` | number | `1500` | Minimum audio recording length |

## Discord Usage Scenario

Once installed on an OpenClaw gateway connected to Discord, the AI agent handles everything automatically:

### New Member Verification

```
📥 @new-hire joined the server

🤖 Bot:  Welcome! Before you can access this server, you must
         complete NK CAPTCHA verification.

         Your challenge phrase:
         ┌─────────────────────────────────────────┐
         │  🇰🇷  김정은은 독재자이다                    │
         │  🇺🇸  Kim Jong-un is a dictator            │
         └─────────────────────────────────────────┘

         ✏️ Type the phrase exactly, OR
         🎙️ Upload a voice recording of yourself saying it
```

### Option A: Text Verification

```
👤 new-hire:  김정은은 독재자이다

🤖 Bot:  ✅ VERIFIED (100% match)
         You are NOT a DPRK operative.
         Role "Verified" granted. Welcome aboard!
```

### Option B: Voice Verification

```
👤 new-hire:  [📎 voice-message.ogg]

🤖 Bot:  🎧 Analyzing your recording...
         Transcript: "김정은은 독재자이다"
         ✅ VERIFIED (95% match via Whisper STT)
         You are NOT a DPRK operative.
         Role "Verified" granted!
```

### Option C: Failure

```
👤 suspect:  I can't say that

🤖 Bot:  🚫 VERIFICATION FAILED
         POTENTIAL DPRK OPERATIVE detected.
         Access denied.
```

### Under the Hood

```
User joins → AI calls nk_captcha_challenge → random phrase + challengeId
                              ↓
         ┌────────────────────┴────────────────────┐
         │                                         │
    User types text                      User uploads audio file
         │                                         │
  nk_captcha_verify                  nk_captcha_verify_audio_url
  (Levenshtein 90%+)           (download → Whisper STT → Levenshtein)
         │                                         │
         └────────────────────┬────────────────────┘
                              ↓
                   PASS → assign role / grant access
                   FAIL → deny access / flag user
```

No separate Discord bot needed — the OpenClaw AI agent handles challenge generation, response detection, tool selection, and verification automatically.

## OpenClaw Tools

### `nk_captcha_challenge`

Generate a text-based challenge.

```json
{ "count": 1, "locale": "both" }
```

Returns challenge phrase(s) with ID, Korean text, English text, category, and severity.

### `nk_captcha_verify`

Verify typed responses.

```json
{
  "responses": [
    { "challengeId": "dictator-1", "userInput": "Kim Jong-un is a dictator" }
  ]
}
```

Returns pass/fail with similarity score. 90%+ similarity passes (allows minor typos).

### `nk_captcha_media_challenge`

Generate a voice recording challenge. Returns challenge with recording requirements (format, min duration, min size).

### `nk_captcha_media_verify`

Verify audio recordings.

```json
{
  "responses": [
    {
      "challengeId": "media-pathetic-1",
      "audioBase64": "...",
      "durationMs": 3200,
      "mimeType": "audio/webm"
    }
  ]
}
```

Validates recording size (>1KB) and duration (>1.5s). Returns pass/fail per challenge.

### `nk_captcha_verify_audio_url`

Verify audio from a URL (Discord attachment, Slack file, etc.). Downloads the file, transcribes via Whisper, and verifies against the challenge phrase — all in one call.

```json
{
  "challengeId": "dictator-1",
  "audioUrl": "https://cdn.discordapp.com/attachments/.../voice-message.ogg"
}
```

Returns transcript, similarity score, and pass/fail. Requires `sttApiKey` in plugin config.

### `nk_captcha_list` (optional)

List all available challenge phrases. Enable in config:

```json5
{ tools: { allow: ["nk_captcha_list"] } }
```

### HTTP Route

`GET /nk-captcha` — serves the full interactive verification page through OpenClaw gateway.

## Discord Bot

A standalone Discord bot is included for direct server integration. New members are auto-challenged via DM, and verified members receive a role.

```bash
npm install discord.js
DISCORD_TOKEN=your-token VERIFIED_ROLE_ID=role-id npx tsx discord-bot.ts
```

**Features:**
- `/nk-verify` slash command for on-demand verification
- Auto-DM challenge on member join
- 2-minute timeout
- Automatic role assignment on pass
- "POTENTIAL DPRK OPERATIVE" warning on fail

## Challenge Phrases (15 total)

| ID | Korean | English | Mode |
|----|--------|---------|------|
| dictator-1 | 김정은은 독재자이다 | Kim Jong-un is a dictator | text |
| dictator-2 | 김정은은 미치광이 독재자이다 | Kim Jong-un is a deranged dictator | text |
| human-rights-1 | 북한 정권은 인권을 탄압한다 | The North Korean regime suppresses human rights | text |
| freedom-1 | 북한에는 자유가 없다 | There is no freedom in North Korea | text |
| failed-state-1 | 김정은 정권은 실패한 체제이다 | The Kim Jong-un regime is a failed system | text |
| juche-1 | 주체사상은 거짓 이념이다 | Juche ideology is a false ideology | text |
| liberation-1 | 북한 주민들은 해방되어야 한다 | The North Korean people must be liberated | text |
| dynasty-1 | 김씨 왕조는 끝나야 한다 | The Kim dynasty must end | text |
| propaganda-1 | 북한의 선전은 모두 거짓말이다 | North Korean propaganda is all lies | text |
| gulags-1 | 정치범 수용소를 폐쇄하라 | Shut down the political prison camps | text |
| media-pathetic-1 | 김정은은 한심한 독재자다 | Kim Jong-un is a pathetic dictator | voice |
| media-joke-1 | 김정은은 세계의 웃음거리다 | Kim Jong-un is a laughingstock of the world | voice |
| media-slaves-1 | 북한은 국민을 노예로 만든다 | North Korea enslaves its own people | voice |
| media-collapse-1 | 북한 정권은 반드시 무너진다 | The North Korean regime will surely collapse | voice |
| media-fat-1 | 김정은은 국민이 굶주리는데 혼자만 살찐 돼지다 | Kim Jong-un is a fat pig while his people starve | voice |

## Project Structure

```
anti-nk-claw/
├── README.md
├── package.json              # npm package with OpenClaw metadata
├── openclaw.plugin.json      # Plugin manifest + config schema
├── tsconfig.json             # TypeScript config
├── index.ts                  # Plugin entry — 5 tools + HTTP route
├── discord-bot.ts            # Standalone Discord bot
├── src/
│   ├── challenges.ts         # 15 challenge phrases + verification logic
│   └── captcha-ui.ts         # Full HTML/CSS/JS captcha page renderer
├── demo/
│   └── index.html            # Standalone demo (no build needed)
└── assets/
    └── screenshot-*.png      # Documentation screenshots
```

## Visual Design

- Dark cyberpunk aesthetic (`#080808` background, `#dc2626` red accents)
- Glitch text animation on "NK CAPTCHA" title
- CRT scanlines + vignette overlay
- Real-time character-by-character feedback (green = correct, red = wrong)
- Match meter with color transitions (red to gold to green)
- Countdown timer with urgency pulse at 10s
- Voice recording with waveform animation
- Dramatic pass/fail screens with glow effects

## Why It Works

A North Korean operative — even one fluent in English or Korean — **cannot type or speak these phrases** without risking severe consequences:

1. **Surveillance**: NK operatives operate under constant monitoring by their handlers
2. **Recording evidence**: Typed/spoken criticism creates permanent evidence of disloyalty
3. **Death penalty**: Criticizing the Supreme Leader carries execution as punishment in the DPRK
4. **Psychological conditioning**: Decades of indoctrination make it psychologically difficult to criticize the regime, even under cover

This makes NK CAPTCHA simple to implement but nearly impossible for a genuine DPRK operative to bypass.

## License

MIT
