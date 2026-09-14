# -*- coding: utf-8 -*-
"""UI 효과음 — 나무 물주기(sound_waterpour): 짧은 물 붓기 + 물방울"""
import os, subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(7)

def bpf(x, lo, hi, order=4):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, x)

n = int(0.85 * SR)
t = np.arange(n) / SR
# 물 붓는 스플래시 — 밝은 노이즈가 빠르게 잦아듦
env = np.exp(-t / 0.18) * np.sin(np.linspace(0.25, np.pi, n)) ** 0.5
pour = bpf(rng.standard_normal(n), 600, 5200) * env * 0.9
# 통통 물방울 두 개 (하강 스윕)
for t0, f0 in [(0.42, 760), (0.58, 620)]:
    ln = int(0.05 * SR)
    tt = np.arange(ln) / SR
    p = np.sin(2 * np.pi * (f0 - 260 * tt / 0.05) * tt) * np.exp(-tt / 0.018) * 0.8
    i0 = int(t0 * SR)
    pour[i0:i0 + ln] += p
pour *= 0.55 / (np.max(np.abs(pour)) + 1e-9)
st = np.stack([pour, np.roll(pour, int(0.008 * SR)) * 0.9 + pour * 0.1])
fade = int(0.03 * SR)
st[:, -fade:] *= np.linspace(1, 0, fade)
wavfile.write("/tmp/snd4/sound_waterpour.wav", SR, (st.T * 32767).astype(np.int16))

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sounds")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", "/tmp/snd4/sound_waterpour.wav",
                "-codec:a", "libmp3lame", "-b:a", "128k", f"{DEST}/sound_waterpour.mp3"], check=True)
print("sound_waterpour.mp3 done")
