# -*- coding: utf-8 -*-
"""
3HA Mental Care — 고품질 프로시저럴 사운드 합성
ambient 루프 4종 + SFX 12종을 44.1kHz 스테레오로 생성.
"""
import numpy as np
from scipy import signal
from scipy.io import wavfile
import os

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sounds_wav")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(20260703)

# ---------------------------------------------------------------- helpers
def t_axis(dur):
    return np.arange(int(dur * SR)) / SR

def white(n):
    return rng.standard_normal(n)

def pink(n):
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    x = signal.lfilter(b, a, white(n + SR))[SR:]
    return x / (np.std(x) + 1e-9)

def brown(n):
    x = np.cumsum(white(n + SR))
    sos = signal.butter(2, 20, "highpass", fs=SR, output="sos")
    x = signal.sosfilt(sos, x)[SR:]
    return x / (np.std(x) + 1e-9)

def bp(x, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)

def lp(x, fc, order=4):
    sos = signal.butter(order, fc, "lowpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)

def hp(x, fc, order=4):
    sos = signal.butter(order, fc, "highpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)

def env_ad(n, a, d, curve=3.0):
    """attack-decay envelope (samples), exponential decay."""
    na = max(1, int(a * SR))
    nd = n - na
    e = np.zeros(n)
    e[:na] = np.linspace(0, 1, na) ** 0.7
    e[na:] = np.exp(-curve * np.linspace(0, 1, nd)) if nd > 0 else 1
    return e

def smooth_lfo(dur, rate_hz, lo=0.0, hi=1.0, seed_offset=0):
    """느린 랜덤 LFO — control point 보간 후 저역 스무딩"""
    n = int(dur * SR)
    npts = max(4, int(dur * rate_hz) + 2)
    pts = rng.uniform(lo, hi, npts)
    x = np.interp(np.linspace(0, npts - 1, n), np.arange(npts), pts)
    sos = signal.butter(2, max(rate_hz * 2, 0.5), "lowpass", fs=SR, output="sos")
    return signal.sosfiltfilt(sos, x)

def fade(x, fin=0.005, fout=0.02):
    ni, no = int(fin * SR), int(fout * SR)
    if ni > 0:
        x[..., :ni] *= np.linspace(0, 1, ni)
    if no > 0:
        x[..., -no:] *= np.linspace(1, 0, no)
    return x

def norm(x, peak=0.85):
    return x * (peak / (np.max(np.abs(x)) + 1e-9))

def soft_limit(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)

def make_loop(x, xfade=1.5):
    """등파워 크로스페이드로 끊김 없는 루프 생성"""
    nf = int(xfade * SR)
    a = x[:, :nf] if x.ndim == 2 else x[:nf]
    body = x[..., nf:]
    w = np.linspace(0, np.pi / 2, nf)
    fin, fout = np.sin(w) ** 2, np.cos(w) ** 2
    tail = body[..., -nf:].copy()
    body = body[..., :-nf]
    mixed = tail * fout + a * fin
    return np.concatenate([mixed, body], axis=-1)

def save(name, x, peak=0.85, rms_target=None):
    x = np.atleast_2d(x)
    if x.shape[0] == 1:
        x = np.vstack([x[0], x[0]])
    x = x - np.mean(x, axis=1, keepdims=True)
    if rms_target is not None:
        # RMS 기준 정규화 (사운드 간 체감 음량 통일) + 소프트리밋 피크 보호만
        cur = np.sqrt(np.mean(x ** 2))
        x = x * (rms_target / (cur + 1e-9))
        x = soft_limit(x, 1.15)
        pk = np.max(np.abs(x))
        if pk > 0.92:
            x = x * (0.92 / pk)
    else:
        x = norm(x, peak)
    wavfile.write(os.path.join(OUT, name + ".wav"), SR, (x.T * 32767).astype(np.int16))
    print(f"  {name}: {x.shape[1]/SR:.2f}s peak={np.max(np.abs(x)):.2f}")

# ================================================================ AMBIENT
print("[ambient]")

# ---------------- 파도 : 뚜렷한 밀려옴/부서짐 주기 -------------------------
def waves(dur=44.0):
    n = int(dur * SR)
    L, R = np.zeros(n), np.zeros(n)
    # 저역 심해 배경 + 먼 파도의 연속적인 워시(트로프가 죽지 않게)
    surf_mod = smooth_lfo(dur, 0.13, 0.5, 1.0)
    bedL = lp(brown(n), 120) * 0.30 + lp(pink(n), 900) * surf_mod * 0.12
    bedR = lp(brown(n), 120) * 0.30 + lp(pink(n), 900) * surf_mod * 0.12
    # 파도 이벤트: 약 8초 주기, 강약 교차
    tev, k = 1.0, 0
    while tev < dur - 7.5:
        strength = 0.75 + 0.45 * (k % 2) + rng.uniform(-0.1, 0.1)
        bright_fc = rng.uniform(3200, 5200)  # 파도마다 밝기 변화
        i0 = int(tev * SR)
        # (1) 밀려오는 스웰 3.2s — 어두운 노이즈가 점점 차오름
        ns = int(3.2 * SR)
        sw = lp(pink(ns), 550) * (np.linspace(0, 1, ns) ** 1.8) * 0.55 * strength
        # (2) 부서짐 4.5s — 완만한 어택(0.4s) 후 긴 감쇠, 파도별 밝기 변화
        nb = int(4.5 * SR)
        br_env = env_ad(nb, 0.4, 0.0, curve=0)  # attack만
        decay = np.exp(-2.0 * np.linspace(0, 1, nb))
        hiss = pink(nb)
        bright = lp(hiss, bright_fc) * 0.6 + lp(hiss, 1200) * 0.5
        wash = bright * br_env * decay * strength
        # (3) 거품 시즐 — 부서짐 직후 살짝 늦게 퍼지는 잔거품
        foam = hp(pink(nb), 2800) * env_ad(nb, 0.7, 0.0, curve=0) * np.exp(-1.5 * np.linspace(0, 1, nb)) * 0.22 * strength
        tail = hp(pink(nb), 1500) * decay ** 1.6 * 0.15 * strength
        panL = 0.5 + 0.35 * rng.uniform(-1, 1)
        for sig_, off in ((sw, i0), (wash + foam + tail, i0 + int(2.9 * SR))):
            j1 = min(n, off + len(sig_))
            seg = sig_[: j1 - off]
            L[off:j1] += seg * panL
            R[off:j1] += seg * (1 - panL)
        tev += 7.8 + rng.uniform(-0.6, 0.6)
        k += 1
    L, R = L + bedL, R + bedR
    st = make_loop(np.vstack([L, R]), 2.0)
    return st

save("sound_waves", waves(), peak=0.72, rms_target=0.10)

# ---------------- 숲 바람 : 돌풍 LFO + 잎사귀 러슬 --------------------------
def forest(dur=44.0):
    n = int(dur * SR)
    gust = smooth_lfo(dur, 0.10, 0.15, 1.0) ** 1.6      # 느린 돌풍
    flutter = smooth_lfo(dur, 14, 0.35, 1.0)            # 잎 떨림
    body = lp(pink(n), 400) * 0.55                       # 바람 몸통(어두움)
    breath = bp(pink(n), 300, 1600) * gust * 0.7        # 돌풍 숨결
    leaves_l = bp(pink(n), 2500, 9000) * (gust ** 1.4) * flutter * 0.5
    leaves_r = bp(pink(n), 2500, 9000) * (gust ** 1.4) * smooth_lfo(dur, 16, 0.35, 1.0) * 0.5
    L = body + breath + leaves_l
    R = body * 0.98 + breath * 1.02 + leaves_r
    st = make_loop(np.vstack([L, R]), 2.0)
    return st

save("sound_forest", forest(), peak=0.65, rms_target=0.085)

# ---------------- 아침 참새 : FM 지저귐 3마리 ------------------------------
def bird_syllable(f0, dur_s, shape):
    """새소리 음절 — 급한 어택+지수 감쇠, 밝기 감쇠, 미세 지터로 유기적인 질감"""
    n = int(dur_s * SR)
    t = np.arange(n) / SR
    if shape == "up":
        f = f0 * (1 + 0.55 * (t / dur_s) ** 1.3)
    elif shape == "down":
        f = f0 * (1.45 - 0.55 * (t / dur_s) ** 0.8)
    elif shape == "trill":
        f = f0 * (1 + 0.16 * np.sin(2 * np.pi * rng.uniform(32, 46) * t))
    else:  # arc
        f = f0 * (1 + 0.42 * np.sin(np.pi * t / dur_s))
    # 미세한 주파수 지터 (기계음 제거의 핵심)
    f = f * (1 + smooth_lfo(dur_s, 60, -0.012, 0.012)[:n])
    ph = 2 * np.pi * np.cumsum(f) / SR
    # 배음은 시간이 지날수록 어두워짐
    h2 = 0.4 * np.exp(-t * 25)
    h3 = 0.12 * np.exp(-t * 45)
    tone = np.sin(ph) + h2 * np.sin(2 * ph) + h3 * np.sin(3 * ph)
    # 비대칭 엔벨로프: 8% 어택 + 지수 감쇠 (새의 발성에 가까움)
    na = max(2, int(0.08 * n))
    e = np.ones(n)
    e[:na] = np.linspace(0, 1, na) ** 0.6
    e[na:] = np.exp(-3.2 * np.linspace(0, 1, n - na))
    syl = tone * e
    # 발성 시작의 짧은 'chip' 트랜지언트
    nc = max(2, int(0.0015 * SR))
    syl[:nc] += bp(white(nc), max(f0 * 0.8, 1500), min(f0 * 2.4, 12000), 2) * 0.25
    return syl

def sparrow(dur=40.0):
    n = int(dur * SR)
    L, R = np.zeros(n), np.zeros(n)
    # 새벽 공기 배경 (아주 조용)
    airL = hp(pink(n), 800) * 0.012 + lp(brown(n), 100) * 0.04
    airR = hp(pink(n), 800) * 0.012 + lp(brown(n), 100) * 0.04
    voices = [
        dict(f0=3400, pan=0.75, amp=0.85),   # 가까운 참새 (우측)
        dict(f0=2800, pan=0.25, amp=0.55),   # 왼쪽 중간거리
        dict(f0=4100, pan=0.55, amp=0.28),   # 먼 새
    ]
    for v in voices:
        tcur = rng.uniform(0.6, 2.0)
        while tcur < dur - 2.2:  # 루프 경계 앞뒤는 지저귐 없는 '쉼' 구간 → 심리스
            nsyl = rng.integers(3, 9)
            # 노래 안에서 자연스러운 강약 곡선 (크레셴도→데크레셴도)
            song_env = np.sin(np.pi * (np.arange(nsyl) + 0.5) / nsyl) * 0.4 + 0.6
            for si in range(nsyl):
                shape = rng.choice(["up", "down", "trill", "arc"], p=[0.3, 0.2, 0.25, 0.25])
                dlen = rng.uniform(0.045, 0.13)
                syl = bird_syllable(v["f0"] * rng.uniform(0.92, 1.08), dlen, shape) * v["amp"]
                syl *= rng.uniform(0.75, 1.0) * song_env[si]
                i0 = int(tcur * SR)
                j1 = min(n, i0 + len(syl))
                if j1 <= i0:
                    break
                L[i0:j1] += syl[: j1 - i0] * v["pan"]
                R[i0:j1] += syl[: j1 - i0] * (1 - v["pan"])
                tcur += dlen + rng.uniform(0.03, 0.10)
            tcur += rng.uniform(0.9, 3.0)
    # 은은한 공간감(짧은 에코)
    d = int(0.09 * SR)
    L[d:] += R[:-d] * 0.10
    R[d:] += L[:-d] * 0.10
    L, R = lp(L, 9000) + airL, lp(R, 9000) + airR
    st = make_loop(np.vstack([L, R]), 0.8)
    return st

save("sound_sparrow", sparrow(), peak=0.62, rms_target=0.045)

# ---------------- 책 넘기기 : 조용한 서재 ----------------------------------
def one_pageturn(strength=1.0):
    # slide(종이 미끄러짐) + flick(탁) + settle
    ns = int(0.22 * SR)
    slide = bp(white(ns), 1000, 5000) * np.sin(np.pi * np.linspace(0, 1, ns)) ** 1.3 * 0.5
    nf = int(0.05 * SR)
    flick = bp(white(nf), 2000, 8000) * np.exp(-28 * np.linspace(0, 1, nf)) * 1.1
    nset = int(0.09 * SR)
    settle = lp(white(nset), 700) * np.exp(-18 * np.linspace(0, 1, nset)) * 0.45
    out = np.zeros(ns + nf + nset)
    out[:ns] += slide
    out[int(0.16 * SR):int(0.16 * SR) + nf] += flick
    out[ns:ns + nset] += settle
    return out * strength

def pageflip(dur=36.0):
    n = int(dur * SR)
    L, R = np.zeros(n), np.zeros(n)
    room = lp(brown(n), 90) * 0.045
    tcur = 1.2
    while tcur < dur - 1.0:
        pt = one_pageturn(rng.uniform(0.7, 1.0))
        pan = rng.uniform(0.42, 0.58)
        i0 = int(tcur * SR)
        j1 = min(n, i0 + len(pt))
        L[i0:j1] += pt[: j1 - i0] * pan
        R[i0:j1] += pt[: j1 - i0] * (1 - pan)
        tcur += rng.uniform(3.8, 6.5)
    L, R = L + room, R + room * 0.97
    st = make_loop(np.vstack([L, R]), 1.0)
    return st

save("sound_pageflip", pageflip(), peak=0.60, rms_target=0.035)

# ================================================================ SFX
print("[sfx]")

# ---------------- 차임 (호흡 완료) ------------------------------------------
def chime():
    dur = 4.2
    t = t_axis(dur)
    f0 = 587.33  # D5
    partials = [(1.0, 1.0, 1.9), (2.0, 0.5, 2.6), (2.92, 0.34, 3.4), (4.2, 0.16, 4.6), (5.44, 0.08, 6.0)]
    x = np.zeros(len(t))
    for ratio, amp, dk in partials:
        det = rng.uniform(0.9995, 1.0005)
        x += amp * np.sin(2 * np.pi * f0 * ratio * det * t) * np.exp(-dk * t)
        x += amp * 0.6 * np.sin(2 * np.pi * f0 * ratio * det * 1.003 * t) * np.exp(-dk * 1.1 * t)
    # 부드러운 타격감
    nstr = int(0.012 * SR)
    strike = lp(white(nstr), 3000) * np.exp(-30 * np.linspace(0, 1, nstr)) * 0.5
    x[:nstr] += strike
    x *= 1 - np.exp(-np.linspace(0, 60, len(t)))  # 3ms 소프트 어택
    L = x
    R = np.roll(x, int(0.0006 * SR))
    return fade(np.vstack([L, R]), 0.001, 0.35)

save("sound_chime", chime(), peak=0.72)

# ---------------- 불 (걱정 태우기, 2.4s) ------------------------------------
def fire():
    dur = 2.4
    n = int(dur * SR)
    envm = np.minimum(np.linspace(0, 1, n) / 0.18, 1) * np.exp(-1.6 * np.maximum(np.linspace(0, 1, n) - 0.55, 0))
    rumble = lp(brown(n), 350) * envm * 0.8
    # 점화 whoosh
    nw = int(1.1 * SR)
    sweep = bp(pink(nw), 150, 1000) * np.sin(np.pi * np.linspace(0, 1, nw)) ** 1.4 * 0.5
    rumble[:nw] += sweep
    # 크래클
    crackle = np.zeros(n)
    for _ in range(26):
        tp = rng.uniform(0.1, dur - 0.15)
        nc = int(rng.uniform(0.004, 0.014) * SR)
        f = rng.uniform(1800, 5200)
        tc = np.arange(nc) / SR
        c = np.sin(2 * np.pi * f * tc) * np.exp(-tc * rng.uniform(600, 1600) * 1.0)
        c += hp(white(nc), 2500) * np.exp(-tc * 900) * 0.6
        i0 = int(tp * SR)
        crackle[i0:i0 + nc] += c * rng.uniform(0.25, 0.9)
    x = rumble + crackle * envm
    return fade(np.vstack([x, x]), 0.01, 0.25)

save("sound_fire", fire(), peak=0.82)

# ---------------- 클릭 (만지작 보드) ----------------------------------------
def click():
    n = int(0.10 * SR)
    x = np.zeros(n)
    # press
    npr = int(0.007 * SR)
    x[:npr] += bp(white(npr), 2200, 5200) * np.exp(-np.linspace(0, 9, npr))
    nth = int(0.03 * SR)
    x[:nth] += np.sin(2 * np.pi * 190 * np.arange(nth) / SR) * np.exp(-np.linspace(0, 8, nth)) * 0.7
    # release (35ms 뒤, 살짝 높고 약하게)
    i0 = int(0.038 * SR)
    nrl = int(0.005 * SR)
    x[i0:i0 + nrl] += bp(white(nrl), 3000, 6500) * np.exp(-np.linspace(0, 9, nrl)) * 0.45
    return fade(np.vstack([x, x]), 0.0005, 0.02)

save("sound_click", click(), peak=0.80)

# ---------------- 팝 (톡톡 팝) ----------------------------------------------
def pop(f_hi=850, f_lo=320, dur=0.13, click_amp=0.5, soft=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_hi * (f_lo / f_hi) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 38)
    if not soft:
        nc = int(0.0012 * SR)
        x[:nc] += white(nc) * click_amp
    else:
        x = lp(x, 4000)
    return fade(np.vstack([x, x]), 0.0008, 0.03)

save("sound_pop", pop(), peak=0.80)

# ---------------- 비눗방울 (soap) -------------------------------------------
def bubble():
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    f = 1500 * (600 / 1500) ** (t / 0.16)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 30) * 0.9
    # 물기 있는 blip 꼬리 (상승 처프)
    nb = int(0.045 * SR)
    tb = np.arange(nb) / SR
    fb = 420 * (980 / 420) ** (tb / 0.045)
    blip = np.sin(2 * np.pi * np.cumsum(fb) / SR) * np.exp(-tb * 55) * 0.22
    i0 = int(0.05 * SR)
    x[i0:i0 + nb] += blip
    x = lp(x, 5000)
    return fade(np.vstack([x, x]), 0.004, 0.04)

save("sound_bubble", bubble(), peak=0.68)

# ---------------- 뽁뽁이 (popwrap) ------------------------------------------
def popwrap():
    n = int(0.11 * SR)
    x = np.zeros(n)
    nb_ = int(0.009 * SR)
    x[:nb_] += bp(white(nb_), 700, 2600) * np.exp(-np.linspace(0, 7, nb_)) * 1.2
    nsn = int(0.004 * SR)
    x[:nsn] += bp(white(nsn), 3000, 7000) * 0.5
    nth = int(0.06 * SR)
    x[:nth] += np.sin(2 * np.pi * 205 * np.arange(nth) / SR) * np.exp(-np.linspace(0, 10, nth)) * 0.9
    return fade(np.vstack([x, x]), 0.0005, 0.03)

save("sound_popwrap", popwrap(), peak=0.82)

# ---------------- 물수제비 plop ---------------------------------------------
def plop():
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = 480 * (130 / 480) ** (np.minimum(t / 0.16, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 22)
    # 공명 bloink
    x += np.sin(2 * np.pi * 290 * t) * np.exp(-t * 30) * 0.35
    # 작은 물튀김
    nsp = int(0.12 * SR)
    sp = bp(white(nsp), 2000, 6500) * np.exp(-np.linspace(0, 7, nsp)) * 0.14
    i0 = int(0.03 * SR)
    x[i0:i0 + nsp] += sp
    return fade(np.vstack([x, x]), 0.002, 0.06)

save("sound_plop", plop(), peak=0.78)

# ---------------- 슬라임 squish ---------------------------------------------
def squish():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    base = bp(white(n), 250, 1500)
    wob = 0.4 + 0.6 * np.abs(np.sin(2 * np.pi * (18 + 26 * t) * t))
    grains = smooth_lfo(0.22, 55, 0.2, 1.0)[:n]
    x = base * wob * grains * np.exp(-t * 9)
    x = lp(x, 2200)
    x += np.sin(2 * np.pi * 110 * t) * np.exp(-t * 18) * 0.3
    return fade(np.vstack([x, x]), 0.004, 0.05)

save("sound_squish", squish(), peak=0.72)

# ---------------- 접시 깨기 crash -------------------------------------------
def crash():
    dur = 0.75
    n = int(dur * SR)
    x = np.zeros(n)
    # 임팩트
    nim = int(0.035 * SR)
    x[:nim] += lp(white(nim), 900) * np.exp(-np.linspace(0, 6, nim)) * 1.1
    x[:nim] += np.sin(2 * np.pi * 85 * np.arange(nim) / SR) * np.exp(-np.linspace(0, 5, nim)) * 0.8
    # 파편 핑 (도자기)
    for _ in range(16):
        tp = rng.uniform(0.0, 0.28) ** 1.5  # 초반 밀집
        f = rng.uniform(2200, 7800)
        nl = int(rng.uniform(0.04, 0.13) * SR)
        tt = np.arange(nl) / SR
        ping = np.sin(2 * np.pi * f * tt) * np.exp(-tt * rng.uniform(45, 90))
        ping += np.sin(2 * np.pi * f * 2.31 * tt) * np.exp(-tt * 110) * 0.4
        i0 = int(tp * SR)
        j1 = min(n, i0 + nl)
        x[i0:j1] += ping[: j1 - i0] * rng.uniform(0.25, 0.7)
    # 잔파편 노이즈
    x += hp(white(n), 3000) * np.exp(-np.linspace(0, 9, n)) * 0.3
    L = x
    R = np.roll(x, int(0.0009 * SR)) * 0.96
    return fade(np.vstack([L, R]), 0.0008, 0.12)

save("sound_crash", crash(), peak=0.84)

# ---------------- 소리 발산 whoosh ------------------------------------------
def whoosh():
    dur = 0.6
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    src = pink(n)
    # 대역 중심 상승→하강
    c1 = bp(src, 200, 900) * (1 - t) ** 1.2
    c2 = bp(src, 700, 2600) * np.sin(np.pi * t) ** 1.5
    c3 = bp(src, 1800, 5000) * np.sin(np.pi * np.minimum(t * 1.4, 1)) ** 3
    e = np.sin(np.pi * t ** 0.8) ** 1.2
    x = (c1 * 0.6 + c2 + c3 * 0.5) * e
    panL = 0.65 - 0.3 * t
    return fade(np.vstack([x * panL, x * (1 - panL)]), 0.01, 0.08)

save("sound_whoosh", whoosh(), peak=0.78)

# ---------------- 잎사귀 쓸기 rustle ----------------------------------------
def rustle():
    dur = 0.5
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    grains = smooth_lfo(dur, 90, 0.0, 1.0)[:n] ** 1.5
    x = bp(white(n), 2200, 9000) * grains * np.sin(np.pi * t ** 0.9) ** 1.1
    x += bp(white(n), 500, 1500) * np.sin(np.pi * t) * 0.18  # 빗자루 몸통
    return fade(np.vstack([x, x * 0.94]), 0.01, 0.09)

save("sound_rustle", rustle(), peak=0.70)

# ---------------- 젠 가든 scrape --------------------------------------------
def scrape():
    """zen.tsx에서 드래그 중 loop=true로 재생 → 심리스 루프 텍스처여야 함 (원샷 아님)"""
    dur = 2.4
    n = int(dur * SR)
    grains = smooth_lfo(dur, 70, 0.3, 1.0)[:n]          # 모래 알갱이 질감
    drift = smooth_lfo(dur, 0.8, 0.55, 1.0)[:n]         # 손 움직임의 느린 강약
    x = bp(white(n), 900, 3200) * grains * drift
    x = lp(x, 4200) * 0.9
    x += bp(white(n), 300, 800) * drift * 0.25          # 갈퀴 몸통 저역
    st = make_loop(np.vstack([x, x * 0.95]), 0.4)       # 양끝 페이드 없이 크로스페이드 루프
    return st

save("sound_scrape", scrape(), peak=0.62)

# ---------------- 호흡 페이즈 큐 3종 ----------------------------------------
def breath_cue(kind):
    """눈 감고도 페이즈를 알 수 있는 은은한 톤 큐 — 놀라지 않게 느린 어택"""
    if kind == "in":      # 들숨: G4 → D5 상승 (숨이 차오르는 방향)
        dur, f_start, f_end = 0.7, 392.0, 587.33
    elif kind == "hold":  # 멈춤: C5 단음 (중립)
        dur, f_start, f_end = 0.5, 523.25, 523.25
    else:                 # 날숨: D5 → G4 하강 (내려놓는 방향)
        dur, f_start, f_end = 0.9, 587.33, 392.0
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f_start * (f_end / f_start) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.25 * np.sin(2 * ph) * np.exp(-t * 4)
    na = int(0.06 * SR)  # 60ms 소프트 어택
    e = np.ones(n)
    e[:na] = np.linspace(0, 1, na) ** 1.5
    e[na:] = np.exp(-2.6 * np.linspace(0, 1, n - na))
    x = lp(x * e, 3000)
    return fade(np.vstack([x, x]), 0.01, 0.12)

save("sound_cue_in", breath_cue("in"), peak=0.5)
save("sound_cue_hold", breath_cue("hold"), peak=0.42)
save("sound_cue_out", breath_cue("out"), peak=0.5)

# ════════════════════════════════════════════════════════════ AMBIENT 확장 10종
from scipy.signal import fftconvolve

print("[ambient-2]")

def poisson_times(dur, rate, t0=0.2, t1=None):
    """포아송 이벤트 시각 목록"""
    t1 = dur if t1 is None else t1
    out, t = [], t0
    while True:
        t += rng.exponential(1.0 / rate)
        if t >= t1:
            return out
        out.append(t)

def place(dst, sig_, t):
    i0 = int(t * SR)
    j1 = min(len(dst), i0 + len(sig_))
    if j1 > i0:
        dst[i0:j1] += sig_[: j1 - i0]

def small_reverb(x, taps=((0.21, 0.38), (0.43, 0.20), (0.66, 0.10)), wet_lp=2200):
    """멀티탭 에코 기반의 값싼 공간감"""
    y = x.copy()
    for dt, g in taps:
        d = int(dt * SR)
        y[d:] += lp(x[:-d], wet_lp) * g
        wet_lp = max(800, wet_lp * 0.7)
    return y

# ---------------- 잔잔한 비 -------------------------------------------------
def rain_layers(dur, brightness=1.0, level=1.0):
    """비 스테레오 레이어 (thunder에서 재사용)"""
    n = int(dur * SR)
    ch = []
    hiss_mod = smooth_lfo(dur, 0.08, 0.85, 1.0)
    for _side in range(2):
        # (1) 빗줄기 히스 — 밀도의 몸통
        hiss = bp(pink(n), 1200, 9500) * hiss_mod * 0.15 * brightness
        # (2) 미세 물방울 — 스파이크 + 2.5ms 감쇠 커널 컨볼브
        spikes = np.zeros(n)
        idx = (rng.uniform(0.05, dur - 0.05, int(dur * 210)) * SR).astype(int)
        spikes[idx] = rng.uniform(0.2, 1.0, len(idx)) ** 3
        kern = white(int(0.0025 * SR)) * np.exp(-np.linspace(0, 7, int(0.0025 * SR)))
        micro = bp(fftconvolve(spikes, kern)[:n], 2500, 10000) * 0.5 * brightness
        # (3) 중간 물방울 — 커널 뱅크 12종으로 개성 부여
        kerns = []
        for _ in range(12):
            kl = int(rng.uniform(0.004, 0.009) * SR)
            kerns.append(bp(white(kl), rng.uniform(1400, 3200), rng.uniform(3800, 7000), 2) * np.exp(-np.linspace(0, 6, kl)))
        med = np.zeros(n)
        for t in poisson_times(dur, 24):
            place(med, kerns[rng.integers(12)] * rng.uniform(0.15, 0.75), t)
        # (4) 굵은 방울 'plip' — 하강 처프
        big = np.zeros(n)
        for t in poisson_times(dur, 2.5):
            bl = int(0.012 * SR)
            tb = np.arange(bl) / SR
            fc = rng.uniform(2800, 4200)
            chirp = np.sin(2 * np.pi * np.cumsum(fc * (0.45 ** (tb / 0.012))) / SR) * np.exp(-tb * 400)
            place(big, chirp * rng.uniform(0.1, 0.3), t)
        ch.append(hiss + micro + med + big)
    # (5) 공통 저역 워시
    rum = lp(brown(n), 260) * 0.07
    L, R = ch[0] + rum, ch[1] + rum
    return np.vstack([L, R]) * level

def rain(dur=46.0):
    return make_loop(rain_layers(dur), 1.6)

save("sound_rain", rain(), peak=0.66, rms_target=0.085)

# ---------------- 비와 먼 천둥 ----------------------------------------------
def thunder(dur=50.0):
    # 비를 더 어둡고 무겁게 → '잔잔한 비'와 확실히 다른 분위기
    st = rain_layers(dur, brightness=0.55, level=0.78)
    st = np.vstack([lp(st[0], 5200), lp(st[1], 5200)])
    n = st.shape[1]
    # 먼 천둥 3회 — 다봉우리 저역 럼블 (놀라지 않게 어택 느림)
    for tc in [8.5 + rng.uniform(-2, 2), 25 + rng.uniform(-2, 2), 39 + rng.uniform(-2, 2)]:
        dl = rng.uniform(5.5, 7.5)
        nl = int(dl * SR)
        tt = np.linspace(0, dl, nl)
        env = np.zeros(nl)
        for pk in range(rng.integers(2, 4)):
            c, w = rng.uniform(0.8, dl - 1.2), rng.uniform(0.5, 1.1)
            env += np.exp(-0.5 * ((tt - c) / w) ** 2) * rng.uniform(0.5, 1.0)
        env *= np.minimum(tt / 1.2, 1)  # 느린 어택
        rum = lp(brown(nl), 95) * env * 0.55
        sub = lp(brown(nl), 45) * env * 0.35
        panL = rng.uniform(0.35, 0.65)
        sig_ = rum + sub
        i0 = int(tc * SR)
        j1 = min(n, i0 + nl)
        st[0, i0:j1] += sig_[: j1 - i0] * panL
        st[1, i0:j1] += sig_[: j1 - i0] * (1 - panL)
    return make_loop(st, 1.6)

save("sound_thunder", thunder(), peak=0.72, rms_target=0.085)

# ---------------- 시냇물 ----------------------------------------------------
def stream(dur=44.0):
    n = int(dur * SR)
    ch = []
    for _side in range(2):
        # 보글거림: 로그 간격 6개 대역, 각자 빠른 불규칙 AM
        gurgle = np.zeros(n)
        for i, f in enumerate(np.geomspace(340, 2400, 6)):
            am = smooth_lfo(dur, 9 + i * 3.5, 0.05, 1.0) ** 2
            gurgle += bp(white(n), f, f * 1.45, 2) * am * (1.0 - i * 0.09)
        gurgle *= 0.85  # 보글거림이 주인공 — 저역 흐름에 묻히지 않게
        # 잔물결 스파클
        sparkle = bp(white(n), 2600, 7500) * smooth_lfo(dur, 15, 0.2, 1.0) * 0.09
        # 물거품 'plip' — 상승 처프
        plips = np.zeros(n)
        for t in poisson_times(dur, 0.9):
            bl = int(rng.uniform(0.012, 0.022) * SR)
            tb = np.arange(bl) / SR
            f0 = rng.uniform(500, 900)
            f = f0 * (rng.uniform(1.8, 2.6)) ** (tb / tb[-1])
            plip = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * np.linspace(0, 1, bl)) ** 2
            place(plips, plip * rng.uniform(0.08, 0.22), t)
        ch.append(gurgle + sparkle + plips)
    flow = lp(pink(n), 450) * 0.10  # 공통 흐름 저역 (받침 역할만)
    st = np.vstack([ch[0] + flow, ch[1] + flow * 0.97])
    return make_loop(st, 1.6)

save("sound_stream", stream(), peak=0.66, rms_target=0.085)

# ---------------- 모닥불 ----------------------------------------------------
def campfire(dur=46.0):
    n = int(dur * SR)
    breath = smooth_lfo(dur, 0.12, 0.55, 1.0)
    bed = lp(brown(n), 300) * breath * 0.22             # 깊은 화염 럼블 (받침)
    flame = bp(pink(n), 400, 1600) * smooth_lfo(dur, 5, 0.3, 1.0) * 0.16  # 일렁임
    crackle = np.zeros(n)
    for t in poisson_times(dur, 7.0):                    # 잔 크래클
        cl = int(rng.uniform(0.003, 0.010) * SR)
        tc = np.arange(cl) / SR
        f = rng.uniform(1600, 5200)
        c = np.sin(2 * np.pi * f * tc) * np.exp(-tc * rng.uniform(700, 1800))
        c += hp(white(cl), 2800, 2) * np.exp(-tc * 1000) * 0.5
        place(crackle, c * rng.uniform(0.15, 0.8) ** 1.4, t)  # 크래클이 주인공
    pops = np.zeros(n)
    for t in poisson_times(dur, 0.35):                   # 굵은 팝
        pl = int(0.05 * SR)
        tp_ = np.arange(pl) / SR
        f = rng.uniform(800, 2000)
        p = np.sin(2 * np.pi * f * tp_) * np.exp(-tp_ * 160)
        p += np.sin(2 * np.pi * 120 * tp_) * np.exp(-tp_ * 90) * 0.8
        place(pops, p * rng.uniform(0.3, 0.6), t)
    x = bed + flame + crackle * breath + pops
    L = x
    R = bed * 0.98 + flame * 1.02 + np.roll(crackle, int(0.0008 * SR)) * breath + np.roll(pops, int(0.0006 * SR))
    return make_loop(np.vstack([L, R]), 1.6)

save("sound_campfire", campfire(), peak=0.68, rms_target=0.085)

# ---------------- 밤의 풀벌레 -----------------------------------------------
def cricket_voice(dur, f0, period, pan, amp, n):
    """귀뚜라미 한 마리 — '울다 쉬다'를 반복하는 bout 구조 (기계적 규칙성 제거)"""
    L, R = np.zeros(n), np.zeros(n)
    t = rng.uniform(0.3, period + 1.5)
    while t < dur - 0.3:
        bout_end = t + rng.uniform(4.0, 8.5)      # 우는 구간
        fade_len = rng.uniform(1.0, 2.0)          # 시작/끝은 살살
        bout_start = t
        while t < min(bout_end, dur - 0.3):
            # bout 가장자리에서 소리가 작아짐 (갑자기 뚝 시작하지 않게)
            edge = min(1.0, (t - bout_start) / fade_len, max(0.25, (bout_end - t) / fade_len))
            npulse = rng.integers(3, 5)
            for k in range(npulse):
                pl = int(0.013 * SR)
                tp_ = np.arange(pl) / SR
                f = f0 * (1 + 0.02 * np.sin(np.pi * tp_ / tp_[-1])) * rng.uniform(0.995, 1.005)
                pulse = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * np.linspace(0, 1, pl)) ** 1.3
                sig_ = pulse * amp * rng.uniform(0.8, 1.0) * edge
                place(L, sig_ * pan, t + k * 0.026)
                place(R, sig_ * (1 - pan), t + k * 0.026)
            t += period * rng.uniform(0.82, 1.25)
        t += rng.uniform(1.8, 4.5)                # 쉬는 구간
    return L, R

