"use client";

import { jsPDF } from "jspdf";
import { formatDuration, formatPercent } from "@/lib/metrics";
import {
  INSTRUCTOR_LINE,
  computeBatchAggregates,
  labResultToSummaryRow,
} from "@/lib/report-export";
import type { LabResult } from "@/lib/types";

let fontsReady: Promise<void> | null = null;
const fontCache: { regular?: string; bold?: string } = {};

export type PdfArtifact = {
  blob: Blob;
  fileName: string;
};

async function loadFontAsBase64(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Font yüklenemedi: ${path} (HTTP ${res.status})`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    let part = "";
    for (let j = 0; j < slice.length; j++) part += String.fromCharCode(slice[j]);
    binary += part;
  }
  return btoa(binary);
}

async function ensureFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      try {
        fontCache.regular = await loadFontAsBase64("/fonts/DejaVuSans.ttf");
        fontCache.bold = await loadFontAsBase64("/fonts/DejaVuSans-Bold.ttf");
      } catch (err) {
        fontsReady = null;
        fontCache.regular = undefined;
        fontCache.bold = undefined;
        throw err;
      }
    })();
  }
  await fontsReady;
}

function registerFonts(doc: jsPDF) {
  if (!fontCache.regular || !fontCache.bold) {
    throw new Error("PDF fontları henüz hazır değil.");
  }
  doc.addFileToVFS("DejaVuSans.ttf", fontCache.regular);
  doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  doc.addFileToVFS("DejaVuSans-Bold.ttf", fontCache.bold);
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");
  doc.setFont("DejaVu", "normal");
}

type WriteCtx = {
  doc: jsPDF;
  y: number;
  margin: number;
  maxWidth: number;
  pageH: number;
};

function ensureSpace(ctx: WriteCtx, need: number) {
  if (ctx.y + need > ctx.pageH - ctx.margin) {
    ctx.doc.addPage();
    ctx.y = ctx.margin;
  }
}

function writeHeading(ctx: WriteCtx, text: string) {
  ensureSpace(ctx, 14);
  ctx.doc.setFont("DejaVu", "bold");
  ctx.doc.setFontSize(12);
  ctx.doc.setTextColor(174, 22, 21);
  ctx.doc.text(text, ctx.margin, ctx.y);
  ctx.y += 8;
  ctx.doc.setTextColor(15, 23, 42);
}

function writeBody(
  ctx: WriteCtx,
  text: string,
  opts?: { bold?: boolean; size?: number }
) {
  ctx.doc.setFont("DejaVu", opts?.bold ? "bold" : "normal");
  ctx.doc.setFontSize(opts?.size ?? 10);
  const lines = ctx.doc.splitTextToSize(text, ctx.maxWidth) as string[];
  for (const line of lines) {
    ensureSpace(ctx, 6);
    ctx.doc.text(line, ctx.margin, ctx.y);
    ctx.y += 5.2;
  }
}

function writeSpacer(ctx: WriteCtx, n = 4) {
  ctx.y += n;
}

function writeSingleSections(ctx: WriteCtx, result: LabResult) {
  const { transcript, metrics, sentiment, wer, fileName, processedAt } = result;

  writeBody(ctx, `Dosya: ${fileName}`, { bold: true, size: 11 });
  writeBody(ctx, `İşlenme: ${new Date(processedAt).toLocaleString("tr-TR")}`);
  writeBody(ctx, `Kaynak ASR: ${transcript.source}`);
  writeSpacer(ctx, 3);

  writeHeading(ctx, "Transkript");
  writeBody(ctx, transcript.text || "—");
  writeSpacer(ctx, 3);

  if (result.callAnalysis) {
    writeHeading(ctx, "Çağrı özeti (çok dakikalık)");
    writeBody(ctx, result.callAnalysis.summaryTr);
    writeBody(
      ctx,
      `Anahtar ifadeler: ${result.callAnalysis.keyPhrases.join("; ") || "—"}`
    );
    if (result.callAnalysis.segments.length > 1) {
      writeBody(ctx, "Süre dilimleri:", { bold: true, size: 10 });
      for (const seg of result.callAnalysis.segments) {
        writeBody(
          ctx,
          `${formatDuration(seg.startSec)}-${formatDuration(seg.endSec)} · ${seg.label}: ${seg.text}`,
          { size: 9 }
        );
      }
    }
    writeBody(ctx, result.callAnalysis.disclaimerTr, { size: 8 });
    writeSpacer(ctx, 3);
  }

  writeHeading(ctx, "Duygu / polarite");
  writeBody(ctx, `Polarite: ${sentiment.label}`);
  writeBody(ctx, `Duygu: ${sentiment.emotion}`);
  writeBody(
    ctx,
    `Skor: ${sentiment.score} (güven ${Math.round(sentiment.confidence * 100)}%)`
  );
  writeBody(ctx, sentiment.summaryTr);
  writeSpacer(ctx, 3);

  writeHeading(ctx, "Metrikler");
  writeBody(
    ctx,
    `Süre: ${metrics.durationSec.toFixed(2)} sn (${formatDuration(metrics.durationSec)})`
  );
  writeBody(ctx, `Örnekleme: ${Math.round(metrics.sampleRate)} Hz`);
  writeBody(ctx, `Konuşma oranı: ${formatPercent(metrics.speakingRatio)}`);
  writeBody(ctx, `Sessizlik boşlukları: ${metrics.silenceGaps}`);
  writeBody(
    ctx,
    `Ort. güven: ${Math.round(metrics.averageConfidence * 100)}%`
  );
  writeBody(
    ctx,
    `Anahtar kelimeler: ${
      metrics.keywordHits.map((k) => `${k.keyword}(${k.count})`).join(", ") || "—"
    }`
  );
  writeSpacer(ctx, 3);

  writeHeading(ctx, "WER-ish / kalite");
  if (wer.hasReference) {
    writeBody(
      ctx,
      `WER: ${(wer.wer * 100).toFixed(1)}% · Kelime doğruluğu: ${(wer.wordAccuracy * 100).toFixed(1)}%`
    );
  } else {
    writeBody(
      ctx,
      `Yaklaşık doğruluk (proxy): ${(wer.wordAccuracy * 100).toFixed(1)}%`
    );
  }
  writeBody(
    ctx,
    `S=${wer.substitutions} D=${wer.deletions} I=${wer.insertions}`
  );
  writeBody(ctx, wer.noteTr);
}

function docToArtifact(doc: jsPDF, fileName: string): PdfArtifact {
  const blob = doc.output("blob");
  // Ensure browsers treat it as PDF for iframe / new-tab preview
  const pdfBlob =
    blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });
  return { blob: pdfBlob, fileName };
}

/** Trigger a file download from a PDF blob without revoking a live preview URL. */
export function downloadPdfArtifact(artifact: PdfArtifact): void {
  const url = URL.createObjectURL(artifact.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = artifact.fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Delay revoke so the browser can start the download (Safari/Chrome quirk)
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Open a PDF blob URL in a new tab.
 * Returns false when the popup is blocked — caller should keep iframe preview.
 */
export function openPdfBlobUrl(blobUrl: string): boolean {
  const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
  return win != null;
}

/** Client-side Turkish analysis PDF (transcript, sentiment, metrics, instructor). */
export async function buildAnalysisPdf(
  result: LabResult
): Promise<PdfArtifact> {
  await ensureFonts();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerFonts(doc);

  const margin = 16;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxWidth = pageW - margin * 2;
  const ctx: WriteCtx = { doc, y: margin, margin, maxWidth, pageH };

  doc.setFont("DejaVu", "bold");
  doc.setFontSize(16);
  doc.setTextColor(174, 22, 21);
  doc.text("speech-to-text-lab · Analiz Raporu", margin, ctx.y);
  ctx.y += 8;

  doc.setFont("DejaVu", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  writeBody(ctx, INSTRUCTOR_LINE, { bold: true, size: 11 });
  writeSpacer(ctx, 2);
  writeSingleSections(ctx, result);
  writeSpacer(ctx, 6);

  writeHeading(ctx, "Not");
  writeBody(
    ctx,
    "Eğitim demosu. Ücretli API yok. Gerçek PII / ALO 124 kaydı yoktur. Resmi bir TÜİK ürünü değildir."
  );
  writeSpacer(ctx, 6);
  writeBody(ctx, INSTRUCTOR_LINE, { bold: true, size: 9 });
  writeBody(ctx, "© speech-to-text-lab · eğitim laboratuvarı", { size: 8 });

  const safeName = result.fileName.replace(/\W+/g, "_");
  return docToArtifact(doc, `stt-lab-rapor-${safeName}.pdf`);
}

export async function downloadAnalysisPdf(result: LabResult): Promise<void> {
  const artifact = await buildAnalysisPdf(result);
  downloadPdfArtifact(artifact);
}

/** Batch summary PDF: aggregate stats + table + short per-file notes. */
export async function buildBatchAnalysisPdf(
  results: LabResult[]
): Promise<PdfArtifact> {
  if (!results.length) throw new Error("Dışa aktarılacak sonuç yok.");
  await ensureFonts();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  registerFonts(doc);

  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxWidth = pageW - margin * 2;
  const ctx: WriteCtx = { doc, y: margin, margin, maxWidth, pageH };
  const agg = computeBatchAggregates(results);

  doc.setFont("DejaVu", "bold");
  doc.setFontSize(15);
  doc.setTextColor(174, 22, 21);
  doc.text("speech-to-text-lab · Toplu İşleme Özeti", margin, ctx.y);
  ctx.y += 8;

  doc.setTextColor(15, 23, 42);
  writeBody(ctx, INSTRUCTOR_LINE, { bold: true, size: 11 });
  writeBody(ctx, `Oluşturulma: ${new Date().toLocaleString("tr-TR")}`);
  writeSpacer(ctx, 3);

  writeHeading(ctx, "Toplu istatistikler");
  writeBody(ctx, `Dosya sayısı: ${agg.count}`);
  writeBody(
    ctx,
    `Toplam süre: ${agg.totalDurationSec.toFixed(2)} sn (${formatDuration(agg.totalDurationSec)})`
  );
  writeBody(ctx, `Ort. süre: ${agg.avgDurationSec.toFixed(2)} sn`);
  writeBody(
    ctx,
    agg.avgWerPercent != null
      ? `Ort. WER: ${agg.avgWerPercent.toFixed(1)}%`
      : "Ort. WER: — (referans yok)"
  );
  writeBody(
    ctx,
    `Ort. kelime doğruluğu: ${agg.avgAccuracyPercent.toFixed(1)}%`
  );
  writeBody(
    ctx,
    `Polarite: ${
      Object.entries(agg.polarityCounts)
        .map(([k, v]) => `${k}(${v})`)
        .join(", ") || "—"
    }`
  );
  writeBody(
    ctx,
    `Duygu: ${
      Object.entries(agg.emotionCounts)
        .map(([k, v]) => `${k}(${v})`)
        .join(", ") || "—"
    }`
  );
  writeSpacer(ctx, 4);

  writeHeading(ctx, "Özet tablo");
  for (const r of results) {
    const row = labResultToSummaryRow(r);
    const wer =
      row.werPercent != null ? `${row.werPercent.toFixed(1)}%` : "—";
    writeBody(
      ctx,
      `${row.fileName} · ${formatDuration(row.durationSec)} · ${row.polarity} / ${row.emotion} · WER ${wer} · doğruluk ${row.accuracyPercent.toFixed(1)}%`,
      { size: 9 }
    );
  }

  writeSpacer(ctx, 4);
  writeHeading(ctx, "Dosya detayları");
  for (const r of results) {
    writeSpacer(ctx, 2);
    writeSingleSections(ctx, r);
    writeSpacer(ctx, 4);
  }

  writeHeading(ctx, "Not");
  writeBody(
    ctx,
    "Eğitim demosu. Ücretli API yok. Gerçek PII / ALO 124 kaydı yoktur. Resmi bir TÜİK ürünü değildir."
  );
  writeSpacer(ctx, 4);
  writeBody(ctx, INSTRUCTOR_LINE, { bold: true, size: 9 });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return docToArtifact(doc, `stt-lab-toplu-rapor-${stamp}.pdf`);
}

export async function downloadBatchAnalysisPdf(
  results: LabResult[]
): Promise<void> {
  const artifact = await buildBatchAnalysisPdf(results);
  downloadPdfArtifact(artifact);
}
