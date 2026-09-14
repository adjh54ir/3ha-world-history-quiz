# -*- coding: utf-8 -*-
"""신규 10종: 오픈소스 실녹음 7 + 집중 소음 3(백색/분홍/갈색 — 수학적 정의 그대로 합성)
소스: github.com/Muges/ambientsounds, github.com/rafaelmardojai/blanket (라이선스는 assets/sounds/ATTRIBUTIONS.md)"""
import numpy as np
from scipy.io import wavfile
from scipy import signal
import subprocess, os

SR = 44100
M = "/tmp/snd/ambientsounds"
B = "/tmp/snd/blanket/data/resources/sounds"
TMP = "/tmp/snd/work2"
OUT = "/tmp/snd/mastered2"
os.makedirs(TMP, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

JOBS = [
    ("sound_heavyrain",  f"{M}/heavy-rain.ogg",   None, 0.090),  # 50s 원본 루프
    ("sound_forestrain", f"{M}/forest-rain.ogg",    60, 0.085),
    ("sound_storm2",     f"{M}/thunderstorm.ogg",   75, 0.090),  # 천둥 포함되게 길게
    ("sound_brook",      f"{M}/stream.ogg",         60, 0.085),
    ("sound_cafe",       f"{B}/coffee-shop.ogg",  None, 0.055),
    ("sound_train",      f"{B}/train.ogg",        None, 0.075),
    ("sound_city",       f"{B}/city.ogg",         None, 0.055),
]

def soft_limit(x, d=1.15):
    return np.tanh(x * d) / np.tanh(d)

def make_loop(x, xfade=2.0):
    nf = int(xfade * SR)
    head, body = x[:, :nf], x[:, nf:]
    w = np.linspace(0, np.pi / 2, nf)
    tail = body[:, -nf:].copy()
    body = body[:, :-nf]
    return np.concatenate([tail * np.cos(w) ** 2 + head * np.sin(w) ** 2, body], axis=1)

def finalize(name, x, rms_t):
    x = x - np.mean(x, axis=1, keepdims=True)
    x *= rms_t / (np.sqrt(np.mean(x ** 2)) + 1e-9)
    x = soft_limit(x)
    pk = np.max(np.abs(x))
    if pk > 0.92:
        x *= 0.92 / pk
    wavfile.write(f"{OUT}/{name}.wav", SR, (x.T * 32767).astype(np.int16))
    m = x.mean(axis=0)
    seam = np.concatenate([m[-int(0.15 * SR):], m[:int(0.15 * SR)]])
    print(f"{name}: {x.shape[1]/SR:.1f}s seam={np.sqrt((seam**2).mean())/np.sqrt((m**2).mean()):.2f}")

for name, src, seg, rms_t in JOBS:
    wav = f"{TMP}/{name}.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-ar", str(SR), "-ac", "2", wav], check=True)
    sr, x = wavfile.read(wav)
    x = x.astype(np.float64).T / 32767.0
    if seg is not None and x.shape[1] / SR > seg + 8:
        x = x[:, int(4 * SR):int(4 * SR) + int(seg * SR)]
        x = make_loop(x, 2.0)
    finalize(name, x, rms_t)

# ---- 집중 소음 3종 (정의 그대로 = 어떤 녹음보다 순수) ----
n = 60 * SR

def pink(nn):
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    x = signal.lfilter(b, a, rng.standard_normal(nn + SR))[SR:]
    return x / np.std(x)

def brown(nn):
    x = np.cumsum(rng.standard_normal(nn + SR))
    sos = signal.butter(2, 20, "highpass", fs=SR, output="sos")
    x = signal.sosfilt(sos, x)[SR:]
    return x / np.std(x)

sos16 = signal.butter(4, 16000, "lowpass", fs=SR, output="sos")  # 고역 자극 완화
white_st = np.vstack([signal.sosfilt(sos16, rng.standard_normal(n)), signal.sosfilt(sos16, rng.standard_normal(n))])
pink_st = np.vstack([pink(n), pink(n)])
brown_st = np.vstack([brown(n), brown(n)])

finalize("sound_whitenoise", make_loop(white_st, 1.0), 0.075)
finalize("sound_pinknoise", make_loop(pink_st, 1.0), 0.080)
finalize("sound_brownnoise", make_loop(brown_st, 1.0), 0.085)
print("done ->", OUT)
