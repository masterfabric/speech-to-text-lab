"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  History,
  Loader2,
  Maximize2,
  MessageCircleQuestion,
  Minimize2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TriangleAlert,
  Terminal,
  UserRound,
  Wand2,
} from "lucide-react";
import { AudioUploader } from "@/components/AudioUploader";
import { SampleCatalogRow } from "@/components/SampleCatalogRow";
import { OpenCodeInstallAccordion } from "@/components/OpenCodeInstallAccordion";
import { SentimentPanel } from "@/components/SentimentPanel";
import { useLocale } from "@/components/LocaleProvider";
import {
  INTENT_LABELS_TR,
  analyzeBrowserNlp,
  type BrowserNlpResult,
} from "@/lib/browser-nlp";
import { SAMPLE_CATALOG } from "@/lib/constants";
import { decodeAudioFile } from "@/lib/audio-utils";
import {
  OPENCODE_FALLBACK_MODELS,
  OPENCODE_MODEL_ID,
  OPENCODE_MODEL_STORAGE_KEY,
  ensureModelInList,
  fetchOpenCodeStatus,
  runOpenCodeAnalyze,
  sanitizeOpenCodeModelId,
  type OpenCodeStatus,
} from "@/lib/opencode-bridge";
import {
  buildActionQuestions,
  deleteArchivedCase,
  exportArchivesAsJson,
  formatArchiveTimeTr,
  listArchivedCases,
  saveArchivedCase,
  type ArchivedCase,
} from "@/lib/case-archive";
import { downloadBlob } from "@/lib/report-export";
import {
  REPORT_SCHEMA_VERSION,
  buildReportDocument,
  stringifyReportDocument,
  type ReportAgentSection,
  type ReportDocumentV1,
} from "@/lib/report-schema";
import { labResultFromSampleFileName, runLabPipeline } from "@/lib/stt-pipeline";
import type { LabResult } from "@/lib/types";

type NlpOpenCodePanelProps = {
  /** Optional result from Tek dosya STT — NLP tab can also run from SAMPLE_CATALOG alone. */
  labResult: LabResult | null;
};

type AgentChatMessage = {
  id: string;
  role: "user" | "assistant";
  /** Primary visible text */
  text: string;
  /** Optional structured bits for assistant replies */
  status?: ReportAgentSection["status"];
  source?: string;
  notesTr?: string;
  refinedSummaryTr?: string;
  riskFlags?: string[];
  model?: string;
  at: string;
};

