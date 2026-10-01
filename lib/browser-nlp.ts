/**
 * Optional in-browser Turkish NLP after STT.
 * Intent / summary / keywords — lexicon + heuristics, fully local, no APIs.
 */
import { DEMO_KEYWORDS } from "./constants";
import type { ReportIntent, ReportKeyword } from "./report-schema";

export type BrowserNlpResult = {
  intent: ReportIntent;
  intentConfidence: number;
  summaryTr: string;
  keywords: ReportKeyword[];
  keyPhrases: string[];
  method: "browser-tr-local";
};

const STOPWORDS = new Set(
  [
    "ve",
    "veya",
    "ile",
    "için",
    "bir",
    "bu",
    "şu",
    "o",
    "de",
    "da",
    "mi",
    "mı",
    "mu",
    "mü",
    "ne",
    "nasıl",
    "çok",
    "daha",
    "ama",
    "fakat",
    "ki",
    "ben",
    "sen",
    "biz",
    "siz",
    "onlar",
    "var",
    "yok",
    "gibi",
    "kadar",
    "sonra",
    "önce",
    "ise",
    "olarak",
    "her",
    "şey",
    "ya",
    "hem",
    "en",
    "az",
    "mıydı",
    "midir",
    "dir",
    "tır",
    "dır",
  ].map((w) => w.toLocaleLowerCase("tr-TR"))
);

type IntentRule = {
  intent: ReportIntent;
  terms: string[];
  weight: number;
};

const INTENT_RULES: IntentRule[] = [
  {
    intent: "randevu",
    terms: ["randevu", "tarih", "saat", "planla", "görüşme", "çağrı zaman"],
    weight: 1.2,
  },
  {
    intent: "sikayet",
    terms: [
      "şikayet",
      "sikayet",
      "sorun",
      "problem",
      "hata",
      "yanlış",
      "memnun değil",
      "geçikme",
    ],
    weight: 1.3,
  },
  {
    intent: "anket",
    terms: ["anket", "soru", "katılım", "araştırma", "cati", "örneklem"],
    weight: 1.15,
  },
  {
    intent: "gizlilik",
    terms: [
      "gizlilik",
      "kvkk",
      "kişisel veri",
      "izin",
      "onay",
      "mahremiyet",
      "paylaşılm",
    ],
    weight: 1.25,
  },
  {
    intent: "tesekkur",
    terms: ["teşekkür", "tesekkur", "sağol", "memnun", "iyi günler", "kolay gelsin"],
    weight: 1.0,
  },
  {
    intent: "bilgi",
    terms: [
      "bilgi",
      "öğrenmek",
      "nedir",
      "nasıl",
      "istatistik",
      "tüik",
      "alo",
      "124",
      "veri",
    ],
    weight: 1.0,
  },
];

function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[.,;:!?"'()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeTr(text)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function detectIntent(text: string): { intent: ReportIntent; confidence: number } {
  const norm = normalizeTr(text);
  if (!norm) return { intent: "diger", confidence: 0.2 };

  const scores: Record<ReportIntent, number> = {
    bilgi: 0,
    randevu: 0,
    sikayet: 0,
    anket: 0,
    gizlilik: 0,
    tesekkur: 0,
    diger: 0.05,
  };

  for (const rule of INTENT_RULES) {
    for (const term of rule.terms) {
      if (norm.includes(term.toLocaleLowerCase("tr-TR"))) {
        scores[rule.intent] += rule.weight;
      }
    }
  }

  let best: ReportIntent = "diger";
  let bestScore = 0;
  for (const [k, v] of Object.entries(scores) as [ReportIntent, number][]) {
    if (v > bestScore) {
      bestScore = v;
      best = k;
    }
  }

  if (bestScore < 0.4) {
    return { intent: "diger", confidence: 0.35 };
  }

  const conf = Math.min(0.95, 0.4 + bestScore * 0.18);
  return { intent: best, confidence: Number(conf.toFixed(3)) };
}

function extractKeywords(text: string, limit = 10): ReportKeyword[] {
  const tokens = tokenize(text);
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  const out: ReportKeyword[] = [];
  const seen = new Set<string>();

  for (const demo of DEMO_KEYWORDS) {
    const d = demo.toLocaleLowerCase("tr-TR");
    const count = [...freq.entries()]
      .filter(([w]) => w.includes(d) || d.includes(w))
      .reduce((a, [, c]) => a + c, 0);
    if (count > 0 && !seen.has(d)) {
      seen.add(d);
      out.push({ term: demo, count, source: "demo" });
    }
  }

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"));
  for (const [term, count] of sorted) {
    if (out.length >= limit) break;
    if (seen.has(term) || term.length < 3) continue;
    seen.add(term);
    out.push({ term, count, source: "frequency" });
  }

  return out.slice(0, limit);
}

function extractKeyPhrases(text: string, limit = 5): string[] {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
  if (sentences.length) {
    return sentences.slice(0, limit);
  }
  const words = tokenize(text);
  if (words.length < 3) return words.length ? [words.join(" ")] : [];
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 2 && phrases.length < limit; i += 3) {
    phrases.push(words.slice(i, i + 3).join(" "));
  }
  return phrases;
}

function buildSummary(text: string, intent: ReportIntent, keywords: ReportKeyword[]): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "Transkript boş; özet üretilemedi.";
  }
  const head =
    trimmed.length > 160 ? `${trimmed.slice(0, 157).trim()}…` : trimmed;
  const intentLabel: Record<ReportIntent, string> = {
    bilgi: "bilgi talebi",
    randevu: "randevu / planlama",
    sikayet: "şikayet / sorun",
    anket: "anket / araştırma",
    gizlilik: "gizlilik / KVKK",
    tesekkur: "teşekkür / kapanış",
    diger: "genel / diğer",
  };
  const topKw = keywords
    .slice(0, 4)
    .map((k) => k.term)
    .join(", ");
  return (
    `Yerel Türkçe NLP özeti (${intentLabel[intent]}): ${head}` +
    (topKw ? ` Anahtar: ${topKw}.` : "")
  );
}

/** Run optional browser NLP on STT transcript text. */
export function analyzeBrowserNlp(text: string): BrowserNlpResult {
  const { intent, confidence } = detectIntent(text);
  const keywords = extractKeywords(text);
  const keyPhrases = extractKeyPhrases(text);
  return {
    intent,
    intentConfidence: confidence,
    summaryTr: buildSummary(text, intent, keywords),
    keywords,
    keyPhrases,
    method: "browser-tr-local",
  };
}

export const INTENT_LABELS_TR: Record<ReportIntent, string> = {
  bilgi: "Bilgi",
  randevu: "Randevu",
  sikayet: "Şikayet",
  anket: "Anket",
  gizlilik: "Gizlilik",
  tesekkur: "Teşekkür",
  diger: "Diğer",
};
