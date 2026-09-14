# -*- coding: utf-8 -*-
"""batch4 — 신규 100종 전량 프로시저럴 합성 (라이선스 제약 없음).
사용: python3 make_batch4.py [키...]   (생략 시 전체 100종)
      python3 make_batch4.py --list    (키 목록)
카탈로그: src/const/ConstMindSounds.ts · 문서: assets/sounds/ATTRIBUTIONS.md"""
import sys, os
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
OUT = "/tmp/snd4"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(44)

# ============================ 공통 유틸 ============================
def nz(n, ch=2):
    return rng.standard_normal((ch, n))

def bpf(x, lo, hi, order=4):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, x, axis=-1)

def lpf(x, fc, order=4):
    b, a = signal.butter(order, fc / (SR / 2), "low")
    return signal.lfilter(b, a, x, axis=-1)

def hpf(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x, axis=-1)

def sine(n, hz, ph=0.0):
    return np.sin(2 * np.pi * hz * np.arange(n) / SR + ph)

def swell(n, depth, base=1.0, k=3):
    """루프 안전한 느린 스웰 (정수 주기 사인 합)"""
    t = np.arange(n) / n
    e = np.zeros(n)
    for i in range(1, k + 1):
        e += rng.uniform(0.4, 1.0) * np.sin(2 * np.pi * i * t + rng.uniform(0, 6.28)) / i
    e /= np.max(np.abs(e)) + 1e-9
    return base + depth * e

def slowctrl(n, dur, hz, lo=0.0, hi=1.0):
    """~hz 랜덤 컨트롤 곡선 (보간, 루프 랩)"""
    m = max(4, int(dur * hz))
    c = rng.standard_normal(m + 1)
    c[-1] = c[0]
    v = np.interp(np.linspace(0, m, n), np.arange(m + 1), c)
    v = (v - v.min()) / (v.max() - v.min() + 1e-9)
    return lo + (hi - lo) * v

def events(dur, rate):
    ts, t = [], 0.0
    while True:
        t += rng.exponential(1.0 / max(rate, 1e-6))
        if t >= dur:
            break
        ts.append(t)
    return ts

def place(canvas, snd, t, gain=1.0, pan=0.0):
    n = canvas.shape[1]
    i0 = int(t * SR) % n
    gl, gr = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    idx = (np.arange(len(snd)) + i0) % n
    canvas[0, idx] += snd * gain * gl
    canvas[1, idx] += snd * gain * gr

def tone(f, dur, decay, h=None, attack=0.004):
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.exp(-t / decay)
    a = max(1, int(attack * SR))
    env[:a] *= np.linspace(0, 1, a)
    y = np.sin(2 * np.pi * f * t)
    for m, amp in h or []:
        y += amp * np.sin(2 * np.pi * f * m * t)
    return y * env

def burst(dur, lo, hi, decay=None, shape="exp"):
    n = int(dur * SR)
    x = bpf(nz(n, 1)[0], lo, hi)
    if shape == "exp":
        x *= np.exp(-np.arange(n) / ((decay or dur * 0.3) * SR))
    else:
        x *= np.sin(np.linspace(0, np.pi, n)) ** 1.2
    return x

def rev(x, mix=0.25, decay=0.75):
    """가벼운 슈뢰더 리버브 (lfilter 콤 3 + 올패스 1)"""
    wet = np.zeros_like(x)
    for d, g in [(0.0297, decay), (0.0371, decay * 0.95), (0.0411, decay * 0.9)]:
        dd = int(d * SR)
        wet += signal.lfilter([1.0], [1.0] + [0.0] * (dd - 1) + [-g], x, axis=-1)
    wet /= 3.0
    dd, g = int(0.0051 * SR), 0.6
    b = [-g] + [0.0] * (dd - 1) + [1.0]
    a = [1.0] + [0.0] * (dd - 1) + [-g]
    wet = signal.lfilter(b, a, wet, axis=-1)
    return x * (1 - mix) + wet * mix

def stx(mono, width=0.011):
    """모노 → 디코릴레이트 스테레오"""
    d = int(width * SR)
    r = np.roll(mono, d)
    return np.stack([mono, 0.93 * r + 0.07 * mono])

def make_loop(x, xfade=1.6):
    nf = int(xfade * SR)
    head, body = x[:, :nf], x[:, nf:]
    w = np.linspace(0, np.pi / 2, nf)
    tail = body[:, -nf:].copy()
    body = body[:, :-nf]
    return np.concatenate([tail * np.cos(w) ** 2 + head * np.sin(w) ** 2, body], axis=1)

def finalize(name, x, rms_t, xfade=1.6):
    if xfade:
        x = make_loop(x, xfade)
    x = x - np.mean(x, axis=1, keepdims=True)
    x *= rms_t / (np.sqrt(np.mean(x ** 2)) + 1e-9)
    x = np.tanh(x * 1.15) / np.tanh(1.15)
    pk = np.max(np.abs(x))
    if pk > 0.92:
        x *= 0.92 / pk
    wavfile.write(f"{OUT}/sound_{name}.wav", SR, (x.T * 32767).astype(np.int16))
    print(f"sound_{name}: {x.shape[1] / SR:.1f}s")

# ============================ 텍스처 빌더 ============================
def rain_bed(n, lo=300, hi=2200, muf=1600, g=1.0):
    return lpf(bpf(nz(n), lo, hi), muf) * g * swell(n, 0.1)

def drops(dur, rate, kind="plip", fr=(400, 900), g=(0.3, 0.7), pan=0.6):
    n = int(dur * SR)
    out = np.zeros((2, n))
    for t in events(dur, rate):
        if kind == "plip":  # 물방울 (하강 스윕)
            f0 = rng.uniform(*fr)
            ln = int(rng.uniform(0.02, 0.05) * SR)
            tt = np.arange(ln) / SR
            s = np.sin(2 * np.pi * (f0 - 0.35 * f0 * tt / (ln / SR)) * tt) * np.exp(-tt / 0.015)
        elif kind == "thump":  # 둔탁한 방울
            s = tone(rng.uniform(*fr), 0.03, 0.008)
        elif kind == "ping":  # 금속성 핑
            f = rng.uniform(*fr)
            s = tone(f, 0.09, 0.02, [(2.76, 0.4)])
        else:  # tick — 유리/가벼운 톡
            s = burst(0.012, fr[0], fr[1], 0.0025)
        place(out, s, t, rng.uniform(*g), rng.uniform(-pan, pan))
    return out

def wind_bed(n, dur, lo=150, hi=700, gust=0.4, g=1.0):
    w = bpf(nz(n), lo, hi) * (slowctrl(n, dur, 0.12, 1 - gust, 1.0)) * swell(n, 0.15)
    return w * g

def whistle(n, dur, f=900, g=0.05):
    fmod = slowctrl(n, dur, 0.08, 0.92, 1.08)
    ph = np.cumsum(2 * np.pi * f * fmod / SR)
    return stx(np.sin(ph) * slowctrl(n, dur, 0.1, 0.1, 1.0) * g)

def flow_bed(n, lo=250, hi=2400, g=1.0):
    return (bpf(nz(n), lo, hi) * swell(n, 0.08) + lpf(nz(n), 180) * 0.8) * g

def surf(n, dur, period=11.0, dark=0.0):
    t = np.arange(n) / SR
    cyc = 0.5 + 0.5 * np.sin(2 * np.pi * t / period - 1.4)
    crest = np.clip(cyc, 0, 1) ** 2.2
    hiss = bpf(nz(n), 400, 5000 - dark * 3200) * (0.15 + 0.85 * crest)
    body = lpf(nz(n), 250) * (0.6 + 0.6 * cyc)
    return hiss + body * 1.4

def crackle(dur, rate=14, fr=(1200, 5200), g=(0.2, 0.8)):
    n = int(dur * SR)
    out = np.zeros((2, n))
    for t in events(dur, rate):
        s = burst(rng.uniform(0.004, 0.014), fr[0], fr[1], 0.002)
        place(out, s, t, rng.uniform(*g), rng.uniform(-0.5, 0.5))
    return out