def night_crickets(dur=48.0):
    n = int(dur * SR)
    L, R = np.zeros(n), np.zeros(n)
    for f0, period, pan, amp in [(4300, 1.0, 0.7, 0.5), (4650, 1.35, 0.3, 0.32), (3950, 0.85, 0.5, 0.18)]:
        l, r = cricket_voice(dur - 1.2, f0 * rng.uniform(0.98, 1.02), period, pan, amp, n)
        L += l
        R += r
    # 연속 트릴 종 (아주 은은히, 중간중간)
    trill_on = smooth_lfo(dur, 0.07, 0.0, 1.0) ** 2
    tt = np.arange(n) / SR
    trill = np.sin(2 * np.pi * 5300 * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 41 * tt)) * trill_on * 0.045
    # 부엉이 — 낮고 부드러운 2음 후후
    for tc in [13 + rng.uniform(-3, 3), 32 + rng.uniform(-3, 3)]:
        for k, (fh, dl, ga) in enumerate([(345, 0.35, 0.8), (305, 0.55, 1.0)]):
            hl = int(dl * SR)
            th = np.arange(hl) / SR
            fv = fh * (1 + 0.015 * np.sin(2 * np.pi * 4.2 * th))
            hoot = np.sin(2 * np.pi * np.cumsum(fv) / SR)
            e = np.sin(np.pi * np.minimum(th / 0.08, 1) / 2) * np.exp(-np.maximum(th - dl * 0.4, 0) * 6)
            hoot = lp(hoot * e, 900) * 0.22 * ga
            place(L, hoot * 0.45, tc + k * 0.5)
            place(R, hoot * 0.55, tc + k * 0.5)
    air = lp(pink(n), 500) * 0.05
    st = np.vstack([L + trill * 0.9 + air, R + trill * 1.1 + air * 0.97])
    return make_loop(st, 1.2)

