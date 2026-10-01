"use client";

import { formatDuration, formatPercent } from "@/lib/metrics";
import type { AudioMetrics } from "@/lib/types";

type MetricsDashboardProps = {
  metrics: AudioMetrics | null;
  loading?: boolean;
};

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-tuik">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function MetricsDashboard({ metrics, loading }: MetricsDashboardProps) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Transkripsiyon sonrası süre, konuşma oranı, sessizlik ve anahtar kelime
        metrikleri burada listelenir.
      </div>
    );
  }

  const topKeywords =
    metrics.keywordHits.length > 0
      ? metrics.keywordHits.map((k) => `${k.keyword} (${k.count})`).join(", ")
      : "Eşleşme yok";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Çağrı süresi"
          value={formatDuration(metrics.durationSec)}
          hint={`${metrics.durationSec.toFixed(2)} sn`}
        />
        <Card
          label="Konuşma oranı"
          value={formatPercent(metrics.speakingRatio)}
          hint="Kelime zaman damgalarından tahmin"
        />
        <Card
          label="Sessizlik boşlukları"
          value={String(metrics.silenceGaps)}
          hint="≥ 0,45 sn boşluklar"
        />
        <Card
          label="Örnekleme hızı"
          value={`${Math.round(metrics.sampleRate)} Hz`}
          hint={`Ort. güven: ${Math.round(metrics.averageConfidence * 100)}%`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-tuik">
          Anahtar kelime eşleşmeleri
        </p>
        <p className="mt-2 text-sm text-slate-800">{topKeywords}</p>
        <p className="mt-2 text-xs text-slate-500">
          Demo terimler: anket, gizlilik, TÜİK, randevu (+ alo, veri, istatistik)
        </p>
      </div>
    </div>
  );
}