def chirp(f0, f1, dur, vib=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 + (f1 - f0) * t / dur + vib * np.sin(2 * np.pi * 28 * t)
    y = np.sin(np.cumsum(2 * np.pi * f / SR))
    return y * np.sin(np.linspace(0, np.pi, n)) ** 1.3

def birds(dur, density=0.25, band=(1800, 4200), far=False, pan=0.8):
    n = int(dur * SR)
    out = np.zeros((2, n))
    for t in events(dur, density):
        p = rng.uniform(-pan, pan)
        f0 = rng.uniform(*band)
        for k in range(rng.integers(2, 6)):
            c = chirp(f0 * rng.uniform(0.92, 1.1), f0 * rng.uniform(0.85, 1.15), rng.uniform(0.05, 0.16), vib=rng.uniform(0, 60))
            place(out, c, t + k * rng.uniform(0.09, 0.2), rng.uniform(0.15, 0.4), p)
    if far:
        out = lpf(out, 2800) * 0.7
        out = rev(out, 0.3)
    return out

def cricket_bed(dur, rate=1.4, f=(4200, 5200), slow=1.0, g=0.25):
    n = int(dur * SR)
    out = np.zeros((2, n))
    for t in events(dur, rate):
        f0 = rng.uniform(*f)
        m = rng.integers(3, 7)
        for k in range(m):
            s = sine(int(0.03 * SR), f0) * np.sin(np.linspace(0, np.pi, int(0.03 * SR))) ** 2
            place(out, s, t + k * 0.06 * slow, g * rng.uniform(0.6, 1.0), rng.uniform(-0.7, 0.7))
    return out

def bell(f, dur=6.0, inharm=True, amp=1.0):
    parts = [(1.0, 1.0), (2.76 if inharm else 2.0, 0.45), (5.4 if inharm else 3.0, 0.18), (1.005, 0.4)]
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for m, a in parts:
        y += a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (dur * 0.35 / max(1.0, m * 0.6)))
    a = int(0.006 * SR)
    y[:a] *= np.linspace(0, 1, a)
    return y * amp

def hum(n, freqs):
    y = np.zeros(n)
    for f, a in freqs:
        y += a * sine(n, f, rng.uniform(0, 6.28))
    return stx(y)

def brown(n, fc=400, g=3.0):
    b = np.cumsum(nz(n), axis=1)
    b /= np.max(np.abs(b)) + 1e-9
    return lpf(b * g, fc)