save("sound_crickets", night_crickets(), peak=0.6, rms_target=0.05)

# ---------------- 바람 종 (윈드차임) -----------------------------------------
def chime_note(f0, vel):
    """관형 차임 한 음 — 비조화 배음 + 미세 디튠 반짝임"""
    dl = 2.8 + vel * 1.8
    nl = int(dl * SR)
    t = np.arange(nl) / SR
    x = np.zeros(nl)
    for ratio, a, dk in [(1.0, 1.0, 1.0), (2.76, 0.45, 1.8), (5.40, 0.18, 3.0), (8.93, 0.07, 4.5)]:
        det = rng.uniform(0.9992, 1.0008)
        x += a * np.sin(2 * np.pi * f0 * ratio * det * t) * np.exp(-dk * t / (0.4 + vel))
    na = int(0.004 * SR)
    x[:na] *= np.linspace(0, 1, na)
    return lp(x, 8000) * vel

def windchime(dur=50.0):
    n = int(dur * SR)
    L, R = np.zeros(n), np.zeros(n)
    gust = smooth_lfo(dur, 0.09, 0.0, 1.0) ** 1.7
    scale = [880.0, 987.8, 1108.7, 1318.5, 1479.9, 1760.0]  # A5 펜타토닉
    t = 0.8
    while t < dur - 1.5:
        g = gust[int(t * SR)]
        if rng.random() < 0.12 + g * 0.75:
            for _ in range(rng.integers(1, 2 + int(g * 2.6))):   # 돌풍일수록 클러스터
                f0 = scale[rng.integers(len(scale))]
                vel = rng.uniform(0.25, 0.5) + g * rng.uniform(0.2, 0.5)
                note = chime_note(f0, min(vel, 1.0))
                pan = rng.uniform(0.3, 0.7)
                place(L, note * pan * 0.5, t)
                place(R, note * (1 - pan) * 0.5, t)
                t += rng.uniform(0.06, 0.22)
        t += rng.uniform(0.25, 0.6)
    breeze = lp(pink(n), 500) * (0.35 + 0.65 * gust) * 0.16
    st = np.vstack([L + breeze, R + breeze * 0.97])
    return make_loop(st, 1.6)

