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

/**
 * Educational local STT path: VAD → feature summary → mock decode.
 * No model download; stages are simulated for teaching the classic ASR pipeline.
 */
export async function runPipelineStagesAsr(options: {
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
  const rand = seededRandom(hashSeed(options.fileName + "-pipeline"));
  const stages: PipelineStage[] = [];

  const emit = (stage: PipelineStage) => {
    stages.push(stage);
    options.onStage?.(stage);
  };

  // --- Stage 1: VAD ---
  await sleep(180 + Math.floor(rand() * 120));
  const frameMs = 30;
  const frames = Math.max(1, Math.round((duration * 1000) / frameMs));
  const speechFrames = Math.round(frames * (0.55 + rand() * 0.25));
  const speechRatio = speechFrames / frames;
  const segmentCount = Math.max(1, Math.round(1 + duration / 8 + rand() * 2));
  const vadStage: PipelineStage = {
    id: "vad",
    label: "VAD — konuşma etkinliği",
    status: "done",
    detail: `${segmentCount} konuşma segmenti · ${Math.round(speechRatio * 100)}% etkin çerçeve`,
    durationMs: Math.round(160 + rand() * 80),
    metrics: {
      frames,
      speechFrames,
      segments: segmentCount,
      speechRatio: Number(speechRatio.toFixed(3)),
      frameMs,
    },
  };
  emit(vadStage);

  // --- Stage 2: Features ---
  await sleep(200 + Math.floor(rand() * 140));
  const mfccCoeffs = 13;
  const featureFrames = speechFrames;
  const featureDim = mfccCoeffs + 2; // energy + delta proxy
  const featStage: PipelineStage = {
    id: "features",
    label: "Öznitelik çıkarımı",
    status: "done",
    detail: `${featureFrames} çerçeve × ${featureDim} boyut (MFCC+enerji özeti)`,
    durationMs: Math.round(200 + rand() * 100),
    metrics: {
      mfccCoeffs,
      featureFrames,
      featureDim,
      sampleRate,
      hopMs: frameMs,
    },
  };
  emit(featStage);

  // --- Stage 3: Decode (mock) ---
  await sleep(220 + Math.floor(rand() * 160));
  const mock = runMockAsr({
    fileName: options.fileName,
    durationSec: duration,
    sampleRate,
  });
  const decodeStage: PipelineStage = {
    id: "decode",
    label: "Çözümleme (decode)",
    status: "done",
    detail: `${mock.words.length} kelime · güven ${(mock.confidence * 100).toFixed(0)}%`,
    durationMs: Math.round(240 + rand() * 120),
    metrics: {
      tokens: mock.words.length,
      confidence: mock.confidence,
      language: mock.language,
      lexicon: "mock-tr-demo",
    },
  };
  emit(decodeStage);

  return {
    text: mock.text,
    words: mock.words,
    confidence: mock.confidence,
    language: mock.language,
    stages,
  };
}