def creak(f0=170, dur=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (1 - 0.35 * t / dur)
    y = np.sin(np.cumsum(2 * np.pi * f / SR)) * (0.6 + 0.4 * np.sin(2 * np.pi * 33 * t))
    y += bpf(nz(n, 1)[0], f0 * 3, f0 * 9) * 0.25
    return y * np.sin(np.linspace(0, np.pi, n)) ** 0.8

# ============================ 100종 스펙 ============================
D = 40.0  # 기본 길이

def _rain(kind):
    n = int(D * SR)
    if kind == "windowrain":
        x = rain_bed(n, 350, 2600, 2600, 0.9) + drops(D, 9, "tick", (2200, 5200), (0.15, 0.4)) + lpf(nz(n), 300) * 0.5
    elif kind == "drizzle":
        x = rain_bed(n, 500, 3200, 3000, 0.45) + drops(D, 4, "tick", (1500, 3500), (0.1, 0.25)) + wind_bed(n, D, 120, 500, 0.3, 0.5)
    elif kind == "sunshower":
        x = rain_bed(n, 450, 3000, 2800, 0.6) + drops(D, 6, "plip", (500, 1000), (0.2, 0.45)) + birds(D, 0.12, far=True) * 0.8
    elif kind == "nightrain":
        x = rain_bed(n, 280, 1800, 1200, 1.0) + lpf(nz(n), 220) * 0.7 + drops(D, 4, "plip", (350, 700), (0.15, 0.4))
    elif kind == "eaves":
        bed = rain_bed(n, 300, 2000, 1500, 0.5)
        dr = np.zeros((2, n))
        t = 0.0
        while t < D:
            place(dr, tone(rng.uniform(500, 750), 0.04, 0.012), t, rng.uniform(0.5, 0.9), rng.uniform(-0.25, 0.25))
            t += rng.uniform(0.5, 1.1)
        x = bed + dr * 1.6
    elif kind == "carrain":
        x = lpf(rain_bed(n, 250, 1600, 700, 1.2), 800) + drops(D, 7, "thump", (110, 190), (0.3, 0.6)) + brown(n, 200, 1.6) * 0.5
    elif kind == "tinroof":
        x = rain_bed(n, 400, 2600, 2400, 0.7) + drops(D, 14, "ping", (1100, 2400), (0.12, 0.35)) + drops(D, 5, "thump", (200, 340), (0.2, 0.4))
    elif kind == "leafrain":
        fl = slowctrl(n, D, 6, 0.6, 1.0)
        x = bpf(nz(n), 600, 3600) * fl * 0.8 + drops(D, 8, "plip", (600, 1200), (0.15, 0.4)) + wind_bed(n, D, 150, 600, 0.3, 0.4)
    elif kind == "puddles":
        x = rain_bed(n, 350, 2200, 1800, 0.5) + drops(D, 11, "plip", (400, 1100), (0.3, 0.7)) * 1.3
    elif kind == "distantthunder":
        bed = lpf(nz(n), 350) * 0.8 + cricket_bed(D, 0.5, slow=1.3, g=0.12)
        th = np.zeros((2, n))
        for t in events(D, 1 / 14):
            ln = int(rng.uniform(3.5, 6.0) * SR)
            r = lpf(nz(ln), 90) * np.exp(-np.arange(ln) / (1.6 * SR)) * np.sin(np.linspace(0.15, np.pi, ln)) ** 0.6
            place(th, r[0], t, rng.uniform(0.8, 1.3), rng.uniform(-0.5, 0.5))
            place(th, r[1], t + 0.01, rng.uniform(0.8, 1.3), rng.uniform(-0.5, 0.5))
        x = bed + th * 2.2
    elif kind == "afterrain":
        dr = drops(D, 1.6, "plip", (450, 900), (0.3, 0.6))
        x = lpf(nz(n), 500) * 0.5 + dr * 1.5 + birds(D, 0.2, far=True) + hpf(nz(n), 4000) * 0.03
    else:  # monsoon
        x = rain_bed(n, 250, 2400, 1900, 1.3) + lpf(nz(n), 150) * 0.9 + drops(D, 9, "plip", (350, 800), (0.2, 0.5))
    return x

def _water(kind):
    n = int(D * SR)
    if kind == "nightsea":
        x = surf(n, D, 13.5, dark=0.8) * 0.9 + lpf(nz(n), 160) * 0.6
    elif kind == "pebblebeach":
        t_ = np.arange(n) / SR
        crest = np.clip(np.sin(2 * np.pi * t_ / 10 - 1.2), 0, 1) ** 2
        rattle = np.zeros((2, n))
        for t in events(D, 26):
            i = int(t * SR) % n
            g = crest[i]
            if g > 0.15:
                place(rattle, burst(rng.uniform(0.01, 0.03), 900, 3800, 0.006), t, g * rng.uniform(0.3, 0.7), rng.uniform(-0.6, 0.6))
        x = surf(n, D, 10.0) * 0.8 + rattle * 1.6
    elif kind == "rivershore":
        x = flow_bed(n, 200, 1400, 0.9) + drops(D, 3, "plip", (300, 600), (0.15, 0.35)) + wind_bed(n, D, 150, 500, 0.3, 0.3)
    elif kind == "fountain":
        x = bpf(nz(n), 700, 6000) * 0.7 * swell(n, 0.06) + flow_bed(n, 300, 1200, 0.5) + drops(D, 18, "plip", (500, 1400), (0.15, 0.4))
    elif kind == "underwater":
        wob = slowctrl(n, D, 0.15, 0.6, 1.0)
        x = brown(n, 380, 2.6) * wob + drops(D, 1.2, "plip", (150, 320), (0.2, 0.45)) * 0.8
        x = lpf(x, 500)
    elif kind == "hotspring":
        x = drops(D, 5, "plip", (200, 480), (0.3, 0.6)) * 1.4 + bpf(nz(n), 2000, 7000) * 0.12 + flow_bed(n, 200, 900, 0.45)
    elif kind == "harbor":
        gull = np.zeros((2, n))
        for t in events(D, 1 / 9):
            c = chirp(rng.uniform(1300, 1600), rng.uniform(800, 1000), rng.uniform(0.4, 0.7), vib=40)
            place(gull, lpf(stx(c), 3000)[0] * 0.5, t, 0.35, rng.uniform(-0.7, 0.7))
        lap = drops(D, 2.2, "plip", (250, 520), (0.3, 0.6))
        cr = np.zeros((2, n))
        for t in events(D, 1 / 6):
            place(cr, creak(150, rng.uniform(0.4, 0.8)), t, rng.uniform(0.15, 0.3), rng.uniform(-0.4, 0.4))
        x = surf(n, D, 12, dark=0.5) * 0.5 + lap * 1.3 + gull + cr
    elif kind == "rapids":
        x = bpf(nz(n), 300, 4500) * swell(n, 0.1) * 1.1 + lpf(nz(n), 200) * 1.2 + drops(D, 8, "plip", (250, 600), (0.2, 0.5))
    elif kind == "springmelt":
        x = bpf(nz(n), 500, 3600) * 0.65 * swell(n, 0.1) + drops(D, 6, "plip", (500, 1100), (0.25, 0.5)) + wind_bed(n, D, 130, 450, 0.3, 0.3)
    elif kind == "marsh":
        x = drops(D, 1.6, "plip", (300, 700), (0.2, 0.5)) + bpf(nz(n), 600, 2600) * 0.2 * slowctrl(n, D, 3, 0.5, 1.0) + cricket_bed(D, 0.7, g=0.14) + lpf(nz(n), 300) * 0.4
    elif kind == "rowboat":
        cyc = 3.2
        out = np.zeros((2, n))
        for i in range(int(D / cyc)):
            t0 = i * cyc
            place(out, creak(180, 0.35), t0, 0.5, -0.2)
            place(out, burst(0.4, 300, 1600, shape="sin"), t0 + 0.5, 0.55, 0.2)
            place(out, tone(rng.uniform(180, 240), 0.05, 0.015), t0 + 0.52, 0.3, 0.2)
        x = out * 1.6 + flow_bed(n, 200, 900, 0.4) + wind_bed(n, D, 140, 500, 0.3, 0.25)
    else:  # seacave
        s = lpf(surf(n, D, 12.5, dark=0.7), 900)
        s = rev(s, 0.4, 0.85)
        x = s + drops(D, 2.5, "plip", (350, 800), (0.3, 0.6)) * rev(np.ones((2, 1)), 0)[0][0]  # noqa — 단순 배치
        x = s + rev(drops(D, 2.5, "plip", (350, 800), (0.3, 0.6)), 0.45, 0.85)
    return x

def _field(kind):
    n = int(D * SR)
    if kind == "bamboo":
        kn = np.zeros((2, n))
        for t in events(D, 0.5):
            f = rng.choice([392, 460, 520])
            place(kn, tone(f, 0.12, 0.03, [(2.0, 0.3)]), t, rng.uniform(0.25, 0.5), rng.uniform(-0.5, 0.5))
        x = bpf(nz(n), 700, 3200) * slowctrl(n, D, 5, 0.4, 1.0) * 0.7 + wind_bed(n, D, 160, 600, 0.4, 0.5) + kn
    elif kind == "morningforest":
        x = birds(D, 0.5, (1600, 4400)) * 1.1 + wind_bed(n, D, 140, 550, 0.25, 0.4) + drops(D, 0.8, "plip", (500, 900), (0.1, 0.25))
    elif kind == "pinewind":
        x = wind_bed(n, D, 180, 900, 0.4, 0.9) + whistle(n, D, 1100, 0.03) + bpf(nz(n), 1200, 3200) * 0.15 * slowctrl(n, D, 4, 0.4, 1.0)
    elif kind == "meadow":
        bee = np.zeros((2, n))
        for t in events(D, 1 / 11):
            ln = int(rng.uniform(1.5, 3.0) * SR)
            tt = np.arange(ln) / SR
            b = np.sin(np.cumsum(2 * np.pi * (190 + 30 * np.sin(2 * np.pi * 0.7 * tt)) / SR)) * np.sin(np.linspace(0, np.pi, ln)) ** 1.5
            b *= 0.5 + 0.5 * np.clip(np.sin(2 * np.pi * 110 * tt), 0, 1)
            place(bee, b, t, 0.18, rng.uniform(-0.7, 0.7))
        x = cricket_bed(D, 1.0, (3800, 4800), g=0.16) + wind_bed(n, D, 150, 600, 0.3, 0.45) + birds(D, 0.15, far=True) + bee
    elif kind == "wheatfield":
        x = bpf(nz(n), 400, 2200) * slowctrl(n, D, 0.5, 0.4, 1.0) * 0.8 + wind_bed(n, D, 130, 500, 0.5, 0.7)
    elif kind == "mountaintop":
        x = wind_bed(n, D, 120, 1200, 0.55, 1.1) + whistle(n, D, 800, 0.045) + bpf(nz(n), 2000, 6000) * 0.1
    elif kind == "fallenleaves":
        out = np.zeros((2, n))
        step = 0.72
        for i in range(int(D / step)):
            t0 = i * step + rng.uniform(-0.04, 0.04)
            ln = int(rng.uniform(0.18, 0.3) * SR)
            cr = bpf(nz(ln, 1)[0], 900, 4200) * np.sin(np.linspace(0, np.pi, ln)) ** 1.4
            for tt in events(ln / SR, 90):
                j = int(tt * SR)
                if j < ln - 80:
                    cr[j : j + 80] += bpf(nz(80, 1)[0], 1500, 5200) * 1.6 * np.exp(-np.arange(80) / 30)
            place(out, cr, t0, rng.uniform(0.5, 0.75), 0.3 if i % 2 else -0.3)
        x = out * 1.5 + wind_bed(n, D, 140, 550, 0.35, 0.4) + birds(D, 0.08, far=True)
    elif kind == "treecreak":
        cr = np.zeros((2, n))
        for t in events(D, 1 / 5):
            place(cr, creak(rng.uniform(110, 170), rng.uniform(0.6, 1.4)), t, rng.uniform(0.3, 0.55), rng.uniform(-0.4, 0.4))
        x = wind_bed(n, D, 130, 600, 0.45, 0.8) + cr * 1.4
    elif kind == "farbirds":
        x = birds(D, 0.35, (1400, 3600), far=True) * 1.3 + wind_bed(n, D, 130, 500, 0.3, 0.5)
    elif kind == "junglefar":
        x = lpf(birds(D, 0.7, (1200, 3800)), 2400) * 0.8 + cricket_bed(D, 1.6, (3000, 4200), g=0.12) + lpf(nz(n), 600) * 0.5 + drops(D, 2, "plip", (400, 800), (0.1, 0.25))
        x = rev(x, 0.3)
    elif kind == "creekside":
        x = bpf(nz(n), 800, 4000) * 0.3 * swell(n, 0.1) + drops(D, 4.5, "plip", (600, 1400), (0.3, 0.6)) * 1.4 + birds(D, 0.1, far=True)
    else:  # autumnwind
        sk = np.zeros((2, n))
        for t in events(D, 0.9):
            ln = int(rng.uniform(0.2, 0.5) * SR)
            s = bpf(nz(ln, 1)[0], 1200, 5200) * np.sin(np.linspace(0, np.pi, ln)) ** 2 * slowctrl(ln, ln / SR, 12, 0.3, 1.0)
            place(sk, s, t, rng.uniform(0.25, 0.5), rng.uniform(-0.7, 0.7))
        x = wind_bed(n, D, 140, 700, 0.5, 0.9) + sk
    return x

def _night(kind):
    n = int(D * SR)
    if kind == "frogs":
        out = np.zeros((2, n))
        for t in events(D, 2.2):
            f0 = rng.uniform(95, 150)
            ln = int(rng.uniform(0.18, 0.35) * SR)
            tt = np.arange(ln) / SR
            c = np.sin(2 * np.pi * f0 * tt) * (0.5 + 0.5 * np.clip(np.sin(2 * np.pi * 24 * tt), 0, 1))
            c = np.tanh(c * 2.2) * np.sin(np.linspace(0, np.pi, ln)) ** 0.8
            place(out, c, t, rng.uniform(0.3, 0.6), rng.uniform(-0.8, 0.8))
        x = out * 1.4 + cricket_bed(D, 0.8, g=0.14) + lpf(nz(n), 300) * 0.5
    elif kind == "owlnight":
        out = np.zeros((2, n))
        for t in events(D, 1 / 9):
            for k, (dur_, gap) in enumerate([(0.45, 0.0), (0.6, 0.65)]):
                ln = int(dur_ * SR)
                tt = np.arange(ln) / SR
                h = np.sin(2 * np.pi * (335 - 25 * tt / dur_) * tt + 3 * np.sin(2 * np.pi * 5.5 * tt))
                h = lpf(stx(h * np.sin(np.linspace(0, np.pi, ln)) ** 1.6), 700)
                place(out, h[0] * 0.5, t + gap, 0.5, -0.15)
                place(out, h[1] * 0.5, t + gap, 0.5, 0.15)
        x = out * 1.2 + wind_bed(n, D, 120, 450, 0.3, 0.5) + cricket_bed(D, 0.3, slow=1.4, g=0.08)
    elif kind == "autumnnight":
        x = cricket_bed(D, 0.55, (3400, 4400), slow=1.5, g=0.2) + wind_bed(n, D, 130, 500, 0.35, 0.55) + lpf(nz(n), 250) * 0.4
    elif kind == "firstsnow":
        x = lpf(nz(n), 300, 5) * 1.4 + wind_bed(n, D, 100, 380, 0.3, 0.4) + hpf(nz(n), 6000) * 0.015
    elif kind == "blizzard":
        x = wind_bed(n, D, 100, 1400, 0.6, 1.3) + whistle(n, D, 700, 0.06) + bpf(nz(n), 2500, 8000) * 0.12 * slowctrl(n, D, 0.3, 0.5, 1.0)
    elif kind == "springnight":
        fr = np.zeros((2, n))
        for t in events(D, 0.4):
            f0 = rng.uniform(100, 140)
            ln = int(0.22 * SR)
            tt = np.arange(ln) / SR
            c = np.sin(2 * np.pi * f0 * tt) * (0.5 + 0.5 * np.clip(np.sin(2 * np.pi * 22 * tt), 0, 1))
            place(fr, lpf(stx(np.tanh(c * 2) * np.sin(np.linspace(0, np.pi, ln))), 500)[0], t, 0.2, rng.uniform(-0.6, 0.6))
        x = cricket_bed(D, 0.5, g=0.12) + fr + wind_bed(n, D, 120, 420, 0.25, 0.45) + lpf(nz(n), 280) * 0.4
    elif kind == "summerdusk":
        n_ = n
        cic = bpf(nz(n_, 1)[0], 3700, 4500) * (1 + np.clip(sine(n_, 115), 0, 1)) / 2 * slowctrl(n_, D, 0.08, 0.1, 0.7)
        x = stx(cic * 0.5) + wind_bed(n, D, 140, 520, 0.3, 0.55) + birds(D, 0.08, (1400, 2600), far=True)
    elif kind == "foggymorning":
        horn = np.zeros((2, n))
        for t in events(D, 1 / 26):
            ln = int(2.4 * SR)
            h = sine(ln, 112) * np.sin(np.linspace(0, np.pi, ln)) ** 1.6
            place(horn, lpf(stx(h), 300)[0] * 0.55, t, 0.5, -0.1)
            place(horn, lpf(stx(h), 300)[1] * 0.55, t, 0.5, 0.1)
        x = lpf(nz(n), 400, 5) * 1.3 + drops(D, 1.4, "plip", (400, 800), (0.2, 0.4)) + horn
    elif kind == "wintermorning":
        wh = np.zeros((2, n))
        for t in events(D, 1 / 13):
            ln = int(rng.uniform(0.5, 0.9) * SR)
            place(wh, lpf(nz(ln), 250)[0] * np.sin(np.linspace(0, np.pi, ln)) ** 2, t, rng.uniform(0.5, 0.9), rng.uniform(-0.5, 0.5))
        x = lpf(nz(n), 320, 5) * 1.3 + wind_bed(n, D, 90, 320, 0.25, 0.35) + wh + birds(D, 0.05, (2000, 3200), far=True)
    else:  # typhooneve
        rat = np.zeros((2, n))
        for t in events(D, 0.5):
            place(rat, burst(0.02, 500, 2000, 0.006), t, rng.uniform(0.15, 0.35), rng.uniform(-0.5, 0.5))
        x = lpf(wind_bed(n, D, 80, 700, 0.6, 1.3), 800) + brown(n, 120, 1.8) * 0.8 * slowctrl(n, D, 0.15, 0.5, 1.0) + rat
    return x

def _rest(kind):
    n = int(D * SR)
    if kind == "fireplace":
        roar = lpf(nz(n), 350) * slowctrl(n, D, 0.5, 0.55, 1.0) * 1.1
        x = crackle(D, 16, (1000, 5200), (0.2, 0.7)) + crackle(D, 2, (500, 1800), (0.4, 0.9)) + roar
    elif kind == "candle":
        x = crackle(D, 3.5, (1800, 6000), (0.06, 0.18)) + lpf(nz(n), 250, 5) * 0.9 + bpf(nz(n), 800, 2000) * 0.05 * slowctrl(n, D, 2, 0.3, 1.0)
    elif kind == "teakettle":
        t_ = np.arange(n) / SR
        cyc = 0.5 + 0.5 * np.sin(2 * np.pi * t_ / 13 - 1.5)
        steam = bpf(nz(n), 2500, 9000) * (0.15 + 0.85 * cyc ** 1.6) * 0.6
        x = steam + drops(D, 6, "plip", (500, 900), (0.1, 0.25)) + lpf(nz(n), 400) * 0.5 + crackle(D, 0.4, (700, 1600), (0.2, 0.4))
    elif kind == "templewind":
        bl = np.zeros((2, n))
        for t in events(D, 1 / 7):
            f = rng.choice([1975.5, 2349.3, 2637.0])
            place(bl, bell(f, 3.5, True, 0.3), t, rng.uniform(0.5, 0.9), rng.uniform(-0.4, 0.4))
        wd = np.zeros((2, n))
        for t in events(D, 1 / 18):
            place(wd, tone(210, 0.25, 0.06, [(1.5, 0.3)]), t, 0.35, rng.uniform(-0.3, 0.3))
        x = wind_bed(n, D, 130, 550, 0.4, 0.7) + rev(bl, 0.35) + wd + birds(D, 0.06, far=True)
    elif kind == "rockingchair":
        cyc = 2.4
        out = np.zeros((2, n))
        for i in range(int(D / cyc)):
            place(out, creak(160, 0.4), i * cyc, 0.5, -0.1)
            place(out, creak(130, 0.45), i * cyc + 1.15, 0.45, 0.1)
        x = out * 1.5 + lpf(nz(n), 350, 5) * 1.0 + crackle(D, 1.2, (900, 3000), (0.05, 0.15))
    elif kind == "hammockbreeze":
        cr = np.zeros((2, n))
        for i in range(int(D / 3.1)):
            place(cr, creak(200, 0.3), i * 3.1, 0.3, 0.0)
        x = wind_bed(n, D, 140, 600, 0.35, 0.7) + cr + birds(D, 0.12, far=True) + bpf(nz(n), 700, 2600) * 0.12 * slowctrl(n, D, 4, 0.3, 1.0)
    elif kind == "woodcabin":
        cr = np.zeros((2, n))
        for t in events(D, 1 / 8):
            place(cr, creak(rng.uniform(100, 150), rng.uniform(0.5, 1.0)), t, 0.3, rng.uniform(-0.4, 0.4))
        x = lpf(wind_bed(n, D, 90, 500, 0.5, 1.0), 500) + lpf(nz(n), 300, 5) * 0.9 + crackle(D, 5, (900, 3600), (0.1, 0.3)) + cr
    elif kind == "gardennoon":
        bee = np.zeros((2, n))
        for t in events(D, 1 / 6):
            ln = int(rng.uniform(2.0, 4.0) * SR)
            tt = np.arange(ln) / SR
            b = np.sin(np.cumsum(2 * np.pi * (185 + 25 * np.sin(2 * np.pi * 0.5 * tt)) / SR))
            b *= (0.5 + 0.5 * np.clip(np.sin(2 * np.pi * 105 * tt), 0, 1)) * np.sin(np.linspace(0, np.pi, ln)) ** 1.2
            place(bee, b, t, 0.22, rng.uniform(-0.6, 0.6))
        x = birds(D, 0.3, (1700, 4000)) + bee + wind_bed(n, D, 150, 600, 0.3, 0.4) + bpf(nz(n), 800, 2800) * 0.1 * slowctrl(n, D, 4, 0.3, 1.0)
    elif kind == "oldbookshop":
        pg = np.zeros((2, n))
        for t in events(D, 1 / 7):
            ln = int(rng.uniform(0.25, 0.45) * SR)
            place(pg, bpf(nz(ln, 1)[0], 800, 4200) * np.sin(np.linspace(0, np.pi, ln)) ** 1.5, t, rng.uniform(0.35, 0.6), rng.uniform(-0.4, 0.4))
        tk = np.zeros((2, n))
        for i in range(int(D)):
            place(tk, burst(0.005, 2200, 5200, 0.001), i * 1.0, 0.12, 0.3)
        cr = np.zeros((2, n))
        for t in events(D, 1 / 11):
            place(cr, creak(140, 0.6), t, 0.25, rng.uniform(-0.3, 0.3))
        x = lpf(nz(n), 420, 5) * 1.1 + pg + tk + cr
    else:  # attictime
        x = lpf(rain_bed(n, 300, 1800, 900, 0.8), 1000) + drops(D, 5, "thump", (140, 240), (0.2, 0.45)) + lpf(nz(n), 280, 5) * 0.8 + (lambda c: c)(np.zeros((2, n)))
        cr = np.zeros((2, n))
        for t in events(D, 1 / 9):
            place(cr, creak(120, 0.8), t, 0.28, rng.uniform(-0.3, 0.3))
        x = x + cr
    return x

def _sleep(kind):
    n = int(D * SR)
    t_ = np.arange(n) / SR
    if kind == "womb":
        beat = 60.0 / 64
        out = np.zeros((2, n))
        lub = lpf(stx(tone(50, 0.18, 0.05, [(2, 0.35)])), 160)
        dub = lpf(stx(tone(46, 0.13, 0.04)), 150)
        for i in range(int(D / beat)):
            place(out, lub[0], i * beat, 1.0, -0.05)
            place(out, lub[1], i * beat, 1.0, 0.05)
            place(out, dub[0], i * beat + 0.24, 0.7, 0.05)
            place(out, dub[1], i * beat + 0.24, 0.7, -0.05)
        whoosh = brown(n, 300, 2.4) * (0.55 + 0.45 * np.sin(2 * np.pi * t_ / beat * 0.5))
        x = lpf(out * 2.6 + whoosh, 400)
    elif kind == "tibetanbowls":
        out = np.zeros((2, n))
        seqs = [(0.0, 147.0), (11.0, 196.0), (23.0, 165.0), (33.0, 147.0)]
        for t0, f in seqs:
            place(out, bell(f, 9.0, True, 1.0), t0, 0.9, rng.uniform(-0.25, 0.25))
        drone_ = stx(sine(n, 73.5) * 0.12 + sine(n, 110.3) * 0.08) * swell(n, 0.2)
        x = rev(out * 1.4, 0.3, 0.85) + drone_
    elif kind == "zengarden":
        cyc = 10.0
        out = np.zeros((2, n))
        for i in range(int(D / cyc)):
            t0 = i * cyc + 6.0
            place(out, tone(620, 0.1, 0.03, [(1.6, 0.4)]), t0, 0.7, 0.1)  # 딱
            place(out, burst(0.7, 400, 2400, shape="sin"), t0 + 0.35, 0.5, 0.1)  # 물 쏟기
            place(out, tone(430, 0.09, 0.025), t0 + 0.42, 0.4, 0.1)
        trickle = bpf(nz(n), 900, 4200) * 0.22 * swell(n, 0.08)
        x = rev(out * 1.5, 0.3) + trickle + wind_bed(n, D, 140, 480, 0.25, 0.3) + birds(D, 0.05, far=True)
    elif kind == "crystalbowl":
        y = sine(n, 880) * 0.5 + sine(n, 881.4) * 0.45 + sine(n, 1320.6) * 0.12 + sine(n, 2640.5) * 0.03
        x = stx(y * swell(n, 0.3, 0.75)) * 0.4 + lpf(nz(n), 300) * 0.15
        x = rev(x, 0.3, 0.85)
    elif kind == "moonlightdrone":
        y = np.zeros(n)
        for f, a in [(98, 0.5), (147, 0.35), (196, 0.28), (98.5, 0.4), (294, 0.1)]:
            y += a * sine(n, f, rng.uniform(0, 6.28))
        pad = bpf(nz(n), 250, 1100) * 0.16 * slowctrl(n, D, 0.06, 0.4, 1.0)
        x = stx(y * 0.22) * swell(n, 0.25, 0.85) + pad
    elif kind == "alphadrone":
        y = sine(n, 200) * 0.5 + sine(n, 210) * 0.5  # 10Hz 맥놀이
        y2 = sine(n, 100) * 0.3
        x = stx((y + y2) * 0.28) * swell(n, 0.12, 0.92) + lpf(nz(n), 500) * 0.22
    elif kind == "nighttrainbed":
        cyc = 1.9
        out = np.zeros((2, n))
        for i in range(int(D / cyc)):
            t0 = i * cyc
            for dt, g in [(0.0, 0.8), (0.18, 0.6), (0.95, 0.75), (1.13, 0.55)]:
                place(out, lpf(stx(tone(70, 0.07, 0.02, [(2.2, 0.3)])), 240)[0], t0 + dt, g, -0.1)
                place(out, lpf(stx(tone(70, 0.07, 0.02, [(2.2, 0.3)])), 240)[1], t0 + dt, g, 0.1)
        x = out * 1.8 + brown(n, 350, 2.2) * 0.9 + hum(n, [(55, 0.06)]) * swell(n, 0.1)
    elif kind == "harpdream":
        scaleT = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3]
        out = np.zeros((2, n))
        for t in events(D, 1 / 7):
            start = rng.integers(3, len(scaleT))
            for k in range(rng.integers(3, 6)):
                f = scaleT[max(0, start - k)]
                note = tone(f, 2.2, 0.5, [(2, 0.25), (3, 0.08)], attack=0.002)
                place(out, note, t + k * rng.uniform(0.14, 0.22), rng.uniform(0.3, 0.5), rng.uniform(-0.4, 0.4))
        x = rev(out, 0.4, 0.8) + lpf(nz(n), 350) * 0.18
    elif kind == "breathingpad":
        cyc = 10.0
        br = 0.5 - 0.5 * np.cos(2 * np.pi * t_ / cyc)
        br = br ** 1.3
        y = np.zeros(n)
        for f, a in [(110, 0.4), (165, 0.3), (220, 0.25), (277, 0.12)]:
            y += a * sine(n, f, rng.uniform(0, 6.28))
        x = stx(y * 0.3) * (0.35 + 0.65 * br) + bpf(nz(n), 300, 900) * 0.12 * (0.3 + 0.7 * br)
    elif kind == "dreamchime":
        out = np.zeros((2, n))
        for t in events(D, 1 / 5):
            f = rng.choice([1568.0, 1760.0, 2093.0, 2637.0])
            place(out, bell(f, 4.0, False, 0.25), t, rng.uniform(0.4, 0.7), rng.uniform(-0.6, 0.6))
        x = rev(out, 0.5, 0.85) + stx(sine(n, 131) * 0.05 + sine(n, 196) * 0.04) * swell(n, 0.2)
    elif kind == "oceanbowl":
        out = np.zeros((2, n))
        for t0, f in [(2.0, 220.0), (15.0, 165.0), (28.0, 196.0)]:
            place(out, bell(f, 8.0, True, 0.8), t0, 0.8, rng.uniform(-0.2, 0.2))
        x = surf(n, D, 12.5, dark=0.6) * 0.45 + rev(out * 1.2, 0.3, 0.85)
    else:  # slumberhum
        mel = [220.0, 246.9, 220.0, 196.0]
        seg = D / len(mel)
        f_curve = np.concatenate([np.full(int(seg * SR), f) for f in mel])[:n]
        f_curve = lpf(f_curve[None, :], 2)[0]
        vib = 1 + 0.008 * sine(n, 4.5)
        y = np.sin(np.cumsum(2 * np.pi * f_curve * vib / SR))
        y = bpf(stx(y * 0.4), 150, 900)
        breath_ = bpf(nz(n), 400, 1400) * 0.06
        x = (y + breath_) * swell(n, 0.2, 0.85)
        x = rev(x, 0.25)
    return x

