# -*- coding: utf-8 -*-
"""신규 20종 (batch3): 실녹음 1(보트, CC0) + 프로시저럴 합성 19.
사용: python3 make_batch3.py [이름...]  (이름 생략 시 전체)
출처/라이선스: assets/sounds/ATTRIBUTIONS.md"""
import sys, os, subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
OUT = "/tmp/snd3"
BLANKET = "/tmp/snd/blanket/data/resources/sounds"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(33)


# ---------- 공통 유틸 ----------
def noise(n, ch=2):
    return rng.standard_normal((ch, n))


def bp(x, lo, hi, order=4):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, x, axis=-1)


def lp(x, fc, order=4):
    b, a = signal.butter(order, fc / (SR / 2), "low")
    return signal.lfilter(b, a, x, axis=-1)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x, axis=-1)


def lfo(n, hz, ph=0.0):
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * hz * t + ph)


def slow_env(n, hz, depth, base=1.0):
    """느린 랜덤 스웰 (루프 매끄럽게 — 정수 주기 사인 합)"""
    t = np.arange(n) / n
    e = np.zeros(n)
    for k in range(1, 4):
        e += rng.uniform(0.4, 1.0) * np.sin(2 * np.pi * k * t + rng.uniform(0, 6.28)) / k
    e /= np.max(np.abs(e)) + 1e-9
    return base + depth * e


def make_loop(x, xfade=1.6):
    nf = int(xfade * SR)
    head, body = x[:, :nf], x[:, nf:]
    w = np.linspace(0, np.pi / 2, nf)
    tail = body[:, -nf:].copy()
    body = body[:, :-nf]
    return np.concatenate([tail * np.cos(w) ** 2 + head * np.sin(w) ** 2, body], axis=1)


def soft_limit(x, d=1.15):
    return np.tanh(x * d) / np.tanh(d)


def finalize(name, x, rms_t, loop_xfade=1.6):
    if loop_xfade:
        x = make_loop(x, loop_xfade)
    x = x - np.mean(x, axis=1, keepdims=True)
    x *= rms_t / (np.sqrt(np.mean(x ** 2)) + 1e-9)
    x = soft_limit(x)
    pk = np.max(np.abs(x))
    if pk > 0.92:
        x *= 0.92 / pk
    wavfile.write(f"{OUT}/{name}.wav", SR, (x.T * 32767).astype(np.int16))
    print(f"{name}: {x.shape[1] / SR:.1f}s")


def decorrelate(mono):
    """모노 → 살짝 다른 좌우 (지연+필터)"""
    d = int(0.011 * SR)
    r = np.roll(mono, d)
    return np.stack([mono, 0.92 * r + 0.08 * mono])


def events(dur, rate):
    """포아송 이벤트 시각(초) — 루프 랩 지원"""
    ts, t = [], 0.0
    while True:
        t += rng.exponential(1.0 / rate)
        if t >= dur:
            break
        ts.append(t)
    return ts


def place(canvas, snd, t, gain=1.0, pan=0.0):
    """루프 랩(모듈로)으로 이벤트 배치. pan: -1(L)~1(R)"""
    n = canvas.shape[1]
    i0 = int(t * SR) % n
    gl, gr = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    ln = len(snd)
    idx = (np.arange(ln) + i0) % n
    canvas[0, idx] += snd * gain * gl
    canvas[1, idx] += snd * gain * gr


