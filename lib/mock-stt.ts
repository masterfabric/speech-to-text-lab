import type { WordTiming } from "./types";
import { MOCK_TRANSCRIPTS, resolveSampleId } from "./constants";

/** Educational chunk length for long telephony uploads. */
export const MOCK_CHUNK_SEC = 45;

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
 * Expand / chunk mock transcript text for long unknown uploads so the lab
 * still produces a non-empty transcript + skorlama after process.
 */
export function expandTranscriptForDuration(
  baseText: string,
  durationSec: number,
  sampleId: string
): string {
  const text = (baseText || "").trim();
  if (!text) {
    return MOCK_TRANSCRIPTS.default.text;
  }
  // Catalog samples keep their fixed transcript.
  if (sampleId !== "default") return text;

  const duration = Math.max(durationSec, 1);
  if (duration <= MOCK_CHUNK_SEC * 1.25) return text;

  const chunkCount = Math.min(12, Math.max(2, Math.ceil(duration / MOCK_CHUNK_SEC)));
  const bridge = [
    "Bir sonraki bölümde numara tekrarlandı.",
    "Görüşme devam ediyor, kısa bir bekleme oluştu.",
    "Operatör doğrulama adımlarını özetledi.",
    "Çağrı sonunda bilgilendirme cümlesi okundu.",
  ];
  const parts: string[] = [];
  for (let i = 0; i < chunkCount; i++) {
    parts.push(text);
    if (i < chunkCount - 1) {
      parts.push(bridge[i % bridge.length]);
    }
  }
  return parts.join(" ");
}

function buildWordTimings(
  wordsRaw: string[],
  durationSec: number,
  fileName: string
): WordTiming[] {
  if (wordsRaw.length === 0) return [];
  const duration = Math.max(durationSec, 1);
  const rand = seededRandom(
    hashSeed(fileName + String(Math.round(duration * 100)))
  );

  // Cap average word duration so ultra-long calls do not create 30s "words".
  const avgWordDur = Math.min(1.35, duration / wordsRaw.length);
  let cursor = 0.15;
  const words: WordTiming[] = [];

  for (let i = 0; i < wordsRaw.length; i++) {
    if (cursor >= duration - 0.05) break;
    const jitter = 0.7 + rand() * 0.6;
    const dur = Math.min(avgWordDur * jitter, duration - cursor);
    const start = cursor;
    const end = Math.min(start + Math.max(dur * 0.85, 0.12), duration);
    cursor = end + 0.04 + rand() * 0.08;
    const confidence = 0.72 + rand() * 0.26;
    words.push({
      word: wordsRaw[i],
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      confidence: Number(confidence.toFixed(3)),
    });
  }

  // If text is longer than we could pack into duration, keep remaining words
  // compressed into the last 15% of the timeline (chunk tail).
  if (words.length < wordsRaw.length && words.length > 0) {
    const remain = wordsRaw.slice(words.length);
    const tailStart = Math.min(
      words[words.length - 1].end + 0.05,
      duration * 0.85
    );
    const span = Math.max(0.5, duration - tailStart);
    const step = span / remain.length;
    let t = tailStart;
    for (const word of remain) {
      const start = t;
      const end = Math.min(start + step * 0.85, duration);
      t = end + step * 0.1;
      words.push({
        word,
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        confidence: Number((0.7 + rand() * 0.25).toFixed(3)),
      });
    }
  }

  return words;
}

/**
 * Deterministic offline mock ASR for demos.
 * Produces Turkish transcript + synthetic word timings and confidence scores.
 * Unknown / telephony uploads never yield an empty transcript.
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
  const duration = Math.max(options.durationSec, 1);
  const text = expandTranscriptForDuration(template.text, duration, sampleId);
  const wordsRaw = text.split(/\s+/).filter(Boolean);
  const words = buildWordTimings(wordsRaw, duration, options.fileName);

  const confidence =
    words.length > 0
      ? words.reduce((acc, w) => acc + w.confidence, 0) / words.length
      : 0.75;

  return {
    text: text || MOCK_TRANSCRIPTS.default.text,
    words,
    confidence: Number(confidence.toFixed(3)),
    language: template.language || "tr-TR",
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
  return buildWordTimings(wordsRaw, Math.max(durationSec, 1), fileName + "-timing");
}
