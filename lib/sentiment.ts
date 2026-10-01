/**
 * Offline Turkish lexicon / rule+keyword sentiment & emotion scorer.
 * Educational demo only — not production NLP.
 */

export type SentimentLabel = "olumlu" | "nötr" | "olumsuz";
export type EmotionLabel =
  | "sakin"
  | "memnun"
  | "ilgili"
  | "gergin"
  | "kızgın"
  | "üzgün"
  | "nötr";

export type SentimentHit = {
  word: string;
  weight: number;
  category: "positive" | "negative" | "calm" | "tense" | "angry" | "sad" | "engaged";
};

export type SentimentResult = {
  label: SentimentLabel;
  score: number; // -1 .. +1
  confidence: number; // 0 .. 1
  emotion: EmotionLabel;
  emotionScores: Record<EmotionLabel, number>;
  positiveHits: SentimentHit[];
  negativeHits: SentimentHit[];
  summaryTr: string;
};

function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[.,;:!?"'()[\]{}]/g, " ");
}

/** Weighted Turkish demo lexicon (call-center friendly). */
const LEXICON: Record<
  string,
  { weight: number; category: SentimentHit["category"] }
> = {
  // olumlu / memnun
  teşekkür: { weight: 0.9, category: "positive" },
  teşekkürler: { weight: 0.9, category: "positive" },
  "teşekkür ederiz": { weight: 1.0, category: "positive" },
  memnun: { weight: 0.85, category: "positive" },
  memnuniyet: { weight: 0.8, category: "positive" },
  güzel: { weight: 0.6, category: "positive" },
  iyi: { weight: 0.55, category: "positive" },
  "iyi günler": { weight: 0.7, category: "positive" },
  hoş: { weight: 0.65, category: "positive" },
  "hoş geldiniz": { weight: 0.75, category: "positive" },
  yardımcı: { weight: 0.5, category: "engaged" },
  "yardımcı olabilirim": { weight: 0.6, category: "engaged" },
  başarı: { weight: 0.7, category: "positive" },
  tamam: { weight: 0.35, category: "calm" },
  evet: { weight: 0.25, category: "calm" },
  lütfen: { weight: 0.3, category: "calm" },
  rica: { weight: 0.35, category: "calm" },

  // sakin / resmi
  bilgi: { weight: 0.15, category: "calm" },
  teyit: { weight: 0.2, category: "calm" },
  kayıt: { weight: 0.15, category: "calm" },
  anket: { weight: 0.2, category: "engaged" },
  gizlilik: { weight: 0.25, category: "calm" },
  randevu: { weight: 0.2, category: "engaged" },

  // gergin / olumsuz
  sorun: { weight: -0.55, category: "tense" },
  problem: { weight: -0.6, category: "tense" },
  şikayet: { weight: -0.75, category: "tense" },
  bekletme: { weight: -0.5, category: "tense" },
  gecikme: { weight: -0.55, category: "tense" },
  hata: { weight: -0.65, category: "tense" },
  yanlış: { weight: -0.6, category: "tense" },
  olmuyor: { weight: -0.7, category: "tense" },
  bağlanamıyorum: { weight: -0.75, category: "tense" },
  anlamadım: { weight: -0.4, category: "tense" },
  hayır: { weight: -0.35, category: "tense" },
  istemiyorum: { weight: -0.7, category: "tense" },
  iptal: { weight: -0.45, category: "tense" },

  // kızgın
  kızgın: { weight: -0.9, category: "angry" },
  öfke: { weight: -0.95, category: "angry" },
  rezalet: { weight: -0.95, category: "angry" },
  berbat: { weight: -0.9, category: "angry" },
  "kabul edilemez": { weight: -0.9, category: "angry" },

  // üzgün
  üzgün: { weight: -0.7, category: "sad" },
  üzüldüm: { weight: -0.75, category: "sad" },
  maalesef: { weight: -0.45, category: "sad" },
  "ne yazık": { weight: -0.55, category: "sad" },
  özür: { weight: -0.35, category: "sad" },
  bitkin: { weight: -0.4, category: "sad" },
};

const MULTIWORD = Object.keys(LEXICON)
  .filter((k) => k.includes(" "))
  .sort((a, b) => b.length - a.length);

