import { FC } from 'react';

export interface NkCaptchaResult {
  pass: boolean;
  challengeId: string;
  transcript: string;
  similarity: number;
  code: string | null;
  audioBlob: Blob | null;
  durationMs: number;
}

export interface NkCaptchaProps {
  /** Language: "ko", "en", or "both" (default: "both") */
  locale?: 'ko' | 'en' | 'both';
  /** Timeout in seconds (default: 60) */
  timeout?: number;
  /** Visual theme (default: "dark") */
  theme?: 'dark' | 'light';
  /** Called when verification completes */
  onVerify?: (result: NkCaptchaResult) => void;
  /** Custom className for the container */
  className?: string;
}

declare const NkCaptcha: FC<NkCaptchaProps>;
export default NkCaptcha;