function agentToAssistantMessage(
  agent: ReportAgentSection,
  model?: string
): AgentChatMessage {
  return {
    id: `a-${agent.ranAt ?? Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role: "assistant",
    text: agent.messageTr,
    status: agent.status,
    source: agent.source,
    notesTr: agent.notesTr,
    refinedSummaryTr: agent.refinedSummaryTr,
    riskFlags: agent.riskFlags,
    model,
    at: agent.ranAt ?? new Date().toISOString(),
  };
}

function ToggleRow(props: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { id, label, description, checked, onChange, disabled } = props;
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
        checked
          ? "border-tuik/40 bg-tuik-soft/60"
          : "border-slate-200 bg-white hover:border-tuik/25"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {checked ? (
        <ToggleRight className="mt-0.5 h-5 w-5 shrink-0 text-tuik" aria-hidden />
      ) : (
        <ToggleLeft className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      )}
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-600">{description}</span>
      </span>
    </button>
  );
}

export function NlpOpenCodePanel({ labResult }: NlpOpenCodePanelProps) {
  const { t } = useLocale();
  const [browserNlpOn, setBrowserNlpOn] = useState(true);
  const [openCodeOn, setOpenCodeOn] = useState(false);
  const [nlp, setNlp] = useState<BrowserNlpResult | null>(null);
  const [agent, setAgent] = useState<ReportAgentSection | null>(null);
  const [document, setDocument] = useState<ReportDocumentV1 | null>(null);
  const [status, setStatus] = useState<OpenCodeStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [progressTr, setProgressTr] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [progressSteps, setProgressSteps] = useState<
    { id: string; labelTr: string; percent: number }[]
  >([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(
    () => SAMPLE_CATALOG[0]?.fileName ?? null
  );
  const [sampleResult, setSampleResult] = useState<LabResult | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);
  /** LabResult from external audio dropped/picked on this NLP tab. */
  const [uploadResult, setUploadResult] = useState<LabResult | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [archives, setArchives] = useState<ArchivedCase[]>(() =>
    typeof window !== "undefined" ? listArchivedCases() : []
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);
  const [lastFollowUp, setLastFollowUp] = useState<string | null>(null);
  const [chatThread, setChatThread] = useState<AgentChatMessage[]>([]);
  const [agentChatExpanded, setAgentChatExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(OPENCODE_MODEL_ID);
  const [modelOptions, setModelOptions] = useState<string[]>([
    ...OPENCODE_FALLBACK_MODELS,
  ]);

  const refreshArchives = useCallback(() => {
    setArchives(listArchivedCases());
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Restore persisted model choice (default remains OPENCODE_MODEL_ID).
    try {
      const stored = window.localStorage.getItem(OPENCODE_MODEL_STORAGE_KEY);
      if (stored) {
        setSelectedModel(sanitizeOpenCodeModelId(stored, OPENCODE_MODEL_ID));
      }
    } catch {
      /* ignore */
    }
    void fetchOpenCodeStatus().then((s) => {
      if (cancelled) return;
      setStatus(s);
      const listed = ensureModelInList(
        OPENCODE_MODEL_ID,
        s.models?.length ? s.models : [...OPENCODE_FALLBACK_MODELS]
      );
      setModelOptions(listed);
      // Enable OpenCode toggle by default when CLI is present.
      if (s.available) setOpenCodeOn(true);
      setSelectedModel((prev) => {
        const next = sanitizeOpenCodeModelId(prev, OPENCODE_MODEL_ID);
        return listed.includes(next) ? next : OPENCODE_MODEL_ID;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSelectModel = useCallback((value: string) => {
    const next = sanitizeOpenCodeModelId(value, OPENCODE_MODEL_ID);
    setSelectedModel(next);
    try {
      window.localStorage.setItem(OPENCODE_MODEL_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const clearAnalysisState = useCallback(() => {
    setNlp(null);
    setAgent(null);
    setDocument(null);
    setChatThread([]);
    setAgentChatExpanded(false);
    setStreamLines([]);
    setProgressTr(null);
    setProgressPercent(null);
    setProgressSteps([]);
    setActiveStepId(null);
  }, []);

  const loadSampleResult = useCallback(
    async (fileName: string) => {
      setSampleLoading(true);
      setError(null);
      clearAnalysisState();
      setUploadResult(null);
      try {
        const lab = await labResultFromSampleFileName(fileName);
        setSampleResult(lab);
        setSelectedSample(fileName);
      } catch (e) {
        setSampleResult(null);
        setError(e instanceof Error ? e.message : t("nlp.errSample"));
      } finally {
        setSampleLoading(false);
      }
    },
    [clearAnalysisState, t]
  );

  const loadExternalAudio = useCallback(
    async (file: File) => {
      setUploadLoading(true);
      setError(null);
      clearAnalysisState();
      setSelectedSample(null);
      setSampleResult(null);
      let objectUrl: string | null = null;
      try {
        const info = await decodeAudioFile(file);
        objectUrl = URL.createObjectURL(file);
        const lab = await runLabPipeline({
          fileName: file.name,
          durationSec: info.durationSec || 8,
          sampleRate: info.sampleRate || 16000,
          mode: "mock",
          audioUrl: objectUrl,
        });
        setUploadResult(lab);
        // Same spirit as main tab: transcript + offline sentiment ready for NLP run.
        if (browserNlpOn) {
          setNlp(analyzeBrowserNlp(lab.transcript.text));
        }
      } catch (e) {
        setUploadResult(null);
        setError(e instanceof Error ? e.message : t("nlp.errUpload"));
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setUploadLoading(false);
      }
    },
    [browserNlpOn, clearAnalysisState, t]
  );

  useEffect(() => {
    const first = SAMPLE_CATALOG[0]?.fileName;
    if (first) void loadSampleResult(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Prefer NLP-tab external upload, then catalog sample, then Tek dosya labResult. */
  const effectiveResult = uploadResult ?? sampleResult ?? labResult;
  const sourceKind: "upload" | "sample" | "lab" | null = uploadResult
    ? "upload"
    : sampleResult
      ? "sample"
      : labResult
        ? "lab"
        : null;

  const sourceBusy = sampleLoading || uploadLoading;
  const canRun = !!effectiveResult && !sourceBusy;

  const previewDoc = useMemo(() => {
    if (!effectiveResult) return null;
    return buildReportDocument({
      result: effectiveResult,
      nlp: browserNlpOn ? nlp : null,
      agent: agent ?? {
        source: "none",
        available: status?.available ?? false,
        status: "skipped",
        messageTr: "Henüz çalıştırılmadı.",
      },
    });
  }, [agent, browserNlpOn, effectiveResult, nlp, status]);

  const handleOpenCodeEvents = useCallback(
    (ev: {
      type: string;
      messageTr?: string;
      percent?: number;
      step?: string;
      steps?: { id: string; labelTr: string; percent: number }[];
      line?: string;
    }) => {
      if (ev.type === "progress") {
        if (ev.messageTr) setProgressTr(ev.messageTr);
        if (typeof ev.percent === "number") setProgressPercent(ev.percent);
        if (ev.step) setActiveStepId(ev.step);
        if (ev.steps?.length) setProgressSteps(ev.steps);
      } else if (ev.type === "log" && ev.line) {
        setStreamLines((prev) => {
          const next = [...prev, ev.line!];
          return next.length > 200 ? next.slice(-200) : next;
        });
      }
    },
    []
  );

  const runAnalysis = useCallback(
    async (followUpQuestion?: string) => {
      if (!effectiveResult) {
        setError(t("nlp.errNeedSource"));
        return;
      }
      setRunning(true);
      setError(null);
      const trimmedFollowUp = followUpQuestion?.trim() || null;
      setLastFollowUp(trimmedFollowUp);
      if (trimmedFollowUp) {
        setChatThread((prev) => [
          ...prev,
          {
            id: `u-${Date.now()}`,
            role: "user",
            text: trimmedFollowUp,
            at: new Date().toISOString(),
          },
        ]);
        setAgentChatExpanded(true);
      } else {
        setChatThread([]);
      }
      try {
        let localNlp: BrowserNlpResult | null = nlp;
        if (!followUpQuestion) {
          if (browserNlpOn) {
            localNlp = analyzeBrowserNlp(effectiveResult.transcript.text);
            setNlp(localNlp);
          } else {
            localNlp = null;
            setNlp(null);
          }
        }

        const baseDoc =
          followUpQuestion && document
            ? document
            : buildReportDocument({
                result: effectiveResult,
                nlp: localNlp,
                agent: {
                  source: openCodeOn || !!followUpQuestion ? "opencode-cli" : "none",
                  available: status?.available ?? false,
                  status: "skipped",
                  messageTr:
                    openCodeOn || followUpQuestion
                      ? followUpQuestion
                        ? "Takip sorusu OpenCode'a gönderiliyor…"
                        : "OpenCode çağrısı hazırlanıyor…"
                      : "OpenCode adımı kapalı — yalnızca lab + isteğe bağlı tarayıcı NLP.",
                },
              });

        const wantOpenCode = !!followUpQuestion || openCodeOn;
        if (!wantOpenCode) {
          setAgent(baseDoc.agent);
          setDocument(baseDoc);
          setChatThread([
            agentToAssistantMessage(baseDoc.agent, selectedModel),
          ]);
          return;
        }

        setAgent(null);
        setStreamLines([]);
        setProgressTr(
          followUpQuestion
            ? "Takip sorusu · OpenCode CLI…"
            : "OpenCode CLI çağrılıyor…"
        );
        setProgressPercent(5);
        setProgressSteps([]);
        setActiveStepId("prepare");
        const res = await runOpenCodeAnalyze(baseDoc, {
          followUpQuestion,
          model: selectedModel,
          onEvent: (ev) => handleOpenCodeEvents(ev),
        });
        setAgent(res.agent);
        setDocument(res.document ?? { ...baseDoc, agent: res.agent });
        const assistantMsg = agentToAssistantMessage(res.agent, selectedModel);
        setChatThread((prev) =>
          trimmedFollowUp ? [...prev, assistantMsg] : [assistantMsg]
        );
        if (res.agent.status === "ok" || trimmedFollowUp) {
          setAgentChatExpanded(true);
        }
        if (!res.ok && (res.agent.status === "missing" || res.agent.status === "error")) {
          setError(res.agent.messageTr);
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "NLP / OpenCode analizi başarısız."
        );
      } finally {
        setRunning(false);
      }
    },
    [
      browserNlpOn,
      document,
      effectiveResult,
      handleOpenCodeEvents,
      nlp,
      openCodeOn,
      selectedModel,
      status,
      t,
    ]
  );

  const actionQuestions = useMemo(
    () => buildActionQuestions(agent?.suggestedActionsTr),
    [agent?.suggestedActionsTr]
  );

  const archiveCurrentCase = useCallback(() => {
    if (!effectiveResult) return;
    const entry = saveArchivedCase({
      fileName: effectiveResult.fileName,
      transcript: effectiveResult.transcript.text,
      nlp: browserNlpOn ? nlp : null,
      agent,
      document:
        document ??
        buildReportDocument({
          result: effectiveResult,
          nlp: browserNlpOn ? nlp : null,
          agent: agent ?? undefined,
        }),
      model: selectedModel,
      followUpQuestion: lastFollowUp ?? undefined,
    });
    refreshArchives();
    setArchiveNotice(`Vaka arşivlendi · ${formatArchiveTimeTr(entry.savedAt)}`);
    setHistoryOpen(true);
    window.setTimeout(() => setArchiveNotice(null), 3500);
  }, [
    agent,
    browserNlpOn,
    document,
    effectiveResult,
    lastFollowUp,
    nlp,
    refreshArchives,
    selectedModel,
  ]);

  const reopenCase = useCallback((entry: ArchivedCase) => {
    setError(null);
    setNlp(entry.enrichment.nlp);
    setAgent(entry.enrichment.agent);
    setDocument(entry.document);
    setLastFollowUp(entry.followUpQuestion ?? null);
    setStreamLines([]);
    setProgressTr(null);
    setProgressPercent(null);
    setProgressSteps([]);
    setActiveStepId(null);
    if (entry.model) {
      onSelectModel(entry.model);
    }
    const msgs: AgentChatMessage[] = [];
    if (entry.followUpQuestion) {
      msgs.push({
        id: `u-arch-${entry.id}`,
        role: "user",
        text: entry.followUpQuestion,
        at: entry.savedAt,
      });
    }
    if (entry.enrichment.agent) {
      msgs.push(
        agentToAssistantMessage(entry.enrichment.agent, entry.model)
      );
    }
    setChatThread(msgs);
    setAgentChatExpanded(msgs.length > 0);
    setArchiveNotice(`Arşivden açıldı · ${entry.fileName}`);
    window.setTimeout(() => setArchiveNotice(null), 2500);
  }, [onSelectModel]);

  const removeCase = useCallback(
    (id: string) => {
      deleteArchivedCase(id);
      refreshArchives();
    },
    [refreshArchives]
  );

  const downloadArchivesJson = useCallback(() => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBlob(
      exportArchivesAsJson(),
      "application/json",
      `stt-lab-archives-${stamp}.json`
    );
  }, []);

  const downloadJson = () => {
    const doc =
      document ??
      (effectiveResult
        ? buildReportDocument({
            result: effectiveResult,
            nlp: browserNlpOn ? nlp : null,
            agent: agent ?? undefined,
          })
        : null);
    if (!doc) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBlob(
      stringifyReportDocument(doc),
      "application/json",
      `stt-lab-report-v1-${stamp}.json`
    );
  };

  const canArchive = !!effectiveResult && (!!nlp || !!agent || !!document);

  return (
    <div
      id="lab-nlp-opencode-panel"
      data-testid="nlp-opencode-panel"
      className="mx-auto flex max-w-7xl gap-4"
    >
      {/* History sidebar */}
      <aside
        data-testid="nlp-history-sidebar"
        className={`shrink-0 overflow-hidden rounded-xl border border-tuik/30 bg-white shadow-sm transition-all ${
          historyOpen ? "w-72" : "w-12"
        }`}
      >
        <div className="accent-bar" aria-hidden />
        <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-2 py-2">
          <button
            type="button"
            data-testid="nlp-history-toggle"
            onClick={() => setHistoryOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-tuik-dim transition hover:bg-tuik-soft"
            aria-expanded={historyOpen}
            aria-controls="nlp-history-list"
            title="Geçmiş vakalar"
          >
            <History className="h-4 w-4" aria-hidden />
            {historyOpen ? "Geçmiş" : null}
          </button>
          {historyOpen ? (
            <button
              type="button"
              data-testid="nlp-archives-export"
              onClick={downloadArchivesJson}
              disabled={!archives.length}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-tuik-soft hover:text-tuik disabled:opacity-40"
              title="Arşivi JSON indir"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        {historyOpen ? (
          <div id="nlp-history-list" className="max-h-[70vh] overflow-y-auto p-2">
            {!archives.length ? (
              <p className="px-2 py-4 text-xs text-slate-500">
                Henüz arşivlenmiş vaka yok. OpenCode sonucundan sonra &quot;Bu vakayı
                arşivle&quot; kullanın.
              </p>
            ) : (
              <ul className="space-y-1.5" data-testid="nlp-history-list">
                {archives.map((c) => (
                  <li key={c.id}>
                    <div className="group rounded-lg border border-slate-200 bg-slate-50/80 p-2 transition hover:border-tuik/40 hover:bg-tuik-soft/40">
                      <button
                        type="button"
                        data-testid="nlp-history-item"
                        onClick={() => reopenCase(c)}
                        className="w-full text-left"
                      >
                        <span className="block truncate text-xs font-semibold text-tuik-deep">
                          {c.fileName}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
                          {formatArchiveTimeTr(c.savedAt)}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[9px] text-slate-400">
                          {c.model.replace("opencode/", "")}
                        </span>
                        <span className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-600">
                          {c.transcript.slice(0, 100)}
                          {c.transcript.length > 100 ? "…" : ""}
                        </span>
                      </button>
                      <div className="mt-1.5 flex justify-end gap-1 opacity-70 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => reopenCase(c)}
                          className="rounded p-1 text-tuik hover:bg-white"
                          title="Yeniden aç"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          data-testid="nlp-history-delete"
                          onClick={() => removeCase(c.id)}
                          className="rounded p-1 text-rose-600 hover:bg-white"
                          title="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
      <SampleCatalogRow
        selectedSample={selectedSample}
        onSelectSample={(n) => void loadSampleResult(n)}
        disabled={running || sourceBusy}
      />

      <div
        className="overflow-hidden rounded-xl border border-tuik/30 bg-white p-4 shadow-sm"
        data-testid="nlp-external-upload"
      >
        <AudioUploader
          testId="nlp-audio-uploader"
          rootId="nlp-upload-zone"
          onSelectSample={(n) => void loadSampleResult(n)}
          onUpload={(f) => void loadExternalAudio(f)}
          disabled={running || sourceBusy}
          title={t("nlp.upload.title")}
          hint={t("nlp.upload.hint")}
          loadedMessage={t("nlp.upload.loaded")}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-tuik/40 bg-white shadow-sm">
        <div className="accent-bar" aria-hidden />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tuik text-white">
                <Brain className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-tuik-dim">
                  NLP / OpenCode
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  İsteğe bağlı yerel Türkçe NLP + masaüstü OpenCode CLI köprüsü.
                  Şema:{" "}
                  <code className="rounded bg-tuik-soft px-1.5 py-0.5 font-mono text-[11px] text-tuik-deep">
                    {REPORT_SCHEMA_VERSION}
                  </code>
                </p>
              </div>
            </div>
            <span className="rounded-full bg-tuik-soft px-3 py-1 text-[11px] font-medium text-tuik-dim ring-1 ring-tuik/25">
              Ücretli API yok · lokal
            </span>
          </div>

          <div
            className="flex flex-col gap-2 rounded-xl border border-tuik/30 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            data-testid="opencode-model-picker"
          >
            <label
              htmlFor="opencode-model-select"
              className="text-xs font-semibold uppercase tracking-wide text-tuik"
            >
              OpenCode model
            </label>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xl sm:items-end">
              <select
                id="opencode-model-select"
                data-testid="opencode-model-id"
                value={selectedModel}
                disabled={running}
                onChange={(e) => onSelectModel(e.target.value)}
                className="w-full rounded-lg border border-tuik/35 bg-white px-3 py-2 font-mono text-xs text-tuik-deep shadow-sm outline-none transition focus:border-tuik focus:ring-2 focus:ring-tuik/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ensureModelInList(selectedModel, modelOptions).map((id) => (
                  <option key={id} value={id}>
                    {id}
                    {id === OPENCODE_MODEL_ID ? " (varsayılan)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                Seçim tarayıcıda saklanır · CLI:{" "}
                <code className="rounded bg-slate-100 px-1">opencode models</code>
              </p>
            </div>
          </div>

          {sourceBusy ? (
            <div
              className="rounded-xl border border-tuik/25 bg-tuik-soft/40 px-4 py-3 text-sm text-slate-700"
              data-testid="nlp-source-loading"
            >
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-tuik" aria-hidden />
              {uploadLoading
                ? t("nlp.upload.processing")
                : "MOCK_TRANSCRIPTS yükleniyor…"}
            </div>
          ) : sourceKind === "upload" && effectiveResult ? (
            <div
              className="rounded-xl border border-tuik/25 bg-tuik-soft/40 px-4 py-3 text-sm text-slate-800"
              data-testid="nlp-source-upload"
            >
              <strong className="font-semibold text-tuik-deep">
                {effectiveResult.fileName}
              </strong>{" "}
              · {t("nlp.source.upload")} · {effectiveResult.transcript.source} ·{" "}
              {t("lab.sentiment")}: {effectiveResult.sentiment.label}/
              {effectiveResult.sentiment.emotion}
            </div>
          ) : sourceKind === "sample" && effectiveResult ? (
            <div
              className="rounded-xl border border-tuik/25 bg-tuik-soft/40 px-4 py-3 text-sm text-slate-800"
              data-testid="nlp-source-sample"
            >
              Kaynak:{" "}
              <strong className="font-semibold text-tuik-deep">
                {effectiveResult.fileName}
              </strong>{" "}
              · {t("nlp.source.sample")} · {effectiveResult.transcript.source}
            </div>
          ) : sourceKind === "lab" && effectiveResult ? (
            <div
              className="rounded-xl border border-tuik/25 bg-tuik-soft/40 px-4 py-3 text-sm text-slate-800"
              data-testid="nlp-source-lab"
            >
              {t("nlp.source.lab")}:{" "}
              <strong className="font-semibold text-tuik-deep">
                {effectiveResult.fileName}
              </strong>{" "}
              · {effectiveResult.transcript.source} ·{" "}
              {new Date(effectiveResult.processedAt).toLocaleString("tr-TR")}
            </div>
          ) : (
            <div
              className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              data-testid="nlp-source-waiting"
            >
              {t("nlp.source.waiting")}
            </div>
          )}

          {effectiveResult ? (
            <p
              className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200"
              data-testid="nlp-sample-transcript-preview"
            >
              <span className="font-semibold text-slate-800">Transkripsiyon: </span>
              {effectiveResult.transcript.text.slice(0, 220)}
              {effectiveResult.transcript.text.length > 220 ? "…" : ""}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow
              id="toggle-browser-nlp"
              label="Tarayıcı NLP"
              description="STT sonrası yerel niyet / özet / anahtar kelime (Türkçe sözlük)."
              checked={browserNlpOn}
              onChange={setBrowserNlpOn}
              disabled={running}
            />
            <ToggleRow
              id="toggle-opencode"
              label="OpenCode CLI"
              description={
                status?.available
                  ? `CLI hazır${status.version ? ` · ${status.version}` : ""} · model ${selectedModel}. Lab analizinden sonra payload gönderilir.`
                  : status?.messageTr ??
                    `CLI durumu kontrol ediliyor… Hedef model: ${selectedModel}. Yoksa zarif geri düşüş.`
              }
              checked={openCodeOn}
              onChange={setOpenCodeOn}
              disabled={running}
            />
          </div>

          <div className="max-w-xl">
            <OpenCodeInstallAccordion />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="nlp-run-button"
              onClick={() => void runAnalysis(undefined)}
              disabled={running || !canRun}
              className="inline-flex items-center gap-2 rounded-xl bg-tuik px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-tuik-dim disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="h-4 w-4" aria-hidden />
              )}
              {running ? "Çalışıyor…" : "NLP / OpenCode çalıştır"}
            </button>
            <button
              type="button"
              data-testid="nlp-download-json"
              onClick={downloadJson}
              disabled={!effectiveResult}
              className="inline-flex items-center gap-2 rounded-xl border border-tuik/30 bg-white px-4 py-2.5 text-sm font-semibold text-tuik-dim transition hover:bg-tuik-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden />
              Rapor JSON (v1)
            </button>
            <button
              type="button"
              data-testid="nlp-archive-case"
              onClick={archiveCurrentCase}
              disabled={!canArchive || running}
              className="inline-flex items-center gap-2 rounded-xl border border-tuik/30 bg-white px-4 py-2.5 text-sm font-semibold text-tuik-dim transition hover:bg-tuik-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Archive className="h-4 w-4" aria-hidden />
              Bu vakayı arşivle
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-tuik/30 hover:bg-tuik-soft hover:text-tuik-dim"
            >
              <History className="h-4 w-4" aria-hidden />
              Geçmiş
              {archives.length ? (
                <span className="rounded-full bg-tuik-soft px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-tuik-deep ring-1 ring-tuik/25">
                  {archives.length}
                </span>
              ) : null}
            </button>
          </div>

          {archiveNotice ? (
            <p
              data-testid="nlp-archive-notice"
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              {archiveNotice}
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          {(running && openCodeOn) || streamLines.length > 0 || progressTr ? (
            <div
              data-testid="opencode-live-terminal"
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner"
            >
              <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  OpenCode canlı çıktı
                </span>
                <span className="truncate font-mono text-[10px] text-slate-500">
                  {status?.model ?? OPENCODE_MODEL_ID}
                </span>
                {typeof progressPercent === "number" ? (
                  <span
                    data-testid="opencode-progress-percent"
                    className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-emerald-300"
                  >
                    %{Math.round(progressPercent)}
                  </span>
                ) : null}
                {running ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-amber-300">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    çalışıyor
                  </span>
                ) : (
                  <span className="ml-auto text-[10px] text-slate-500">durdu</span>
                )}
              </div>
              {typeof progressPercent === "number" ? (
                <div
                  className="h-1.5 bg-slate-900"
                  role="progressbar"
                  aria-valuenow={Math.round(progressPercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  data-testid="opencode-progress-bar"
                >
                  <div
                    className="h-full bg-emerald-500 transition-[width] duration-300 ease-out"
                    style={{
                      width: `${Math.max(0, Math.min(100, progressPercent))}%`,
                    }}
                  />
                </div>
              ) : null}
              {progressSteps.length ? (
                <ol
                  data-testid="opencode-progress-steps"
                  className="flex flex-wrap gap-1.5 border-b border-slate-800 px-3 py-2"
                >
                  {progressSteps.map((s) => {
                    const active = s.id === activeStepId;
                    const done =
                      typeof progressPercent === "number" &&
                      progressPercent >= s.percent &&
                      !active;
                    return (
                      <li
                        key={s.id}
                        className={`rounded-md px-2 py-0.5 text-[10px] ring-1 ${
                          active
                            ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"
                            : done
                              ? "bg-slate-800 text-slate-300 ring-slate-700"
                              : "bg-slate-900 text-slate-500 ring-slate-800"
                        }`}
                      >
                        {s.labelTr}
                        <span className="ml-1 tabular-nums opacity-70">
                          %{s.percent}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
              {progressTr ? (
                <p
                  data-testid="opencode-progress"
                  className="border-b border-slate-800 px-3 py-1.5 text-xs text-emerald-300/90"
                >
                  {progressTr}
                </p>
              ) : null}
              <pre
                data-testid="opencode-stream-log"
                className="max-h-48 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-200"
              >
                {streamLines.length
                  ? streamLines.join("\n")
                  : running
                    ? "CLI bekleniyor…"
                    : "(çıktı yok)"}
              </pre>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <SentimentPanel
          sentiment={effectiveResult?.sentiment ?? null}
          loading={sourceBusy}
        />

        <section className="rounded-xl border border-tuik/30 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-tuik" aria-hidden />
            <h3 className="text-sm font-semibold text-tuik">Tarayıcı NLP</h3>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              lexicon-tr-local
            </span>
          </div>
          {!browserNlpOn ? (
            <p className="text-sm text-slate-500">Tarayıcı NLP kapalı.</p>
          ) : !nlp ? (
            <p className="text-sm text-slate-500">
              Çalıştırınca niyet, özet ve anahtar kelimeler burada görünür.
            </p>
          ) : (
            <div className="space-y-3" data-testid="nlp-browser-result">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-tuik-soft px-3 py-1 text-sm font-semibold text-tuik-deep ring-1 ring-tuik/30">
                  {INTENT_LABELS_TR[nlp.intent]}
                </span>
                <span className="text-xs text-slate-600">
                  Güven: {Math.round(nlp.intentConfidence * 100)}%
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                {nlp.summaryTr}
              </p>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Anahtar kelimeler
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {nlp.keywords.map((k) => (
                    <li
                      key={`${k.source}-${k.term}`}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200"
                    >
                      {k.term}
                      <span className="ml-1 tabular-nums text-slate-400">
                        ×{k.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {nlp.keyPhrases.length ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Anahtar ifadeler
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-600">
                    {nlp.keyPhrases.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section
          className={`opencode-chat-card rounded-xl border bg-white shadow-sm transition-all ${
            agentChatExpanded
              ? "border-tuik/50 p-5 shadow-md shadow-tuik/10 lg:col-span-2"
              : "border-tuik/30 p-5 lg:col-span-2"
          }`}
          data-testid="opencode-agent-card"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Bot className="h-4 w-4 text-tuik" aria-hidden />
            <h3 className="text-sm font-semibold text-tuik">OpenCode ajan</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 normal-case">
              {selectedModel}
            </span>
            {chatThread.length || agent ? (
              <button
                type="button"
                data-testid="opencode-chat-expand"
                aria-expanded={agentChatExpanded}
                onClick={() => setAgentChatExpanded((v) => !v)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-tuik/30 bg-tuik-soft px-2.5 py-1 text-[11px] font-semibold text-tuik-deep transition hover:bg-tuik-muted"
              >
                {agentChatExpanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                    Daralt
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                    Genişlet
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  </>
                )}
              </button>
            ) : null}
          </div>
          {!openCodeOn && !agent && !chatThread.length ? (
            <p className="text-sm text-slate-500">
              OpenCode kapalı. Açıp çalıştırırsanız lab raporu CLI&apos;ya
              gönderilir; sonuç buraya döner. CLI yoksa mesaj gösterilir.
            </p>
          ) : running && openCodeOn && !chatThread.length ? (
            <div
              className="space-y-2"
              data-testid="opencode-agent-running"
            >
              <p className="flex items-center gap-2 text-sm text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin text-tuik" aria-hidden />
                OpenCode çalışıyor
                {typeof progressPercent === "number"
                  ? ` · %${Math.round(progressPercent)}`
                  : ""}
              </p>
              <p className="text-xs text-slate-500">
                {progressTr ?? "Canlı terminal aşağıda / üstte güncellenir…"}
              </p>
            </div>
          ) : !agent && !chatThread.length ? (
            <p className="text-sm text-slate-500">
              {status?.messageTr ?? "CLI durumu bekleniyor…"}
            </p>
          ) : (
            <div
              className={`space-y-3 ${agentChatExpanded ? "max-w-none" : ""}`}
              data-testid="nlp-opencode-result"
            >
              <div
                className={`flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 ${
                  agentChatExpanded ? "max-h-[32rem] overflow-y-auto" : "max-h-56 overflow-y-auto"
                }`}
                data-testid="opencode-chat-thread"
                role="log"
                aria-live="polite"
              >
                {(chatThread.length
                  ? chatThread
                  : agent
                    ? [agentToAssistantMessage(agent, selectedModel)]
                    : []
                ).map((msg) =>
                  msg.role === "user" ? (
                    <div
                      key={msg.id}
                      className="opencode-bubble-enter ml-6 flex justify-end sm:ml-16"
                    >
                      <div className="max-w-[95%] rounded-2xl rounded-br-md border border-tuik/40 bg-tuik px-3.5 py-2.5 text-sm text-white shadow-sm">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                          <UserRound className="h-3 w-3" aria-hidden />
                          Siz
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={msg.id}
                      className="opencode-bubble-enter mr-6 flex justify-start sm:mr-16"
                    >
                      <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-tuik/25 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-tuik">
                            <Bot className="h-3 w-3" aria-hidden />
                            Ajan
                          </span>
                          {msg.status ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                                msg.status === "ok"
                                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                  : msg.status === "missing"
                                    ? "bg-amber-50 text-amber-900 ring-amber-200"
                                    : msg.status === "error"
                                      ? "bg-rose-50 text-rose-900 ring-rose-200"
                                      : "bg-slate-100 text-slate-700 ring-slate-200"
                              }`}
                            >
                              {msg.status === "ok" ? (
                                <CheckCircle2 className="h-3 w-3" aria-hidden />
                              ) : null}
                              {msg.status}
                            </span>
                          ) : null}
                          {msg.model ? (
                            <span className="font-mono text-[10px] text-slate-500">
                              {msg.model}
                            </span>
                          ) : null}
                        </div>
                        <p className="leading-relaxed text-slate-700">{msg.text}</p>
                        {msg.notesTr ? (
                          <p className="mt-2 rounded-lg bg-tuik-soft/60 px-3 py-2 text-sm text-slate-800 ring-1 ring-tuik/15">
                            {msg.notesTr}
                          </p>
                        ) : null}
                        {msg.refinedSummaryTr ? (
                          <p className="mt-2 text-sm text-slate-700">
                            <span className="font-semibold text-tuik-dim">
                              Ajan özeti:{" "}
                            </span>
                            {msg.refinedSummaryTr}
                          </p>
                        ) : null}
                        {msg.riskFlags?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {msg.riskFlags.map((f) => (
                              <span
                                key={f}
                                className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900 ring-1 ring-amber-200"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                )}
                {running ? (
                  <div className="opencode-bubble-enter mr-6 flex justify-start sm:mr-16">
                    <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-tuik/20 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-tuik" aria-hidden />
                      Ajan yanıtı bekleniyor…
                    </div>
                  </div>
                ) : null}
              </div>
              {!agentChatExpanded && (chatThread.length > 1 || (agent?.notesTr && agent.notesTr.length > 120)) ? (
                <p className="text-[11px] text-slate-500">
                  Daha fazla alan için Genişlet&apos;e basın — sohbet tam genişlikte açılır.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {agent && agent.status === "ok" && actionQuestions.length ? (
        <section
          data-testid="nlp-action-questions"
          className="rounded-xl border border-tuik/30 bg-white p-5 shadow-sm"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-tuik" aria-hidden />
            <h3 className="text-sm font-semibold text-tuik">
              Üretken aksiyon soruları
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              suggestedActionsTr + generative
            </span>
          </div>
          <p className="mb-3 text-xs text-slate-600">
            Bir soruya tıklayınca OpenCode (Muse Spark) aynı vaka üzerinde devam eder.
            Canlı ilerleme terminali korunur.
          </p>
          {lastFollowUp ? (
            <p
              data-testid="nlp-last-followup"
              className="mb-3 rounded-lg bg-tuik-soft/60 px-3 py-2 text-xs text-tuik-deep ring-1 ring-tuik/20"
            >
              Son soru: {lastFollowUp}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {actionQuestions.map((q) => {
              const fromAgent = !!agent.suggestedActionsTr?.includes(q);
              return (
                <button
                  key={q}
                  type="button"
                  data-testid="nlp-action-question"
                  data-source={fromAgent ? "agent" : "generative"}
                  disabled={running}
                  onClick={() => void runAnalysis(q)}
                  className={`inline-flex max-w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    fromAgent
                      ? "border-tuik/40 bg-tuik-soft text-tuik-deep hover:bg-tuik-muted"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-tuik/30 hover:bg-tuik-soft/50"
                  }`}
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tuik" aria-hidden />
                  <span className="min-w-0 whitespace-normal">{q}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {previewDoc || document ? (
        <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            Şema önizleme ({REPORT_SCHEMA_VERSION})
          </summary>
          <pre
            data-testid="nlp-schema-preview"
            className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-100"
          >
            {stringifyReportDocument(document ?? previewDoc!)}
          </pre>
        </details>
      ) : null}
      </div>
    </div>
  );
}
