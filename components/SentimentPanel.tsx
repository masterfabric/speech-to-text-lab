"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Angry,
  Frown,
  Heart,
  Meh,
  MessageCircle,
  Smile,
} from "lucide-react";
import type { SentimentResult } from "@/lib/sentiment";
import { useLocale } from "@/components/LocaleProvider";

type SentimentPanelProps = {
  sentiment: SentimentResult | null;
  loading?: boolean;
};

const labelStyles: Record<SentimentResult["label"], string> = {
  olumlu: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  nötr: "bg-slate-100 text-slate-700 ring-slate-200",
  olumsuz: "bg-rose-50 text-rose-800 ring-rose-200",
};

const emotionIcon: Record<SentimentResult["emotion"], LucideIcon> = {
  sakin: Heart,
  memnun: Smile,
  ilgili: MessageCircle,
  gergin: AlertTriangle,
  kızgın: Angry,
  üzgün: Frown,
  nötr: Meh,
};

export function SentimentPanel({ sentiment, loading }: SentimentPanelProps) {
  const { t } = useLocale();

  if (loading) {
    return (
      <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    );
  }

  if (!sentiment) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        {t("panel.sentimentEmpty")}
      </div>
    );
  }

  const maxEmo = Math.max(
    ...Object.values(sentiment.emotionScores),
    0.001
  );
  const EmotionIcon = emotionIcon[sentiment.emotion];

  return (
    <div className="space-y-4 rounded-xl border border-tuik/30 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-tuik">
          {t("panel.sentiment")}
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {t("panel.sentimentOffline")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${labelStyles[sentiment.label]}`}
        >
          {sentiment.label.toLocaleUpperCase("tr-TR")}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-tuik-soft px-3 py-1 text-sm font-medium text-tuik-deep ring-1 ring-tuik/30">
          <EmotionIcon className="h-4 w-4 shrink-0" aria-hidden />
          {sentiment.emotion}
        </span>
        <span className="text-xs text-slate-600">
          {t("panel.score")}: {sentiment.score.toFixed(2)} · {t("panel.confidence")}:{" "}
          {Math.round(sentiment.confidence * 100)}%
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {(
          Object.entries(sentiment.emotionScores) as [
            SentimentResult["emotion"],
            number,
          ][]
        )
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => {
            const Icon = emotionIcon[name];
            return (
              <div key={name} className="flex items-center gap-2 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 text-tuik" aria-hidden />
                <span className="w-14 shrink-0 text-slate-600">{name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-tuik"
                    style={{ width: `${Math.round((value / maxEmo) * 100)}%` }}
                  />
                </div>
                <span className="w-8 tabular-nums text-slate-500">
                  {value.toFixed(1)}
                </span>
              </div>
            );
          })}
      </div>

      <p className="text-sm leading-relaxed text-slate-700">
        {sentiment.summaryTr}
      </p>
    </div>
  );
}
