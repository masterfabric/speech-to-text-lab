/**
 * Client-side audio utilities: decode metadata, extract peaks for waveform/VAD heuristics.
 * Robust for long / low-rate telephony MP3 (8 kHz MPEG) with timeouts and fallbacks.
 */

export type AudioFileInfo = {
  durationSec: number;
  sampleRate: number;
  numberOfChannels: number;
  peaks: Float32Array;
  /** How duration/rate were obtained. */
  probeSource: "decoded" | "metadata" | "estimated" | "partial";
  warning?: string;
};

const DECODE_TIMEOUT_MS = 12_000;
/** Cap PCM decode work for very long clips (waveform + peaks only). */
const MAX_DECODE_SECONDS = 120;
const DEFAULT_PEAK_BARS = 400;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Sniff MPEG audio frame header for sample rate / bitrate (incl. MPEG 2.5 @ 8 kHz).
 * Returns null when the buffer is not a recognizable MP3.
 */
export function sniffMp3StreamInfo(
  bytes: Uint8Array
): { sampleRate: number; bitrateKbps: number; channels: number } | null {
  // Skip ID3v2
  let offset = 0;
  if (
    bytes.length >= 10 &&
    bytes[0] === 0x49 &&
    bytes[1] === 0x44 &&
    bytes[2] === 0x33
  ) {
    const size =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);
    offset = 10 + size;
  }

  const mpegRates: Record<number, number[]> = {
    // MPEG1, MPEG2, MPEG2.5
    3: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
    0: [11025, 12000, 8000],
  };
  const bitrateV1L3 = [
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
  ];
  const bitrateV2L3 = [
    0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0,
  ];

  for (let i = offset; i < Math.min(bytes.length - 4, offset + 8192); i++) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const versionBits = (b1 >> 3) & 0x3; // 3=V1, 2=V2, 0=V2.5
    const layerBits = (b1 >> 1) & 0x3; // 1 = Layer III
    if (layerBits !== 1) continue;
    if (versionBits === 1) continue;
    const srIdx = (b2 >> 2) & 0x3;
    if (srIdx === 3) continue;
    const brIdx = (b2 >> 4) & 0xf;
    if (brIdx === 0 || brIdx === 15) continue;
    const rates = mpegRates[versionBits];
    if (!rates) continue;
    const sampleRate = rates[srIdx];
    const bitrateKbps =
      versionBits === 3 ? bitrateV1L3[brIdx] : bitrateV2L3[brIdx];
    if (!sampleRate || !bitrateKbps) continue;
    const channelMode = (bytes[i + 3] >> 6) & 0x3;
    const channels = channelMode === 3 ? 1 : 2;
    return { sampleRate, bitrateKbps, channels };
  }
  return null;
}

function estimateDurationFromMp3(
  byteLength: number,
  info: { bitrateKbps: number }
): number {
  // Prefer payload estimate; ID3 overhead is small for long telephony clips.
  const bits = Math.max(byteLength - 128, 1) * 8;
  return bits / (info.bitrateKbps * 1000);
}

function syntheticPeaks(bars: number, seed = 1): Float32Array {
  const peaks = new Float32Array(bars);
  let s = seed || 1;
  for (let i = 0; i < bars; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const n = s / 4294967296;
    // Soft telephony-looking envelope with quiet gaps
    const env = 0.15 + 0.55 * Math.abs(Math.sin(i / 17));
    peaks[i] = n > 0.22 ? env * (0.35 + n * 0.65) : env * 0.08;
  }
  return peaks;
}

