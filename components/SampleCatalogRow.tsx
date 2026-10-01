"use client";

import { Check, Music2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SAMPLE_CATALOG } from "@/lib/constants";

type SampleCatalogRowProps = {
  selectedSample: string | null;
  onSelectSample: (fileName: string) => void;
  disabled?: boolean;
  /** Less header chrome for Minimal strip. */
  compact?: boolean;
};

function sourceBadge(): { label: string; className: string } {
  return {
    label: "CC-0",
    className: "bg-tuik-soft text-tuik-dim ring-1 ring-tuik/30",
  };
}

function chipLabel(sample: (typeof SAMPLE_CATALOG)[number]): string {
  const stem = sample.fileName
    .replace(/^cv-tr-/i, "")
    .replace(/\.(wav|mp3|m4a|ogg)$/i, "");
  if (stem.length <= 24) return stem;
  return `${stem.slice(0, 22)}…`;
}

function matchesQuery(
  sample: (typeof SAMPLE_CATALOG)[number],
  query: string
): boolean {
  if (!query) return true;
  const q = query.trim().toLocaleLowerCase("tr");
  if (!q) return true;
  const hay = [
    sample.label,
    sample.description,
    sample.fileName,
    sample.durationHint,
    sample.id,
    chipLabel(sample),
  ]
    .join(" ")
    .toLocaleLowerCase("tr");
  return hay.includes(q);
}

/**
 * Compact horizontal sample strip placed near the player.
 * Left-to-right overflow-x scroll — no vertical nested sidebar hell.
 */
export function SampleCatalogRow({
  selectedSample,
  onSelectSample,
  disabled,
  compact = false,
}: SampleCatalogRowProps) {
  const [filter, setFilter] = useState("");

  const filteredSamples = useMemo(
    () => SAMPLE_CATALOG.filter((s) => matchesQuery(s, filter)),
    [filter]
  );

  const searchField = (
      <div className={`relative ${compact ? "mb-1.5 max-w-[11rem]" : "mb-2 max-w-xs"}`}>
        <Search
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={disabled}
          placeholder={compact ? "Ara…" : "Ara: etiket, dosya, süre…"}
          aria-label="Örnek kayıtları filtrele"
          className={`w-full rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-tuik/50 focus:ring-1 focus:ring-tuik/30 disabled:opacity-50 ${
            compact ? "py-1 pl-7 pr-7" : "py-1.5 pl-8 pr-8"
          }`}
        />
        {filter ? (
          <button
            type="button"
            aria-label="Filtreyi temizle"
            onClick={() => setFilter("")}
            className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>
  );

  return (
    <div
      id="lab-sample-catalog"
      className={
        compact
          ? "min-w-0 max-w-full overflow-hidden"
          : "min-w-0 max-w-full overflow-hidden rounded-xl border border-tuik/30 bg-white p-3 shadow-sm"
      }
      data-compact={compact ? "true" : "false"}
    >
      {compact ? (
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-tuik">
            Örnekler
          </h2>
          <span className="rounded-full bg-tuik-soft px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-tuik-dim ring-1 ring-tuik/30">
            {filter.trim()
              ? `${filteredSamples.length}/${SAMPLE_CATALOG.length}`
              : `${SAMPLE_CATALOG.length}`}
          </span>
          <div className="min-w-0 flex-1">{searchField}</div>
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-wide text-tuik">
                Örnek kayıtlar
              </h2>
              <p className="text-[11px] leading-snug text-slate-600">
                Yatay kaydırın · Common Voice TR (CC-0) · seçince oynatıcıya yüklenir
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-tuik-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tuik-dim ring-1 ring-tuik/30">
              {filter.trim()
                ? `${filteredSamples.length}/${SAMPLE_CATALOG.length}`
                : `${SAMPLE_CATALOG.length} ses`}
            </span>
          </div>
          {searchField}
        </>
      )}

      <div
        className="flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-tuik/40"
        role="listbox"
        aria-label="Örnek kayıt kataloğu"
        data-testid="sample-catalog-row"
      >
        {filteredSamples.length === 0 ? (
          <p className="shrink-0 px-3 py-4 text-xs text-slate-500">
            Eşleşen örnek yok. Filtreyi temizleyin.
          </p>
        ) : (
          filteredSamples.map((sample) => {
            const active = selectedSample === sample.fileName;
            const badge = sourceBadge();
            return (
              <button
                key={sample.id}
                type="button"
                role="option"
                aria-selected={active}
                disabled={disabled}
                title={`${sample.label} — ${sample.description}`}
                draggable={!disabled}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/x-stt-sample",
                    sample.fileName
                  );
                  e.dataTransfer.setData("text/plain", sample.fileName);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onSelectSample(sample.fileName)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition ${
                  active
                    ? "border-tuik bg-tuik text-white shadow-sm shadow-tuik/25"
                    : "border-tuik/25 bg-tuik-soft/60 text-slate-800 hover:border-tuik hover:bg-tuik-soft"
                } ${disabled ? "opacity-50" : "cursor-grab active:cursor-grabbing"}`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-white text-tuik ring-1 ring-tuik/30"
                  }`}
                  aria-hidden
                >
                  {active ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Music2 className="h-3 w-3" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block max-w-[11rem] truncate text-[11px] font-semibold leading-tight">
                    {chipLabel(sample)}
                  </span>
                  <span
                    className={`mt-0.5 flex items-center gap-1 text-[9px] tabular-nums ${
                      active ? "text-white/85" : "text-slate-500"
                    }`}
                  >
                    <span>{sample.durationHint}</span>
                    <span
                      className={`rounded px-1 py-px font-semibold ${
                        active ? "bg-white/15 text-white" : badge.className
                      }`}
                    >
                      {badge.label}
                    </span>
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
