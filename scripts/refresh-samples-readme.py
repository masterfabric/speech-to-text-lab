#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
meta = json.loads((ROOT / "scripts" / "cv-samples-meta.json").read_text(encoding="utf-8"))
shorts = [m for m in meta if m.get("kind") == "short"]
longs = [m for m in meta if m.get("kind") == "long"]

def lines(items):
    out = []
    for m in items:
        n = m.get("n_clips", 1)
        dur = m.get("duration", 0)
        fname = m["file"]
        extra = f", {n} klip" if n > 1 else ""
        out.append(f"- {fname}.wav / .m4a (~{dur:.0f} sn{extra})")
    return "\n".join(out)

readme = (
    "speech-to-text-lab Common Voice Türkçe örnek sesler\n"
    "====================================================\n"
    "Bu klasörde yalnızca cv-tr-* dosya adlarıyla Common Voice Türkçe (CC-0)\n"
    "sesleri tutulur. Gerçek TÜİK ALO 124 çağrı kaydı veya kişisel veri içermez.\n"
    "Educational / lab use only.\n\n"
    f"Toplam: {len(meta)} örnek (kısa + uzun birleşik). Yalnızca Common Voice.\n\n"
    "Kısa klipler (~5–15 sn)\n"
    "-----------------------\n"
    f"{lines(shorts)}\n\n"
    "Uzun süreç demoları (birden fazla CC-0 klip birleştirildi, ~0.3 sn sessizlik)\n"
    "---------------------------------------------------------------------------\n"
    "Kaynak: Mozilla Common Voice Türkçe, HF mirror:\n"
    "cemalgndzz/turkish-granary-commonvoice\n\n"
    f"{lines(longs)}\n\n"
    "Biçim\n"
    "-----\n"
    "- WAV: PCM 16-bit LE, mono, 16 kHz (birincil)\n"
    "- M4A: AAC (tarayıcı yedek kaynağı)\n\n"
    "Yeniden üretmek:\n"
    "  npm run samples\n"
    "  python3 scripts/build-cv-long-samples.py\n"
)
(ROOT / "public" / "samples" / "README.txt").write_text(readme, encoding="utf-8")
print(f"README refreshed ({len(meta)} samples)")