save("sound_windchime", windchime(), peak=0.6, rms_target=0.055)

# ---------------- 싱잉볼 ----------------------------------------------------
def bowl_strike(f0, dl=12.0):
    nl = int(dl * SR)
    t = np.arange(nl) / SR
    x = np.zeros(nl)
    for ratio, a, dk in [(1.0, 1.0, 11.0), (2.71, 0.42, 7.0), (5.05, 0.14, 4.5), (8.10, 0.05, 3.0)]:
        for det in (1 - 0.0012, 1 + 0.0012):  # 쌍 디튠 → 0.5Hz 내외 맥놀이(웅웅거림)
            x += a * 0.5 * np.sin(2 * np.pi * f0 * ratio * det * t) * np.exp(-t / dk * 3)
    na = int(0.03 * SR)  # 매우 부드러운 타격
    x[:na] *= np.linspace(0, 1, na) ** 0.8
    x[:na] += lp(white(na), 1000) * np.exp(-np.linspace(0, 8, na)) * 0.15
    return x

def singing_bowl(dur=52.0):
    n = int(dur * SR)
    L, R = np.zeros(n), np.zeros(n)
    seq = [(1.0, 146.83, 0.55), (14.0, 196.0, 0.45), (27.0, 146.83, 0.55), (40.0, 220.0, 0.4)]  # D3·G3·D3·A3
    for tc, f0, amp in seq:
        s = bowl_strike(f0) * amp
        pan = 0.5 + rng.uniform(-0.06, 0.06)
        place(L, s * pan, tc + rng.uniform(-0.3, 0.3))
        place(R, s * (1 - pan), tc)
    drone = lp(brown(n), 160) * 0.03
    st = np.vstack([L + drone, R + drone])
    return make_loop(st, 2.5)

