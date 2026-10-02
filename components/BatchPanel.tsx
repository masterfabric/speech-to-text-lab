"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckSquare,
  Clock3,
  FileAudio,
  FileJson,
  FileText,
  Layers,
  Loader2,
  Play,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { decodeAudioFile, isAudioFile } from "@/lib/audio-utils";
import { SAMPLE_CATALOG } from "@/lib/constants";
import { PdfPreviewActions } from "@/components/PdfPreview";
import { buildBatchAnalysisPdf } from "@/lib/export-pdf";
import { formatDuration } from "@/lib/metrics";
import {
  buildBatchExportText,
  computeBatchAggregates,
  downloadBlob,
  labResultToSummaryRow,
} from "@/lib/report-export";
import { runLabPipeline } from "@/lib/stt-pipeline";
import type { LabResult } from "@/lib/types";

type BatchItem =
  | { kind: "sample"; id: string; fileName: string; label: string }
  | { kind: "file"; id: string; fileName: string; label: string; file: File };

type RowState = {
  id: string;
  fileName: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
  result?: LabResult;
};

export function BatchPanel() {
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(
    () => new Set(SAMPLE_CATALOG.slice(0, 2).map((s) => s.id))
  );
  const [extraFiles, setExtraFiles] = useState<
    { id: string; file: File }[]
  >([]);
  const [rows, setRows] = useState<RowState[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const queueItems = useMemo((): BatchItem[] => {
    const samples: BatchItem[] = SAMPLE_CATALOG.filter((s) =>
      selectedSampleIds.has(s.id)
    ).map((s) => ({
      kind: "sample",
      id: `sample:${s.id}`,
      fileName: s.fileName,
      label: s.label,
    }));
    const files: BatchItem[] = extraFiles.map((f) => ({
      kind: "file",
      id: f.id,
      fileName: f.file.name,
      label: f.file.name,
      file: f.file,
    }));
    return [...samples, ...files];
  }, [extraFiles, selectedSampleIds]);

  const doneResults = useMemo(
    () => rows.filter((r) => r.result).map((r) => r.result as LabResult),
    [rows]
  );

  const aggregates = useMemo(
    () => (doneResults.length ? computeBatchAggregates(doneResults) : null),
    [doneResults]
  );

  const toggleSample = (id: string) => {
    setSelectedSampleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSamples = () => {
    setSelectedSampleIds(new Set(SAMPLE_CATALOG.map((s) => s.id)));
  };

  const clearSampleSelection = () => {
    setSelectedSampleIds(new Set());
  };

  const addFiles = useCallback((list: FileList | File[]) => {
    const accepted: { id: string; file: File }[] = [];
    for (const file of Array.from(list)) {
      if (!isAudioFile(file)) continue;
      accepted.push({
        id: `file:${file.name}:${file.size}:${file.lastModified}:${Math.random().toString(36).slice(2, 7)}`,
        file,
      });
    }
    if (!accepted.length) {
      alert("Geçerli ses dosyası bulunamadı. WAV / MP3 / M4A deneyin.");
      return;
    }
    setExtraFiles((prev) => [...prev, ...accepted]);
  }, []);

  const removeExtraFile = (id: string) => {
    setExtraFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const runBatch = useCallback(async () => {
    if (!queueItems.length) {
      alert("En az bir katalog örneği seçin veya ses dosyası ekleyin.");
      return;
    }
    abortRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: queueItems.length });

    const initial: RowState[] = queueItems.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      label: item.label,
      status: "pending",
    }));
    setRows(initial);

    for (let i = 0; i < queueItems.length; i++) {
      if (abortRef.current) break;
      const item = queueItems[i];
      setRows((prev) =>
        prev.map((r) =>
          r.id === item.id ? { ...r, status: "running", error: undefined } : r
        )
      );

      try {
        let durationSec = 8;
        let sampleRate = 16000;
        let fileName = item.fileName;

        if (item.kind === "sample") {
          const url = `/samples/${item.fileName}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Örnek bulunamadı: ${item.fileName}`);
          const blob = await res.blob();
          const info = await decodeAudioFile(blob);
          durationSec = info.durationSec > 0 ? info.durationSec : 8;
          sampleRate = info.sampleRate > 0 ? info.sampleRate : 16000;
        } else {
          // Uploads (incl. long 8 kHz MP3): probe with fallbacks; never skip skorlama.
          const info = await decodeAudioFile(item.file);
          durationSec = info.durationSec > 0 ? info.durationSec : 8;
          sampleRate = info.sampleRate > 0 ? info.sampleRate : 8000;
          fileName = item.file.name;
        }

        // Small stagger so UI can paint progress between heavy decode steps
        await new Promise((r) => setTimeout(r, 120));

        const lab = await runLabPipeline({
          fileName,
          durationSec,
          sampleRate,
          mode: "mock",
        });

        if (!lab.sentiment) {
          throw new Error("Duygu skoru üretilemedi.");
        }

        setRows((prev) =>
          prev.map((r) =>
            r.id === item.id
              ? { ...r, status: "done", result: lab, error: undefined }
              : r
          )
        );
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "İşleme sırasında hata oluştu.";
        // Last-chance skorlama: still emit mock+sentiment so batch UI is not blank.
        try {
          const lab = await runLabPipeline({
            fileName: item.fileName,
            durationSec: 8,
            sampleRate: 8000,
            mode: "mock",
          });
          setRows((prev) =>
            prev.map((r) =>
              r.id === item.id
                ? {
                    ...r,
                    status: "done",
                    result: lab,
                    error: `Uyarı: ${msg}`,
                  }
                : r
            )
          );
        } catch {
          setRows((prev) =>
            prev.map((r) =>
              r.id === item.id ? { ...r, status: "error", error: msg } : r
            )
          );
        }
      }

      setProgress({ done: i + 1, total: queueItems.length });
    }

    setRunning(false);
  }, [queueItems]);

  const stopBatch = () => {
    abortRef.current = true;
  };

  const clearResults = () => {
    if (running) return;
    setRows([]);
    setProgress({ done: 0, total: 0 });
  };

  const exportTxt = () => {
    if (!doneResults.length) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadBlob(
      buildBatchExportText(doneResults),
      "text/plain;charset=utf-8",
      `stt-lab-toplu-rapor-${stamp}.txt`
    );
  };

  const exportJson = () => {
    if (!doneResults.length) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const payload = {
      generatedAt: new Date().toISOString(),
      aggregates: aggregates,
      results: doneResults,
    };
    downloadBlob(
      JSON.stringify(payload, null, 2),
      "application/json",
      `stt-lab-toplu-rapor-${stamp}.json`
    );
  };


  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="overflow-hidden rounded-xl border border-tuik/40 bg-white shadow-sm">
        <div className="accent-bar" aria-hidden />
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tuik text-white">
                <Layers className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-tuik-dim">
                  Toplu işleme
                </h2>
                <p className="text-xs text-slate-600">
                  Birden fazla katalog örneği veya dosya · Mock ASR + duygu ·
                  özet tablo ve dışa aktarım
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!running ? (
                <button
                  type="button"
                  onClick={() => void runBatch()}
                  disabled={!queueItems.length}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-tuik px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-tuik/20 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  Toplu işle ({queueItems.length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopBatch}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-tuik/40 bg-white px-4 py-2 text-xs font-semibold text-tuik-dim hover:bg-tuik-soft"
                >
                  <Square className="h-3.5 w-3.5" aria-hidden />
                  Durdur
                </button>
              )}
              <button
                type="button"
                onClick={clearResults}
                disabled={running || !rows.length}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Sonuçları temizle
              </button>
            </div>
          </div>

          {running ? (
            <div className="rounded-lg border border-tuik/25 bg-tuik-soft/70 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-xs text-tuik-dim">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  İşleniyor… {progress.done}/{progress.total}
                </span>
                <span className="tabular-nums">
                  {progress.total
                    ? Math.round((progress.done / progress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-tuik transition-all"
                  style={{
                    width: `${
                      progress.total
                        ? (progress.done / progress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-tuik">
                  Katalog örnekleri
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllSamples}
                    disabled={running}
                    className="inline-flex items-center gap-1 rounded-md border border-tuik/25 bg-tuik-soft px-2 py-1 text-[11px] font-medium text-tuik-dim hover:bg-tuik-muted disabled:opacity-50"
                  >
                    <CheckSquare className="h-3 w-3" aria-hidden />
                    Tümünü seç
                  </button>
                  <button
                    type="button"
                    onClick={clearSampleSelection}
                    disabled={running}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Temizle
                  </button>
                </div>
              </div>
              <div className="grid max-h-64 gap-2 overflow-y-auto overscroll-contain rounded-xl border border-slate-200/80 bg-slate-50/40 p-2 pr-1 shadow-inner sm:max-h-72">
                {SAMPLE_CATALOG.map((sample) => {
                  const checked = selectedSampleIds.has(sample.id);
                  return (
                    <label
                      key={sample.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                        checked
                          ? "border-tuik bg-tuik-soft/80 shadow-sm shadow-tuik/10"
                          : "border-slate-200 bg-white hover:border-tuik/40"
                      } ${running ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-[#ae1615]"
                        checked={checked}
                        disabled={running}
                        onChange={() => toggleSample(sample.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {sample.label}
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] tabular-nums text-tuik">
                            {sample.durationHint}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          {sample.fileName}
                        </span>
                      </span>
                      {checked ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-tuik" aria-hidden />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-tuik">
                Ek dosyalar (çoklu)
              </h3>
              <div
                role="button"
                tabIndex={0}
                aria-label="Birden fazla ses dosyası bırakın"
                onClick={() => {
                  if (!running) fileInputRef.current?.click();
                }}
                onKeyDown={(e) => {
                  if (running) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (!running) setDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (running) return;
                  if (e.dataTransfer.files?.length) {
                    addFiles(e.dataTransfer.files);
                  }
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
                  dragging
                    ? "border-tuik bg-tuik-soft ring-2 ring-tuik/25"
                    : "border-slate-300 bg-white hover:border-tuik hover:bg-tuik-soft/40"
                } ${running ? "pointer-events-none opacity-50" : ""}`}
              >
                <Upload className="mb-2 h-6 w-6 text-tuik" aria-hidden />
                <p className="text-sm font-medium text-slate-800">
                  Birden fazla ses dosyasını bırakın
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  WAV · MP3 · M4A — tıklayarak da seçebilirsiniz
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/wav,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/*"
                  multiple
                  className="hidden"
                  disabled={running}
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {extraFiles.length ? (
                <ul className="mt-3 space-y-1.5">
                  {extraFiles.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2 truncate text-slate-800">
                        <FileAudio className="h-3.5 w-3.5 shrink-0 text-tuik" aria-hidden />
                        <span className="truncate">{f.file.name}</span>
                      </span>
                      <button
                        type="button"
                        disabled={running}
                        onClick={() => removeExtraFile(f.id)}
                        className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-white hover:text-tuik disabled:opacity-50"
                        aria-label={`${f.file.name} kaldır`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">
                  Katalog dışı dosyalar kuyruğa eklenir; Mock ASR varsayılan
                  şablon kullanır.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>

      {aggregates ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AggStat
            label="Dosya"
            value={String(aggregates.count)}
            hint="başarılı sonuç"
          />
          <AggStat
            label="Toplam süre"
            value={formatDuration(aggregates.totalDurationSec)}
            hint={`${aggregates.totalDurationSec.toFixed(1)} sn`}
          />
          <AggStat
            label="Ort. WER"
            value={
              aggregates.avgWerPercent != null
                ? `${aggregates.avgWerPercent.toFixed(1)}%`
                : "—"
            }
            hint={`Ort. doğruluk ${aggregates.avgAccuracyPercent.toFixed(1)}%`}
          />
          <AggStat
            label="Polarite"
            value={
              Object.entries(aggregates.polarityCounts)
                .map(([k, v]) => `${k} ${v}`)
                .join(" · ") || "—"
            }
            hint={
              Object.entries(aggregates.emotionCounts)
                .map(([k, v]) => `${k}(${v})`)
                .join(", ") || "duygu dağılımı"
            }
          />
        </div>
      ) : null}

      {rows.length ? (
        <div className="overflow-hidden rounded-xl border border-tuik/30 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-tuik-dim">
                Özet tablo
              </h3>
              <p className="text-[11px] text-slate-500">
                Dosya · süre · polarite · duygu · WER
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportTxt}
                disabled={!doneResults.length || running}
                className="inline-flex items-center gap-1.5 rounded-lg border border-tuik/30 bg-tuik-soft px-3 py-1.5 text-xs font-semibold text-tuik-dim hover:bg-tuik-muted disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                TXT
              </button>
              <button
                type="button"
                onClick={exportJson}
                disabled={!doneResults.length || running}
                className="inline-flex items-center gap-1.5 rounded-lg border border-tuik/30 bg-white px-3 py-1.5 text-xs font-semibold text-tuik-dim hover:bg-tuik-soft disabled:opacity-50"
              >
                <FileJson className="h-3.5 w-3.5" aria-hidden />
                JSON
              </button>
            </div>
          </div>

          <div className="border-b border-slate-100 px-4 py-3">
            <PdfPreviewActions
              buildPdf={() => buildBatchAnalysisPdf(doneResults)}
              disabled={!doneResults.length || running}
              downloadVariant="solid"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-tuik-soft/80 text-[11px] uppercase tracking-wide text-tuik-dim">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Dosya</th>
                  <th className="px-4 py-2.5 font-semibold">Süre</th>
                  <th className="px-4 py-2.5 font-semibold">Polarite</th>
                  <th className="px-4 py-2.5 font-semibold">Duygu</th>
                  <th className="px-4 py-2.5 font-semibold">WER</th>
                  <th className="px-4 py-2.5 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const summary = row.result
                    ? labResultToSummaryRow(row.result)
                    : null;
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 text-slate-800"
                    >
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-xs font-medium">
                        {row.fileName}
                      </td>
                      <td className="px-4 py-2.5 text-xs tabular-nums">
                        {summary ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3 text-tuik" aria-hidden />
                            {formatDuration(summary.durationSec)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs capitalize">
                        {summary?.polarity ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs capitalize">
                        {summary?.emotion ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs tabular-nums">
                        {summary
                          ? summary.werPercent != null
                            ? `${summary.werPercent.toFixed(1)}%`
                            : `~${summary.accuracyPercent.toFixed(0)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <StatusPill status={row.status} error={row.error} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Layers className="mx-auto h-8 w-8 text-tuik/70" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-800">
            Toplu sonuçlar burada görünecek
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Katalogdan seçin veya dosya bırakın, ardından &quot;Toplu işle&quot;
            düğmesine basın.
          </p>
        </div>
      )}
    </div>
  );
}

function AggStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-tuik/25 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-tuik">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold capitalize leading-snug text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function StatusPill({
  status,
  error,
}: {
  status: RowState["status"];
  error?: string;
}) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-tuik-soft px-2 py-0.5 text-[11px] font-medium text-tuik-dim">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        İşleniyor
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-tuik px-2 py-0.5 text-[11px] font-medium text-white">
        <Check className="h-3 w-3" aria-hidden />
        Tamam
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="inline-flex max-w-[160px] truncate rounded-full bg-black px-2 py-0.5 text-[11px] font-medium text-white"
        title={error}
      >
        Hata
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
      Bekliyor
    </span>
  );
}
