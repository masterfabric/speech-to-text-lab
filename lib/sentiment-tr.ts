/**
 * Origin-style Turkish emotion scoring surface.
 * Live e2e uses lib/sentiment.ts via stt-pipeline; this adapter keeps
 * Origin ReportPanel / imports working if swapped in later.
 */
import { analyzeSentiment } from "./sentiment";
import type { EmotionAnalysis, EmotionLabel } from "./sentiment-types";

const POLARITY: Record<string, number> = {
  olumlu: 0.85,
  memnun: 0.9,
  ilgili: 0.55,
  sakin: 0.35,
  nötr: 0,
  gergin: -0.45,
  üzgün: -0.7,
  kızgın: -0.95,
  olumsuz: -0.9,
};

export function analyzeTurkishEmotion(text: string): EmotionAnalysis {
  const s = analyzeSentiment(text || "");
  const scores = (
    Object.entries(s.emotionScores) as [string, number][]
  )
    .map(([label, score]) => ({
      label: (label === "memnun"
        ? "memnuniyet"
        : label === "sakin"
          ? "güven"
          : label === "gergin" || label === "kızgın"
            ? "endişe"
            : label === "üzgün"
              ? "olumsuz"
              : label === "ilgili"
                ? "olumlu"
                : "nötr") as EmotionLabel,
      score: Number(score.toFixed(3)),
    }))
    .sort((a, b) => b.score - a.score);

  const primary: EmotionLabel =
    s.label === "olumlu"
      ? "olumlu"
      : s.label === "olumsuz"
        ? "olumsuz"
        : "nötr";

  const polarity = Number(
    Math.max(-1, Math.min(1, POLARITY[s.emotion] ?? s.score)).toFixed(3)
  );

  const hits = [...s.positiveHits, ...s.negativeHits].slice(0, 12).map((h) => ({
    term: h.word,
    weight: h.weight,
    bucket: (h.category === "positive"
      ? "olumlu"
      : h.category === "negative" || h.category === "angry" || h.category === "sad"
        ? "olumsuz"
        : h.category === "tense"
          ? "endişe"
          : "nötr") as EmotionLabel,
  }));

  return {
    primary,
    polarity,
    sentiment:
      s.label === "olumlu" ? "pozitif" : s.label === "olumsuz" ? "negatif" : "nötr",
    scores,
    hits,
    method: "lexicon-tr-local",
  };
}

export function emotionLabelTr(label: EmotionLabel): string {
  const map: Record<EmotionLabel, string> = {
    nötr: "Nötr",
    olumlu: "Olumlu",
    olumsuz: "Olumsuz",
    güven: "Güven",
    endişe: "Endişe",
    memnuniyet: "Memnuniyet",
  };
  return map[label];
}
