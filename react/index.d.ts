import { FC } from 'react';

export interface NkCaptchaResult {
  pass: boolean;
  challengeId: string;
  transcript: string;
  similarity: number;
  code: string | null;
  audioBlob: Blob | null;
  durationMs: number;
  puzzleMoves: number;
}

export interface NkCaptchaProps {
  /** URL of the image to use for the puzzle (Kim Jong-un photo) */
  imageUrl?: string;
  /** Puzzle grid size: 3 or 4 (default: 3) */
  gridSize?: 3 | 4;
  /** Language: "ko", "en", or "both" (default: "both") */
  locale?: 'ko' | 'en' | 'both';
  /** Total timeout in seconds for all steps (default: 120) */
  timeout?: number;
  /** Called when verification completes (pass or fail) */
  onVerify?: (result: NkCaptchaResult) => void;
  /** Custom className for the container */
  className?: string;
}

/**
 * NK CAPTCHA — 3-step verification component
 *
 * Step 1: Reassemble scrambled image of Kim Jong-un (puzzle)
 * Step 2: Record yourself saying an anti-regime phrase (voice)
 * Step 3: Result (pass/fail)
 *
 * @example
 * <NkCaptcha
 *   imageUrl="/kim-photo.png"
 *   onVerify={(result) => console.log(result.pass ? 'Verified' : 'Failed')}
 * />
 */
declare const NkCaptcha: FC<NkCaptchaProps>;
export default NkCaptcha;
