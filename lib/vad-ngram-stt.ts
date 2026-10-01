import { runMockAsr } from "./mock-stt";
import type { PipelineStage, WordTiming } from "./types";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Tiny Turkish demo unigram/bigram lexicon for educational n-gram scoring. */
const DEMO_UNIGRAMS = [
  "tüik",
  "anket",
  "randevu",
  "gizlilik",
  "veri",
  "istatistik",
  "teşekkür",
  "alo",
  "adres",
  "merhaba",
  "evet",
  "hayır",
  "lütfen",
  "yardım",
] as const;

/**
 * Educational energy/VAD + n-gram hybrid (NOT Whisper / transformers.js).
 * Produces mock transcript for known samples; stages show the classic light path.
 */
export async function runVadNgramHybridAsr(options: {
  fileName: string;
  durationSec: number;
  sampleRate?: number;
  onStage?: (stage: PipelineStage) => void;
}): Promise<{
  text: string;
  words: WordTiming[];
  confidence: number;
  language: string;
  stages: PipelineStage[];
}> {
  const duration = Math.max(options.durationSec, 1);
  const sampleRate = options.sampleRate ?? 16000;
  const rand = seededRandom(hashSeed(options.fileName + "-vad-ngram"));
  const stages: PipelineStage[] = [];

  const emit = (stage: PipelineStage) => {
    stages.push(stage);
    options.onStage?.(stage);
  };

  // --- Stage 1: Energy / VAD ---
  await sleep(160 + Math.floor(rand() * 100));
  const frameMs = 25;
  const frames = Math.max(1, Math.round((duration * 1000) / frameMs));
  const energyThreshold = 0.12 + rand() * 0.06;
  const speechFrames = Math.round(frames * (0.5 + rand() * 0.3));
  const speechRatio = speechFrames / frames;
  const segmentCount = Math.max(1, Math.round(1 + duration / 7 + rand() * 2));
  const meanEnergy = Number((0.18 + rand() * 0.35).toFixed(3));
  emit({
    id: "energy-vad",
    label: "Enerji / VAD",
    status: "done",
    detail: `${segmentCount} segment · eşik ${energyThreshold.toFixed(2)} · %${Math.round(speechRatio * 100)} konuşma`,
    durationMs: Math.round(140 + rand() * 70),
    metrics: {
      frames,
      speechFrames,
      segments: segmentCount,
      speechRatio: Number(speechRatio.toFixed(3)),
      energyThreshold: Number(energyThreshold.toFixed(3)),
      meanEnergy,
      frameMs,
    },
  });

  // --- Stage 2: n-gram scoring ---
  await sleep(180 + Math.floor(rand() * 120));
  const mock = runMockAsr({
    fileName: options.fileName,
    durationSec: duration,
    sampleRate,
  });
  const tokens = mock.text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[.,;:!?"'()[\]{}]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  let unigramHits = 0;
  for (const t of tokens) {
    if (DEMO_UNIGRAMS.some((u) => t === u || t.includes(u))) unigramHits++;
  }
  const bigramCount = Math.max(0, tokens.length - 1);
  const scoredBigrams = Math.round(bigramCount * (0.35 + rand() * 0.4));
  const ngramScore = Number(
    Math.min(0.98, 0.55 + unigramHits * 0.04 + scoredBigrams / Math.max(bigramCount, 1) * 0.25).toFixed(3)
  );
  emit({
    id: "ngram",
    label: "n-gram dil modeli (demo)",
    status: "done",
    detail: `${unigramHits} unigram eşleşmesi · ${scoredBigrams}/${bigramCount} bigram · skor ${(ngramScore * 100).toFixed(0)}%`,
    durationMs: Math.round(180 + rand() * 90),
    metrics: {
      unigramHits,
      bigramCount,
      scoredBigrams,
      ngramScore,
      lexicon: "demo-tr-ngram-v1",
      note: "Whisper değil — eğitim hibriti",
    },
  });

  // --- Stage 3: Hybrid decode (mock text) ---
  await sleep(200 + Math.floor(rand() * 140));
  const energyConf = Math.min(0.95, 0.6 + speechRatio * 0.3 + meanEnergy * 0.2);
  const blended = Number(
    Math.min(0.97, mock.confidence * 0.45 + ngramScore * 0.35 + energyConf * 0.2).toFixed(3)
  );
  const words: WordTiming[] = mock.words.map((w) => ({
    ...w,
    confidence: Number(
      Math.min(0.99, w.confidence * 0.7 + blended * 0.3 + (rand() - 0.5) * 0.04).toFixed(3)
    ),
  }));
  emit({
    id: "hybrid-decode",
    label: "Hibrit çözümleme",
    status: "done",
    detail: `${words.length} kelime · harman güven ${(blended * 100).toFixed(0)}% (enerji+n-gram+mock)`,
    durationMs: Math.round(220 + rand() * 100),
    metrics: {
      tokens: words.length,
      confidence: blended,
      energyConf: Number(energyConf.toFixed(3)),
      language: mock.language,
      engine: "vad-ngram-hybrid-demo",
    },
  });

  return {
    text: mock.text,
    words,
    confidence: blended,
    language: mock.language,
    stages,
  };
}