def tone(f, dur, decay, h=None):
    """감쇠 사인 (h: 배음 [(mult, amp)])"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.exp(-t / decay)
    y = np.sin(2 * np.pi * f * t)
    for m, a in h or []:
        y += a * np.sin(2 * np.pi * f * m * t)
    return y * env


# ---------- 자연 확장 ----------
def waterfall(dur=60):
    n = int(dur * SR)
    hiss = bp(noise(n), 900, 7000) * slow_env(n, 0.05, 0.10)
    mid = bp(noise(n), 250, 1200) * 0.8 * slow_env(n, 0.07, 0.12)
    rumble = lp(noise(n), 140) * 2.2 * slow_env(n, 0.04, 0.15)
    finalize("sound_waterfall", hiss + mid + rumble, 0.085)


def snownight(dur=64):
    n = int(dur * SR)
    base = lp(noise(n), 350, 5) * 1.6  # 아주 어두운 룸톤
    wind = bp(noise(n), 180, 700) * (0.35 + 0.3 * (1 + lfo(n, 1.0 / dur * 3)) / 2) * slow_env(n, 0.03, 0.35)
    finalize("sound_snownight", base + wind, 0.045)


def cicada(dur=60):
    n = int(dur * SR)
    out = np.zeros((2, n))
    for f0, am, pan in [(4300, 118, -0.5), (4700, 127, 0.5), (3900, 110, 0.0)]:
        buzz = bp(noise(n, 1)[0], f0 - 350, f0 + 350)
        buzz *= (1 + np.clip(lfo(n, am), 0, 1)) / 2  # 거친 진동
        buzz *= slow_env(n, 0.05, 0.45, 0.75)  # 개체 스웰
        gl, gr = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
        out[0] += buzz * gl
        out[1] += buzz * gr
    amb = lp(noise(n), 500) * 0.5
    finalize("sound_cicada", out + amb, 0.05)


def reeds(dur=60):
    n = int(dur * SR)
    rustle = bp(noise(n), 600, 3000)
    ctrl = rng.standard_normal(int(dur * 11))  # ~11Hz 랜덤 플러터 (저주파 IIR 불안정 회피)
    flut = np.interp(np.linspace(0, len(ctrl) - 1, n), np.arange(len(ctrl)), ctrl)
    flutter = 0.55 + 0.45 * np.clip(flut, -1, 1)
    body = rustle * flutter * slow_env(n, 0.05, 0.4, 0.85)
    windbed = bp(noise(n), 150, 600) * 0.9 * slow_env(n, 0.04, 0.3)
    finalize("sound_reeds", body + windbed, 0.055)


def tentrain(dur=60):
    """텐트 위 빗소리 — 천막에 먹먹하게 두드리는 빗방울"""
    n = int(dur * SR)
    patter = lp(bp(noise(n), 300, 2200), 1600) * slow_env(n, 0.06, 0.12)  # 먹먹한 빗발
    out = np.zeros((2, n))
    for t in events(dur, 6.5):  # 굵은 방울 툭툭
        ln = int(rng.uniform(0.015, 0.035) * SR)
        tt = np.arange(ln) / SR
        thump = np.sin(2 * np.pi * rng.uniform(90, 160) * tt) * np.exp(-tt / 0.008)
        place(out, thump, t, rng.uniform(0.4, 0.9), rng.uniform(-0.6, 0.6))
    wind = lp(noise(n), 250) * 0.5 * slow_env(n, 0.04, 0.3)
    finalize("sound_tentrain", patter + out * 1.6 + wind, 0.065)


# ---------- 명상과 수면 ----------
def omdrone(dur=64):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f, a in [(110, 1.0), (110.6, 0.9), (220, 0.35), (165, 0.2), (55, 0.6)]:
        y += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28))
    formant = bp(noise(n, 1)[0], 400, 900) * 0.06  # 'o' 포먼트 숨결
    breath = slow_env(n, 0.06, 0.25, 0.9)
    finalize("sound_omdrone", decorrelate((y * 0.14 + formant) * breath), 0.06)


def heartbeat(dur=60, bpm=52):
    n = int(dur * SR)
    out = np.zeros((2, n))
    beat = 60.0 / bpm
    k = int(dur / beat)
    lub = lp(decorrelate(tone(52, 0.16, 0.045, [(2, 0.4)]))[0], 220)
    dub = lp(decorrelate(tone(48, 0.12, 0.035, [(2, 0.3)]))[0], 200)
    for i in range(k):
        t0 = i * beat
        place(out, lub, t0, 1.0)
        place(out, dub, t0 + 0.22, 0.75)
    bed = lp(noise(n), 180) * 0.25
    finalize("sound_heartbeat", out * 3.0 + bed, 0.06, loop_xfade=0)


def lullaby(dur=76.8, bpm=50):
    """오르골풍 펜타토닉 자장가 — 마디에 맞춘 심리스 루프"""
    n = int(dur * SR)
    out = np.zeros((2, n))
    beat = 60.0 / bpm  # 1.2s, 64비트 = 76.8s
    scale = [392.0, 440.0, 523.25, 587.33, 659.26, 783.99]  # G A C D E G'
    pattern = [0, 2, 4, 3, 2, 4, 5, 4, 3, 2, 1, 2, 0, 2, 1, 0]
    for rep in range(4):
        for i, deg in enumerate(pattern):
            t0 = (rep * 16 + i) * beat
            if rng.random() < 0.18 and i % 4 != 0:
                continue  # 숨 고르기
            f = scale[deg]
            note = tone(f, 2.6, 0.55, [(2, 0.35), (4, 0.12)])
            note += 0.3 * tone(f * 1.001, 2.6, 0.5)  # 오르골 디튠
            place(out, note, t0, rng.uniform(0.5, 0.75), rng.uniform(-0.4, 0.4))
    bed = lp(noise(n), 300) * 0.12
    finalize("sound_lullaby", out * 0.5 + bed, 0.045, loop_xfade=0)


def space(dur=64):
    n = int(dur * SR)
    t = np.arange(n) / SR
    drone = 0.5 * np.sin(2 * np.pi * 50 * t) + 0.3 * np.sin(2 * np.pi * 75.2 * t) + 0.2 * np.sin(2 * np.pi * 100.5 * t)
    pad = bp(noise(n), 300, 1400) * slow_env(n, 0.03, 0.5, 0.5) * 0.35
    shimmer = np.zeros((2, n))
    for f in [1046.5, 1318.5, 1568.0]:
        s = np.sin(2 * np.pi * f * t) * np.clip(slow_env(n, 0.05, 1.0, 0.0), 0, 1) * 0.012
        shimmer += decorrelate(s)
    finalize("sound_space", decorrelate(drone * 0.35) + pad + shimmer, 0.055)


def deepsleep(dur=64):
    n = int(dur * SR)
    t = np.arange(n) / SR
    brown = np.cumsum(noise(n), axis=1)
    brown /= np.max(np.abs(brown)) + 1e-9
    warm = lp(brown * 3.0, 240)
    hum = 0.10 * np.sin(2 * np.pi * 58 * t) * slow_env(n, 0.04, 0.2)
    finalize("sound_deepsleep", warm + decorrelate(hum), 0.07)


# ---------- 일상 ASMR ----------
def keyboard(dur=48):
    n = int(dur * SR)
    out = np.zeros((2, n))
    typing, t = True, 0.0
    while t < dur:
        if typing:
            t += rng.exponential(0.11)
            click = bp(noise(int(0.012 * SR), 1)[0], 1800, 5200) * np.exp(-np.arange(int(0.012 * SR)) / (0.002 * SR))
            thock = tone(rng.uniform(140, 190), 0.03, 0.008)
            snd = click * 0.8 + np.pad(thock, (0, max(0, len(click) - len(thock))))[: len(click)]
            place(out, snd, t, rng.uniform(0.5, 1.0), rng.uniform(-0.35, 0.35))
            if rng.random() < 0.06:  # 스페이스바
                place(out, tone(95, 0.045, 0.012), t + 0.05, 0.9)
            if rng.random() < 0.055:
                typing = False
        else:
            t += rng.uniform(0.8, 2.2)  # 생각하는 멈춤
            typing = True
    bed = lp(noise(n), 400) * 0.18
    finalize("sound_keyboard", out * 2.2 + bed, 0.04, loop_xfade=0)


def pencil(dur=48):
    n = int(dur * SR)
    out = np.zeros((2, n))
    t = 0.0
    while t < dur:
        for _ in range(rng.integers(3, 8)):  # 글자 획들
            ln = int(rng.uniform(0.08, 0.3) * SR)
            env = np.sin(np.linspace(0, np.pi, ln)) ** 0.7
            stroke = bp(noise(ln, 1)[0], 1400, 5600) * env
            place(out, stroke, t, rng.uniform(0.4, 0.7), rng.uniform(-0.2, 0.2))
            t += ln / SR + rng.uniform(0.02, 0.1)
        t += rng.uniform(0.3, 1.4)  # 단어 사이
        if rng.random() < 0.12:
            t += rng.uniform(1.0, 2.5)  # 생각
    bed = lp(noise(n), 350) * 0.15
    finalize("sound_pencil", out * 2.0 + bed, 0.035, loop_xfade=0)


def boiling(dur=56):
    n = int(dur * SR)
    out = np.zeros((2, n))
    for t in events(dur, 9.0):  # 잔거품
        f0 = rng.uniform(420, 900)
        ln = int(rng.uniform(0.02, 0.05) * SR)
        tt = np.arange(ln) / SR
        sweep = np.sin(2 * np.pi * (f0 - 120 * tt / (ln / SR)) * tt) * np.exp(-tt / 0.015)
        place(out, sweep, t, rng.uniform(0.25, 0.6), rng.uniform(-0.5, 0.5))
    for t in events(dur, 0.7):  # 큰 보글
        ln = int(0.09 * SR)
        tt = np.arange(ln) / SR
        blub = np.sin(2 * np.pi * (300 - 140 * tt / 0.09) * tt) * np.exp(-tt / 0.03)
        place(out, blub, t, rng.uniform(0.7, 1.0), rng.uniform(-0.3, 0.3))
    simmer = bp(noise(n), 500, 3500) * 0.5 * slow_env(n, 0.08, 0.15)
    finalize("sound_boiling", out * 2.0 + simmer, 0.055, loop_xfade=0)


def shower(dur=54):
    n = int(dur * SR)
    spray = bp(noise(n), 900, 8000) * slow_env(n, 0.06, 0.06)
    out = np.zeros((2, n))
    for t in events(dur, 22.0):  # 물방울 타닥
        ln = int(0.008 * SR)
        p = bp(noise(ln, 1)[0], 1200, 6000) * np.exp(-np.arange(ln) / (0.0015 * SR))
        place(out, p, t, rng.uniform(0.3, 0.8), rng.uniform(-0.6, 0.6))
    room = lp(noise(n), 300) * 0.45
    finalize("sound_shower", spray + out * 1.4 + room, 0.075)


def library(dur=60):
    n = int(dur * SR)
    room = lp(noise(n), 500, 5) * 1.2 * slow_env(n, 0.03, 0.08)  # 룸톤
    out = np.zeros((2, n))
    for t in events(dur, 0.12):  # 페이지 넘김
        ln = int(rng.uniform(0.25, 0.45) * SR)
        env = np.sin(np.linspace(0, np.pi, ln)) ** 1.5
        page = bp(noise(ln, 1)[0], 800, 4500) * env
        place(out, page, t, rng.uniform(0.5, 0.8), rng.uniform(-0.5, 0.5))
    for t in events(dur, 0.25):  # 먼 필기
        ln = int(rng.uniform(0.3, 0.8) * SR)
        env = np.sin(np.linspace(0, np.pi, ln)) ** 0.8
        w = bp(noise(ln, 1)[0], 1500, 4000) * env
        place(out, w, t, rng.uniform(0.1, 0.22), rng.uniform(-0.7, 0.7))
    finalize("sound_library", room + out, 0.035, loop_xfade=0)


# ---------- 리듬과 소음 ----------
def fan(dur=48):
    n = int(dur * SR)
    t = np.arange(n) / SR
    hum = 0.5 * np.sin(2 * np.pi * 104 * t) + 0.22 * np.sin(2 * np.pi * 208 * t) + 0.1 * np.sin(2 * np.pi * 312 * t)
    blade = lp(noise(n), 900) * (0.75 + 0.25 * lfo(n, 3.8))  # 날개 통과감
    finalize("sound_fan", decorrelate(hum * 0.35) + blade, 0.07)


def airplane(dur=64):
    n = int(dur * SR)
    t = np.arange(n) / SR
    brown = np.cumsum(noise(n), axis=1)
    brown /= np.max(np.abs(brown)) + 1e-9
    body = lp(brown * 3.0, 480) * slow_env(n, 0.04, 0.08)
    engine = 0.12 * np.sin(2 * np.pi * 106 * t) + 0.05 * np.sin(2 * np.pi * 212.7 * t)
    vent = bp(noise(n), 1500, 5000) * 0.10
    finalize("sound_airplane", body + decorrelate(engine) + vent, 0.075)


def washer(dur=57.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    motor = 0.3 * np.sin(2 * np.pi * 82 * t) + 0.12 * np.sin(2 * np.pi * 164 * t)
    cyc = 0.9  # 드럼 회전
    slosh_env = 0.45 + 0.55 * (0.5 + 0.5 * np.sin(2 * np.pi * t / cyc - 1.2)) ** 1.6
    slosh = bp(noise(n), 300, 2200) * slosh_env
    out = np.zeros((2, n))
    for i in range(int(dur / cyc)):  # 젖은 빨래 툭
        place(out, lp(tone(120, 0.06, 0.02), 400), i * cyc + 0.35, rng.uniform(0.2, 0.5), rng.uniform(-0.3, 0.3))
    finalize("sound_washer", decorrelate(motor) + slosh * 0.8 + out, 0.065, loop_xfade=0)


def clockticks(dur=48):
    n = int(dur * SR)
    out = np.zeros((2, n))
    tick = bp(noise(int(0.006 * SR), 1)[0], 2500, 6000) * np.exp(-np.arange(int(0.006 * SR)) / (0.0012 * SR))
    body_t = tone(820, 0.05, 0.01)
    body_k = tone(660, 0.05, 0.012)
    for i in range(int(dur)):
        place(out, tick * 0.9, i, 1.0, -0.25)
        place(out, np.pad(body_t, (0, 0)), i, 0.5, -0.25)
        place(out, tick * 0.8, i + 0.5, 0.9, 0.25)
        place(out, body_k, i + 0.5, 0.5, 0.25)
    room = lp(noise(n), 400) * 0.22
    finalize("sound_clock", out * 2.0 + room, 0.04, loop_xfade=0)


def greennoise(dur=60):
    n = int(dur * SR)
    g = bp(noise(n), 180, 1400, order=2)  # 중역 집중 '초록소음'
    finalize("sound_greennoise", g, 0.08)


ALL = {
    "waterfall": waterfall, "snownight": snownight, "cicada": cicada, "reeds": reeds, "tentrain": tentrain,
    "omdrone": omdrone, "heartbeat": heartbeat, "lullaby": lullaby, "space": space, "deepsleep": deepsleep,
    "keyboard": keyboard, "pencil": pencil, "boiling": boiling, "shower": shower, "library": library,
    "fan": fan, "airplane": airplane, "washer": washer, "clock": clockticks, "greennoise": greennoise,
}

if __name__ == "__main__":
    names = sys.argv[1:] or list(ALL)
    for nm in names:
        ALL[nm]()
