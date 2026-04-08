import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import { CHALLENGES, pickRandom, verify } from "./src/challenges.js";
import { renderCaptchaPage } from "./src/captcha-ui.js";

export default definePluginEntry({
  id: "nk-captcha",
  name: "NK Captcha",
  description:
    "North Korea regime criticism CAPTCHA — verify candidates are not DPRK operatives",

  register(api) {
    const config = (api.pluginConfig ?? {}) as {
      locale?: "ko" | "en" | "both";
      timeoutSeconds?: number;
      challengeCount?: number;
      enableMediaRecording?: boolean;
      minRecordingDurationMs?: number;
      sttEndpoint?: string;
      sttApiKey?: string;
      sttModel?: string;
    };
    const locale = config.locale ?? "both";
    const challengeCount = config.challengeCount ?? 1;
    const enableMediaRecording = config.enableMediaRecording ?? false;
    const minRecordingDurationMs = config.minRecordingDurationMs ?? 1500;
    const sttEndpoint = config.sttEndpoint ?? "https://api.openai.com/v1/audio/transcriptions";
    const sttApiKey = config.sttApiKey ?? "";
    const sttModel = config.sttModel ?? "whisper-1";

    // ── Server-side STT via Whisper API ─────────────────────────
    async function transcribeAudio(audioBase64: string, mimeType: string = "audio/webm"): Promise<string | null> {
      if (!sttApiKey) return null;
      try {
        const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : "webm";
        const binaryStr = atob(audioBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const formData = new FormData();
        formData.append("file", new Blob([bytes], { type: mimeType }), `audio.${ext}`);
        formData.append("model", sttModel);
        formData.append("language", "ko");

        const res = await fetch(sttEndpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${sttApiKey}` },
          body: formData,
        });

        if (!res.ok) {
          api.logger.warn(`STT request failed: ${res.status} ${res.statusText}`);
          return null;
        }

        const data = await res.json() as { text?: string };
        return data.text?.trim() ?? null;
      } catch (err) {
        api.logger.warn(`STT transcription error: ${err}`);
        return null;
      }
    }

    // ── Tool: Generate a challenge ──────────────────────────────
    api.registerTool({
      name: "nk_captcha_challenge",
      description:
        "Generate an NK Captcha challenge. Returns phrase(s) the user must type to prove they are not a DPRK operative.",
      parameters: Type.Object({
        count: Type.Optional(
          Type.Number({
            description: "Number of challenge phrases (default: from plugin config)",
            minimum: 1,
            maximum: 5,
          }),
        ),
        locale: Type.Optional(
          Type.Union([Type.Literal("ko"), Type.Literal("en"), Type.Literal("both")], {
            description: "Language for challenges (default: from plugin config)",
          }),
        ),
      }),
      async execute(_id, params) {
        const n = params.count ?? challengeCount;
        const challenges = pickRandom(n);
        const loc = params.locale ?? locale;

        const items = challenges.map((c) => ({
          id: c.id,
          phrase: loc === "en" ? c.en : loc === "ko" ? c.ko : `${c.ko} (${c.en})`,
          category: c.category,
          severity: c.severity,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "challenge_issued",
                  instruction:
                    "Ask the user to type each phrase exactly. Then call nk_captcha_verify with their responses.",
                  challenges: items,
                  timeoutSeconds: config.timeoutSeconds ?? 60,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    });

    // ── Tool: Verify a response ─────────────────────────────────
    api.registerTool({
      name: "nk_captcha_verify",
      description:
        "Verify the user's response to an NK Captcha challenge. Returns pass/fail for each phrase.",
      parameters: Type.Object({
        responses: Type.Array(
          Type.Object({
            challengeId: Type.String({ description: "The challenge ID from nk_captcha_challenge" }),
            userInput: Type.String({ description: "What the user typed" }),
          }),
        ),
        locale: Type.Optional(
          Type.Union([Type.Literal("ko"), Type.Literal("en"), Type.Literal("both")]),
        ),
      }),
      async execute(_id, params) {
        const loc = params.locale ?? locale;
        const results = params.responses.map((r) => {
          const result = verify(r.challengeId, r.userInput, loc);
          return {
            challengeId: r.challengeId,
            userInput: r.userInput,
            ...result,
          };
        });

        const allPassed = results.every((r) => r.pass);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: allPassed ? "VERIFIED" : "FAILED",
                  verdict: allPassed
                    ? "✅ User successfully completed NK Captcha verification. Likely not a DPRK operative."
                    : "🚫 User FAILED NK Captcha verification. Could not or would not criticize the regime.",
                  results,
                  totalChallenges: results.length,
                  passed: results.filter((r) => r.pass).length,
                  failed: results.filter((r) => !r.pass).length,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    });

    // ── Tool: Generate a media recording challenge ───────────────
    api.registerTool({
      name: "nk_captcha_media_challenge",
      description:
        "Generate an NK Captcha challenge that requires the user to record audio of themselves reading the phrase aloud.",
      parameters: Type.Object({
        count: Type.Optional(
          Type.Number({
            description: "Number of challenge phrases (default: from plugin config)",
            minimum: 1,
            maximum: 5,
          }),
        ),
        locale: Type.Optional(
          Type.Union([Type.Literal("ko"), Type.Literal("en"), Type.Literal("both")], {
            description: "Language for challenges (default: from plugin config)",
          }),
        ),
      }),
      async execute(_id, params) {
        const n = params.count ?? challengeCount;
        const challenges = pickRandom(n);
        const loc = params.locale ?? locale;

        const items = challenges.map((c) => ({
          id: c.id,
          phrase: loc === "en" ? c.en : loc === "ko" ? c.ko : `${c.ko} (${c.en})`,
          category: c.category,
          severity: c.severity,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "media_challenge_issued",
                  instruction:
                    "Ask the user to RECORD AUDIO of themselves reading each phrase aloud. " +
                    "They must use their microphone to record. Then call nk_captcha_media_verify with the base64-encoded audio data.",
                  challenges: items,
                  timeoutSeconds: config.timeoutSeconds ?? 60,
                  minRecordingDurationMs,
                  requirements: {
                    format: "webm/opus or wav",
                    minDurationMs: minRecordingDurationMs,
                    minSizeBytes: 1000,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    });

    // ── Tool: Verify a media recording response ─────────────────
    api.registerTool({
      name: "nk_captcha_media_verify",
      description:
        "Verify the user's audio recording for an NK Captcha media challenge. " +
        "Checks recording validity AND verifies the spoken transcript matches the challenge phrase (90%+ similarity).",
      parameters: Type.Object({
        responses: Type.Array(
          Type.Object({
            challengeId: Type.String({ description: "The challenge ID from nk_captcha_media_challenge" }),
            audioBase64: Type.String({ description: "Base64-encoded audio recording data" }),
            durationMs: Type.Number({ description: "Duration of the recording in milliseconds" }),
            transcript: Type.Optional(Type.String({ description: "Client-side speech recognition transcript of what the user said" })),
            mimeType: Type.Optional(Type.String({ description: "MIME type of the audio (e.g. audio/webm)" })),
          }),
        ),
      }),
      async execute(_id, params) {
        const results = await Promise.all(params.responses.map(async (r) => {
          const challenge = CHALLENGES.find((c) => c.id === r.challengeId);
          if (!challenge) {
            return {
              challengeId: r.challengeId,
              pass: false,
              reason: "Unknown challenge ID",
              transcriptMatch: null,
            };
          }

          // Validate recording data exists and meets minimum requirements
          const audioBytes = r.audioBase64 ? Math.ceil((r.audioBase64.length * 3) / 4) : 0;
          const minBytes = 1000;

          if (audioBytes < minBytes) {
            return {
              challengeId: r.challengeId,
              pass: false,
              reason: `Recording too small (${audioBytes} bytes). Minimum: ${minBytes} bytes.`,
              challenge: { ko: challenge.ko, en: challenge.en },
              transcriptMatch: null,
            };
          }

          if (r.durationMs < minRecordingDurationMs) {
            return {
              challengeId: r.challengeId,
              pass: false,
              reason: `Recording too short (${r.durationMs}ms). Minimum: ${minRecordingDurationMs}ms.`,
              challenge: { ko: challenge.ko, en: challenge.en },
              transcriptMatch: null,
            };
          }

          // Get transcript: use provided one, or run server-side STT via Whisper
          let transcript = r.transcript ?? null;
          let sttSource = r.transcript ? "client" : "none";

          if (!transcript && sttApiKey) {
            transcript = await transcribeAudio(r.audioBase64, r.mimeType ?? "audio/webm");
            if (transcript) sttSource = "whisper";
          }

          // Verify transcript matches challenge phrase
          if (transcript) {
            const verifyResult = verify(r.challengeId, transcript, locale);
            if (!verifyResult.pass) {
              return {
                challengeId: r.challengeId,
                pass: false,
                reason: `Speech transcript does not match challenge phrase (${Math.round(verifyResult.similarity * 100)}% similarity, need 90%+).`,
                transcript,
                sttSource,
                expected: verifyResult.expected,
                similarity: verifyResult.similarity,
                challenge: { ko: challenge.ko, en: challenge.en },
                transcriptMatch: false,
              };
            }
            return {
              challengeId: r.challengeId,
              pass: true,
              reason: `Speech verified via ${sttSource}: transcript matches (${Math.round(verifyResult.similarity * 100)}% similarity).`,
              transcript,
              sttSource,
              similarity: verifyResult.similarity,
              durationMs: r.durationMs,
              sizeBytes: audioBytes,
              challenge: { ko: challenge.ko, en: challenge.en },
              transcriptMatch: true,
            };
          }

          // No transcript and no STT configured — pass with warning
          return {
            challengeId: r.challengeId,
            pass: true,
            reason: "Audio recording submitted (no STT configured — set sttApiKey to enable speech verification).",
            durationMs: r.durationMs,
            sizeBytes: audioBytes,
            challenge: { ko: challenge.ko, en: challenge.en },
            transcriptMatch: null,
            sttSource: "none",
          };
        }));

        const allPassed = results.every((r) => r.pass);
        const hasTranscripts = results.some((r) => r.transcriptMatch !== null);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: allPassed ? "VERIFIED" : "FAILED",
                  verdict: allPassed
                    ? hasTranscripts
                      ? "✅ User spoke the anti-regime phrase aloud and transcript was verified. Not a DPRK operative."
                      : "⚠️ User submitted audio recording but speech content was not verified (no STT). Consider requiring transcript."
                    : "🚫 User FAILED media recording verification.",
                  verificationLevel: hasTranscripts ? "transcript-verified" : "recording-only",
                  results,
                  totalChallenges: results.length,
                  passed: results.filter((r) => r.pass).length,
                  failed: results.filter((r) => !r.pass).length,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    });

    // ── Tool: Verify audio from URL (Discord, etc.) ──────────────
    api.registerTool({
      name: "nk_captcha_verify_audio_url",
      description:
        "Download an audio file from a URL (e.g. Discord attachment), transcribe it via Whisper, " +
        "and verify the spoken content matches the challenge phrase. " +
        "Use this when a user uploads a voice recording in Discord/Mattermost/Slack.",
      parameters: Type.Object({
        challengeId: Type.String({ description: "The challenge ID to verify against" }),
        audioUrl: Type.String({ description: "URL of the audio file (Discord attachment URL, etc.)" }),
      }),
      async execute(_id, params) {
        const challenge = CHALLENGES.find((c) => c.id === params.challengeId);
        if (!challenge) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ status: "FAILED", reason: "Unknown challenge ID" }),
            }],
          };
        }

        // Download audio file
        let audioBase64: string;
        let mimeType = "audio/webm";
        try {
          const res = await fetch(params.audioUrl);
          if (!res.ok) {
            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({ status: "FAILED", reason: `Failed to download audio: ${res.status} ${res.statusText}` }),
              }],
            };
          }
          mimeType = res.headers.get("content-type") ?? "audio/ogg";
          const buffer = await res.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          // Convert to base64
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          audioBase64 = btoa(binary);
        } catch (err) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ status: "FAILED", reason: `Download error: ${err}` }),
            }],
          };
        }

        const audioBytes = Math.ceil((audioBase64.length * 3) / 4);
        if (audioBytes < 1000) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ status: "FAILED", reason: `Audio file too small (${audioBytes} bytes)` }),
            }],
          };
        }

        // Transcribe via Whisper
        const transcript = await transcribeAudio(audioBase64, mimeType);
        if (!transcript) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                status: "FAILED",
                reason: sttApiKey
                  ? "STT transcription returned no text. The audio may be silent or corrupted."
                  : "No sttApiKey configured. Set sttApiKey in plugin config to enable speech verification.",
                challenge: { ko: challenge.ko, en: challenge.en },
              }),
            }],
          };
        }

        // Verify transcript against challenge
        const verifyResult = verify(params.challengeId, transcript, locale);
        const pass = verifyResult.pass;

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              status: pass ? "VERIFIED" : "FAILED",
              verdict: pass
                ? `✅ Speech verified: "${transcript}" matches challenge (${Math.round(verifyResult.similarity * 100)}% similarity). Not a DPRK operative.`
                : `🚫 Speech does NOT match: "${transcript}" vs expected "${verifyResult.expected}" (${Math.round(verifyResult.similarity * 100)}% similarity, need 90%+).`,
              transcript,
              expected: verifyResult.expected,
              similarity: verifyResult.similarity,
              sttSource: "whisper",
              audioSizeBytes: audioBytes,
              challenge: { ko: challenge.ko, en: challenge.en },
            }, null, 2),
          }],
        };
      },
    });

    // ── Tool: List all available challenges ─────────────────────
    api.registerTool(
      {
        name: "nk_captcha_list",
        description: "List all available NK Captcha challenge phrases (admin/debug use).",
        parameters: Type.Object({}),
        async execute() {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    total: CHALLENGES.length,
                    challenges: CHALLENGES.map((c) => ({
                      id: c.id,
                      ko: c.ko,
                      en: c.en,
                      category: c.category,
                      severity: c.severity,
                    })),
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        },
      },
      { optional: true },
    );

    // ── HTTP Route: Visual captcha page ─────────────────────────
    api.registerHttpRoute({
      method: "GET",
      path: "/nk-captcha",
      handler: async (_req) => {
        const html = renderCaptchaPage(locale, config.timeoutSeconds ?? 60, {
          enableMediaRecording,
          minRecordingDurationMs,
        });
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    });

    api.logger.info("NK Captcha plugin loaded — 자유를 위하여 🦅");
  },
});
