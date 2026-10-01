import { formatDuration, formatPercent } from "@/lib/metrics";
import type { LabResult } from "@/lib/types";

export const INSTRUCTOR_LINE = "Eğitmen mühendis Gürkan Fikret Günak";

export function buildSingleExportText(result: LabResult): string {
  const { transcript, metrics, sentiment, wer, fileName, processedAt } = result;
  const lines = [
    "=== speech-to-text-lab · Analiz Raporu ===",
    INSTRUCTOR_LINE,
    `Dosya: ${fileName}`,
    `İşlenme: ${new Date(processedAt).toLocaleString("tr-TR")}`,
    `Kaynak ASR: ${transcript.source}`,
    "",
    "--- Transkript ---",
    transcript.text,
    "",
    "--- Özet ---",
    `Süre: ${metrics.durationSec.toFixed(2)} sn (${formatDuration(metrics.durationSec)})`,
    `Örnekleme: ${Math.round(metrics.sampleRate)} Hz`,
    `Konuşma oranı: ${formatPercent(metrics.speakingRatio)}`,
    `Sessizlik boşlukları: ${metrics.silenceGaps}`,
    `Ort. güven: ${Math.round(metrics.averageConfidence * 100)}%`,
    `Anahtar kelimeler: ${
      metrics.keywordHits.map((k) => `${k.keyword}(${k.count})`).join(", ") || "—"
    }`,
    "",
    "--- Duygu / duygu durumu ---",
    `Etiket (polarite): ${sentiment.label}`,
    `Duygu: ${sentiment.emotion}`,
    `Skor: ${sentiment.score} (güven ${Math.round(sentiment.confidence * 100)}%)`,
    sentiment.summaryTr,
    "",
    "--- WER-ish metrikler ---",
    wer.hasReference
      ? `WER: ${(wer.wer * 100).toFixed(1)}% · Kelime doğruluğu: ${(wer.wordAccuracy * 100).toFixed(1)}%`
      : `Yaklaşık doğruluk (proxy): ${(wer.wordAccuracy * 100).toFixed(1)}%`,
    `S=${wer.substitutions} D=${wer.deletions} I=${wer.insertions}`,
    wer.noteTr,
    "",
    "Not: Eğitim demosu. Ücretli API yok. Gerçek PII / ALO 124 kaydı yoktur.",
    INSTRUCTOR_LINE,
    "==========================================",
  ];
  return lines.join("\n");
}

export type BatchSummaryRow = {
  fileName: string;
  durationSec: number;
  polarity: string;
  emotion: string;
  werPercent: number | null;
  accuracyPercent: number;
  hasReference: boolean;
  sentimentScore: number;
};

export function labResultToSummaryRow(result: LabResult): BatchSummaryRow {
  return {
    fileName: result.fileName,
    durationSec: result.metrics.durationSec,
    polarity: result.sentiment.label,
    emotion: result.sentiment.emotion,
    werPercent: result.wer.hasReference ? result.wer.wer * 100 : null,
    accuracyPercent: result.wer.wordAccuracy * 100,
    hasReference: result.wer.hasReference,
    sentimentScore: result.sentiment.score,
  };
}

export type BatchAggregateStats = {
  count: number;
  totalDurationSec: number;
  avgDurationSec: number;
  avgWerPercent: number | null;
  avgAccuracyPercent: number;
  polarityCounts: Record<string, number>;
  emotionCounts: Record<string, number>;
};

export function computeBatchAggregates(results: LabResult[]): BatchAggregateStats {
  const polarityCounts: Record<string, number> = {};
  const emotionCounts: Record<string, number> = {};
  let totalDuration = 0;
  let werSum = 0;
  let werCount = 0;
  let accSum = 0;

  for (const r of results) {
    totalDuration += r.metrics.durationSec;
    polarityCounts[r.sentiment.label] = (polarityCounts[r.sentiment.label] ?? 0) + 1;
    emotionCounts[r.sentiment.emotion] =
      (emotionCounts[r.sentiment.emotion] ?? 0) + 1;
    if (r.wer.hasReference) {
      werSum += r.wer.wer * 100;
      werCount += 1;
    }
    accSum += r.wer.wordAccuracy * 100;
  }

  const n = results.length || 1;
  return {
    count: results.length,
    totalDurationSec: totalDuration,
    avgDurationSec: totalDuration / n,
    avgWerPercent: werCount ? werSum / werCount : null,
    avgAccuracyPercent: accSum / n,
    polarityCounts,
    emotionCounts,
  };
}

export function buildBatchExportText(results: LabResult[]): string {
  const agg = computeBatchAggregates(results);
  const stamp = new Date().toLocaleString("tr-TR");
  const lines: string[] = [
    "=== speech-to-text-lab · Toplu İşleme Özeti ===",
    INSTRUCTOR_LINE,
    `Oluşturulma: ${stamp}`,
    `Dosya sayısı: ${agg.count}`,
    `Toplam süre: ${agg.totalDurationSec.toFixed(2)} sn (${formatDuration(agg.totalDurationSec)})`,
    `Ort. süre: ${agg.avgDurationSec.toFixed(2)} sn`,
    agg.avgWerPercent != null
      ? `Ort. WER: ${agg.avgWerPercent.toFixed(1)}%`
      : "Ort. WER: — (referans yok)",
    `Ort. kelime doğruluğu: ${agg.avgAccuracyPercent.toFixed(1)}%`,
    `Polarite dağılımı: ${
      Object.entries(agg.polarityCounts)
        .map(([k, v]) => `${k}(${v})`)
        .join(", ") || "—"
    }`,
    `Duygu dağılımı: ${
      Object.entries(agg.emotionCounts)
        .map(([k, v]) => `${k}(${v})`)
        .join(", ") || "—"
    }`,
    "",
    "--- Dosya satırları ---",
    "dosya | süre_sn | polarite | duygu | WER% | doğruluk%",
  ];

  for (const r of results) {
    const row = labResultToSummaryRow(r);
    const wer =
      row.werPercent != null ? row.werPercent.toFixed(1) : "—";
    lines.push(
      `${row.fileName} | ${row.durationSec.toFixed(2)} | ${row.polarity} | ${row.emotion} | ${wer} | ${row.accuracyPercent.toFixed(1)}`
    );
  }

  lines.push("");
  lines.push("--- Dosya detayları ---");
  for (const r of results) {
    lines.push("");
    lines.push(buildSingleExportText(r));
  }

  lines.push("");
  lines.push("Not: Eğitim demosu. Ücretli API yok. Gerçek PII / ALO 124 kaydı yoktur.");
  lines.push(INSTRUCTOR_LINE);
  lines.push("==========================================");
  return lines.join("\n");
}

export function downloadBlob(content: string, mime: string, fileName: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
