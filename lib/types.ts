import type { SentimentResult } from "./sentiment";
import type { WerMetrics } from "./wer";


export type PipelineStageId =
  | "vad"
  | "features"
  | "decode"
  | "energy-vad"
  | "ngram"
  | "hybrid-decode"
  | "acoustic"
  | "keyword-scan"
  | "mock-fill";

export type PipelineStage = {
  id: PipelineStageId;
  label: string;
  status: "done" | "running" | "pending";
  detail: string;
  durationMs: number;
  metrics?: Record<string, string | number>;
};

export type WordTiming = {
  word: string;
  start: number;
  end: number;
  confidence: number;
};

export type KeywordHit = {
  keyword: string;
  count: number;
  positions: number[];
};

export type AudioMetrics = {
  durationSec: number;
  sampleRate: number;
  speakingRatio: number;
  silenceGaps: number;
  silenceGapDurations: number[];
  keywordHits: KeywordHit[];
  averageConfidence: number;
};

export type TranscriptResult = {
  text: string;
  words: WordTiming[];
  confidence: number;
  durationSec: number;
  sampleRate: number;
  source:
    | "web-speech"
    | "mock-asr"
    | "hybrid"
    | "pipeline-stages"
    | "vad-ngram-hybrid"
    | "keyword-spot";
  language: string;
};

export type LabResult = {
  transcript: TranscriptResult;
  metrics: AudioMetrics;
  sentiment: SentimentResult;
  wer: WerMetrics;
  fileName: string;
  processedAt: string;
  /** Present when STT mode emits educational pipeline stages. */
  pipelineStages?: PipelineStage[];
};

export type SampleMeta = {
  id: string;
  fileName: string;
  label: string;
  description: string;
  durationHint: string;
};

export type { SentimentResult, WerMetrics };
