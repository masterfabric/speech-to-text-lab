import { DEMO_KEYWORDS } from "./constants";
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

function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[.,;:!?"'()[\]{}]/g, "");
}

/**
 * Offline keyword-spotting + acoustic-confidence demo.
 * Full transcript still comes from MOCK for known samples (educational).
 */
export async function runKeywordSpotAsr(options: {
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
  const rand = seededRandom(hashSeed(options.fileName + "-kwspot"));
  const stages: PipelineStage[] = [];

  const emit = (stage: PipelineStage) => {
    stages.push(stage);
    options.onStage?.(stage);
  };

  // --- Stage 1: Acoustic confidence from synthetic energy ---
  await sleep(150 + Math.floor(rand() * 90));
  const frameMs = 20;
  const frames = Math.max(1, Math.round((duration * 1000) / frameMs));
  const snrDb = Number((8 + rand() * 18).toFixed(1));
  const acousticConf = Number(
    Math.min(0.96, 0.55 + snrDb / 40 + rand() * 0.08).toFixed(3)
  );
  emit({
    id: "acoustic",
    label: "Akustik güven",
    status: "done",
    detail: `SNR ≈ ${snrDb} dB · çerçeve ${frames} · akustik güven ${(acousticConf * 100).toFixed(0)}%`,
    durationMs: Math.round(130 + rand() * 60),
    metrics: {
      frames,
      frameMs,
      snrDb,
      acousticConf,
      sampleRate,
    },
  });

  // --- Stage 2: Keyword spotting against mock text ---
  await sleep(170 + Math.floor(rand() * 110));
  const mock = runMockAsr({
    fileName: options.fileName,
    durationSec: duration,
    sampleRate,
  });
  const tokens = normalizeTr(mock.text).split(/\s+/).filter(Boolean);
  const hits: { keyword: string; count: number; avgConf: number }[] = [];
  for (const keyword of DEMO_KEYWORDS) {
    const k = normalizeTr(keyword);
    let count = 0;
    let confSum = 0;
    tokens.forEach((token, idx) => {
      if (token === k || token.includes(k)) {
        count++;
        // Acoustic confidence slightly jittered per hit
        const wordConf = mock.words[idx]?.confidence ?? acousticConf;
        confSum += Math.min(0.99, wordConf * 0.6 + acousticConf * 0.4);
      }
    });
    if (count > 0) {
      hits.push({
        keyword,
        count,
        avgConf: Number((confSum / count).toFixed(3)),
      });
    }
  }
  // Always surface a few “spotted” demo keywords with acoustic scores even if text lacks them
  const syntheticSpots =
    hits.length === 0
      ? DEMO_KEYWORDS.slice(0, 3).map((keyword) => ({
          keyword,
          count: 0,
          avgConf: Number((acousticConf * (0.7 + rand() * 0.2)).toFixed(3)),
        }))
      : [];
  const displayHits = hits.length ? hits : syntheticSpots;
  const hitSummary = displayHits
    .slice(0, 5)
    .map((h) =>
      h.count > 0
        ? `${h.keyword}×${h.count}(${Math.round(h.avgConf * 100)}%)`
        : `${h.keyword}(yok·${Math.round(h.avgConf * 100)}%)`
    )
    .join(" · ");
  emit({
    id: "keyword-scan",
    label: "Anahtar kelime tarama",
    status: "done",
    detail: hitSummary || "Eşleşme yok (demo sözlük tarandı)",
    durationMs: Math.round(160 + rand() * 80),
    metrics: {
      lexiconSize: DEMO_KEYWORDS.length,
      hitTypes: hits.length,
      totalHits: hits.reduce((a, h) => a + h.count, 0),
      top: displayHits[0]?.keyword ?? "—",
    },
  });

  // --- Stage 3: Mock transcript fill for samples ---
  await sleep(190 + Math.floor(rand() * 120));
  const spotBoost =
    hits.length > 0
      ? Math.min(0.12, hits.reduce((a, h) => a + h.count, 0) * 0.02)
      : 0;
  const blended = Number(
    Math.min(0.97, mock.confidence * 0.55 + acousticConf * 0.35 + spotBoost).toFixed(3)
  );
  const hitSet = new Set(hits.map((h) => normalizeTr(h.keyword)));
  const words: WordTiming[] = mock.words.map((w) => {
    const nw = normalizeTr(w.word);
    const isKw = [...hitSet].some((k) => nw === k || nw.includes(k));
    return {
      ...w,
      confidence: Number(
        Math.min(
          0.99,
          isKw
            ? Math.max(w.confidence, acousticConf) * 0.85 + 0.12
            : w.confidence * 0.75 + acousticConf * 0.2
        ).toFixed(3)
      ),
    };
  });
  emit({
    id: "mock-fill",
    label: "Mock transkript doldurma",
    status: "done",
    detail: `${words.length} kelime MOCK örnek metinden · güven ${(blended * 100).toFixed(0)}%`,
    durationMs: Math.round(200 + rand() * 90),
    metrics: {
      tokens: words.length,
      confidence: blended,
      language: mock.language,
      engine: "keyword-spot-demo",
      note: "Tam metin örnek MOCK; KW+akustik demo",
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
