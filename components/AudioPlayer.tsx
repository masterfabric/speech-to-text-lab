"use client";

import { Pause, Play } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

type Source = { src: string; type?: string };

type AudioPlayerProps = {
  /** Single URL (blob uploads) or multi-source for samples. */
  src?: string | null;
  sources?: Source[] | null;
  label?: string;
  className?: string;
  /** Thin single-row chrome for Minimal layout. */
  compact?: boolean;
  /** Fires on timeupdate / rAF while playing — wire to Waveform playhead. */
  onTimeUpdate?: (currentTime: number) => void;
  /** Fires when metadata duration is known. */
  onDurationChange?: (duration: number) => void;
  /** Parent assigns seek(timeSec) for Waveform scrub. */
  seekRef?: MutableRefObject<((time: number) => void) | null>;
  /** Called when the media element fails to load (e.g. revoked blob URL). */
  onSourceError?: () => void;
};

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Single HTML5 player (no native controls duplicate).
 * Prefers multi-source (WAV + M4A) when provided for browser safety.
 * Exposes currentTime via onTimeUpdate + seekRef for Waveform sync/scrub.
 */
export function AudioPlayer({
  src,
  sources,
  label,
  className,
  compact = false,
  onTimeUpdate,
  onDurationChange,
  seekRef,
  onSourceError,
}: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onDurationChangeRef = useRef(onDurationChange);
  const onSourceErrorRef = useRef(onSourceError);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onDurationChangeRef.current = onDurationChange;
    onSourceErrorRef.current = onSourceError;
  }, [onTimeUpdate, onDurationChange, onSourceError]);

  const key = sources?.map((s) => s.src).join("|") || src || "empty";

  const emitTime = (t: number) => {
    setCurrent(t);
    onTimeUpdateRef.current?.(t);
  };

  const seek = (value: number) => {
    const el = ref.current;
    if (!el || !Number.isFinite(value)) return;
    const dur = el.duration;
    const clamped =
      Number.isFinite(dur) && dur > 0
        ? Math.min(Math.max(0, value), dur)
        : Math.max(0, value);
    el.currentTime = clamped;
    emitTime(clamped);
  };

  useEffect(() => {
    if (seekRef) {
      seekRef.current = seek;
      return () => {
        seekRef.current = null;
      };
    }
    // seek closes over ref/emitTime; re-bind when key changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRef, key]);

  useEffect(() => {
    setError(null);
    setReady(false);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    onTimeUpdateRef.current?.(0);
  }, [key]);

  useEffect(() => {
    const el = ref.current;
    if (!el || key === "empty") return;
    el.pause();
    el.currentTime = 0;
    el.load();
  }, [key]);

  // Smooth playhead while playing (timeupdate alone is ~4 Hz)
  useEffect(() => {
    if (!playing) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const tick = () => {
      const el = ref.current;
      if (el && !el.paused) {
        emitTime(el.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  if (!src && (!sources || sources.length === 0)) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 ${
          compact ? "h-9 text-xs" : "h-12 text-sm"
        } ${className ?? ""}`}
      >
        Örnek seçince oynatıcı burada açılır
      </div>
    );
  }

  const toggle = async () => {
    const el = ref.current;
    if (!el) return;
    try {
      if (el.paused) {
        await el.play();
      } else {
        el.pause();
      }
    } catch {
      setError(
        "Ses oynatılamadı. Dosyayı yeniden seçin veya tarayıcı otomatik oynatma kısıtını kontrol edin."
      );
    }
  };

  const audioEl = (
    <audio
      ref={ref}
      key={key}
      preload="auto"
      className="hidden"
      aria-label={label ?? "Ses oynatıcı"}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onTimeUpdate={(e) => emitTime(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => {
        const d = e.currentTarget.duration || 0;
        setDuration(d);
        setReady(true);
        onDurationChangeRef.current?.(d);
      }}
      onCanPlay={() => setReady(true)}
      onError={() => {
        setReady(false);
        setError(
          "Ses dosyası yüklenemedi. /samples/ yolunu kontrol edin veya WAV/M4A deneyin."
        );
        onSourceErrorRef.current?.();
      }}
    >
      {sources && sources.length > 0
        ? sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))
        : src
          ? [<source key={src} src={src} />]
          : null}
      Tarayıcınız HTML5 ses öğesini desteklemiyor.
    </audio>
  );

  if (compact) {
    /* Minimal: play/pause + time only — scrub via waveform, no range timeline */
    return (
      <div
        className={`flex min-w-0 items-center gap-2 ${className ?? ""}`}
        data-testid="audio-player-compact"
      >
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={!ready && !error}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tuik text-white shadow-sm shadow-tuik/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={playing ? "Duraklat" : "Oynat"}
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Play className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <span className="shrink-0 tabular-nums text-[10px] font-medium text-slate-500">
          {formatTime(current)}/{formatTime(duration)}
        </span>
        {audioEl}
        {error ? (
          <p className="sr-only" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-tuik/20 bg-gradient-to-r from-white to-tuik-soft/50 p-3 shadow-sm shadow-black/5 ${className ?? ""}`}
      data-testid="audio-player-detail"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-tuik">
            Ses oynatıcı
          </p>
          <p className="truncate text-sm font-medium text-slate-800">
            {label ?? "Seçili kayıt"}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-tuik/20">
          {formatTime(current)} / {formatTime(duration)}
          {ready ? "" : " · yükleniyor"}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={!ready && !error}
          className="inline-flex h-11 min-w-[7.5rem] items-center justify-center gap-2 rounded-xl bg-tuik px-4 text-sm font-semibold text-white shadow-md shadow-tuik/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={playing ? "Duraklat" : "Oynat"}
        >
          {playing ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
          {playing ? "Duraklat" : "Oynat"}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="sr-only" htmlFor={`seek-${key}`}>
            İlerleme
          </label>
          <input
            id={`seek-${key}`}
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(current, duration || 0)}
            disabled={!ready || duration <= 0}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-tuik disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {audioEl}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">
        <span>{ready ? "Hazır" : "Yükleniyor…"}</span>
        {sources && sources.length > 1 ? (
          <span className="rounded bg-tuik-soft px-1.5 py-0.5 text-tuik-dim ring-1 ring-tuik/30">
            WAV + M4A
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5">HTML5</span>
        )}
        {src || sources?.[0]?.src ? (
          <code className="rounded bg-tuik-soft px-1 text-tuik-dim normal-case tracking-normal">
            {sources?.[0]?.src ?? src}
          </code>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