def _daily(kind):
    n = int(D * SR)
    t_ = np.arange(n) / SR
    if kind == "catpurr":
        cyc = 2.6
        br = 0.62 + 0.38 * np.sin(2 * np.pi * t_ / cyc)
        purr = lpf(nz(n), 300) * (0.35 + 0.65 * np.clip(sine(n, 26), 0, 1)) * br
        body = stx(sine(n, 52) * 0.2) * br
        x = purr * 1.6 + body + lpf(nz(n), 200, 5) * 0.3
    elif kind == "ironing":
        st = np.zeros((2, n))
        for t in events(D, 1 / 6):
            ln = int(rng.uniform(0.7, 1.3) * SR)
            place(st, bpf(nz(ln, 1)[0], 2000, 7000) * np.sin(np.linspace(0, np.pi, ln)) ** 1.3, t, rng.uniform(0.5, 0.8), 0.1)
        sl = np.zeros((2, n))
        for t in events(D, 0.5):
            ln = int(rng.uniform(0.4, 0.9) * SR)
            place(sl, bpf(nz(ln, 1)[0], 300, 1400) * np.sin(np.linspace(0, np.pi, ln)) ** 1.1, t, rng.uniform(0.25, 0.45), -0.1)
        x = st + sl + lpf(nz(n), 350, 5) * 0.9
    elif kind == "dishwashing":
        clink = np.zeros((2, n))
        for t in events(D, 0.9):
            f = rng.uniform(900, 1600)
            place(clink, tone(f, 0.1, 0.02, [(2.3, 0.3)]), t, rng.uniform(0.2, 0.5), rng.uniform(-0.3, 0.3))
        water = bpf(nz(n), 500, 3200) * 0.4 * slowctrl(n, D, 0.4, 0.4, 1.0)
        x = water + clink + drops(D, 4, "plip", (400, 800), (0.15, 0.35)) + lpf(nz(n), 300) * 0.4
    elif kind == "knitting":
        out = np.zeros((2, n))
        t = 0.0
        while t < D:
            place(out, burst(0.008, 1800, 4600, 0.0018), t, rng.uniform(0.3, 0.5), -0.15)
            place(out, burst(0.008, 2000, 5000, 0.0018), t + rng.uniform(0.12, 0.2), rng.uniform(0.3, 0.5), 0.15)
            t += rng.uniform(0.55, 0.85)
        x = out * 1.6 + lpf(nz(n), 320, 5) * 1.0 + crackle(D, 0.5, (800, 2400), (0.04, 0.1))
    elif kind == "ricecooker":
        cyc = 1.4
        out = np.zeros((2, n))
        for i in range(int(D / cyc)):
            ln = int(0.16 * SR)
            place(out, bpf(nz(ln, 1)[0], 2600, 8000) * np.sin(np.linspace(0, np.pi, ln)) ** 0.9, i * cyc, rng.uniform(0.5, 0.7), 0.05)
        x = out * 1.4 + bpf(nz(n), 1500, 5000) * 0.12 + lpf(nz(n), 400) * 0.6 + drops(D, 2, "plip", (400, 700), (0.1, 0.2))
    elif kind == "bathfill":
        pour = bpf(nz(n), 400, 3600) * 0.9 * swell(n, 0.06)
        body = lpf(nz(n), 300) * 1.2
        x = rev(pour + body, 0.25, 0.7) + drops(D, 5, "plip", (300, 700), (0.2, 0.4)) + bpf(nz(n), 3000, 8000) * 0.06
    elif kind == "frypan":
        siz = bpf(nz(n), 2200, 9000) * (0.5 + 0.5 * slowctrl(n, D, 1.2, 0.4, 1.0)) * 0.7
        x = siz + crackle(D, 22, (2000, 8000), (0.08, 0.3)) + crackle(D, 1.5, (600, 2200), (0.2, 0.5)) + lpf(nz(n), 350) * 0.5
    elif kind == "coffeedrip":
        out = np.zeros((2, n))
        t = 0.0
        while t < D:
            f0 = rng.uniform(500, 800)
            ln = int(0.035 * SR)
            tt = np.arange(ln) / SR
            place(out, np.sin(2 * np.pi * (f0 - 150 * tt / 0.035) * tt) * np.exp(-tt / 0.014), t, rng.uniform(0.4, 0.7), 0.1)
            t += rng.uniform(0.55, 0.95)
        gur = np.zeros((2, n))
        for tg in events(D, 1 / 9):
            ln = int(rng.uniform(0.5, 1.1) * SR)
            place(gur, bpf(nz(ln, 1)[0], 250, 1100) * np.sin(np.linspace(0, np.pi, ln)), tg, 0.3, -0.2)
        x = out * 1.5 + gur + hum(n, [(120, 0.03)]) + lpf(nz(n), 300, 5) * 0.7
    elif kind == "typewriter":
        out = np.zeros((2, n))
        t, count = 0.0, 0
        while t < D:
            clack = burst(0.014, 1400, 5200, 0.003) * 1.2
            th = tone(rng.uniform(120, 160), 0.03, 0.008)
            place(out, clack, t, rng.uniform(0.5, 0.9), rng.uniform(-0.25, 0.25))
            place(out, th, t, 0.6, 0.0)
            count += 1
            t += rng.exponential(0.16)
            if count > rng.integers(28, 45):  # 행 끝 — 딩 + 캐리지
                place(out, bell(1320, 1.2, False, 0.3), t + 0.2, 0.5, 0.3)
                zip_ = burst(0.35, 700, 2600, shape="sin")
                place(out, zip_, t + 0.45, 0.4, -0.2)
                t += 1.4
                count = 0
            if rng.random() < 0.04:
                t += rng.uniform(0.8, 1.8)
        x = out * 1.7 + lpf(nz(n), 380, 5) * 0.8
    elif kind == "vacuumfar":
        drift = slowctrl(n, D, 0.1, 0.7, 1.0)
        x = lpf(nz(n), 450) * drift * 1.3 + hum(n, [(170, 0.14), (340, 0.06)]) * drift
        x = lpf(x, 500)
    elif kind == "eveningalley":
        murmur = lpf(nz(n), 700) * 0.7 * slowctrl(n, D, 0.3, 0.5, 1.0)
        clat = np.zeros((2, n))
        for t in events(D, 1 / 5):
            place(clat, lpf(stx(tone(rng.uniform(300, 700), 0.08, 0.02)), 900)[0], t, rng.uniform(0.15, 0.35), rng.uniform(-0.7, 0.7))
        bark = np.zeros((2, n))
        for t in events(D, 1 / 17):
            for k in range(rng.integers(1, 3)):
                b = lpf(stx(np.tanh(sine(int(0.14 * SR), 260) * 3) * np.sin(np.linspace(0, np.pi, int(0.14 * SR))) ** 0.7), 500)
                place(bark, b[0] * 0.4, t + k * 0.35, 0.4, 0.5)
        x = murmur + clat + bark + cricket_bed(D, 0.3, g=0.08)
    else:  # nightkitchen
        tick = np.zeros((2, n))
        for t in events(D, 1 / 7):
            place(tick, tone(rng.uniform(700, 1100), 0.04, 0.01), t, rng.uniform(0.08, 0.2), rng.uniform(-0.3, 0.3))
        x = hum(n, [(120, 0.22), (240, 0.1), (60, 0.12)]) * swell(n, 0.06, 0.95) + lpf(nz(n), 260, 5) * 0.8 + tick
    return x

