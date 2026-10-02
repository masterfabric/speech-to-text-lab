"use client";

import type { TranscriptResult } from "@/lib/types";
import { useLocale } from "@/components/LocaleProvider";

type TranscriptPanelProps = {
  transcript: TranscriptResult | null;
  loading?: boolean;
  error?: string | null;
};

const sourceLabels: Record<TranscriptResult["source"], string> = {
  "mock-asr": "Mock ASR (çevrimdışı)",
  "web-speech": "Web Speech API",
  hybrid: "Hibrit (Web Speech + zaman damgası)",
  "pipeline-stages": "Boru hattı (VAD → öznitelik → decode)",
  "vad-ngram-hybrid": "Enerji/VAD + n-gram hibrit (demo)",
  "keyword-spot": "Anahtar kelime + akustik güven (MOCK)",
};

export function TranscriptPanel({
  transcript,
  loading,
  error,
}: TranscriptPanelProps) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-20 animate-pulse rounded bg-slate-100" />
        <div className="h-16 animate-pulse rounded bg-slate-50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
        <p className="font-medium">{t("panel.transcriptError")}</p>
        <p className="mt-1 text-rose-800/90">{error}</p>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        {t("panel.transcriptEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-tuik">{t("panel.transcript")}</h3>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="rounded-md bg-slate-100 px-2 py-1">
            {sourceLabels[transcript.source]}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1">
            {transcript.language}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1">
            {t("panel.confidence")}: {Math.round(transcript.confidence * 100)}%
          </span>
        </div>
      </div>

      <p className="leading-relaxed text-slate-900">{transcript.text}</p>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          {t("panel.wordTimings")}
        </h4>
        <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t("panel.word")}</th>
                <th className="px-3 py-2 font-medium">{t("panel.start")}</th>
                <th className="px-3 py-2 font-medium">{t("panel.end")}</th>
                <th className="px-3 py-2 font-medium">{t("panel.confidence")}</th>
              </tr>
            </thead>
            <tbody>
              {transcript.words.map((w, i) => (
                <tr key={`${w.word}-${i}`} className="border-t border-slate-200">
                  <td className="px-3 py-1.5 text-slate-800">{w.word}</td>
                  <td className="px-3 py-1.5 font-mono text-tuik">
                    {w.start.toFixed(2)}s
                  </td>
                  <td className="px-3 py-1.5 font-mono text-tuik">
                    {w.end.toFixed(2)}s
                  </td>
                  <td className="px-3 py-1.5 text-slate-500">
                    {Math.round(w.confidence * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
