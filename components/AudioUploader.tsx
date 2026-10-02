"use client";

import { ArrowDown, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { isAudioFile } from "@/lib/audio-utils";
import { useLocale } from "@/components/LocaleProvider";

type AudioUploaderProps = {
  onSelectSample: (fileName: string) => void;
  onUpload: (file: File) => void;
  disabled?: boolean;
};

function pickAudioFile(dataTransfer: DataTransfer | null): File | null {
  if (!dataTransfer) return null;
  const files = dataTransfer.files;
  if (files?.length) {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (isAudioFile(f)) return f;
    }
  }
  return null;
}

/**
 * Upload / drop zone only. Sample catalog lives in SampleCatalogRow
 * (horizontal strip near the player) to avoid vertical nested scroll.
 */
export function AudioUploader({
  onSelectSample,
  onUpload,
  disabled,
}: AudioUploaderProps) {
  const { t } = useLocale();

  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hint, setHint] = useState<string | null>(null);

  const resetDrag = useCallback(() => {
    dragDepth.current = 0;
    setDragging(false);
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragDepth.current += 1;
      if (
        e.dataTransfer?.types?.includes("Files") ||
        e.dataTransfer?.types?.includes("application/x-stt-sample")
      ) {
        setDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resetDrag();
      if (disabled) return;

      const sampleName = e.dataTransfer.getData("application/x-stt-sample");
      if (sampleName) {
        onSelectSample(sampleName);
        return;
      }

      const file = pickAudioFile(e.dataTransfer);
      if (!file) {
        setHint(t("upload.invalid"));
        return;
      }
      onUpload(file);
      setHint(`${t("upload.loaded")} (${file.name})`);
    },
    [disabled, onSelectSample, onUpload, resetDrag, t]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!isAudioFile(file)) {
        setHint(`${t("upload.unsupported")} (${file.name})`);
        return;
      }
      onUpload(file);
      setHint(`${t("upload.loaded")} (${file.name})`);
      e.target.value = "";
    },
    [onUpload, t]
  );

  return (
    <div
      id="lab-upload-zone"
      className="space-y-3 rounded-2xl"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div>
        <h3 className="text-sm font-semibold tracking-wide text-tuik">
          {t("upload.title")}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {t("upload.hint")}
        </p>
        <div
          role="button"
          tabIndex={0}
          aria-label={t("upload.drop")}
          onClick={() => {
            if (!disabled) fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            dragging
              ? "border-tuik bg-tuik-soft shadow-md shadow-tuik/15 ring-2 ring-tuik/30"
              : "border-slate-300 bg-white hover:border-tuik hover:bg-tuik-soft/40"
          } ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <span
            className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
              dragging
                ? "bg-tuik-muted text-tuik ring-1 ring-tuik/50"
                : "bg-tuik-soft text-tuik ring-1 ring-tuik/30"
            }`}
            aria-hidden
          >
            {dragging ? (
              <ArrowDown className="h-5 w-5" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </span>
          <span
            className={`text-sm font-medium ${
              dragging ? "text-tuik-deep" : "text-slate-800"
            }`}
          >
            {t("upload.drop")}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            {t("upload.formats")}
          </span>
          <span className="mt-1 text-[11px] text-slate-400">
            {t("upload.privacy")}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/wav,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/*"
            className="hidden"
            disabled={disabled}
            onChange={handleFileChange}
          />
        </div>
        {dragging ? (
          <p className="mt-2 text-center text-xs font-medium text-tuik">
            {t("upload.release")}
          </p>
        ) : null}
        {hint ? (
          <p
            className={`mt-2 text-center text-xs ${
              hint.includes("(") && !hint.includes(t("upload.invalid").slice(0, 12)) && !hint.includes(t("upload.unsupported").slice(0, 12))
                ? "font-medium text-tuik-dim"
                : "font-medium text-amber-800"
            }`}
            role="status"
          >
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
