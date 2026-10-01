"use client";

import { useState } from "react";
import {
  Apple,
  ChevronDown,
  ExternalLink,
  Monitor,
  Terminal,
} from "lucide-react";

type Platform = "macos" | "linux" | "windows";

const PLATFORMS: {
  id: Platform;
  label: string;
  icon: typeof Apple;
  steps: { title: string; code?: string; note?: string }[];
}[] = [
  {
    id: "macos",
    label: "macOS",
    icon: Apple,
    steps: [
      {
        title: "Install script (recommended)",
        code: "curl -fsSL https://opencode.ai/install | bash",
      },
      {
        title: "Or Homebrew tap",
        code: "brew install anomalyco/tap/opencode",
      },
      {
        title: "Or npm",
        code: "npm install -g opencode-ai@latest",
      },
      {
        title: "Verify",
        code: "opencode --version && opencode models",
        note: "Binary often lands in ~/.opencode/bin — ensure PATH includes it, then restart the lab dev server.",
      },
    ],
  },
  {
    id: "linux",
    label: "Linux",
    icon: Terminal,
    steps: [
      {
        title: "Install script (recommended)",
        code: "curl -fsSL https://opencode.ai/install | bash",
      },
      {
        title: "Or npm",
        code: "npm install -g opencode-ai@latest",
      },
      {
        title: "Arch Linux (optional)",
        code: "sudo pacman -S opencode",
      },
      {
        title: "Verify",
        code: "opencode --version && opencode models",
        note: "Add ~/.opencode/bin to PATH if the shell cannot find opencode.",
      },
    ],
  },
  {
    id: "windows",
    label: "Windows",
    icon: Monitor,
    steps: [
      {
        title: "Recommended: WSL, then install script",
        code: "wsl --install\n# in Ubuntu/WSL:\ncurl -fsSL https://opencode.ai/install | bash",
        note: "WSL gives the best CLI compatibility for this lab bridge.",
      },
      {
        title: "Native: Scoop",
        code: "scoop install opencode",
      },
      {
        title: "Native: Chocolatey",
        code: "choco install opencode",
      },
      {
        title: "Or npm",
        code: "npm install -g opencode-ai@latest",
      },
      {
        title: "Verify",
        code: "opencode --version",
        note: "Restart the Next.js server after install so /api/opencode/status can detect the CLI.",
      },
    ],
  },
];

export function OpenCodeInstallAccordion() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("macos");
  const active = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];
  const Icon = active.icon;

  return (
    <div
      className="rounded-xl border border-tuik/30 bg-white shadow-sm"
      data-testid="opencode-install-accordion"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="opencode-install-panel"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-tuik-soft/40"
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-tuik-soft text-tuik ring-1 ring-tuik/30">
          <Terminal className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-tuik-dim">
            OpenCode kurulum
          </span>
          <span className="block text-[11px] text-slate-500">
            Windows · Linux · macOS — CLI kurulumu (isteğe bağlı)
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-tuik transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      <div
        id="opencode-install-panel"
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        hidden={!open ? true : undefined}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-tuik/15 px-4 pb-4 pt-3">
            <div
              role="tablist"
              aria-label="Kurulum platformu"
              className="inline-flex flex-wrap gap-1 rounded-lg border border-tuik/25 bg-tuik-soft/40 p-1"
            >
              {PLATFORMS.map((p) => {
                const TabIcon = p.icon;
                const selected = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    data-testid={`opencode-install-tab-${p.id}`}
                    onClick={() => setPlatform(p.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? "bg-tuik text-white shadow-sm shadow-tuik/20"
                        : "text-slate-600 hover:bg-white hover:text-tuik-dim"
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" aria-hidden />
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              data-testid={`opencode-install-panel-${platform}`}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <Icon className="h-3.5 w-3.5 text-tuik" aria-hidden />
                {active.label} kurulumu
              </div>
              <ol className="space-y-2.5">
                {active.steps.map((step) => (
                  <li
                    key={step.title}
                    className="rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                  >
                    <p className="text-xs font-semibold text-slate-800">
                      {step.title}
                    </p>
                    {step.code ? (
                      <pre className="mt-1.5 overflow-x-auto rounded-md bg-slate-950 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-slate-100">
                        {step.code}
                      </pre>
                    ) : null}
                    {step.note ? (
                      <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                        {step.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
              <a
                href="https://opencode.ai/docs/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-tuik transition hover:text-tuik-deep"
              >
                Resmi belgeler
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
