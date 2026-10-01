import type { WordTiming } from "./types";
import { MOCK_TRANSCRIPTS, resolveSampleId } from "./constants";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Deterministic offline mock ASR for demos.
 * Produces Turkish transcript + synthetic word timings and confidence scores.
 */
export function runMockAsr(options: {
  fileName: string;
  durationSec: number;
  sampleRate?: number;
}): {
  text: string;
  words: WordTiming[];
  confidence: number;
  language: string;
} {
  const sampleId = resolveSampleId(options.fileName);
  const template = MOCK_TRANSCRIPTS[sampleId] ?? MOCK_TRANSCRIPTS.default;
  const wordsRaw = template.text.split(/\s+/).filter(Boolean);
  const duration = Math.max(options.durationSec, 1);
  const rand = seededRandom(hashSeed(options.fileName + String(Math.round(duration * 100))));

  const avgWordDur = duration / wordsRaw.length;
  let cursor = 0.15;
  const words: WordTiming[] = wordsRaw.map((word) => {
    const jitter = 0.7 + rand() * 0.6;
    const dur = Math.min(avgWordDur * jitter, duration - cursor);
    const start = cursor;
    const end = Math.min(start + Math.max(dur * 0.85, 0.12), duration);
    cursor = end + 0.04 + rand() * 0.08;
    const confidence = 0.72 + rand() * 0.26;
    return {
      word,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      confidence: Number(confidence.toFixed(3)),
    };
  });

  const confidence =
    words.reduce((acc, w) => acc + w.confidence, 0) / Math.max(words.length, 1);

  return {
    text: template.text,
    words,
    confidence: Number(confidence.toFixed(3)),
    language: template.language,
  };
}

/**
 * Merge Web Speech API result with mock timings when browser ASR has no word timings.
 */
export function attachMockTimings(
  text: string,
  durationSec: number,
  fileName: string
): WordTiming[] {
  const wordsRaw = text.split(/\s+/).filter(Boolean);
  if (wordsRaw.length === 0) return [];
  const duration = Math.max(durationSec, 1);
  const rand = seededRandom(hashSeed(fileName + "-timing"));
  const avg = duration / wordsRaw.length;
  let cursor = 0.1;
  return wordsRaw.map((word) => {
    const dur = avg * (0.75 + rand() * 0.5);
    const start = cursor;
    const end = Math.min(start + dur * 0.9, duration);
    cursor = end + 0.05;
    return {
      word,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      confidence: Number((0.7 + rand() * 0.28).toFixed(3)),
    };
  });
}
