import { DEMO_KEYWORDS } from "./constants";
import type { AudioMetrics, KeywordHit, WordTiming } from "./types";

function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[.,;:!?"'()[\]{}]/g, "");
}

export function findKeywordHits(text: string, keywords: readonly string[] = DEMO_KEYWORDS): KeywordHit[] {
  const normalized = normalizeTr(text);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return keywords
    .map((keyword) => {
      const k = normalizeTr(keyword);
      const positions: number[] = [];
      tokens.forEach((token, idx) => {
        if (token === k || token.includes(k)) {
          positions.push(idx);
        }
      });
      return { keyword, count: positions.length, positions };
    })
    .filter((h) => h.count > 0);
}

/**
 * Estimate speaking ratio and silence gaps from word timings.
 * Gaps longer than `gapThresholdSec` count as silence gaps.
 */
export function computeMetricsFromWords(options: {
  words: WordTiming[];
  durationSec: number;
  sampleRate: number;
  text: string;
  gapThresholdSec?: number;
}): AudioMetrics {
  const gapThreshold = options.gapThresholdSec ?? 0.45;
  const { words, durationSec, sampleRate, text } = options;

  let speaking = 0;
  const silenceGapDurations: number[] = [];

  if (words.length === 0) {
    return {
      durationSec,
      sampleRate,
      speakingRatio: 0,
      silenceGaps: durationSec > gapThreshold ? 1 : 0,
      silenceGapDurations: durationSec > gapThreshold ? [durationSec] : [],
      keywordHits: findKeywordHits(text),
      averageConfidence: 0,
    };
  }

  // Leading silence
  if (words[0].start > gapThreshold) {
    silenceGapDurations.push(words[0].start);
  }

  for (let i = 0; i < words.length; i++) {
    speaking += Math.max(0, words[i].end - words[i].start);
    if (i < words.length - 1) {
      const gap = words[i + 1].start - words[i].end;
      if (gap >= gapThreshold) {
        silenceGapDurations.push(gap);
      }
    }
  }

  // Trailing silence
  const trailing = durationSec - words[words.length - 1].end;
  if (trailing >= gapThreshold) {
    silenceGapDurations.push(trailing);
  }

  const speakingRatio = Math.min(1, speaking / Math.max(durationSec, 0.001));
  const averageConfidence =
    words.reduce((a, w) => a + w.confidence, 0) / words.length;

  return {
    durationSec: Number(durationSec.toFixed(3)),
    sampleRate,
    speakingRatio: Number(speakingRatio.toFixed(3)),
    silenceGaps: silenceGapDurations.length,
    silenceGapDurations: silenceGapDurations.map((g) => Number(g.toFixed(3))),
    keywordHits: findKeywordHits(text),
    averageConfidence: Number(averageConfidence.toFixed(3)),
  };
}

/**
 * Analyze decoded PCM peaks for crude VAD-style speaking ratio (client-side).
 */
export function estimateSpeakingFromPeaks(
  peaks: Float32Array | number[],
  durationSec: number,
  threshold = 0.08
): { speakingRatio: number; silenceGaps: number; silenceGapDurations: number[] } {
  if (!peaks.length || durationSec <= 0) {
    return { speakingRatio: 0, silenceGaps: 0, silenceGapDurations: [] };
  }

  const binDur = durationSec / peaks.length;
  let speakingBins = 0;
  const gaps: number[] = [];
  let inSilence = false;
  let silenceStart = 0;

  for (let i = 0; i < peaks.length; i++) {
    const amp = Math.abs(peaks[i]);
    const t = i * binDur;
    if (amp >= threshold) {
      speakingBins++;
      if (inSilence) {
        const gap = t - silenceStart;
        if (gap >= 0.45) gaps.push(gap);
        inSilence = false;
      }
    } else if (!inSilence) {
      inSilence = true;
      silenceStart = t;
    }
  }
  if (inSilence) {
    const gap = durationSec - silenceStart;
    if (gap >= 0.45) gaps.push(gap);
  }

  return {
    speakingRatio: Number((speakingBins / peaks.length).toFixed(3)),
    silenceGaps: gaps.length,
    silenceGapDurations: gaps.map((g) => Number(g.toFixed(3))),
  };
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
