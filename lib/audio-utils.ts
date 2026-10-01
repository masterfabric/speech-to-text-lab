/**
 * Client-side audio utilities: decode metadata, extract peaks for waveform/VAD heuristics.
 */

export type AudioFileInfo = {
  durationSec: number;
  sampleRate: number;
  numberOfChannels: number;
  peaks: Float32Array;
};

export async function decodeAudioFile(file: Blob): Promise<AudioFileInfo> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    const peaks = downsamplePeaks(channel, 400);
    return {
      durationSec: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      peaks,
    };
  } finally {
    await ctx.close().catch(() => undefined);
  }
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

export function isAudioFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type.startsWith("audio/")) return true;
  return /\.(wav|mp3|ogg|m4a|aac|webm)$/i.test(file.name);
}
