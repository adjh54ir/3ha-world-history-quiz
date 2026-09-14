# -*- coding: utf-8 -*-
"""
오픈소스 실녹음(Blanket / Muges ambientsounds) → 3HA 앰비언트 마스터링
- 긴 소스: 중간 60초 발췌 + 2초 등파워 크로스페이드로 심리스 루프화
- 이미 루프인 짧은 소스: 원본 루프 유지 (재크로스페이드 금지)
- 전체 RMS 통일 + 소프트리밋 피크 보호
"""
import numpy as np
from scipy.io import wavfile
import subprocess, os

SR = 44100
SRC_BLANKET = "/tmp/snd/blanket/data/resources/sounds"
SRC_MUGES = "/tmp/snd/ambientsounds"
TMP = "/tmp/snd/work"
OUT = "/tmp/snd/mastered"
os.makedirs(TMP, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# (출력명, 소스경로, 발췌초(None=전체 사용·원본 루프 유지), RMS 타겟)
JOBS = [
    ("sound_rain",       f"{SRC_BLANKET}/rain.ogg",         60, 0.085),
    ("sound_thunder",    f"{SRC_BLANKET}/storm.ogg",      None, 0.085),
    ("sound_stream",     f"{SRC_BLANKET}/stream.ogg",       60, 0.085),
    ("sound_waves",      f"{SRC_BLANKET}/waves.ogg",        60, 0.090),
    ("sound_sparrow",    f"{SRC_BLANKET}/birds.ogg",        60, 0.050),
    ("sound_crickets",   f"{SRC_BLANKET}/summer-night.ogg", None, 0.055),
    ("sound_lake",       f"{SRC_BLANKET}/boat.ogg",       None, 0.065),
    ("sound_winterwind", f"{SRC_BLANKET}/wind.ogg",       None, 0.080),
    ("sound_forest",     f"{SRC_MUGES}/wind.ogg",           60, 0.085),
    ("sound_campfire",   f"{SRC_MUGES}/fireplace.ogg",      60, 0.085),
]

def soft_limit(x, drive=1.15):
    return np.tanh(x * drive) / np.tanh(drive)

def make_loop(x, xfade=2.0):
    nf = int(xfade * SR)
    head = x[:, :nf]
    body = x[:, nf:]
    w = np.linspace(0, np.pi / 2, nf)
    fin, fout = np.sin(w) ** 2, np.cos(w) ** 2
    tail = body[:, -nf:].copy()
    body = body[:, :-nf]
    return np.concatenate([tail * fout + head * fin, body], axis=1)

for name, src, seg, rms_t in JOBS:
    wav = f"{TMP}/{name}.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-ar", str(SR), "-ac", "2", wav], check=True)
    sr, x = wavfile.read(wav)
    x = x.astype(np.float64).T / 32767.0
    dur = x.shape[1] / SR

    if seg is not None and dur > seg + 8:
        # 첫 4초(페이드인 가능성)를 피해 중간에서 발췌 후 심리스 루프화
        start = int(4 * SR)
        x = x[:, start:start + int(seg * SR)]
        x = make_loop(x, 2.0)

    # RMS 정규화 + 피크 보호 (앱 내 14종 체감 음량 통일)
    x = x - np.mean(x, axis=1, keepdims=True)
    cur = np.sqrt(np.mean(x ** 2))
    x = x * (rms_t / (cur + 1e-9))
    x = soft_limit(x)
    pk = np.max(np.abs(x))
    if pk > 0.92:
        x = x * (0.92 / pk)

    out_wav = f"{OUT}/{name}.wav"
    wavfile.write(out_wav, SR, (x.T * 32767).astype(np.int16))
    # 이음새 검증
    m = x.mean(axis=0)
    seam = np.concatenate([m[-int(0.15 * SR):], m[:int(0.15 * SR)]])
    ratio = np.sqrt((seam ** 2).mean()) / np.sqrt((m ** 2).mean())
    print(f"{name}: {x.shape[1]/SR:.1f}s rms={np.sqrt((x**2).mean()):.3f} seam={ratio:.2f}")

print("done ->", OUT)
