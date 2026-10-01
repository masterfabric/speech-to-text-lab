/**
 * OpenCode desktop CLI bridge helpers (client + shared prompt/parse).
 * Detection and spawning happen in Next.js API routes (local Node).
 * Graceful when CLI is missing — no paid APIs required by the lab.
 */
import type { ReportAgentSection, ReportDocumentV1, ReportIntent } from "./report-schema";
import { REPORT_SCHEMA_VERSION } from "./report-schema";

/** Default Muse Spark 1.3 free id — keep as lab default. */
export const OPENCODE_MODEL_ID = "opencode/muse-spark-1.3-contributor-free";

/** localStorage key for selected OpenCode model. */
export const OPENCODE_MODEL_STORAGE_KEY = "stt-lab-opencode-model";

/**
 * Safe fallback list when `opencode models` is unavailable.
 * Prefer free / opencode/* contributor models.
 */
export const OPENCODE_FALLBACK_MODELS: readonly string[] = [
  "opencode/muse-spark-1.3-contributor-free",
  "opencode/big-pickle",
  "opencode/fledge-alpha-free",
  "opencode/ling-3.0-flash-fin-free",
  "opencode/longcat-2.5-preview-free",
  "opencode/mimo-v2.6-flash-free",
  "opencode/nemotron-3-ultra-free",
  "opencode/nemotron-3.5-lightning-free",
  "opencode/space-bunny-free",
] as const;

const MODEL_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._\/-]{0,127}$/;

/** Validate / sanitize a model id from the client. */
export function sanitizeOpenCodeModelId(
  raw: unknown,
  fallback: string = OPENCODE_MODEL_ID
): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!MODEL_ID_RE.test(trimmed)) return fallback;
  return trimmed;
}

export function ensureModelInList(
  model: string,
  models: readonly string[]
): string[] {
  const list = [...models];
  if (!list.includes(model)) list.unshift(model);
  return list;
}

export type OpenCodeStatus = {
  available: boolean;
  path: string | null;
  version: string | null;
  /** Default / last-known model id. */
  model: string;
  /** Models from `opencode models` (filtered to free/opencode when possible). */
  models?: string[];
  messageTr: string;
};

export type OpenCodeAnalyzeResponse = {
  ok: boolean;
  agent: ReportAgentSection;
  document?: ReportDocumentV1;
};

const INTENTS: ReportIntent[] = [
  "bilgi",
  "randevu",
  "sikayet",
  "anket",
  "gizlilik",
  "tesekkur",
  "diger",
];

export function buildOpenCodePrompt(
  reportJson?: string,
  followUpQuestion?: string
): string {
  const parts = [
    "You are enriching an educational speech-to-text-lab report.",
    `Schema: ${REPORT_SCHEMA_VERSION}.`,
    "Work locally. Do not invent PII. Prefer short Turkish notes.",
    "Return ONLY a single JSON object (no markdown fences) with fields:",
    '{"notesTr":string,"suggestedActionsTr":string[],"riskFlags":string[],"refinedIntent":"bilgi"|"randevu"|"sikayet"|"anket"|"gizlilik"|"tesekkur"|"diger","refinedSummaryTr":string}',
  ];
  if (followUpQuestion?.trim()) {
    parts.push(
      "",
      "FOLLOW_UP_QUESTION (answer this in notesTr / refinedSummaryTr / suggestedActionsTr; Turkish):",
      followUpQuestion.trim()
    );
  }
  if (reportJson) {
    parts.push("", "REPORT_JSON:", reportJson);
  } else {
    parts.push("A report JSON file is attached to this message.");
  }
  return parts.join("\n");
}

/** Extract assistant text parts from `opencode run --format json` JSONL. */
export function collectOpenCodeText(stdout: string): string {
  const chunks: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const evt = JSON.parse(trimmed) as {
        type?: string;
        part?: { type?: string; text?: string };
        text?: string;
      };
      if (evt.type === "text" && evt.part?.text) {
        chunks.push(evt.part.text);
      } else if (typeof evt.text === "string" && evt.type === "text") {
        chunks.push(evt.text);
      }
    } catch {
      /* ignore non-JSON lines */
    }
  }
  if (chunks.length) return chunks.join("\n").trim();
  return stdout.trim();
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return text.trim();
}

function pickIntent(value: unknown): ReportIntent | undefined {
  return typeof value === "string" && (INTENTS as string[]).includes(value)
    ? (value as ReportIntent)
    : undefined;
}

export function parseOpenCodeAgentPayload(
  rawText: string
): Partial<ReportAgentSection> {
  const cleaned = stripFences(rawText);
  // Prefer first JSON object in the text
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return {
      notesTr: cleaned.slice(0, 1200) || undefined,
      rawText: cleaned.slice(0, 8000) || undefined,
    };
  }
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
    const suggested = Array.isArray(obj.suggestedActionsTr)
      ? obj.suggestedActionsTr.filter((x): x is string => typeof x === "string")
      : undefined;
    const risks = Array.isArray(obj.riskFlags)
      ? obj.riskFlags.filter((x): x is string => typeof x === "string")
      : undefined;
    return {
      notesTr: typeof obj.notesTr === "string" ? obj.notesTr : undefined,
      suggestedActionsTr: suggested,
      riskFlags: risks,
      refinedIntent: pickIntent(obj.refinedIntent),
      refinedSummaryTr:
        typeof obj.refinedSummaryTr === "string"
          ? obj.refinedSummaryTr
          : undefined,
      rawText: cleaned.slice(0, 8000),
    };
  } catch {
    return {
      notesTr: cleaned.slice(0, 1200) || undefined,
      rawText: cleaned.slice(0, 8000) || undefined,
    };
  }
}