save("sound_bowl", singing_bowl(), peak=0.62, rms_target=0.055)

# ---------------- 호숫가 잔물결 ----------------------------------------------
def lake(dur=44.0):
    n = int(dur * SR)
    L, R = np.zeros(n), np.zeros(n)
    for t in poisson_times(dur - 2.0, 1.1, t0=0.4):      # 작은 찰랑임 (루프 경계는 쉼 구간)
        ll = int(rng.uniform(0.18, 0.35) * SR)
        tl = np.arange(ll) / SR
        am = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(11, 19) * tl)
        lap = bp(white(ll), 320, 1500, 2) * np.sin(np.pi * np.linspace(0, 1, ll)) ** 1.6 * am
        lap += bp(white(ll), 2000, 5000, 2) * np.exp(-tl * 25) * 0.15   # 끝의 잔반짝임
        a = rng.uniform(0.4, 0.85)  # 찰랑임이 주인공
        pan = rng.uniform(0.3, 0.7)
        place(L, lap * a * pan, t)
        place(R, lap * a * (1 - pan), t)
    for t in poisson_times(dur - 2.0, 0.12, t0=0.4):     # 이따금 퐁당
        pl = int(0.2 * SR)
        tp_ = np.arange(pl) / SR
        f = 420 * (150 / 420) ** np.minimum(tp_ / 0.12, 1)
        plop_ = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tp_ * 26) * 0.16
        pan = rng.uniform(0.35, 0.65)
        place(L, plop_ * pan, t)
        place(R, plop_ * (1 - pan), t)
    sway = lp(pink(n), 380) * smooth_lfo(dur, 0.09, 0.4, 1.0) * 0.07  # 물의 숨결 (받침)
    st = np.vstack([L + sway, R + sway * 0.97])
    return make_loop(st, 1.6)

