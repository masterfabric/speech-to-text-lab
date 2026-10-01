#!/usr/bin/env python3
"""Rewrite WAV as canonical PCM (strip FLLR/LIST) for HTML5/WebAudio."""
import struct
import sys
from pathlib import Path

def clean(path: Path) -> None:
    data = path.read_bytes()
    if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise SystemExit(f"not a WAV: {path}")
    i = 12
    fmt = pcm = None
    while i + 8 <= len(data):
        cid = data[i : i + 4]
        size = struct.unpack_from("<I", data, i + 4)[0]
        payload = data[i + 8 : i + 8 + size]
        if cid == b"fmt ":
            fmt = payload[:16]
        elif cid == b"data":
            pcm = payload
            break
        i = i + 8 + size + (size & 1)
    if not fmt or pcm is None:
        raise SystemExit(f"missing fmt/data: {path}")
    riff_size = 4 + (8 + 16) + (8 + len(pcm))
    out = (
        b"RIFF"
        + struct.pack("<I", riff_size)
        + b"WAVE"
        + b"fmt "
        + struct.pack("<I", 16)
        + fmt
        + b"data"
        + struct.pack("<I", len(pcm))
        + pcm
    )
    path.write_bytes(out)

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        clean(Path(arg))
        print(f"cleaned {arg}")
