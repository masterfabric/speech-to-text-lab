#!/usr/bin/env bash
# Common Voice Türkçe örneklerinin yerel yardımcı scripti.
# Yalnızca cv-tr-* sesleri tutulur; eski CV-dışı örnekler yeniden üretilmez.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/samples"
mkdir -p "$OUT"

shopt -s nullglob
for audio in "$OUT"/*.wav "$OUT"/*.m4a; do
  name="$(basename "$audio")"
  case "$name" in
    cv-tr-*) ;;
    *)
      echo "  removing legacy sample: $name"
      rm -f "$audio"
      ;;
  esac
done

if command -v afconvert >/dev/null 2>&1; then
  echo "==> Common Voice M4A (AAC) fallbacks"
  for wav in "$OUT"/cv-tr-*.wav; do
    [[ -f "$wav" ]] || continue
    base="$(basename "$wav" .wav)"
    afconvert -f m4af -d aac -c 1 "$wav" "$OUT/${base}.m4a" 2>/dev/null || true
  done
else
  echo "==> afconvert not found; keeping existing Common Voice M4A files"
fi

# Refresh README from scripts/cv-samples-meta.json when present
if [[ -f "$ROOT/scripts/cv-samples-meta.json" ]]; then
  python3 "$ROOT/scripts/refresh-samples-readme.py" || true
fi

echo "==> Common Voice örnekleri hazır ($(ls -1 "$OUT"/cv-tr-*.wav 2>/dev/null | wc -l | tr -d " ") wav):"
ls -la "$OUT"/cv-tr-* 2>/dev/null || true
