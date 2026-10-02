"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, FileAudio, Layers, PanelTop, Rows3 } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { AudioUploader } from "@/components/AudioUploader";
import { SampleCatalogRow } from "@/components/SampleCatalogRow";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { BatchPanel } from "@/components/BatchPanel";
import { NlpOpenCodePanel } from "@/components/NlpOpenCodePanel";
import { ReportPanel } from "@/components/ReportPanel";
import { SentimentPanel } from "@/components/SentimentPanel";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { PipelineStagesPanel } from "@/components/PipelineStagesPanel";
import { SttModeSelector } from "@/components/SttModeSelector";
import { Waveform } from "@/components/Waveform";
import { decodeAudioFile, isAudioFile } from "@/lib/audio-utils";
import { SAMPLE_CATALOG, sampleAudioSources } from "@/lib/constants";
import { runLabPipeline, sttModeHasStages, type SttMode } from "@/lib/stt-pipeline";
import type { LabResult, PipelineStage } from "@/lib/types";
import { useLocale } from "@/components/LocaleProvider";

export function LabWorkspace() {
  const { t } = useLocale();

  const PIPELINE_STEPS = [
    { id: 1, label: t("lab.step.upload") },
    { id: 2, label: t("lab.step.listen") },
    { id: 3, label: t("lab.step.transcribe") },
    { id: 4, label: t("lab.step.sentiment") },
    { id: 5, label: t("lab.step.report") },
  ] as const;

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [sampleRate, setSampleRate] = useState(16000);
  const [mode, setMode] = useState<SttMode>("mock");
  const [liveStages, setLiveStages] = useState<PipelineStage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabResult | null>(null);
  /** Blob URL for the current upload — owned here; revoke only when replacing or unmounting. */
  const objectUrlRef = useRef<string | null>(null);
  /** Keep the File so blob URLs can be recreated if the player remounts after an STT mode switch. */
  const uploadedFileRef = useRef<File | null>(null);
  const [playedOnce, setPlayedOnce] = useState(false);
  const [pageDragging, setPageDragging] = useState(false);
  const pageDragDepth = useRef(0);
  const uploadRecoveringRef = useRef(false);
  const [workspaceMode, setWorkspaceMode] = useState<"single" | "batch" | "nlp">("single");
  const [currentTime, setCurrentTime] = useState(0);
  const seekAudioRef = useRef<((time: number) => void) | null>(null);
  /** Minimal (default): timeline player + waveform only. Detay: catalog + cards. */
  const [audioStageView, setAudioStageView] = useState<"minimal" | "detail">(
    "minimal"
  );

  const handleSeek = useCallback((time: number) => {
    seekAudioRef.current?.(time);
    setCurrentTime(time);
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  /** Create or replace the upload blob URL without Strict-Mode double-revoke races. */
  const assignUploadObjectUrl = useCallback(
    (file: File): string => {
      revokeObjectUrl();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      uploadedFileRef.current = file;
      return url;
    },
    [revokeObjectUrl]
  );

  useEffect(() => {
    return () => {
      revokeObjectUrl();
      uploadedFileRef.current = null;
    };
  }, [revokeObjectUrl]);

  const sampleSources = useMemo(() => {
    if (!selectedSample) return null;
    return sampleAudioSources(selectedSample);
  }, [selectedSample]);

  const loadSample = useCallback(
    async (name: string) => {
      setError(null);
      setResult(null);
      setPlayedOnce(false);
      setCurrentTime(0);
      setSelectedSample(name);
      setFileName(name);
      uploadedFileRef.current = null;
      revokeObjectUrl();
      const url = `/samples/${name}`;
      setAudioUrl(url);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(t("lab.errSampleMissing"));
        const blob = await res.blob();
        const info = await decodeAudioFile(blob);
        setDurationSec(info.durationSec);
        setSampleRate(info.sampleRate);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : t("lab.errSampleLoad")
        );
      }
    },
    [revokeObjectUrl, t]
  );

  const onUpload = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      setPlayedOnce(false);
      setCurrentTime(0);
      setSelectedSample(null);
      setFileName(file.name);
      const url = assignUploadObjectUrl(file);
      setAudioUrl(url);
      try {
        const info = await decodeAudioFile(file);
        setDurationSec(info.durationSec);
        setSampleRate(info.sampleRate);
      } catch {
        setError(t("lab.errDecode"));
      }
    },
    [assignUploadObjectUrl, t]
  );

  const onWaveReady = useCallback((d: number) => {
    if (d > 0) setDurationSec(d);
  }, []);

  /** If a blob: URL was revoked (Strict Mode / remount), rebuild from retained File. */
  const recoverUploadAudio = useCallback(() => {
    const file = uploadedFileRef.current;
    if (!file || selectedSample || uploadRecoveringRef.current) return;
    uploadRecoveringRef.current = true;
    try {
      const url = assignUploadObjectUrl(file);
      setAudioUrl(url);
    } finally {
      window.setTimeout(() => {
        uploadRecoveringRef.current = false;
      }, 750);
    }
  }, [assignUploadObjectUrl, selectedSample]);

  const transcribe = useCallback(async () => {
    if (!fileName || !audioUrl) {
      setError(t("lab.errSelectFirst"));
      return;
    }
    setLoading(true);
    setError(null);
    setLiveStages(sttModeHasStages(mode) ? [] : null);
    try {
      if (!sttModeHasStages(mode)) {
        await new Promise((r) => setTimeout(r, 450));
      }
      const lab = await runLabPipeline({
        fileName,
        durationSec: durationSec || 8,
        sampleRate,
        mode,
        audioUrl,
        onPipelineStage: (stage) => {
          setLiveStages((prev) => [...(prev ?? []), stage]);
        },
      });
      setResult(lab);
      if (lab.pipelineStages) setLiveStages(lab.pipelineStages);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("lab.errTranscribe")
      );
    } finally {
      setLoading(false);
    }
  }, [audioUrl, durationSec, fileName, mode, sampleRate, t]);

  useEffect(() => {
    const first = SAMPLE_CATALOG[0]?.fileName;
    if (first) void loadSample(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeStep = !audioUrl
    ? 1
    : !result
      ? playedOnce || durationSec > 0
        ? loading
          ? 3
          : 2
        : 2
      : 5;


  const resetPageDrag = useCallback(() => {
    pageDragDepth.current = 0;
    setPageDragging(false);
  }, []);

  const handlePageDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (loading) return;
      pageDragDepth.current += 1;
      if (e.dataTransfer?.types?.includes("Files")) {
        setPageDragging(true);
      }
    },
    [loading]
  );

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    pageDragDepth.current = Math.max(0, pageDragDepth.current - 1);
    if (pageDragDepth.current === 0) setPageDragging(false);
  }, []);

  const handlePageDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (loading) return;
      e.dataTransfer.dropEffect = "copy";
    },
    [loading]
  );

  const handlePageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resetPageDrag();
      if (loading) return;
      const files = e.dataTransfer.files;
      let file: File | null = null;
      if (files?.length) {
        for (let i = 0; i < files.length; i++) {
          if (isAudioFile(files[i])) {
            file = files[i];
            break;
          }
        }
      }
      if (!file) {
        alert(t("lab.dropInvalid"));
        return;
      }
      void onUpload(file);
    },
    [loading, onUpload, resetPageDrag, t]
  );

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label={t("lab.ariaWorkspace")}
        className="mx-auto flex max-w-7xl gap-1 rounded-xl border border-tuik/30 bg-white p-1 shadow-sm"
      >
        <button
          type="button"
          role="tab"
          aria-selected={workspaceMode === "single"}
          onClick={() => setWorkspaceMode("single")}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            workspaceMode === "single"
              ? "bg-tuik text-white shadow-sm shadow-tuik/20"
              : "text-slate-600 hover:bg-tuik-soft hover:text-tuik-dim"
          }`}
        >
          <FileAudio className="h-4 w-4" aria-hidden />
          {t("lab.tab.single")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={workspaceMode === "batch"}
          onClick={() => setWorkspaceMode("batch")}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            workspaceMode === "batch"
              ? "bg-tuik text-white shadow-sm shadow-tuik/20"
              : "text-slate-600 hover:bg-tuik-soft hover:text-tuik-dim"
          }`}
        >
          <Layers className="h-4 w-4" aria-hidden />
          {t("lab.tab.batch")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={workspaceMode === "nlp"}
          data-testid="tab-nlp-opencode"
          onClick={() => setWorkspaceMode("nlp")}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            workspaceMode === "nlp"
              ? "bg-tuik text-white shadow-sm shadow-tuik/20"
              : "text-slate-600 hover:bg-tuik-soft hover:text-tuik-dim"
          }`}
        >
          <Brain className="h-4 w-4" aria-hidden />
          {t("lab.tab.nlp")}
        </button>
      </div>

      {workspaceMode === "batch" ? <BatchPanel /> : null}

      {workspaceMode === "nlp" ? (
        <NlpOpenCodePanel
          key={result?.processedAt ?? "no-lab-result"}
          labResult={result}
        />
      ) : null}

      {workspaceMode === "single" ? (
    <div
      className={`relative mx-auto grid max-w-7xl items-start gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] ${
        pageDragging ? "rounded-2xl ring-2 ring-tuik/50 ring-offset-4 ring-offset-[#fafafa]" : ""
      }`}
      onDragEnter={handlePageDragEnter}
      onDragLeave={handlePageDragLeave}
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
    >
      {pageDragging ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-tuik-soft/80 backdrop-blur-[1px]">
          <div className="rounded-xl border-2 border-dashed border-tuik bg-white px-6 py-4 text-center shadow-lg shadow-tuik/15">
            <p className="text-sm font-semibold text-tuik-deep">
              {t("lab.dropHere")}
            </p>
            <p className="mt-1 text-xs text-slate-600">{t("lab.formats")}</p>
          </div>
        </div>
      ) : null}

      <aside className="order-2 space-y-4 lg:order-none">
        <ol className="flex flex-wrap gap-2 rounded-xl border border-tuik/30 bg-gradient-to-r from-white to-tuik-soft/50 p-3">
          {PIPELINE_STEPS.map((step) => {
            const done =
              (step.id === 1 && !!audioUrl) ||
              (step.id === 2 && !!audioUrl) ||
              (step.id === 3 && !!result) ||
              (step.id === 4 && !!result) ||
              (step.id === 5 && !!result);
            const current = activeStep === step.id || (result && step.id >= 3);
            return (
              <li
                key={step.id}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                  done
                    ? "bg-tuik text-white ring-tuik"
                    : current
                      ? "bg-tuik-soft text-tuik-deep ring-tuik/50"
                      : "bg-white text-slate-500 ring-slate-200"
                }`}
              >
                <span className="tabular-nums">{step.id}</span>
                {step.label}
              </li>
            );
          })}
        </ol>

        <AudioUploader
          onSelectSample={(n) => void loadSample(n)}
          onUpload={(f) => void onUpload(f)}
          disabled={loading}
        />

        <SttModeSelector
          value={mode}
          onChange={(m) => {
            // Clear analysis only — never clear uploaded File / audioUrl / waveform.
            setMode(m);
            setResult(null);
            setLiveStages(null);
            setError(null);
          }}
          disabled={loading}
        />

        <button
          type="button"
          onClick={() => void transcribe()}
          disabled={loading || !audioUrl}
          className="w-full rounded-xl bg-tuik px-4 py-3 text-sm font-semibold text-white transition hover:bg-tuik-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? t("lab.transcribing")
            : t("lab.transcribeBtn")}
        </button>
      </aside>

      <section className="order-1 min-w-0 space-y-6 lg:order-none">
        <div className="min-w-0 space-y-3 bg-[#fafafa] lg:sticky lg:top-4 lg:z-10 lg:pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="group"
              aria-label={t("lab.ariaAudioView")}
              data-testid="audio-stage-view-toggle"
              className="inline-flex gap-0.5 rounded-lg border border-tuik/30 bg-white p-0.5 shadow-sm"
            >
              <button
                type="button"
                aria-pressed={audioStageView === "minimal"}
                data-testid="audio-stage-view-minimal"
                onClick={() => setAudioStageView("minimal")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  audioStageView === "minimal"
                    ? "bg-tuik text-white shadow-sm shadow-tuik/20"
                    : "text-slate-600 hover:bg-tuik-soft hover:text-tuik-dim"
                }`}
              >
                <PanelTop className="h-3.5 w-3.5" aria-hidden />
                {t("lab.viewMinimal")}
              </button>
              <button
                type="button"
                aria-pressed={audioStageView === "detail"}
                data-testid="audio-stage-view-detail"
                onClick={() => setAudioStageView("detail")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  audioStageView === "detail"
                    ? "bg-tuik text-white shadow-sm shadow-tuik/20"
                    : "text-slate-600 hover:bg-tuik-soft hover:text-tuik-dim"
                }`}
              >
                <Rows3 className="h-3.5 w-3.5" aria-hidden />
                {t("lab.viewDetail")}
              </button>
            </div>
            {fileName ? (
              <span
                data-testid="audio-stage-file-badge"
                className="rounded-md bg-tuik-soft px-2 py-1 text-[10px] font-medium text-tuik-dim ring-1 ring-tuik/30"
              >
                {fileName}
                {durationSec > 0
                  ? ` · ${durationSec.toFixed(1)} ${t("lab.sec")} · ${Math.round(sampleRate)} Hz`
                  : ""}
              </span>
            ) : null}
          </div>

          {audioStageView === "minimal" ? (
            <div
              data-testid="audio-stage-minimal"
              className="min-w-0 space-y-1.5 overflow-hidden rounded-xl border border-tuik/30 bg-white p-2 shadow-sm"
            >
              <div onPlayCapture={() => setPlayedOnce(true)}>
                <AudioPlayer
                  compact
                  src={selectedSample ? null : audioUrl}
                  sources={selectedSample ? sampleSources : null}
                  label={fileName ? `${fileName}` : t("lab.playerLabel")}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={(d) => {
                    if (d > 0) setDurationSec(d);
                  }}
                  seekRef={seekAudioRef}
                  onSourceError={recoverUploadAudio}
                />
              </div>
              <Waveform
                compact
                height={48}
                url={audioUrl}
                onReady={onWaveReady}
                currentTime={currentTime}
                duration={durationSec}
                onSeek={handleSeek}
              />
            </div>
          ) : (
            <div data-testid="audio-stage-detail" className="min-w-0 space-y-4">
              <SampleCatalogRow
                selectedSample={selectedSample}
                onSelectSample={(n) => void loadSample(n)}
                disabled={loading}
              />

              <div className="rounded-xl border border-tuik/30 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-tuik-dim">
                      {t("lab.playerTitle")}
                    </h2>
                    <p className="text-xs text-slate-600">
                      {t("lab.playerHint")}
                    </p>
                  </div>
                  {fileName ? (
                    <span className="rounded-md bg-tuik-soft px-2 py-1 text-xs font-medium text-tuik-dim ring-1 ring-tuik/30">
                      {fileName}
                    </span>
                  ) : null}
                </div>
                <div onPlayCapture={() => setPlayedOnce(true)}>
                  <AudioPlayer
                    src={selectedSample ? null : audioUrl}
                    sources={selectedSample ? sampleSources : null}
                    label={fileName ? `${fileName}` : t("lab.playerLabel")}
                    onTimeUpdate={setCurrentTime}
                    onDurationChange={(d) => {
                      if (d > 0) setDurationSec(d);
                    }}
                    seekRef={seekAudioRef}
                    onSourceError={recoverUploadAudio}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {t("lab.waveformTitle")}
                    </h2>
                    <p className="text-xs text-slate-600">
                      {fileName ?? t("lab.noFile")}
                      {durationSec > 0
                        ? ` · ${durationSec.toFixed(2)} ${t("lab.sec")} · ${Math.round(sampleRate)} Hz`
                        : ""}
                    </p>
                  </div>
                </div>
                <Waveform
                  url={audioUrl}
                  onReady={onWaveReady}
                  currentTime={currentTime}
                  duration={durationSec}
                  onSeek={handleSeek}
                />
              </div>
            </div>
          )}
        </div>

        {(sttModeHasStages(mode) || (result?.pipelineStages?.length ?? 0) > 0) ? (
          <PipelineStagesPanel
            stages={result?.pipelineStages ?? liveStages}
            loading={loading && sttModeHasStages(mode)}
            variant={
              mode === "vad-ngram" || mode === "keyword-spot" || mode === "pipeline"
                ? mode
                : undefined
            }
          />
        ) : null}

        <MetricsDashboard metrics={result?.metrics ?? null} loading={loading} />
        <TranscriptPanel
          transcript={result?.transcript ?? null}
          loading={loading}
          error={error}
        />
        <SentimentPanel sentiment={result?.sentiment ?? null} loading={loading} />
        <ReportPanel result={result} loading={loading} />

        {result ? (
          <p className="text-xs text-slate-500">
            {t("lab.processed")}: {new Date(result.processedAt).toLocaleString()} · {t("lab.source")}:{" "}
            {result.transcript.source} · {t("lab.sentiment")}: {result.sentiment.label}/
            {result.sentiment.emotion}
          </p>
        ) : null}
      </section>
    </div>
      ) : null}
    </div>
  );
}
