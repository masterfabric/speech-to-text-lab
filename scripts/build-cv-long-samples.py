#!/usr/bin/env python3
"""Rebuild Common Voice TR (CC-0) long demo WAVs by concatenating clips.

Source: HuggingFace cemalgndzz/turkish-granary-commonvoice
(Mozilla Common Voice Turkish, CC-0).

Uses scripts/cv-long-samples-meta.json for clip indices + combined transcripts.
Requires: pyarrow. Uses afconvert for 16 kHz mono + M4A (macOS).
"""
from __future__ import annotations

import io
import json
import subprocess
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "samples"
META_PATH_CANDIDATES = [
    Path(__file__).resolve().parent / "cv-samples-meta.json",
    Path(__file__).resolve().parent / "cv-long-samples-meta.json",
]
META_PATH = next((p for p in META_PATH_CANDIDATES if p.exists()), META_PATH_CANDIDATES[-1])
PARQUET_CANDIDATES = [
    Path("/private/tmp/cv-tr-long/train.parquet"),
    Path("/private/tmp/cv-tr/granary.parquet"),
    ROOT / ".cache" / "cv-tr" / "train.parquet",
]
SR = 16000
GAP_SEC = 0.3


def find_parquet() -> Path:
    for p in PARQUET_CANDIDATES:
        if p.exists():
            return p
    raise FileNotFoundError(
        "Parquet not found. Place train.parquet under .cache/cv-tr/ "
        "or /private/tmp/cv-tr-long/"
    )


def wav_to_pcm16_mono_16k(wav_bytes: bytes) -> bytes:
    with wave.open(io.BytesIO(wav_bytes), "rb") as w:
        if w.getnchannels() == 1 and w.getframerate() == SR and w.getsampwidth() == 2:
            return w.readframes(w.getnframes())
    OUT.mkdir(parents=True, exist_ok=True)
    tmp_in = OUT / ".tmp-cv-in.wav"
    tmp_out = OUT / ".tmp-cv-out.wav"
    tmp_in.write_bytes(wav_bytes)
    subprocess.check_call(
        [
            "afconvert",
            "-f",
            "WAVE",
            "-d",
            f"LEI16@{SR}",
            "-c",
            "1",
            str(tmp_in),
            str(tmp_out),
        ]
    )
    with wave.open(str(tmp_out), "rb") as o:
        pcm = o.readframes(o.getnframes())
    tmp_in.unlink(missing_ok=True)
    tmp_out.unlink(missing_ok=True)
    return pcm


def write_pcm16_wav(path: Path, pcm: bytes, sr: int = SR) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)


def silence_pcm(sr: int = SR, sec: float = GAP_SEC) -> bytes:
    return b"\x00\x00" * int(sr * sec)


def main() -> None:
    import pyarrow.parquet as pq

    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    table = pq.read_table(find_parquet())
    audio_col = table.column("audio")
    text_col = table.column("text")
    gap = silence_pcm()
    OUT.mkdir(parents=True, exist_ok=True)

    for item in meta:
        parts: list[bytes] = []
        texts: list[str] = []
        for i, idx in enumerate(item["indices"]):
            audio = audio_col[idx].as_py()
            wav_bytes = audio["bytes"]
            parts.append(wav_to_pcm16_mono_16k(wav_bytes))
            texts.append(str(text_col[idx].as_py()).strip())
            if i < len(item["indices"]) - 1:
                parts.append(gap)

        pcm_all = b"".join(parts)
        wav_path = OUT / f"{item['file']}.wav"
        write_pcm16_wav(wav_path, pcm_all)
        # Strip junk chunks if cleaner exists
        cleaner = ROOT / "scripts" / "clean-wav-pcm.py"
        if cleaner.exists():
            subprocess.check_call(["python3", str(cleaner), str(wav_path)])

        dur = len(pcm_all) / (SR * 2)
        print(f"→ {wav_path.name}: {dur:.3f}s ({item['n_clips']} clips)")

        m4a_path = OUT / f"{item['file']}.m4a"
        try:
            subprocess.check_call(
                [
                    "afconvert",
                    "-f",
                    "m4af",
                    "-d",
                    "aac",
                    "-c",
                    "1",
                    str(wav_path),
                    str(m4a_path),
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            print(f"  m4a ok ({m4a_path.stat().st_size} bytes)")
        except (FileNotFoundError, subprocess.CalledProcessError) as exc:
            print(f"  m4a skipped: {exc}")

        joined = " ".join(texts)
        if joined != item["text"]:
            print("  note: parquet text differs from locked meta transcript")

    print("Done. MOCK_TRANSCRIPTS in lib/constants.ts stay authoritative.")


if __name__ == "__main__":
    main()
