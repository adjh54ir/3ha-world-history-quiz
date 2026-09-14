# -*- coding: utf-8 -*-
"""호흡 가이드 큐 리마스터 — 칼림바/벨 톤 + 라이트 리버브 (기존 4파일 덮어쓰기)
sound_cue_in(들숨·상승 2음) · sound_cue_hold(멈춤·단음) · sound_cue_out(날숨·하강 2음) · sound_chime(완료 아르페지오)"""
import os, subprocess
import numpy as np
from scipy.io import wavfile

SR = 44100
OUT = "/tmp/snd3"
os.makedirs(OUT, exist_ok=True)


def kalimba(f, dur, amp=1.0, attack=0.012, decay=0.55):
    """부드러운 칼림바/벨 톤 — 배음 + 미세 디튠"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.exp(-t / decay)
    a = int(attack * SR)
    env[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2  # 소프트 어택
    y = np.sin(2 * np.pi * f * t)
    y += 0.38 * np.sin(2 * np.pi * f * 2.001 * t) * np.exp(-t / (decay * 0.5))
    y += 0.10 * np.sin(2 * np.pi * f * 3.94 * t) * np.exp(-t / (decay * 0.22))  # 살짝 비배음 반짝임
    y += 0.22 * np.sin(2 * np.pi * f * 1.003 * t)  # 디튠 초럴감
    return y * env * amp


def reverb(x, mix=0.22):
    """가벼운 슈뢰더 리버브 (콤 2 + 올패스 1)"""
    out = np.zeros(len(x) + SR)
    out[: len(x)] = x
    wet = np.zeros_like(out)
    for d, g in [(int(0.0297 * SR), 0.72), (int(0.0371 * SR), 0.68)]:
        buf = np.copy(out)
        for i in range(d, len(out)):
            buf[i] += g * buf[i - d]
        wet += buf * 0.5
    d, g = int(0.0051 * SR), 0.6
    ap = np.copy(wet)
    for i in range(d, len(ap)):
        ap[i] = -g * ap[i] + wet[i - d] + g * ap[i - d]
    return out * (1 - mix) + ap * mix * 0.35


def stereo(x, width=0.012):
    d = int(width * SR)
    r = np.roll(x, d)
    r[:d] = 0
    return np.stack([x, 0.94 * r + 0.06 * x])


def render(name, mono, peak=0.6):
    x = reverb(mono)
    # 꼬리 자연 감쇠 후 컷
    tail = np.abs(x) > 1e-4
    last = np.argwhere(tail).max() if tail.any() else len(x) - 1
    x = x[: last + int(0.05 * SR)]
    x *= peak / (np.max(np.abs(x)) + 1e-9)
    st = stereo(x)
    fade = int(0.02 * SR)
    st[:, -fade:] *= np.linspace(1, 0, fade)
    wavfile.write(f"{OUT}/{name}.wav", SR, (st.T * 32767).astype(np.int16))
    print(name, f"{st.shape[1] / SR:.2f}s")


def seq(notes):
    """[(시작초, 주파수, 길이, 세기)] → 모노 믹스"""
    end = max(t + d for t, _, d, _ in notes) + 1.2
    y = np.zeros(int(end * SR))
    for t, f, d, a in notes:
        s = kalimba(f, d, a)
        i0 = int(t * SR)
        y[i0 : i0 + len(s)] += s
    return y


G4, B4, C5, D5, E5, G5 = 392.0, 493.88, 523.25, 587.33, 659.26, 783.99

# 들숨 — 낮→높 (숨이 차오르는 느낌)
render("sound_cue_in", seq([(0.0, G4, 1.2, 0.85), (0.30, C5, 1.5, 1.0)]))
# 멈춤 — 고요한 단음
render("sound_cue_hold", seq([(0.0, B4, 1.3, 0.8)]), peak=0.5)
# 날숨 — 높→낮 (내려놓는 느낌, 여운 길게)
render("sound_cue_out", seq([(0.0, D5, 1.3, 0.9), (0.34, G4, 2.0, 1.0)]))
# 완료 차임 — 밝은 아르페지오 + 긴 여운
render("sound_chime", seq([(0.0, G4, 2.2, 0.9), (0.22, C5, 2.2, 0.95), (0.44, E5, 2.6, 1.0), (0.78, G5, 3.0, 0.7)]), peak=0.65)

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sounds")
for nm in ["sound_cue_in", "sound_cue_hold", "sound_cue_out", "sound_chime"]:
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", f"{OUT}/{nm}.wav", "-codec:a", "libmp3lame", "-b:a", "160k", f"{DEST}/{nm}.mp3"],
        check=True,
    )
print("mp3 done")
