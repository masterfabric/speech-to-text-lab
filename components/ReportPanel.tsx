"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  ClipboardCopy,
  Clock3,
  FileAudio,
  FileJson,
  FileText,
  HeartPulse,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";
import { PdfPreviewActions } from "@/components/PdfPreview";
import { buildAnalysisPdf } from "@/lib/export-pdf";
import { formatDuration } from "@/lib/metrics";
import {
  INSTRUCTOR_LINE,
  buildSingleExportText,
  downloadBlob,
} from "@/lib/report-export";
import type { LabResult } from "@/lib/types";
import { useLocale } from "@/components/LocaleProvider";

type ReportPanelProps = {
  result: LabResult | null;
  loading?: boolean;
};

export function ReportPanel({ result, loading }: ReportPanelProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="space-y-3 rounded-xl border border-tuik/30 bg-white p-5 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-tuik-muted/60" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-slate-100 bg-slate-50"
            />
          ))}
        </div>
        <div className="h-28 animate-pulse rounded-xl bg-slate-50" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <FileAudio
          className="mx-auto h-8 w-8 text-tuik/70"
          aria-hidden
        />
        <p className="mt-3 text-sm font-medium text-slate-800">
          {t("panel.reportEmpty")}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {t("panel.reportEmptyHint")}
        </p>
      </div>
    );
  }

  const { transcript, metrics, sentiment, wer } = result;
  const exportText = buildSingleExportText(result);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(t("panel.copyFailed"));
    }
  };

  const downloadTxt = () => {
    downloadBlob(
      exportText,
      "text/plain;charset=utf-8",
      `stt-lab-rapor-${result.fileName.replace(/\W+/g, "_")}.txt`
    );
  };

  const downloadJson = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBlob(
      JSON.stringify(result, null, 2),
      "application/json",
      `stt-lab-report-${stamp}.json`
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-tuik/40 bg-white shadow-sm">
      <div className="accent-bar" aria-hidden />

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tuik text-white">
                <FileText className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-tuik-dim">
                  {t("panel.report")}
                </h3>
                <p className="text-xs text-slate-600">
                  {t("panel.reportSubtitle")}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-md bg-tuik-soft px-2 py-0.5 font-medium text-tuik-dim ring-1 ring-tuik/25">
                {result.fileName}
              </span>
              <span className="text-slate-500">
                {new Date(result.processedAt).toLocaleString("tr-TR")}
              </span>
              <span className="font-medium text-tuik">{INSTRUCTOR_LINE}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ExportBtn
              onClick={() => void copy()}
              icon={<ClipboardCopy className="h-3.5 w-3.5" aria-hidden />}
              label={copied ? t("panel.copied") : t("panel.copyClipboard")}
              variant="ghost"
            />
            <ExportBtn
              onClick={downloadTxt}
              icon={<FileText className="h-3.5 w-3.5" aria-hidden />}
              label="TXT"
              variant="soft"
            />
            <ExportBtn
              onClick={downloadJson}
              icon={<FileJson className="h-3.5 w-3.5" aria-hidden />}
              label="JSON"
              variant="ghost"
            />
          </div>
        </div>

        <PdfPreviewActions
          buildPdf={() => buildAnalysisPdf(result)}
          downloadVariant="solid"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<Clock3 className="h-3.5 w-3.5" aria-hidden />}
            label={t("panel.duration")}
            value={formatDuration(metrics.durationSec)}
            hint={`${metrics.durationSec.toFixed(2)} sn · ${Math.round(metrics.sampleRate)} Hz`}
          />
          <Stat
            icon={<HeartPulse className="h-3.5 w-3.5" aria-hidden />}
            label={t("panel.polarity")}
            value={sentiment.label}
            hint={`${t("panel.emotion")}: ${sentiment.emotion} · ${t("panel.score")} ${sentiment.score.toFixed(2)}`}
          />
          <Stat
            icon={<Activity className="h-3.5 w-3.5" aria-hidden />}
            label={wer.hasReference ? "WER" : t("panel.approxAccuracy")}
            value={
              wer.hasReference
                ? `${(wer.wer * 100).toFixed(1)}%`
                : `${(wer.wordAccuracy * 100).toFixed(0)}%`
            }
            hint={
              wer.hasReference
                ? `${t("panel.accuracy")} ${(wer.wordAccuracy * 100).toFixed(1)}%`
                : t("panel.proxyHint")
            }
          />
          <Stat
            icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden />}
            label={t("panel.asrConfidence")}
            value={`${Math.round(transcript.confidence * 100)}%`}
            hint={transcript.source}
          />
        </div>

        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <SectionTitle
            icon={<MessageSquareText className="h-3.5 w-3.5" aria-hidden />}
            title={t("panel.transcriptSummary")}
          />
          <p className="mt-2 text-sm leading-relaxed text-slate-900">
            {transcript.text}
          </p>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <SectionTitle
              icon={<HeartPulse className="h-3.5 w-3.5" aria-hidden />}
              title={t("panel.emotionScores")}
            />
            <ul className="mt-2 space-y-1.5 text-slate-700">
              <li>
                Polarite: <strong className="capitalize">{sentiment.label}</strong>{" "}
                (skor {sentiment.score.toFixed(2)})
              </li>
              <li>
                Baskın duygu:{" "}
                <strong className="capitalize">{sentiment.emotion}</strong>
              </li>
              <li className="text-xs leading-relaxed text-slate-500">
                {sentiment.summaryTr}
              </li>
            </ul>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <SectionTitle
              icon={<Activity className="h-3.5 w-3.5" aria-hidden />}
              title={t("panel.werQuality")}
            />
            <ul className="mt-2 space-y-1.5 text-slate-700">
              {wer.hasReference ? (
                <>
                  <li>
                    WER:{" "}
                    <strong>{(wer.wer * 100).toFixed(1)}%</strong>
                  </li>
                  <li>
                    S={wer.substitutions} · D={wer.deletions} · I=
                    {wer.insertions}
                  </li>
                </>
              ) : (
                <li>{t("panel.noReference")}</li>
              )}
              <li className="text-xs leading-relaxed text-slate-500">
                {wer.noteTr}
              </li>
            </ul>
          </section>
        </div>

        <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-700">
            {t("panel.exportPreview")}
          </summary>
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-700">
            {exportText}
          </pre>
        </details>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-tuik">
      {icon}
      {title}
    </p>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-tuik">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold capitalize text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ExportBtn({
  onClick,
  icon,
  label,
  variant,
  disabled,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  variant: "ghost" | "soft" | "solid";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "solid"
      ? "bg-tuik text-white shadow-sm shadow-tuik/20 hover:brightness-105"
      : variant === "soft"
        ? "border border-tuik/30 bg-tuik-soft text-tuik-dim hover:bg-tuik-muted"
        : "border border-tuik/30 bg-white text-tuik-dim hover:bg-tuik-soft";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      {icon}
      {label}
    </button>
  );
}
