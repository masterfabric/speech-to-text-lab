import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import {
  OPENCODE_FALLBACK_MODELS,
  OPENCODE_MODEL_ID,
  ensureModelInList,
  sanitizeOpenCodeModelId,
} from "@/lib/opencode-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

async function listOpenCodeModels(bin: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(bin, ["models"], {
      timeout: 15000,
      env: process.env,
      maxBuffer: 2 * 1024 * 1024,
    });
    const lines = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split(/\s+/)[0])
      .filter((id) => /^[a-zA-Z0-9][a-zA-Z0-9._\/-]{0,127}$/.test(id));

    // Prefer free / opencode namespace models, but keep others as secondary.
    const preferred = lines.filter(
      (id) =>
        id.startsWith("opencode/") ||
        id.includes("-free") ||
        id.includes("contributor-free")
    );
    const rest = lines.filter((id) => !preferred.includes(id));
    const ordered = preferred.length ? [...preferred, ...rest] : lines;
    return ensureModelInList(OPENCODE_MODEL_ID, ordered);
  } catch {
    return [...OPENCODE_FALLBACK_MODELS];
  }
}

async function resolveOpenCode(): Promise<{
  available: boolean;
  path: string | null;
  version: string | null;
  model: string;
  models: string[];
  messageTr: string;
}> {
  const candidates = ["opencode"];
  const home = process.env.HOME;
  if (home) {
    candidates.unshift(`${home}/.opencode/bin/opencode`);
  }

  for (const bin of candidates) {
    try {
      const { stdout } = await execFileAsync(bin, ["--version"], {
        timeout: 8000,
        env: process.env,
      });
      const version = stdout.trim().split(/\s+/)[0] || stdout.trim();
      const models = await listOpenCodeModels(bin);
      return {
        available: true,
        path: bin,
        version,
        model: OPENCODE_MODEL_ID,
        models,
        messageTr: `OpenCode CLI bulundu (${version}). Varsayılan model: ${OPENCODE_MODEL_ID}. İsteğe bağlı ajan adımı kullanılabilir.`,
      };
    } catch {
      /* try next */
    }
  }

  try {
    const { stdout } = await execFileAsync("/usr/bin/which", ["opencode"], {
      timeout: 5000,
    });
    const path = stdout.trim();
    if (path) {
      try {
        const { stdout: verOut } = await execFileAsync(path, ["--version"], {
          timeout: 8000,
        });
        const version = verOut.trim().split(/\s+/)[0] || verOut.trim();
        const models = await listOpenCodeModels(path);
        return {
          available: true,
          path,
          version,
          model: OPENCODE_MODEL_ID,
          models,
          messageTr: `OpenCode CLI bulundu (${version}). Varsayılan model: ${OPENCODE_MODEL_ID}.`,
        };
      } catch {
        return {
          available: true,
          path,
          version: null,
          model: OPENCODE_MODEL_ID,
          models: [...OPENCODE_FALLBACK_MODELS],
          messageTr: `OpenCode CLI yolu bulundu; sürüm okunamadı. Varsayılan model: ${OPENCODE_MODEL_ID}.`,
        };
      }
    }
  } catch {
    /* missing */
  }

  return {
    available: false,
    path: null,
    version: null,
    model: OPENCODE_MODEL_ID,
    models: [...OPENCODE_FALLBACK_MODELS],
    messageTr:
      "OpenCode CLI yok veya PATH'te değil. Lab tarayıcı NLP ile çalışmaya devam eder; CLI kurunca isteğe bağlı ajan adımı açılır.",
  };
}

export async function GET() {
  const status = await resolveOpenCode();
  // Touch sanitize so unused-import tools stay quiet if tree-shaken oddly.
  void sanitizeOpenCodeModelId(status.model);
  return NextResponse.json(status);
}
