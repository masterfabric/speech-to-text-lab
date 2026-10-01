"use client";

import {
  Activity,
  Binary,
  CheckCircle2,
  FileText,
  Gauge,
  Loader2,
  ScanSearch,
  Sparkles,
  AudioWaveform,
  type LucideIcon,
} from "lucide-react";
import type { PipelineStage, PipelineStageId } from "@/lib/types";

const STAGE_ICONS: Record<PipelineStageId, LucideIcon> = {
  vad: Activity,
  features: Binary,
  decode: Sparkles,
  "energy-vad": AudioWaveform,
  ngram: Binary,
  "hybrid-decode": Sparkles,
  acoustic: Gauge,
  "keyword-scan": ScanSearch,
  "mock-fill": FileText,
};

const STAGE_FALLBACK_LABELS: Record<PipelineStageId, string> = {
  vad: "VAD — konuşma etkinliği",
  features: "Öznitelik çıkarımı",
  decode: "Çözümleme (decode)",
  "energy-vad": "Enerji / VAD",
  ngram: "n-gram dil modeli (demo)",
  "hybrid-decode": "Hibrit çözümleme",
  acoustic: "Akustik güven",
  "keyword-scan": "Anahtar kelime tarama",
  "mock-fill": "Mock transkript doldurma",
};

const PIPELINE_ORDER: PipelineStageId[] = ["vad", "features", "decode"];
const VAD_NGRAM_ORDER: PipelineStageId[] = [
  "energy-vad",
  "ngram",
  "hybrid-decode",
];
const KEYWORD_ORDER: PipelineStageId[] = [
  "acoustic",
  "keyword-scan",
  "mock-fill",
];

function resolveOrder(
  stages: PipelineStage[] | null,
  variant?: "pipeline" | "vad-ngram" | "keyword-spot"
): PipelineStageId[] {
  if (variant === "vad-ngram") return VAD_NGRAM_ORDER;
  if (variant === "keyword-spot") return KEYWORD_ORDER;
  if (variant === "pipeline") return PIPELINE_ORDER;
  if (stages && stages.length > 0) return stages.map((s) => s.id);
  return PIPELINE_ORDER;
}

function badgeFor(order: PipelineStageId[]): string {
  if (order[0] === "energy-vad") return "Enerji → n-gram → hibrit";
  if (order[0] === "acoustic") return "Akustik → KW → MOCK";
  return "VAD → öznitelik → decode";
}

type PipelineStagesPanelProps = {
  stages: PipelineStage[] | null;
  loading?: boolean;
  /** Which educational path is active (for placeholder order while loading). */
  variant?: "pipeline" | "vad-ngram" | "keyword-spot";
};

export function PipelineStagesPanel({
  stages,
  loading,
  variant,
}: PipelineStagesPanelProps) {
  if (!loading && (!stages || stages.length === 0)) return null;

  const order = resolveOrder(stages, variant);
  const byId = new Map((stages ?? []).map((s) => [s.id, s]));

  return (
    <div className="rounded-xl border border-tuik/30 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-tuik">
          Boru hattı aşamaları
        </h3>
        <span className="rounded-md bg-tuik-soft px-2 py-0.5 text-[10px] font-semibold text-tuik-dim ring-1 ring-tuik/30">
          {badgeFor(order)}
        </span>
      </div>

      <ol className="space-y-2">
        {order.map((id, idx) => {
          const stage = byId.get(id);
          const running =
            loading && !stage && (idx === 0 || byId.has(order[idx - 1]));
          const Icon = STAGE_ICONS[id] ?? Activity;

          return (
            <li
              key={id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                stage
                  ? "border-tuik/30 bg-tuik-soft/50"
                  : running
                    ? "border-tuik/50 bg-white ring-1 ring-tuik/20"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  stage
                    ? "bg-tuik text-white"
                    : running
                      ? "bg-tuik-muted text-tuik"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : stage ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {stage?.label ?? STAGE_FALLBACK_LABELS[id] ?? id}
                </p>
                {stage ? (
                  <>
                    <p className="mt-0.5 text-xs text-slate-600">{stage.detail}</p>
                    <p className="mt-1 font-mono text-[10px] text-tuik-dim">
                      {stage.durationMs} ms
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {running ? "Çalışıyor…" : "Bekliyor"}
                  </p>
                )}
              </div>
              <span className="text-[10px] font-semibold tabular-nums text-slate-400">
                {idx + 1}/{order.length}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