def _travel(kind):
    n = int(D * SR)
    if kind == "nightbus":
        x = brown(n, 320, 2.4) + hum(n, [(85, 0.18), (170, 0.07)]) * swell(n, 0.08) + lpf(nz(n), 900) * 0.2 * slowctrl(n, D, 0.2, 0.5, 1.0)
    elif kind == "subway":
        cyc = 1.8
        out = np.zeros((2, n))
        for i in range(int(D / cyc)):
            for dt, g in [(0.0, 0.75), (0.16, 0.55), (0.9, 0.7), (1.06, 0.5)]:
                place(out, lpf(stx(tone(88, 0.06, 0.018, [(2.4, 0.3)])), 300)[0], i * cyc + dt, g, -0.12)
                place(out, lpf(stx(tone(88, 0.06, 0.018, [(2.4, 0.3)])), 300)[1], i * cyc + dt, g, 0.12)
        x = out * 1.7 + brown(n, 500, 2.0) * 0.9 + hum(n, [(100, 0.1)]) + bpf(nz(n), 1200, 3200) * 0.08 * slowctrl(n, D, 0.3, 0.3, 1.0)
    elif kind == "shipdeck":
        x = hum(n, [(68, 0.2), (136, 0.08)]) * swell(n, 0.1) + surf(n, D, 9.0, dark=0.4) * 0.4 + wind_bed(n, D, 150, 800, 0.45, 0.7)
    elif kind == "countrystation":
        horn = np.zeros((2, n))
        for t in events(D, 1 / 24):
            ln = int(1.6 * SR)
            h = (sine(ln, 311) * 0.6 + sine(ln, 370) * 0.5) * np.sin(np.linspace(0, np.pi, ln)) ** 1.4
            hh = lpf(stx(h), 800)
            place(horn, hh[0] * 0.35, t, 0.45, -0.3)
            place(horn, hh[1] * 0.35, t, 0.45, 0.3)
        x = cricket_bed(D, 0.6, g=0.13) + wind_bed(n, D, 130, 500, 0.3, 0.5) + birds(D, 0.1, far=True) + rev(horn, 0.4, 0.85)
    elif kind == "highwayfar":
        bed = lpf(nz(n), 550) * 0.8
        cars = np.zeros((2, n))
        for t in events(D, 1 / 6):
            ln = int(rng.uniform(2.5, 4.5) * SR)
            env = np.sin(np.linspace(0, np.pi, ln)) ** 2.6
            c = lpf(nz(ln), 700) * env
            pan = rng.choice([-1, 1])
            place(cars, c[0], t, rng.uniform(0.3, 0.6), pan * 0.4)
            place(cars, c[1], t + 0.005, rng.uniform(0.3, 0.6), -pan * 0.2)
        x = bed + cars + hum(n, [(60, 0.05)])
    elif kind == "sailboat":
        flap = np.zeros((2, n))
        for t in events(D, 0.4):
            ln = int(rng.uniform(0.1, 0.3) * SR)
            f = bpf(nz(ln, 1)[0], 400, 2200) * np.sin(np.linspace(0, np.pi, ln)) * slowctrl(ln, ln / SR, 20, 0.3, 1.0)
            place(flap, f, t, rng.uniform(0.3, 0.6), rng.uniform(-0.4, 0.4))
        rig = np.zeros((2, n))
        for t in events(D, 1 / 7):
            place(rig, tone(rng.uniform(600, 900), 0.12, 0.03), t, 0.2, rng.uniform(-0.5, 0.5))
        x = wind_bed(n, D, 150, 900, 0.5, 0.8) + surf(n, D, 7.5, dark=0.3) * 0.35 + flap + rig + drops(D, 3, "plip", (300, 600), (0.15, 0.35))
    elif kind == "nightdrive":
        woosh = np.zeros((2, n))
        for t in events(D, 1 / 13):
            ln = int(rng.uniform(1.2, 2.2) * SR)
            w = lpf(nz(ln), 900) * np.sin(np.linspace(0, np.pi, ln)) ** 2
            place(woosh, w[0], t, 0.5, -0.5)
            place(woosh, w[1], t + 0.02, 0.5, 0.5)
        x = brown(n, 280, 2.2) + hum(n, [(92, 0.16), (184, 0.05)]) + bpf(nz(n), 200, 600) * 0.25 + woosh
    elif kind == "tram":
        cyc = 1.15
        out = np.zeros((2, n))
        for i in range(int(D / cyc)):
            place(out, lpf(stx(tone(120, 0.05, 0.014)), 400)[0], i * cyc, 0.4, -0.1)
            place(out, lpf(stx(tone(120, 0.05, 0.014)), 400)[1], i * cyc + 0.13, 0.32, 0.1)
        whine_f = slowctrl(n, D, 0.15, 0.9, 1.15)
        whine = np.sin(np.cumsum(2 * np.pi * 760 * whine_f / SR)) * 0.04
        x = out * 1.5 + brown(n, 400, 1.8) * 0.8 + stx(whine) + lpf(nz(n), 600) * 0.3
    elif kind == "ferry":
        throb = 0.75 + 0.25 * np.clip(sine(n, 1.1), -1, 1)
        x = hum(n, [(55, 0.3), (110, 0.14), (165, 0.06)]) * throb + brown(n, 260, 2.2) * 0.9
        x = lpf(x, 400)
    else:  # bicycle
        wh = np.zeros((2, n))
        t = 0.0
        while t < D:
            place(wh, burst(0.004, 2400, 6000, 0.001), t, 0.12, 0.2)
            t += 1 / 11.0
        free = np.zeros((2, n))
        for tg in events(D, 1 / 9):
            tt = tg
            for k in range(rng.integers(8, 20)):
                place(free, burst(0.003, 3000, 7000, 0.0008), tt, 0.18, 0.25)
                tt += 0.045
        x = wind_bed(n, D, 200, 1400, 0.35, 0.8) + wh + free + bpf(nz(n), 150, 500) * 0.35 + birds(D, 0.08, far=True)
    return x