function emptyEmotionScores(): Record<EmotionLabel, number> {
  return {
    sakin: 0,
    memnun: 0,
    ilgili: 0,
    gergin: 0,
    kızgın: 0,
    üzgün: 0,
    nötr: 0.15,
  };
}

function categoryToEmotion(cat: SentimentHit["category"]): EmotionLabel {
  switch (cat) {
    case "positive":
      return "memnun";
    case "engaged":
      return "ilgili";
    case "calm":
      return "sakin";
    case "tense":
      return "gergin";
    case "angry":
      return "kızgın";
    case "sad":
      return "üzgün";
    default:
      return "nötr";
  }
}

/**
 * Score Turkish transcript for sentiment (olumlu/nötr/olumsuz)
 * and coarse emotion labels for the lab report.
 */
export function analyzeSentiment(text: string): SentimentResult {
  const normalized = normalizeTr(text || "");
  let working = ` ${normalized} `;
  const hits: SentimentHit[] = [];

  for (const phrase of MULTIWORD) {
    const needle = ` ${phrase} `;
    if (working.includes(needle)) {
      const entry = LEXICON[phrase];
      hits.push({ word: phrase, weight: entry.weight, category: entry.category });
      working = working.split(needle).join(" ");
    }
  }

  const tokens = working.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const entry = LEXICON[token];
    if (entry) {
      hits.push({ word: token, weight: entry.weight, category: entry.category });
    }
  }

  const emotionScores = emptyEmotionScores();
  let raw = 0;
  for (const hit of hits) {
    raw += hit.weight;
    const emo = categoryToEmotion(hit.category);
    emotionScores[emo] += Math.abs(hit.weight);
  }

  const denom = Math.max(hits.length, 1);
  let score = raw / (denom * 0.85);
  score = Math.max(-1, Math.min(1, score));

  // Soft prior toward nötr when few hits
  if (hits.length === 0) {
    score = 0;
    emotionScores.nötr = 1;
  } else if (hits.length < 2) {
    score *= 0.7;
    emotionScores.nötr += 0.25;
  }

  let label: SentimentLabel = "nötr";
  if (score >= 0.18) label = "olumlu";
  else if (score <= -0.18) label = "olumsuz";

  // Pick dominant emotion
  let emotion: EmotionLabel = "nötr";
  let best = -1;
  (Object.keys(emotionScores) as EmotionLabel[]).forEach((k) => {
    if (emotionScores[k] > best) {
      best = emotionScores[k];
      emotion = k;
    }
  });

  // Align emotion with polarity when scores are flat
  if (best < 0.2) {
    if (label === "olumlu") emotion = "memnun";
    else if (label === "olumsuz") emotion = "gergin";
    else emotion = "sakin";
  }

  const confidence = Math.min(
    0.95,
    0.45 + Math.min(hits.length, 6) * 0.08 + Math.abs(score) * 0.25
  );

  const positiveHits = hits.filter((h) => h.weight > 0);
  const negativeHits = hits.filter((h) => h.weight < 0);

  const summaryTr = buildSummary(label, emotion, score, positiveHits, negativeHits);

  return {
    label,
    score: Number(score.toFixed(3)),
    confidence: Number(confidence.toFixed(3)),
    emotion,
    emotionScores: Object.fromEntries(
      (Object.keys(emotionScores) as EmotionLabel[]).map((k) => [
        k,
        Number(emotionScores[k].toFixed(3)),
      ])
    ) as Record<EmotionLabel, number>,
    positiveHits,
    negativeHits,
    summaryTr,
  };
}

function buildSummary(
  label: SentimentLabel,
  emotion: EmotionLabel,
  score: number,
  positive: SentimentHit[],
  negative: SentimentHit[]
): string {
  const pol =
    label === "olumlu"
      ? "olumlu"
      : label === "olumsuz"
        ? "olumsuz"
        : "nötr / dengeli";
  const posWords = positive.slice(0, 4).map((h) => h.word).join(", ") || "—";
  const negWords = negative.slice(0, 4).map((h) => h.word).join(", ") || "—";
  return (
    `Duygu özeti: ton ${pol} (skor ${score.toFixed(2)}), baskın duygu «${emotion}». ` +
    `Olumlu ipuçları: ${posWords}. Olumsuz ipuçları: ${negWords}. ` +
    `Bu skorlar eğitim amaçlı Türkçe sözlük/kural tabanlıdır; üretim NLP değildir.`
  );
}
