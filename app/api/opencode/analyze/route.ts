import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  OPENCODE_MODEL_ID,
  buildOpenCodePrompt,
  collectOpenCodeText,
  parseOpenCodeAgentPayload,
  sanitizeOpenCodeModelId,
} from "@/lib/opencode-bridge";
import {
  REPORT_SCHEMA_VERSION,
  isReportDocumentV1,
  type ReportAgentSection,
  type ReportDocumentV1,
} from "@/lib/report-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const execFileAsync = promisify(execFile);
const RUN_TIMEOUT_MS = 90_000;

async function findOpenCodeBin(): Promise<string | null> {
  const home = process.env.HOME;
  const candidates = [
    ...(home ? [`${home}/.opencode/bin/opencode`] : []),
    "opencode",
  ];
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 8000 });
      return bin;
    } catch {
      /* next */
    }
  }
  try {
    const { stdout } = await execFileAsync("/usr/bin/which", ["opencode"], {
      timeout: 5000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

function ndjsonLine(obj: unknown): string {
  return JSON.stringify(obj) + "\n";
}

const textEncoder = new TextEncoder();
function ndjsonBytes(obj: unknown): Uint8Array {
  return textEncoder.encode(ndjsonLine(obj));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      ndjsonLine({
        type: "result",
        ok: false,
        agent: {
          source: "opencode-cli",
          available: false,
          status: "error",
          messageTr: "Geçersiz JSON gövde.",
        } satisfies ReportAgentSection,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const bodyObj = body as {
    document?: unknown;
    followUpQuestion?: unknown;
    model?: unknown;
  };
  const document = bodyObj?.document;
  const followUpQuestion =
    typeof bodyObj?.followUpQuestion === "string"
      ? bodyObj.followUpQuestion.trim()
      : "";
  const modelId = sanitizeOpenCodeModelId(bodyObj?.model, OPENCODE_MODEL_ID);
  if (!isReportDocumentV1(document)) {
    return new Response(
      ndjsonLine({
        type: "result",
        ok: false,
        agent: {
          source: "opencode-cli",
          available: false,
          status: "error",
          messageTr: `Beklenen şema ${REPORT_SCHEMA_VERSION} değil.`,
        } satisfies ReportAgentSection,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const bin = await findOpenCodeBin();
  if (!bin) {
    const agent: ReportAgentSection = {
      source: "opencode-cli",
      available: false,
      status: "missing",
      messageTr:
        "OpenCode CLI bulunamadı. Tarayıcı NLP sonuçları korunur; CLI kurup tekrar deneyin.",
    };
    return new Response(
      ndjsonLine({
        type: "result",
        ok: false,
        agent,
        document: { ...document, agent },
      }),
      {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  // Embed report JSON in the message; put prompt BEFORE -f (array option).
  const reportJson = JSON.stringify(document, null, 2);
  const prompt = buildOpenCodePrompt(
    reportJson,
    followUpQuestion || undefined
  );
  const workDir = await fs.mkdtemp(join(tmpdir(), "stt-lab-opencode-"));
  const payloadPath = join(workDir, "report.v1.json");
  await fs.writeFile(payloadPath, reportJson, "utf8");

  const args = [
    "run",
    "--format",
    "json",
    "-m",
    modelId,
    "--title",
    REPORT_SCHEMA_VERSION,
    "--auto",
    prompt,
    "-f",
    payloadPath,
  ];

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (obj: unknown) => {
        try {
          controller.enqueue(ndjsonBytes(obj));
        } catch {
          /* closed */
        }
      };

      const STEPS = [
        { id: "prepare", labelTr: "Hazırlık", percent: 5 },
        { id: "spawn", labelTr: "CLI başlatma", percent: 15 },
        { id: "model", labelTr: "Model çalışıyor", percent: 45 },
        { id: "text", labelTr: "Yanıt üretiliyor", percent: 75 },
        { id: "finish", labelTr: "Tamamlama", percent: 95 },
        { id: "done", labelTr: "Bitti", percent: 100 },
      ] as const;

      const emitProgress = (
        stepId: (typeof STEPS)[number]["id"],
        messageTr: string
      ) => {
        const step = STEPS.find((s) => s.id === stepId) ?? STEPS[0];
        push({
          type: "progress",
          step: step.id,
          stepLabelTr: step.labelTr,
          percent: step.percent,
          messageTr,
          steps: STEPS.map((s) => ({
            id: s.id,
            labelTr: s.labelTr,
            percent: s.percent,
          })),
        });
      };

      emitProgress(
        "prepare",
        followUpQuestion
          ? `Takip sorusu · model ${modelId}`
          : `Rapor hazırlandı · model ${modelId}`
      );
      if (followUpQuestion) {
        push({
          type: "log",
          line: `follow-up: ${followUpQuestion.slice(0, 240)}`,
        });
      }
      emitProgress("spawn", "OpenCode CLI başlatılıyor…");
      push({
        type: "log",
        line: `$ opencode run -m ${modelId} --format json --auto -f report.v1.json`,
      });

      let stdout = "";
      let stderr = "";
      let settled = false;
      const child = spawn(bin, args, {
        cwd: workDir,
        env: {
          ...process.env,
          CI: "1",
          OPENCODE_CLIENT: "cli",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      const timer = setTimeout(() => {
        emitProgress(
          "finish",
          "Zaman aşımı — OpenCode süreci sonlandırılıyor…"
        );
        try {
          child.kill("SIGTERM");
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            /* ignore */
          }
        }, 2000);
      }, RUN_TIMEOUT_MS);

      const onChunk = (buf: Buffer, which: "out" | "err") => {
        const text = buf.toString("utf8");
        if (which === "out") stdout += text;
        else stderr += text;
        for (const rawLine of text.split(/\r?\n/)) {
          const line = rawLine.trimEnd();
          if (!line) continue;
          push({ type: "log", line: line.slice(0, 2000) });
          if (line.startsWith("{")) {
            try {
              const ev = JSON.parse(line) as { type?: string };
              if (ev.type === "step_start") {
                emitProgress("model", "Model adımı başladı…");
              } else if (ev.type === "text") {
                emitProgress("text", "Model metin üretti…");
              } else if (ev.type === "step_finish") {
                emitProgress("finish", "Model adımı tamamlandı…");
              }
            } catch {
              /* not json event */
            }
          }
        }
      };

      child.stdout?.on("data", (b: Buffer) => onChunk(b, "out"));
      child.stderr?.on("data", (b: Buffer) => onChunk(b, "err"));

      const finish = async (code: number | null, signal: NodeJS.Signals | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        const text = collectOpenCodeText(stdout) || stdout || stderr;
        const parsed = parseOpenCodeAgentPayload(text);
        const timedOut = signal === "SIGTERM" || signal === "SIGKILL";
        const ok =
          !timedOut &&
          code === 0 &&
          Boolean(
            parsed.notesTr ||
              parsed.refinedSummaryTr ||
              parsed.refinedIntent ||
              parsed.suggestedActionsTr?.length
          );

        const agent: ReportAgentSection = {
          source: "opencode-cli",
          available: true,
          status: ok ? "ok" : "error",
          messageTr: ok
            ? `OpenCode CLI yanıtı laboratuvara aktarıldı (model: ${modelId}).`
            : timedOut
              ? "OpenCode CLI zaman aşımına uğradı. Lab yerel NLP ile devam eder."
              : "OpenCode CLI çalıştı ancak tamamlanamadı (model/kimlik bilgisi veya çıktı). Lab yerel NLP ile devam eder.",
          notesTr: parsed.notesTr,
          suggestedActionsTr: parsed.suggestedActionsTr,
          riskFlags: parsed.riskFlags,
          refinedIntent: parsed.refinedIntent,
          refinedSummaryTr: parsed.refinedSummaryTr,
          rawText: (text || stderr).slice(0, 8000),
          ranAt: new Date().toISOString(),
        };

        // Heuristic: if we got parseable enrichment JSON even with non-zero code, treat as ok
        if (
          !ok &&
          (parsed.notesTr || parsed.refinedSummaryTr) &&
          !/File not found/i.test(text)
        ) {
          agent.status = "ok";
          agent.messageTr = `OpenCode CLI yanıtı laboratuvara aktarıldı (model: ${modelId}).`;
        }

        const finalOk = agent.status === "ok";
        const merged: ReportDocumentV1 = { ...document, agent };
        emitProgress(
          "done",
          finalOk
            ? "Tamamlandı — rapor JSON v1 hazır."
            : "Tamamlanamadı — yerel NLP korunur."
        );
        push({ type: "result", ok: finalOk, agent, document: merged });

        try {
          await fs.rm(workDir, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      child.on("error", (err) => {
        push({ type: "log", line: `spawn error: ${err.message}` });
        void finish(1, null);
      });
      child.on("close", (code, signal) => {
        void finish(code, signal);
      });
    },
    cancel() {
      /* client aborted — best-effort; child may keep running until timeout */
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
