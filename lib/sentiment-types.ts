/** Origin-compatible emotion types (alias of local sentiment vocabulary). */
export type EmotionLabel =
  | "nötr"
  | "olumlu"
  | "olumsuz"
  | "güven"
  | "endişe"
  | "memnuniyet";

export type EmotionScore = {
  label: EmotionLabel;
  score: number;
};

export type EmotionAnalysis = {
  primary: EmotionLabel;
  polarity: number;
  sentiment: "negatif" | "nötr" | "pozitif";
  scores: EmotionScore[];
  hits: { term: string; weight: number; bucket: EmotionLabel }[];
  method: "lexicon-tr-local";
};
