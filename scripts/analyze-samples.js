#!/usr/bin/env node
/**
 * Örnek WAV dosyalarının metadata / basit özellik özetini üretir.
 * Gerçek ASR çağırmaz — lab demoları için dosya envanteri.
 */
const fs = require("fs");
const path = require("path");

const samplesDir = path.join(__dirname, "..", "public", "samples");

function readWavMeta(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    return { error: "RIFF/WAVE değil" };
  }
  // Minimal fmt chunk parse
  let offset = 12;
  let audioFormat = null;
  let numChannels = null;
  let sampleRate = null;
  let bitsPerSample = null;
  let dataSize = null;

  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (id === "fmt ") {
      audioFormat = buf.readUInt16LE(chunkStart);
      numChannels = buf.readUInt16LE(chunkStart + 2);
      sampleRate = buf.readUInt32LE(chunkStart + 4);
      bitsPerSample = buf.readUInt16LE(chunkStart + 14);
    } else if (id === "data") {
      dataSize = size;
      break;
    }
    offset = chunkStart + size + (size % 2);
  }

  const bytesPerSample = ((bitsPerSample || 16) / 8) * (numChannels || 1);
  const durationSec =
    dataSize && bytesPerSample && sampleRate
      ? dataSize / (sampleRate * bytesPerSample)
      : null;

  return {
    audioFormat,
    numChannels,
    sampleRate,
    bitsPerSample,
    dataSize,
    durationSec: durationSec ? Number(durationSec.toFixed(3)) : null,
    fileSizeBytes: buf.length,
  };
}

function main() {
  if (!fs.existsSync(samplesDir)) {
    console.error("public/samples bulunamadı. Önce: npm run samples");
    process.exit(1);
  }

  const files = fs
    .readdirSync(samplesDir)
    .filter((f) => f.endsWith(".wav") || f.endsWith(".mp3"))
    .sort();

  if (files.length === 0) {
    console.error("Örnek ses yok. npm run samples çalıştırın.");
    process.exit(1);
  }

  const report = files.map((file) => {
    const full = path.join(samplesDir, file);
    const meta = file.endsWith(".wav")
      ? readWavMeta(full)
      : { note: "MP3 — ham metadata atlandı", fileSizeBytes: fs.statSync(full).size };
    return { file, ...meta };
  });

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), samples: report }, null, 2));
}

main();