def _rhythm(kind):
    n = int(D * SR)
    if kind == "metronome":
        per = 0.75  # 80bpm
        out = np.zeros((2, n))
        for i in range(int(D / per)):
            hi_ = i % 4 == 0
            f = 1500 if hi_ else 1150
            place(out, tone(f, 0.035, 0.006, [(2.2, 0.25)]), i * per, 0.8 if hi_ else 0.6, 0.0)
        x = out * 1.6 + lpf(nz(n), 300, 5) * 0.5
    elif kind == "watermill":
        cyc = 1.7
        out = np.zeros((2, n))
        for i in range(int(D / cyc)):
            t0 = i * cyc
            place(out, burst(0.5, 350, 2200, shape="sin"), t0, 0.6, -0.15)
            place(out, lpf(stx(tone(95, 0.09, 0.03)), 300)[0], t0 + 0.12, 0.5, 0.1)
        x = out * 1.4 + flow_bed(n, 220, 1400, 0.6) + drops(D, 5, "plip", (350, 750), (0.15, 0.35))
    elif kind == "clockshop":
        out = np.zeros((2, n))
        for per, pan, f in [(1.0, -0.4, 3400), (0.83, 0.35, 2900), (1.31, 0.0, 3800), (0.62, 0.6, 4300)]:
            for i in range(int(D / per)):
                place(out, burst(0.005, f * 0.7, f * 1.4, 0.0012), i * per, rng.uniform(0.3, 0.45), pan)
                place(out, tone(f * 0.22, 0.03, 0.008), i * per, 0.2, pan)
        gong = np.zeros((2, n))
        place(gong, bell(523.3, 3.0, False, 0.35), 19.0, 0.5, 0.0)
        x = out * 1.5 + rev(gong, 0.3) + lpf(nz(n), 350, 5) * 0.7
    elif kind == "dripfaucet":
        per = 1.15
        out = np.zeros((2, n))
        for i in range(int(D / per)):
            f0 = 620 + 25 * np.sin(i * 0.7)
            ln = int(0.04 * SR)
            tt = np.arange(ln) / SR
            place(out, np.sin(2 * np.pi * (f0 - 200 * tt / 0.04) * tt) * np.exp(-tt / 0.016), i * per, 0.75, 0.05)
        x = rev(out * 1.6, 0.35, 0.8) + lpf(nz(n), 280, 5) * 0.8
    elif kind == "windmill":
        cyc = 2.2
        t_ = np.arange(n) / SR
        blade = lpf(nz(n), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * t_ / cyc)) ** 1.4
        cr = np.zeros((2, n))
        for i in range(int(D / (cyc * 2))):
            place(cr, creak(190, 0.3), i * cyc * 2 + 0.4, 0.25, 0.1)
        x = blade * 1.1 + wind_bed(n, D, 140, 700, 0.4, 0.7) + cr
    else:  # radiostatic
        drift = slowctrl(n, D, 0.12, 0.6, 1.0)
        st = bpf(nz(n), 800, 3600) * 0.35 * drift + lpf(nz(n), 400) * 0.7
        pops = crackle(D, 1.2, (500, 2400), (0.1, 0.25))
        warble_f = slowctrl(n, D, 0.1, 0.97, 1.03)
        tone_ = np.sin(np.cumsum(2 * np.pi * 440 * warble_f / SR)) * 0.03 * slowctrl(n, D, 0.07, 0.0, 1.0)
        x = st + pops + stx(tone_)
    return x