export async function fetchOpenCodeStatus(): Promise<OpenCodeStatus> {
  try {
    const res = await fetch("/api/opencode/status", { cache: "no-store" });
    if (!res.ok) {
      return {
        available: false,
        path: null,
        version: null,
        model: OPENCODE_MODEL_ID,
        messageTr: `OpenCode durum API yanıtı: HTTP ${res.status}`,
      };
    }
    return (await res.json()) as OpenCodeStatus;
  } catch {
    return {
      available: false,
      path: null,
      version: null,
      model: OPENCODE_MODEL_ID,
      messageTr: "OpenCode durum API'sine erişilemedi (ağ / sunucu).",
    };
  }
}

export type OpenCodeProgressStep = {
  id: string;
  labelTr: string;
  percent: number;
};

export type OpenCodeStreamEvent =
  | {
      type: "progress";
      messageTr: string;
      step?: string;
      stepLabelTr?: string;
      percent?: number;
      steps?: OpenCodeProgressStep[];
    }
  | { type: "log"; line: string }
  | {
      type: "result";
      ok: boolean;
      agent: ReportAgentSection;
      document?: ReportDocumentV1;
    };

export type OpenCodeAnalyzeOptions = {
  onEvent?: (event: OpenCodeStreamEvent) => void;
  signal?: AbortSignal;
  /** Continue OpenCode with a generative action / follow-up question. */
  followUpQuestion?: string;
  /** Selected OpenCode model id (`-m`). Defaults to OPENCODE_MODEL_ID. */
  model?: string;
};

export async function runOpenCodeAnalyze(
  document: ReportDocumentV1,
  options: OpenCodeAnalyzeOptions = {}
): Promise<OpenCodeAnalyzeResponse> {
  const { onEvent, signal, followUpQuestion, model } = options;
  const modelId = sanitizeOpenCodeModelId(model, OPENCODE_MODEL_ID);
  try {
    const res = await fetch("/api/opencode/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson, application/json",
      },
      body: JSON.stringify({
        document,
        model: modelId,
        ...(followUpQuestion?.trim()
          ? { followUpQuestion: followUpQuestion.trim() }
          : {}),
      }),
      signal,
    });

    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("ndjson") && !ctype.includes("stream")) {
      // Legacy single JSON response fallback
      const data = (await res.json()) as OpenCodeAnalyzeResponse;
      onEvent?.({
        type: "result",
        ok: data.ok,
        agent: data.agent,
        document: data.document,
      });
      return data;
    }

    // Prefer streaming reader; also keep a full-text fallback for buffered proxies.
    const processLine = (
      line: string,
      sink: { final: OpenCodeAnalyzeResponse | null }
    ) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const ev = JSON.parse(trimmed) as OpenCodeStreamEvent;
        onEvent?.(ev);
        if (ev.type === "result") {
          sink.final = {
            ok: ev.ok,
            agent: ev.agent,
            document: ev.document,
          };
        }
      } catch {
        onEvent?.({ type: "log", line: trimmed });
      }
    };

    const sink: { final: OpenCodeAnalyzeResponse | null } = { final: null };
    let raw = "";

    if (res.body && typeof res.body.getReader === "function") {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        raw += chunk;
        buffer += chunk;
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          processLine(line, sink);
        }
      }
      raw += decoder.decode();
      if (buffer.trim()) processLine(buffer, sink);
    } else {
      raw = await res.text();
      for (const line of raw.split(/\r?\n/)) processLine(line, sink);
    }

    if (!sink.final && raw.trim()) {
      // Buffered / non-streamed body: parse all lines once more.
      for (const line of raw.split(/\r?\n/)) {
        if (sink.final) break;
        processLine(line, sink);
      }
    }

    // Last resort: single JSON object (legacy)
    if (!sink.final && raw.trim().startsWith("{") && !raw.includes("\n")) {
      try {
        const data = JSON.parse(raw) as OpenCodeAnalyzeResponse;
        if (data.agent) {
          onEvent?.({
            type: "result",
            ok: data.ok,
            agent: data.agent,
            document: data.document,
          });
          sink.final = data;
        }
      } catch {
        /* ignore */
      }
    }

    if (sink.final) return sink.final;
    return {
      ok: false,
      agent: {
        source: "opencode-cli",
        available: true,
        status: "error",
        messageTr: raw.trim()
          ? "OpenCode akışı sonuç olayını göndermedi."
          : "OpenCode akışı boş yanıt verdi.",
        rawText: raw.slice(0, 2000) || undefined,
      },
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        agent: {
          source: "opencode-cli",
          available: true,
          status: "error",
          messageTr: "OpenCode isteği iptal edildi.",
        },
      };
    }
    return {
      ok: false,
      agent: {
        source: "opencode-cli",
        available: false,
        status: "error",
        messageTr:
          e instanceof Error
            ? `OpenCode isteği başarısız: ${e.message}`
            : "OpenCode isteği başarısız.",
      },
    };
  }
}