export function downsamplePeaks(
  channelData: Float32Array,
  targetBars: number
): Float32Array {
  const peaks = new Float32Array(targetBars);
  const blockSize = Math.floor(channelData.length / targetBars) || 1;
  for (let i = 0; i < targetBars; i++) {
    const start = i * blockSize;
    let max = 0;
    for (let j = 0; j < blockSize && start + j < channelData.length; j++) {
      const v = Math.abs(channelData[start + j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }
  return peaks;
}

/**
 * Chunked peak extraction: sample evenly across the buffer so long calls
 * (8+ min telephony) do not allocate a second full copy for visualization.
 */
export function chunkedPeaksFromChannel(
  channelData: Float32Array,
  targetBars: number,
  maxSamples = 480_000
): Float32Array {
  if (channelData.length <= maxSamples) {
    return downsamplePeaks(channelData, targetBars);
  }
  // Stride-sample into a working window, then downsample.
  const step = Math.ceil(channelData.length / maxSamples);
  const reduced = new Float32Array(Math.ceil(channelData.length / step));
  for (let i = 0, o = 0; i < channelData.length; i += step, o++) {
    let max = 0;
    for (let j = 0; j < step && i + j < channelData.length; j++) {
      const v = Math.abs(channelData[i + j]);
      if (v > max) max = v;
    }
    reduced[o] = max;
  }
  return downsamplePeaks(reduced, targetBars);
}

async function decodeWithAudioContext(
  arrayBuffer: ArrayBuffer
): Promise<{
  durationSec: number;
  sampleRate: number;
  numberOfChannels: number;
  peaks: Float32Array;
  partial: boolean;
}> {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await withTimeout(
      ctx.decodeAudioData(arrayBuffer.slice(0)),
      DECODE_TIMEOUT_MS,
      "decodeAudioData"
    );
    const channel = audioBuffer.getChannelData(0);
    const partial = audioBuffer.duration > MAX_DECODE_SECONDS + 0.5;
    // For long clips, peaks from a leading window + stride sample of the full buffer.
    const peaks = chunkedPeaksFromChannel(channel, DEFAULT_PEAK_BARS);
    return {
      durationSec: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      peaks,
      partial,
    };
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

async function probeHtmlAudioDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    let settled = false;
    const finish = (v: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      audio.removeAttribute("src");
      audio.load();
      resolve(v);
    };
    const timer = window.setTimeout(() => finish(null), 8000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      finish(Number.isFinite(d) && d > 0 ? d : null);
    };
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

/**
 * Decode / probe an audio Blob. Never throws for telephony edge cases —
 * always returns usable duration + peaks (synthetic if needed) so skorlama
 * can still run.
 */
export async function decodeAudioFile(file: Blob): Promise<AudioFileInfo> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const mp3Info = sniffMp3StreamInfo(bytes);

  try {
    const decoded = await decodeWithAudioContext(arrayBuffer);
    // Prefer container sample rate when browser resamples 8 kHz → 44.1/48 kHz.
    const sampleRate =
      mp3Info && mp3Info.sampleRate > 0 && mp3Info.sampleRate < decoded.sampleRate
        ? mp3Info.sampleRate
        : decoded.sampleRate;
    return {
      durationSec: decoded.durationSec,
      sampleRate,
      numberOfChannels: decoded.numberOfChannels,
      peaks: decoded.peaks,
      probeSource: decoded.partial ? "partial" : "decoded",
      warning: decoded.partial
        ? "Uzun kayıt: dalga formu özetlendi; skorlama tam süre üzerinden sürer."
        : undefined,
    };
  } catch (decodeErr) {
    // Fallback 1: HTMLAudioElement metadata (often works when AudioContext fails on odd MP3).
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      const metaDur = await probeHtmlAudioDuration(objectUrl);
      if (metaDur && metaDur > 0) {
        return {
          durationSec: metaDur,
          sampleRate: mp3Info?.sampleRate ?? 8000,
          numberOfChannels: mp3Info?.channels ?? 1,
          peaks: syntheticPeaks(DEFAULT_PEAK_BARS, bytes.length),
          probeSource: "metadata",
          warning:
            "Tam PCM çözümü yapılamadı; süre medya meta verisinden alındı. Skorlama yine çalışır.",
        };
      }
    } catch {
      /* continue to estimate */
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }

    // Fallback 2: MP3 header bitrate estimate (8 kHz telephony friendly).
    if (mp3Info) {
      const durationSec = Math.max(
        1,
        estimateDurationFromMp3(bytes.byteLength, mp3Info)
      );
      return {
        durationSec,
        sampleRate: mp3Info.sampleRate,
        numberOfChannels: mp3Info.channels,
        peaks: syntheticPeaks(DEFAULT_PEAK_BARS, bytes.length ^ mp3Info.bitrateKbps),
        probeSource: "estimated",
        warning:
          "Ses çözümlenemedi; süre MP3 başlığından tahmin edildi (8 kHz telefon kaydı desteği). Skorlama yine çalışır.",
      };
    }

    // Last resort: keep pipeline alive with a short placeholder duration.
    return {
      durationSec: 8,
      sampleRate: 16000,
      numberOfChannels: 1,
      peaks: syntheticPeaks(DEFAULT_PEAK_BARS, bytes.length || 1),
      probeSource: "estimated",
      warning:
        decodeErr instanceof Error
          ? `Ses çözümlemesi başarısız (${decodeErr.message}). Varsayılan süre ile skorlama sürdürülür.`
          : "Ses çözümlemesi başarısız. Varsayılan süre ile skorlama sürdürülür.",
    };
  }
}

export function isAudioFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type.startsWith("audio/")) return true;
  return /\.(wav|mp3|ogg|m4a|aac|webm)$/i.test(file.name);
}