def _noise(kind):
    n = int(D * SR)
    if kind == "bluenoise":
        w = nz(n)
        x = np.diff(w, prepend=w[:, :1]) * 2.2 + w * 0.3
        x = hpf(x, 300, 1)
    elif kind == "graynoise":
        w = nz(n)
        pink = signal.lfilter([0.049922, -0.095993, 0.050612, -0.004408], [1, -2.494956, 2.017265, -0.522189], w, axis=-1)
        x = pink * 2.2 + hpf(w, 3000, 2) * 0.35 + lpf(w, 120) * 0.9
    elif kind == "aircon":
        x = lpf(bpf(nz(n), 300, 2400), 1800) * swell(n, 0.03, 0.97) + hum(n, [(120, 0.07), (240, 0.03)]) + bpf(nz(n), 2400, 6000) * 0.08
    else:  # deephum
        x = hum(n, [(45, 0.4), (90, 0.18), (135, 0.06)]) * swell(n, 0.08, 0.95) + brown(n, 150, 2.0) * 0.7
    return x

# ============================ 스펙 테이블 ============================
# key: (빌더, rms, xfade)
SPEC = {}
for k in ["windowrain", "drizzle", "sunshower", "nightrain", "eaves", "carrain", "tinroof", "leafrain", "puddles", "distantthunder", "afterrain", "monsoon"]:
    SPEC[k] = (lambda kk: (lambda: _rain(kk)))(k)
