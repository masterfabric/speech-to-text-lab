/**
 * Lightweight WER-ish metrics for the educational lab.
 * Uses classic Levenshtein alignment over whitespace tokens.
 */

export type WerMetrics = {
  wer: number;
  wordAccuracy: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  referenceWords: number;
  hypothesisWords: number;
  hasReference: boolean;
  referencePreview: string | null;
  noteTr: string;
};

function normalizeTokens(text: string): string[] {
  return text
    .toLocaleLowerCase("tr-TR")
    .normalize("NFC")
    .replace(/[.,;:!?"'()[\]{}]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Align hypothesis to reference with dynamic programming.
 * Returns counts of S / D / I and WER = (S+D+I) / N.
 */
export function computeWer(reference: string, hypothesis: string): WerMetrics {
  const ref = normalizeTokens(reference);
  const hyp = normalizeTokens(hypothesis);

  if (ref.length === 0) {
    return {
      wer: hyp.length === 0 ? 0 : 1,
      wordAccuracy: hyp.length === 0 ? 1 : 0,
      substitutions: 0,
      deletions: 0,
      insertions: hyp.length,
      referenceWords: 0,
      hypothesisWords: hyp.length,
      hasReference: false,
      referencePreview: null,
      noteTr:
        "Referans metin yok — yüklenen dosyalar için WER hesaplanamaz. Örnek kayıtlarda referans Mock ASR şablonudur.",
    };
  }

  const n = ref.length;
  const m = hyp.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0)
  );
  // backpointers: 0=sub/match, 1=del, 2=ins
  const bt: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0)
  );

  for (let i = 0; i <= n; i++) {
    dp[i][0] = i;
    bt[i][0] = 1;
  }
  for (let j = 0; j <= m; j++) {
    dp[0][j] = j;
    bt[0][j] = 2;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      const sub = dp[i - 1][j - 1] + cost;
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      if (sub <= del && sub <= ins) {
        dp[i][j] = sub;
        bt[i][j] = 0;
      } else if (del <= ins) {
        dp[i][j] = del;
        bt[i][j] = 1;
      } else {
        dp[i][j] = ins;
        bt[i][j] = 2;
      }
    }
  }

  let i = n;
  let j = m;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && bt[i][j] === 0) {
      if (ref[i - 1] !== hyp[j - 1]) substitutions++;
      i--;
      j--;
    } else if (i > 0 && (j === 0 || bt[i][j] === 1)) {
      deletions++;
      i--;
    } else {
      insertions++;
      j--;
    }
  }

  const errors = substitutions + deletions + insertions;
  const wer = errors / n;
  const wordAccuracy = Math.max(0, 1 - wer);

  return {
    wer: Number(wer.toFixed(4)),
    wordAccuracy: Number(wordAccuracy.toFixed(4)),
    substitutions,
    deletions,
    insertions,
    referenceWords: n,
    hypothesisWords: m,
    hasReference: true,
    referencePreview: reference.slice(0, 160) + (reference.length > 160 ? "…" : ""),
    noteTr:
      wer === 0
        ? "Mock ASR referansla birebir eşleşti (eğitim demosu). Gerçek ASR’de WER genelde > 0 olur."
        : `WER ≈ ${(wer * 100).toFixed(1)}% (S=${substitutions}, D=${deletions}, I=${insertions}). Klasik hizalama; demo metriğidir.`,
  };
}

/** Confidence-based proxy when no reference transcript exists. */
export function estimateAccuracyFromConfidence(confidence: number): WerMetrics {
  const acc = Math.max(0, Math.min(1, confidence));
  const wer = 1 - acc;
  return {
    wer: Number(wer.toFixed(4)),
    wordAccuracy: Number(acc.toFixed(4)),
    substitutions: 0,
    deletions: 0,
    insertions: 0,
    referenceWords: 0,
    hypothesisWords: 0,
    hasReference: false,
    referencePreview: null,
    noteTr:
      "Referans yok — güven skorundan yaklaşık kelime doğruluğu türetilmiştir (WER-ish proxy). Gerçek WER için altın standart transkript gerekir.",
  };
}