save("sound_lake", lake(), peak=0.62, rms_target=0.06)

# ---------------- 동굴 물방울 -----------------------------------------------
def cave(dur=46.0):
    n = int(dur * SR)
    L, R = np.zeros(n), np.zeros(n)
    for t in poisson_times(dur, 1 / 2.3):
        # 물방울: 틱 + 공명 플링크
        pl = int(0.09 * SR)
        tp_ = np.arange(pl) / SR
        f0 = rng.uniform(750, 1650)
        d = np.sin(2 * np.pi * f0 * tp_) * np.exp(-tp_ * 55)
        d += np.sin(2 * np.pi * f0 * 2.3 * tp_) * np.exp(-tp_ * 90) * 0.4
        nt = int(0.001 * SR)
        d[:nt] += white(nt) * 0.3
        a = rng.uniform(0.45, 0.95)  # 물방울이 주인공
        pan = rng.uniform(0.25, 0.75)
        place(L, d * a * pan, t)
        place(R, d * a * (1 - pan), t)
    L = small_reverb(L, taps=((0.19, 0.42), (0.41, 0.24), (0.67, 0.13), (0.95, 0.06)))
    R = small_reverb(R, taps=((0.23, 0.42), (0.47, 0.24), (0.73, 0.13), (1.03, 0.06)))
    room = lp(brown(n), 130) * smooth_lfo(dur, 0.06, 0.6, 1.0) * 0.07   # 깊은 울림 공간 (받침)
    hush = bp(pink(n), 900, 2500) * 0.018                                # 아득한 공기
    st = np.vstack([L + room + hush, R + room * 0.98 + hush])
    return make_loop(st, 1.8)

