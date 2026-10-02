/**
 * Versioned agent-exchange schema for speech-to-text-lab.
 * Document version field: speech-to-text-lab.report.v1
 * Educational / local only — no paid APIs required.
 */
import type { LabResult } from "./types";
import type { BrowserNlpResult } from "./browser-nlp";

export const REPORT_SCHEMA_VERSION = "speech-to-text-lab.report.v1" as const;

export type ReportSchemaVersion = typeof REPORT_SCHEMA_VERSION;

export type ReportIntent =
  | "bilgi"
  | "randevu"
  | "sikayet"
  | "anket"
  | "gizlilik"
  | "tesekkur"
  | "diger";

export type ReportKeyword = {
  term: string;
  count: number;
  source: "lexicon" | "frequency" | "demo";
};

export type ReportNlpSection = {
  enabled: boolean;
  method: "browser-tr-local";
  intent: ReportIntent;
  intentConfidence: number;
  summaryTr: string;
  keywords: ReportKeyword[];
  keyPhrases: string[];
};

export type ReportAgentSection = {
  source: "opencode-cli" | "none";
  available: boolean;
  status: "skipped" | "ok" | "missing" | "error";
  messageTr: string;
  notesTr?: string;
  suggestedActionsTr?: string[];
  riskFlags?: string[];
  refinedIntent?: ReportIntent;
  refinedSummaryTr?: string;
  rawText?: string;
  ranAt?: string;
};

export type ReportDocumentV1 = {
  schemaVersion: ReportSchemaVersion;
  generatedAt: string;
  instructor: string;
  privacyNoteTr: string;
  lab: {
    fileName: string;
    processedAt: string;
    transcript: {
      text: string;
      confidence: number;
      source: string;
      language: string;
      durationSec: number;
    };
    metrics: {
      durationSec: number;
      sampleRate: number;
      speakingRatio: number;
      silenceGaps: number;
      averageConfidence: number;
      keywordHits: { keyword: string; count: number }[];
    };
    sentiment: {
      label: string;
      emotion: string;
      score: number;
      confidence: number;
      summaryTr: string;
    };
    wer: {
      hasReference: boolean;
      wer: number | null;
      wordAccuracy: number;
      noteTr: string;
    };
    callAnalysis: {
      isLongForm: boolean;
      segmentCount: number;
      summaryTr: string;
      keyPhrases: string[];
      disclaimerTr: string;
      segments: {
        index: number;
        startSec: number;
        endSec: number;
        label: string;
        text: string;
        keyPhrases: string[];
      }[];
    } | null;
  };
  nlp: ReportNlpSection | null;
  agent: ReportAgentSection;
};

export const REPORT_JSON_SCHEMA = {
  $id: "speech-to-text-lab.report.v1",
  title: "speech-to-text-lab.report.v1",
  type: "object",
  required: ["schemaVersion", "generatedAt", "lab", "agent"],
  properties: {
    schemaVersion: { const: REPORT_SCHEMA_VERSION },
    generatedAt: { type: "string", format: "date-time" },
    instructor: { type: "string" },
    privacyNoteTr: { type: "string" },
    lab: { type: "object" },
    nlp: { type: ["object", "null"] },
    agent: { type: "object" },
  },
} as const;

const INSTRUCTOR = "Eğitmen mühendis Gürkan Fikret Günak";
const PRIVACY =
  "Eğitim demosu. Ücretli API yok. Gerçek PII / ALO 124 kaydı yoktur. Tüm analiz yereldir.";

export function buildReportDocument(options: {
  result: LabResult;
  nlp?: BrowserNlpResult | null;
  agent?: Partial<ReportAgentSection>;
}): ReportDocumentV1 {
  const { result, nlp = null, agent } = options;
  const nlpSection: ReportNlpSection | null = nlp
    ? {
        enabled: true,
        method: "browser-tr-local",
        intent: nlp.intent,
        intentConfidence: nlp.intentConfidence,
        summaryTr: nlp.summaryTr,
        keywords: nlp.keywords,
        keyPhrases: nlp.keyPhrases,
      }
    : null;

  const agentSection: ReportAgentSection = {
    source: agent?.source ?? "none",
    available: agent?.available ?? false,
    status: agent?.status ?? "skipped",
    messageTr:
      agent?.messageTr ??
      "OpenCode adımı atlandı (isteğe bağlı; CLI yoksa veya kapalıysa).",
    notesTr: agent?.notesTr,
    suggestedActionsTr: agent?.suggestedActionsTr,
    riskFlags: agent?.riskFlags,
    refinedIntent: agent?.refinedIntent,
    refinedSummaryTr: agent?.refinedSummaryTr,
    rawText: agent?.rawText,
    ranAt: agent?.ranAt,
  };

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    instructor: INSTRUCTOR,
    privacyNoteTr: PRIVACY,
    lab: {
      fileName: result.fileName,
      processedAt: result.processedAt,
      transcript: {
        text: result.transcript.text,
        confidence: result.transcript.confidence,
        source: result.transcript.source,
        language: result.transcript.language,
        durationSec: result.transcript.durationSec,
      },
      metrics: {
        durationSec: result.metrics.durationSec,
        sampleRate: result.metrics.sampleRate,
        speakingRatio: result.metrics.speakingRatio,
        silenceGaps: result.metrics.silenceGaps,
        averageConfidence: result.metrics.averageConfidence,
        keywordHits: result.metrics.keywordHits.map((k) => ({
          keyword: k.keyword,
          count: k.count,
        })),
      },
      sentiment: {
        label: result.sentiment.label,
        emotion: result.sentiment.emotion,
        score: result.sentiment.score,
        confidence: result.sentiment.confidence,
        summaryTr: result.sentiment.summaryTr,
      },
      wer: {
        hasReference: result.wer.hasReference,
        wer: result.wer.hasReference ? result.wer.wer : null,
        wordAccuracy: result.wer.wordAccuracy,
        noteTr: result.wer.noteTr,
      },
      callAnalysis: result.callAnalysis
        ? {
            isLongForm: result.callAnalysis.isLongForm,
            segmentCount: result.callAnalysis.segmentCount,
            summaryTr: result.callAnalysis.summaryTr,
            keyPhrases: result.callAnalysis.keyPhrases,
            disclaimerTr: result.callAnalysis.disclaimerTr,
            segments: result.callAnalysis.segments.map((s) => ({
              index: s.index,
              startSec: s.startSec,
              endSec: s.endSec,
              label: s.label,
              text: s.text,
              keyPhrases: s.keyPhrases,
            })),
          }
        : null,
    },
    nlp: nlpSection,
    agent: agentSection,
  };
}

export function isReportDocumentV1(value: unknown): value is ReportDocumentV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === REPORT_SCHEMA_VERSION &&
    typeof v.generatedAt === "string" &&
    typeof v.lab === "object" &&
    v.lab !== null &&
    typeof v.agent === "object" &&
    v.agent !== null
  );
}

export function parseReportDocument(raw: string): ReportDocumentV1 | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isReportDocumentV1(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function stringifyReportDocument(doc: ReportDocumentV1): string {
  return JSON.stringify(doc, null, 2);
}
