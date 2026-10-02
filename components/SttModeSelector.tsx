"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AudioWaveform, Bot, Check, Mic, Radar, Workflow } from "lucide-react";
import {
  STT_MODES,
  supportsWebSpeech,
  type SttMode,
  type SttModeIconName,
} from "@/lib/stt-modes";
import { useLocale } from "@/components/LocaleProvider";

const ICONS: Record<SttModeIconName, LucideIcon> = {
  bot: Bot,
  mic: Mic,
  workflow: Workflow,
  waveform: AudioWaveform,
  radar: Radar,
};

type SttModeSelectorProps = {
  value: SttMode;
  onChange: (mode: SttMode) => void;
  disabled?: boolean;
};

export function SttModeSelector({
  value,
  onChange,
  disabled,
}: SttModeSelectorProps) {
  const { t } = useLocale();
  const [webSpeechOk, setWebSpeechOk] = useState(false);

  useEffect(() => {
    setWebSpeechOk(supportsWebSpeech());
  }, []);

  const active = STT_MODES.find((m) => m.id === value) ?? STT_MODES[0];

  return (
    <div className="rounded-xl border border-tuik/30 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {t("stt.title")}
        </label>
        <span className="rounded-md bg-tuik-soft px-2 py-0.5 text-[10px] font-semibold text-tuik-dim ring-1 ring-tuik/30">
          {STT_MODES.length} {t("stt.tools")}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label={t("stt.aria")}
        className="mt-3 space-y-2"
      >
        {STT_MODES.map((mode) => {
          const Icon = ICONS[mode.icon];
          const selected = value === mode.id;
          const unavailable =
            mode.id === "web-speech" && !webSpeechOk;
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(mode.id)}
              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                selected
                  ? "border-tuik bg-tuik-soft/80 ring-1 ring-tuik/40"
                  : "border-slate-200 bg-white hover:border-tuik/40 hover:bg-tuik-soft/40"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  selected
                    ? "bg-tuik text-white"
                    : "bg-slate-100 text-tuik-dim"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900">
                    {mode.label}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                      mode.offline
                        ? "bg-white text-tuik-dim ring-tuik/30"
                        : "bg-slate-50 text-slate-600 ring-slate-200"
                    }`}
                  >
                    {mode.badge}
                  </span>
                  {mode.recommended ? (
                    <span className="rounded bg-tuik px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {t("stt.recommended")}
                    </span>
                  ) : null}
                  {unavailable ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200">
                      {t("stt.unavailable")}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-600">
                  {mode.shortLabel}
                </span>
              </span>
              {selected ? (
                <Check
                  className="mt-1 h-4 w-4 shrink-0 text-tuik"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <p className="text-xs font-semibold text-tuik-deep">{active.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {active.description}
        </p>
        <ul className="mt-2 space-y-1">
          {active.details.map((line) => (
            <li
              key={line}
              className="flex gap-2 text-[11px] leading-snug text-slate-600"
            >
              <span
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tuik"
                aria-hidden
              />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
