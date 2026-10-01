"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decodeAudioFile } from "@/lib/audio-utils";

type WaveformProps = {
  url: string | null;
  onReady?: (duration: number) => void;
  height?: number;
  /** Hide outer chrome + hint for Minimal strip. */
  compact?: boolean;
  /** Playback position from AudioPlayer (seconds). */
  currentTime?: number;
  /** Duration override; falls back to decoded duration. */
  duration?: number;
  /** Seek callback wired to AudioPlayer.currentTime. */
  onSeek?: (time: number) => void;
};

/**
 * Peak visualization (AudioContext decode + canvas).
 * Playhead syncs to AudioPlayer currentTime; click/drag scrubs seek.
 * Does not create an HTMLAudioElement — playback is solely LabWorkspace AudioPlayer.
 */
export function Waveform({
  url,
  onReady,
  height = 128,
  compact = false,
  currentTime = 0,
  duration: durationProp,
  onSeek,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<Float32Array | null>(null);
  const decodedDurationRef = useRef(0);
  const scrubbingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  const effectiveDuration =
    (durationProp && durationProp > 0
      ? durationProp
      : decodedDurationRef.current) || 0;

  const draw = useCallback(
    (playheadSec: number) => {
      const canvas = canvasRef.current;
      const peaks = peaksRef.current;
      if (!canvas || !peaks) return;

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const cssWidth = canvas.clientWidth || 600;
      const cssHeight = height;
      const needResize =
        canvas.width !== Math.floor(cssWidth * dpr) ||
        canvas.height !== Math.floor(cssHeight * dpr);
      if (needResize) {
        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = cssWidth;
      const h = cssHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      const n = peaks.length;
      const gap = 1;
      const barW = Math.max(1, (w - gap * (n - 1)) / n);
      const mid = h / 2;
      const dur = effectiveDuration > 0 ? effectiveDuration : decodedDurationRef.current;
      const progressX =
        dur > 0 ? Math.min(w, Math.max(0, (playheadSec / dur) * w)) : 0;

      for (let i = 0; i < n; i++) {
        const amp = Math.min(1, peaks[i] * 1.4);
        const barH = Math.max(2, amp * (h * 0.85));
        const x = i * (barW + gap);
        const y = mid - barH / 2;
        const barCenter = x + barW / 2;
        const played = barCenter <= progressX;
        ctx.fillStyle = played ? "#ae1615" : "#f0b4b3";
        ctx.globalAlpha = played ? 0.45 + amp * 0.55 : 0.25 + amp * 0.35;
        ctx.fillRect(x, y, barW, barH);
      }
      ctx.globalAlpha = 1;

      if (dur > 0) {
        // Playhead line synced to audio time
        ctx.strokeStyle = "#7f1010";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(progressX + 0.5, 0);
        ctx.lineTo(progressX + 0.5, h);
        ctx.stroke();

        ctx.fillStyle = "#ae1615";
        ctx.beginPath();
        ctx.arc(progressX, 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [effectiveDuration, height]
  );

  useEffect(() => {
    if (!url) {
      peaksRef.current = null;
      decodedDurationRef.current = 0;
      return;
    }
    let cancelled = false;

    (async () => {
      setStatus("loading");
      setError(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const info = await decodeAudioFile(blob);
        if (cancelled) return;

        peaksRef.current = info.peaks;
        decodedDurationRef.current = info.durationSec;
        onReady?.(info.durationSec);
        draw(currentTime);
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) {
          peaksRef.current = null;
          setStatus("idle");
          setError("Dalga formu yüklenemedi. Dosya formatını kontrol edin.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // currentTime intentionally omitted — redraw handled in separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, height, onReady, draw]);

  useEffect(() => {
    if (status !== "ready") return;
    draw(currentTime);
  }, [currentTime, status, draw, effectiveDuration]);

  useEffect(() => {
    const onResize = () => {
      if (status === "ready") draw(currentTime);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [status, currentTime, draw]);

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      const dur =
        effectiveDuration > 0 ? effectiveDuration : decodedDurationRef.current;
      if (!canvas || dur <= 0) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.min(rect.width, Math.max(0, clientX - rect.left));
      return (x / rect.width) * dur;
    },
    [effectiveDuration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onSeek || status !== "ready") return;
    const t = timeFromClientX(e.clientX);
    if (t == null) return;
    scrubbingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeek(t);
    draw(t);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!scrubbingRef.current || !onSeek) return;
    const t = timeFromClientX(e.clientX);
    if (t == null) return;
    onSeek(t);
    draw(t);
  };

  const endScrub = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center border-dashed border-slate-300 bg-white text-slate-500 ${
          compact
            ? "rounded-md border text-[10px]"
            : "rounded-xl border text-sm"
        }`}
        style={{ height }}
        data-testid={compact ? "waveform-compact" : "waveform-detail"}
      >
        Ses yüklenince dalga formu burada görünecek
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-0" : "space-y-2"} data-testid={compact ? "waveform-compact" : "waveform-detail"}>
      <div
        className={
          compact
            ? "overflow-hidden rounded-md bg-white"
            : "overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-3"
        }
      >
        <canvas
          ref={canvasRef}
          className={`block w-full ${onSeek && status === "ready" ? "cursor-ew-resize" : ""}`}
          style={{ height, touchAction: "none" }}
          aria-label="Dalga formu görselleştirmesi — tıklayın veya sürükleyerek konum seçin"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.round(effectiveDuration * 100) / 100}
          aria-valuenow={Math.round(currentTime * 100) / 100}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        />
        {status === "loading" && !error && !compact ? (
          <p className="mt-2 text-center text-xs text-slate-500">
            Dalga formu yükleniyor…
          </p>
        ) : null}
      </div>
      {error ? (
        <p className={`text-rose-400 ${compact ? "text-[10px]" : "text-sm"}`}>{error}</p>
      ) : compact ? null : (
        <p className="text-xs text-slate-500">
          Oynatma başlığı ses zamanıyla senkron — tıklayın veya sürükleyerek konum seçin
        </p>
      )}
    </div>
  );
}
