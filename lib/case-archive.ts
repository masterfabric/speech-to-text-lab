/**
 * Local case archive for NLP / OpenCode results.
 * Primary store: localStorage. Optional seed/export: public/archives JSON.
 */
import {
  OPENCODE_MODEL_ID,
} from "./opencode-bridge";
import type { BrowserNlpResult } from "./browser-nlp";
import type { ReportAgentSection, ReportDocumentV1 } from "./report-schema";

export const ARCHIVE_STORAGE_KEY = "stt-lab-archives-v1";
export const ARCHIVE_PUBLIC_INDEX = "/archives/index.json";

export type ArchivedCase = {
  id: string;
  savedAt: string;
  model: string;
  fileName: string;
  transcript: string;
  enrichment: {
    nlp: BrowserNlpResult | null;
    agent: ReportAgentSection | null;
  };
  document: ReportDocumentV1 | null;
  followUpQuestion?: string;
};

export type ArchiveIndexFile = {
  schemaVersion: "speech-to-text-lab.archives.v1";
  updatedAt: string;
  cases: ArchivedCase[];
};

/** Extra generative follow-up prompts (Turkish) beyond agent suggestedActionsTr. */
export const GENERATIVE_FOLLOWUP_PROMPTS_TR: string[] = [
  "Bu çağrı için operatöre kısa bir yanıt taslağı yazar mısın?",
  "Niyet sınıflandırmasını alternatif senaryolarla doğrular mısın?",
  "Risk bayraklarını öncelik sırasına koyup gerekçelendirir misin?",
  "Eğitim slaytı için üç maddelik özet çıkarır mısın?",
  "Benzer vakalarda hangi takip adımları önerilir?",
];

export function buildActionQuestions(
  suggestedActionsTr: string[] | undefined | null,
  extras: string[] = GENERATIVE_FOLLOWUP_PROMPTS_TR
): string[] {
  const fromAgent = (suggestedActionsTr ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of [...fromAgent, ...extras]) {
    const key = q.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
    if (out.length >= 10) break;
  }
  return out;
}

function safeParse(raw: string | null): ArchivedCase[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isArchivedCase);
  } catch {
    return [];
  }
}

export function isArchivedCase(value: unknown): value is ArchivedCase {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.savedAt === "string" &&
    typeof v.model === "string" &&
    typeof v.fileName === "string" &&
    typeof v.transcript === "string" &&
    typeof v.enrichment === "object" &&
    v.enrichment !== null
  );
}

export function listArchivedCases(): ArchivedCase[] {
  if (typeof window === "undefined") return [];
  try {
    const list = safeParse(window.localStorage.getItem(ARCHIVE_STORAGE_KEY));
    return [...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

export function saveArchivedCase(input: {
  fileName: string;
  transcript: string;
  nlp: BrowserNlpResult | null;
  agent: ReportAgentSection | null;
  document: ReportDocumentV1 | null;
  model?: string;
  followUpQuestion?: string;
}): ArchivedCase {
  const entry: ArchivedCase = {
    id: `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    model: input.model ?? OPENCODE_MODEL_ID,
    fileName: input.fileName,
    transcript: input.transcript,
    enrichment: {
      nlp: input.nlp,
      agent: input.agent,
    },
    document: input.document,
    followUpQuestion: input.followUpQuestion,
  };

  if (typeof window === "undefined") return entry;

  const prev = listArchivedCases();
  const next = [entry, ...prev].slice(0, 50);
  window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(next));
  return entry;
}

export function deleteArchivedCase(id: string): void {
  if (typeof window === "undefined") return;
  const next = listArchivedCases().filter((c) => c.id !== id);
  window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(next));
}

export function getArchivedCase(id: string): ArchivedCase | null {
  return listArchivedCases().find((c) => c.id === id) ?? null;
}

export function exportArchivesAsJson(): string {
  const payload: ArchiveIndexFile = {
    schemaVersion: "speech-to-text-lab.archives.v1",
    updatedAt: new Date().toISOString(),
    cases: listArchivedCases(),
  };
  return JSON.stringify(payload, null, 2);
}

export function formatArchiveTimeTr(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