for k in ["nightsea", "pebblebeach", "rivershore", "fountain", "underwater", "hotspring", "harbor", "rapids", "springmelt", "marsh", "rowboat", "seacave"]:
    SPEC[k] = (lambda kk: (lambda: _water(kk)))(k)
for k in ["bamboo", "morningforest", "pinewind", "meadow", "wheatfield", "mountaintop", "fallenleaves", "treecreak", "farbirds", "junglefar", "creekside", "autumnwind"]:
    SPEC[k] = (lambda kk: (lambda: _field(kk)))(k)
for k in ["frogs", "owlnight", "autumnnight", "firstsnow", "blizzard", "springnight", "summerdusk", "foggymorning", "wintermorning", "typhooneve"]:
    SPEC[k] = (lambda kk: (lambda: _night(kk)))(k)
for k in ["fireplace", "candle", "teakettle", "templewind", "rockingchair", "hammockbreeze", "woodcabin", "gardennoon", "oldbookshop", "attictime"]:
    SPEC[k] = (lambda kk: (lambda: _rest(kk)))(k)
for k in ["womb", "tibetanbowls", "zengarden", "crystalbowl", "moonlightdrone", "alphadrone", "nighttrainbed", "harpdream", "breathingpad", "dreamchime", "oceanbowl", "slumberhum"]:
    SPEC[k] = (lambda kk: (lambda: _sleep(kk)))(k)
for k in ["catpurr", "ironing", "dishwashing", "knitting", "ricecooker", "bathfill", "frypan", "coffeedrip", "typewriter", "vacuumfar", "eveningalley", "nightkitchen"]:
    SPEC[k] = (lambda kk: (lambda: _daily(kk)))(k)
for k in ["nightbus", "subway", "shipdeck", "countrystation", "highwayfar", "sailboat", "nightdrive", "tram", "ferry", "bicycle"]:
    SPEC[k] = (lambda kk: (lambda: _travel(kk)))(k)
for k in ["metronome", "watermill", "clockshop", "dripfaucet", "windmill", "radiostatic"]:
    SPEC[k] = (lambda kk: (lambda: _rhythm(kk)))(k)
for k in ["bluenoise", "graynoise", "aircon", "deephum"]:
    SPEC[k] = (lambda kk: (lambda: _noise(kk)))(k)

RMS = {"candle": 0.035, "firstsnow": 0.04, "wintermorning": 0.04, "oldbookshop": 0.04, "knitting": 0.04, "dreamchime": 0.045,
       "autumnnight": 0.05, "snownight": 0.045, "metronome": 0.045, "clockshop": 0.045, "dripfaucet": 0.05, "crystalbowl": 0.05,
       "slumberhum": 0.05, "harpdream": 0.05, "moonlightdrone": 0.055, "alphadrone": 0.055, "breathingpad": 0.055,
       "catpurr": 0.06, "womb": 0.065, "deephum": 0.07, "blizzard": 0.08, "rapids": 0.085, "bathfill": 0.075,
       "bluenoise": 0.075, "graynoise": 0.08, "aircon": 0.07, "vacuumfar": 0.06, "ferry": 0.07, "nightbus": 0.07,
       "subway": 0.07, "monsoon": 0.08, "fountain": 0.075, "underwater": 0.07, "shipdeck": 0.07, "nightdrive": 0.07,
       "typhooneve": 0.075, "mountaintop": 0.075}
# 리듬 정합 사운드는 크로스페이드 대신 패턴 길이에 맞춰 그대로 랩 (place가 모듈로 배치)
NO_XFADE = {"metronome", "watermill", "clockshop", "dripfaucet", "rowboat", "subway", "tram", "nighttrainbed",
            "rockingchair", "typewriter", "knitting", "ricecooker", "fallenleaves", "zengarden", "breathingpad",
            "womb", "coffeedrip", "eaves", "bicycle", "tibetanbowls", "oceanbowl"}

if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["--list"]:
        print(" ".join(SPEC))
        sys.exit(0)
    names = args or list(SPEC)
    for nm in names:
        x = SPEC[nm]()
        finalize(nm, x, RMS.get(nm, 0.06), 0 if nm in NO_XFADE else 1.6)
