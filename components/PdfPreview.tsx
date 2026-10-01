"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Download,
  ExternalLink,
  Eye,
  FileDown,
  Loader2,
  X,
} from "lucide-react";
import {
  downloadPdfArtifact,
  openPdfBlobUrl,
  type PdfArtifact,
} from "@/lib/export-pdf";

type PdfPreviewProps = {
  /** Build PDF blob on demand (preview / download share the same builder). */
  buildPdf: () => Promise<PdfArtifact>;
  disabled?: boolean;
  /** Visual style for the download button (ReportPanel solid / Batch soft). */
  downloadVariant?: "solid" | "soft";
};

/**
 * PDF önizleme + indirme.
 * - iframe blob URL (popup gerekmez)
 * - yeni sekme (engel olursa iframe kalır + uyarı)
 * - indirme ayrı blob URL kullanır; önizleme URL'si erken revoke edilmez
 */
export function PdfPreviewActions({
  buildPdf,
  disabled,
  downloadVariant = "solid",
}: PdfPreviewProps) {
  const [busy, setBusy] = useState<"preview" | "download" | null>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const revokeCurrent = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setBlobUrl(null);
  };

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const ensureArtifact = async (): Promise<PdfArtifact> => {
    const artifact = await buildPdf();
    if (!(artifact.blob instanceof Blob) || artifact.blob.size < 64) {
      throw new Error("PDF blob geçersiz veya boş.");
    }
    return artifact;
  };

  const showPreview = async () => {
    setBusy("preview");
    setError(null);
    setPopupBlocked(false);
    try {
      const artifact = await ensureArtifact();
      revokeCurrent();
      const url = URL.createObjectURL(artifact.blob);
      urlRef.current = url;
      setBlobUrl(url);
      setFileName(artifact.fileName);
      setOpen(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? `PDF önizleme başarısız: ${e.message}`
          : "PDF önizleme başarısız."
      );
      setOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    setBusy("download");
    setError(null);
    try {
      // Reuse open preview blob when available to avoid double font/PDF work
      if (urlRef.current && fileName && open) {
        const res = await fetch(urlRef.current);
        const blob = await res.blob();
        downloadPdfArtifact({
          blob:
            blob.type === "application/pdf"
              ? blob
              : new Blob([blob], { type: "application/pdf" }),
          fileName,
        });
      } else {
        const artifact = await ensureArtifact();
        downloadPdfArtifact(artifact);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? `PDF indirilemedi: ${e.message}`
          : "PDF indirilemedi."
      );
    } finally {
      setBusy(null);
    }
  };

  const openTab = () => {
    if (!blobUrl) return;
    const ok = openPdfBlobUrl(blobUrl);
    setPopupBlocked(!ok);
  };

  const dismissPreview = () => {
    setOpen(false);
    setPopupBlocked(false);
    setFileName(null);
    setError(null);
    revokeCurrent();
  };

  const dlClass =
    downloadVariant === "solid"
      ? "bg-tuik text-white shadow-sm shadow-tuik/20 hover:brightness-105"
      : "border border-tuik/30 bg-tuik-soft text-tuik-dim hover:bg-tuik-muted";

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        <ActionBtn
          onClick={() => void showPreview()}
          disabled={disabled || busy != null}
          icon={
            busy === "preview" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden />
            )
          }
          label={busy === "preview" ? "Önizleme…" : "PDF önizle"}
          className="border border-tuik/30 bg-white text-tuik-dim hover:bg-tuik-soft"
        />
        <ActionBtn
          onClick={() => void download()}
          disabled={disabled || busy != null}
          icon={
            busy === "download" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <FileDown className="h-3.5 w-3.5" aria-hidden />
            )
          }
          label={busy === "download" ? "PDF…" : "PDF indir"}
          className={dlClass}
        />
      </div>

      {error ? (
        <p className="mt-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {open && blobUrl ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-tuik/35 bg-slate-50 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-tuik-dim">
                PDF önizleme
              </p>
              {fileName ? (
                <p className="truncate text-[11px] text-slate-500">{fileName}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ActionBtn
                onClick={openTab}
                icon={<ExternalLink className="h-3.5 w-3.5" aria-hidden />}
                label="Yeni sekme"
                className="border border-tuik/30 bg-white text-tuik-dim hover:bg-tuik-soft"
              />
              <ActionBtn
                onClick={() => void download()}
                disabled={busy != null}
                icon={<Download className="h-3.5 w-3.5" aria-hidden />}
                label="İndir"
                className="border border-tuik/30 bg-tuik-soft text-tuik-dim hover:bg-tuik-muted"
              />
              <ActionBtn
                onClick={dismissPreview}
                icon={<X className="h-3.5 w-3.5" aria-hidden />}
                label="Kapat"
                className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              />
            </div>
          </div>

          {popupBlocked ? (
            <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              Yeni sekme engellendi. Önizleme bu paneldeki iframe içinde
              devam ediyor; tarayıcı popup iznini açabilir veya buradan
              indirebilirsiniz.
            </p>
          ) : null}

          <iframe
            title={fileName ? `PDF önizleme: ${fileName}` : "PDF önizleme"}
            src={blobUrl}
            className="h-[min(70vh,640px)] w-full bg-white"
          />
        </div>
      ) : null}
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  label,
  className,
  disabled,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  className: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}