save("sound_cave", cave(), peak=0.62, rms_target=0.055)

# ---------------- 겨울 바람 -------------------------------------------------
def winterwind(dur=46.0):
    n = int(dur * SR)
    gust = smooth_lfo(dur, 0.07, 0.08, 1.0) ** 1.5
    body = lp(pink(n), 380) * (0.3 + 0.7 * gust) * 0.4          # 묵직한 몸통
    # 휘파람 하울: 좁은 3대역을 느린 센터 LFO로 모핑
    center = smooth_lfo(dur, 0.12, 0.0, 1.0)
    howl = np.zeros(n)
    for i, fc in enumerate([420, 620, 880]):
        w = np.exp(-0.5 * ((center - i / 2.0) / 0.33) ** 2)      # 센터가 지나갈 때만 활성
        howl += bp(white(n), fc * 0.97, fc * 1.06, 2) * w
    howl *= gust ** 2 * 2.0   # 하울이 겨울바람의 정체성
    ice = hp(pink(n), 3800) * smooth_lfo(dur, 11, 0.2, 1.0) * gust * 0.07  # 눈가루 히스
    L = body + howl + ice
    R = body * 0.97 + np.roll(howl, int(0.0012 * SR)) + ice * 1.04
    return make_loop(np.vstack([L, R]), 2.0)

save("sound_winterwind", winterwind(), peak=0.62, rms_target=0.075)

print("done ->", OUT)
