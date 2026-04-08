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
    };
    const locale = config.locale ?? "both";
    const challengeCount = config.challengeCount ?? 1;
    const enableMediaRecording = config.enableMediaRecording ?? false;
    const minRecordingDurationMs = config.minRecordingDurationMs ?? 1500;

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
        const results = params.responses.map((r) => {
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

          // Verify transcript matches challenge phrase
          if (r.transcript) {
            const verifyResult = verify(r.challengeId, r.transcript, locale);
            if (!verifyResult.pass) {
              return {
                challengeId: r.challengeId,
                pass: false,
                reason: `Speech transcript does not match challenge phrase (${Math.round(verifyResult.similarity * 100)}% similarity, need 90%+).`,
                transcript: r.transcript,
                expected: verifyResult.expected,
                similarity: verifyResult.similarity,
                challenge: { ko: challenge.ko, en: challenge.en },
                transcriptMatch: false,
              };
            }
            return {
              challengeId: r.challengeId,
              pass: true,
              reason: `Speech verified: transcript matches challenge phrase (${Math.round(verifyResult.similarity * 100)}% similarity).`,
              transcript: r.transcript,
              similarity: verifyResult.similarity,
              durationMs: r.durationMs,
              sizeBytes: audioBytes,
              challenge: { ko: challenge.ko, en: challenge.en },
              transcriptMatch: true,
            };
          }

          // No transcript provided — pass with warning (fallback to recording-only check)
          return {
            challengeId: r.challengeId,
            pass: true,
            reason: "Audio recording submitted (no transcript provided for content verification).",
            durationMs: r.durationMs,
            sizeBytes: audioBytes,
            challenge: { ko: challenge.ko, en: challenge.en },
            transcriptMatch: null,
          };
        });

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
