# -*- coding: utf-8 -*-
"""
오픈소스 실녹음(Moodist / Blanket) → 3HA 앰비언트 음질 개선 마스터링
- Moodist(remvze/moodist): Pixabay Content License / CC0 — 앱 사용 가능, 표기 불요
- Blanket(rafaelmardojai/blanket): SOUNDS_LICENSING.md 참조 (CC0/PD)
- 긴 소스: 중간 발췌 + 2초 등파워 크로스페이드로 심리스 루프화
- 짧은 소스: 원본이 이미 루프 설계라 그대로 사용 (재크로스페이드 금지)
- 레이어 믹스 지원 (예: 여우비 = 가랑비 + 새소리)
- 전체 RMS 통일 + 소프트리밋 피크 보호
사용: git clone --depth 1 https://github.com/remvze/moodist /tmp/moodist
      git clone --depth 1 https://github.com/rafaelmardojai/blanket /tmp/blanket
      python3 scripts/master_moodist.py
"""
import numpy as np
from scipy.io import wavfile
import subprocess, os, sys

SR = 44100
MOOD = "/tmp/moodist/public/sounds"
BLANKET = "/tmp/blanket/data/resources/sounds"
AMBIE = "/tmp/ambie/src/AmbientSounds.Uwp/Assets/Sounds"  # 전부 CC0 (Data.json 참조)
TMP = "/tmp/snd_work"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sounds")
os.makedirs(TMP, exist_ok=True)

# 레이어: (소스, ffmpeg 필터 or None, 게인, 발췌시작초)
# 잡: (출력명, 발췌초(None=전체 사용), RMS 타겟, [레이어...])
JOBS = [
    # ── 우선 개선 목록 ──
    ("sound_rain",          60, 0.085, [(f"{MOOD}/rain/light-rain.mp3", None, 1.0, 8)]),
    ("sound_tentrain",      60, 0.085, [(f"{MOOD}/rain/rain-on-tent.mp3", None, 1.0, 6)]),
    ("sound_drizzle",     None, 0.060, [(f"{MOOD}/rain/rain-on-umbrella.mp3", "lowpass=f=6000", 1.0, 0)]),
    ("sound_sunshower",     45, 0.070, [(f"{MOOD}/rain/light-rain.mp3", None, 1.0, 70),
                                        (f"{MOOD}/animals/birds.mp3", "highpass=f=1500", 0.35, 10)]),
    ("sound_nightrain",     45, 0.065, [(f"{MOOD}/rain/light-rain.mp3", "lowpass=f=3000", 1.0, 30),
                                        (f"{MOOD}/animals/crickets.mp3", "lowpass=f=5000", 0.25, 5)]),
    ("sound_eaves",       None, 0.065, [(f"{MOOD}/nature/droplets.mp3", None, 1.0, 0),
                                        (f"{MOOD}/rain/light-rain.mp3", "lowpass=f=2500", 0.28, 15)]),
    ("sound_puddles",     None, 0.060, [(f"{MOOD}/nature/droplets.mp3", "atempo=0.92,aecho=0.5:0.3:45:0.2", 1.0, 0)]),
    ("sound_monsoon",     None, 0.085, [(f"{MOOD}/rain/heavy-rain.mp3", "lowpass=f=4500", 1.0, 0)]),
    ("sound_rapids",        60, 0.090, [(f"{MOOD}/nature/river.mp3", None, 1.0, 8)]),
    ("sound_reeds",       None, 0.075, [(f"{MOOD}/nature/wind-in-trees.mp3", "highpass=f=300", 1.0, 0)]),
    ("sound_morningforest", 60, 0.055, [(f"{MOOD}/animals/birds.mp3", None, 1.0, 4),
                                        (f"{MOOD}/nature/wind.mp3", "lowpass=f=1200", 0.20, 8)]),
    ("sound_autumnnight",   60, 0.050, [(f"{MOOD}/animals/crickets.mp3", "lowpass=f=6000", 1.0, 12)]),
    ("sound_campfire",      60, 0.085, [(f"{MOOD}/nature/campfire.mp3", None, 1.0, 8)]),
    ("sound_teakettle",   None, 0.070, [(f"{MOOD}/things/boiling-water.mp3", None, 1.0, 0)]),
    ("sound_clock",       None, 0.055, [(f"{MOOD}/things/clock.mp3", None, 1.0, 0)]),
    # ── 2차 개선 (합성 → 실녹음 교체) ──
    ("sound_catpurr",     None, 0.070, [(f"{MOOD}/animals/cat-purring.mp3", None, 1.0, 0)]),
    ("sound_keyboard",    None, 0.060, [(f"{MOOD}/things/keyboard.mp3", None, 1.0, 0)]),
    ("sound_typewriter",  None, 0.060, [(f"{MOOD}/things/typewriter.mp3", None, 1.0, 0)]),
    ("sound_washer",      None, 0.070, [(f"{MOOD}/things/washing-machine.mp3", None, 1.0, 0)]),
    ("sound_fan",         None, 0.070, [(f"{MOOD}/things/ceiling-fan.mp3", None, 1.0, 0)]),
    ("sound_windchime",     60, 0.055, [(f"{MOOD}/things/wind-chimes.mp3", None, 1.0, 6)]),
    ("sound_bowl",        None, 0.065, [(f"{MOOD}/things/singing-bowl.mp3", None, 1.0, 0)]),
    ("sound_waterfall",   None, 0.090, [(f"{MOOD}/nature/waterfall.mp3", None, 1.0, 0)]),
    ("sound_sailboat",      60, 0.075, [(f"{MOOD}/transport/sailboat.mp3", None, 1.0, 10)]),
    ("sound_rowboat",     None, 0.070, [(f"{MOOD}/transport/rowing-boat.mp3", None, 1.0, 0)]),
    ("sound_airplane",    None, 0.080, [(f"{MOOD}/transport/airplane.mp3", None, 1.0, 0)]),
    ("sound_underwater",  None, 0.070, [(f"{MOOD}/places/underwater.mp3", None, 1.0, 0)]),
    ("sound_junglefar",     60, 0.055, [(f"{MOOD}/nature/jungle.mp3", "lowpass=f=4000,volume=0.7", 1.0, 20)]),
    ("sound_mountaintop",   60, 0.080, [(f"{MOOD}/nature/wind.mp3", "highpass=f=120", 1.0, 6)]),
    ("sound_fireplace",     60, 0.085, [(f"{BLANKET}/fireplace.ogg", None, 1.0, 8)]),
    # ── 3차 개선 (합성 → 실녹음 교체) ──
    ("sound_leafrain",    None, 0.070, [(f"{MOOD}/rain/rain-on-leaves.mp3", None, 1.0, 0)]),
    ("sound_windowrain",  None, 0.070, [(f"{MOOD}/rain/rain-on-window.mp3", None, 1.0, 0)]),
    ("sound_carrain",     None, 0.075, [(f"{MOOD}/rain/rain-on-car-roof.mp3", None, 1.0, 0)]),
    ("sound_distantthunder", 60, 0.050, [(f"{MOOD}/rain/thunder.mp3", "lowpass=f=900", 1.0, 2),
                                         (f"{MOOD}/rain/light-rain.mp3", "lowpass=f=2000", 0.12, 40)]),
    ("sound_blizzard",    None, 0.085, [(f"{MOOD}/nature/howling-wind.mp3", None, 1.0, 0)]),
    ("sound_typhooneve",  None, 0.060, [(f"{MOOD}/nature/howling-wind.mp3", "lowpass=f=500", 1.0, 0)]),
    ("sound_nightsea",      60, 0.075, [(f"{MOOD}/nature/waves.mp3", "lowpass=f=1200", 1.0, 0)]),
    ("sound_seacave",       60, 0.070, [(f"{MOOD}/nature/waves.mp3", "lowpass=f=800,aecho=0.6:0.45:120:0.4", 1.0, 0)]),
    ("sound_cave",        None, 0.050, [(f"{MOOD}/nature/droplets.mp3", "lowpass=f=6000,aecho=0.6:0.45:180:0.45", 1.0, 0)]),
    ("sound_eveningalley",  60, 0.060, [(f"{MOOD}/places/night-village.mp3", None, 1.0, 20)]),
    ("sound_subway",      None, 0.080, [(f"{MOOD}/transport/inside-a-train.mp3", "lowpass=f=3500", 1.0, 0)]),
    ("sound_shipdeck",    None, 0.075, [(f"{MOOD}/transport/submarine.mp3", None, 0.8, 0),
                                        (f"{MOOD}/nature/waves.mp3", "lowpass=f=2000", 0.30, 10)]),
    ("sound_harbor",        50, 0.060, [(f"{BLANKET}/boat.ogg", None, 1.0, 30),
                                        (f"{MOOD}/animals/seagulls.mp3", "lowpass=f=4000", 0.18, 5)]),
    ("sound_meadow",      None, 0.060, [(f"{MOOD}/nature/wind-in-trees.mp3", "lowpass=f=2000", 1.0, 0),
                                        (f"{MOOD}/animals/birds.mp3", None, 0.30, 30),
                                        (f"{MOOD}/animals/beehive.mp3", "lowpass=f=3000", 0.12, 0)]),
    ("sound_rivershore",    55, 0.070, [(f"{MOOD}/nature/river.mp3", "lowpass=f=3000", 1.0, 70)]),
    ("sound_hotspring",   None, 0.060, [(f"{MOOD}/things/boiling-water.mp3", "atempo=0.85,lowpass=f=2500", 1.0, 0)]),
    ("sound_pinewind",      55, 0.075, [(f"{MOOD}/nature/wind.mp3", "lowpass=f=5000", 1.0, 15)]),
    ("sound_autumnwind",  None, 0.070, [(f"{MOOD}/nature/wind-in-trees.mp3", "lowpass=f=2800", 1.0, 0)]),
    ("sound_springnight",   60, 0.045, [(f"{MOOD}/animals/crickets.mp3", "lowpass=f=3500", 1.0, 90),
                                        (f"{MOOD}/nature/wind.mp3", "lowpass=f=800", 0.12, 30)]),
    # ── 4차: 실녹음 신규 수집 10종 (신규 카드 9 + 옹달샘 소스 교체 1) ──
    ("sound_whalesong",   None, 0.050, [(f"{MOOD}/animals/whale.mp3", None, 1.0, 0)]),
    ("sound_gullbeach",     60, 0.070, [(f"{MOOD}/nature/waves.mp3", None, 1.0, 5),
                                        (f"{MOOD}/animals/seagulls.mp3", None, 0.30, 3)]),
    ("sound_vinylcrackle", None, 0.050, [(f"{MOOD}/things/vinyl-effect.mp3", None, 1.0, 0)]),
    ("sound_dryer",       None, 0.070, [(f"{MOOD}/things/dryer.mp3", None, 1.0, 0)]),
    ("sound_woodpecker",  None, 0.050, [(f"{MOOD}/animals/woodpecker.mp3", None, 1.0, 0),
                                        (f"{MOOD}/nature/wind-in-trees.mp3", "lowpass=f=1500", 0.15, 10),
                                        (f"{MOOD}/animals/birds.mp3", None, 0.15, 60)]),
    ("sound_wiperrain",   None, 0.065, [(f"{MOOD}/things/windshield-wipers.mp3", None, 1.0, 0),
                                        (f"{MOOD}/rain/light-rain.mp3", "lowpass=f=4000", 0.50, 50)]),
    ("sound_snowwalk",    None, 0.060, [(f"{MOOD}/nature/walk-in-snow.mp3", None, 1.0, 0)]),
    ("sound_rainforest",    60, 0.075, [(f"{AMBIE}/Rainforest.mp3", None, 1.0, 30)]),
    ("sound_beehive",     None, 0.060, [(f"{MOOD}/animals/beehive.mp3", None, 1.0, 0),
                                        (f"{MOOD}/animals/birds.mp3", None, 0.18, 80)]),
    ("sound_creekside",   None, 0.060, [(f"{AMBIE}/creek.wav", None, 1.0, 0),
                                        (f"{MOOD}/nature/droplets.mp3", None, 0.25, 10)]),
    # ── 5차: 실녹음 20종 추가 수집 (신규 카드 15 + 업그레이드 5) ──
    ("sound_templemorn",    60, 0.055, [(f"{MOOD}/places/temple.mp3", None, 1.0, 15)]),
    ("sound_gravelwalk",    60, 0.060, [(f"{MOOD}/nature/walk-on-gravel.mp3", None, 1.0, 5)]),
    ("sound_leafwalk",    None, 0.060, [(f"{MOOD}/nature/walk-on-leaves.mp3", None, 1.0, 0)]),
    ("sound_paddynight",    60, 0.055, [(f"{MOOD}/animals/frog.mp3", None, 1.0, 8)]),
    ("sound_owlforest",     60, 0.045, [(f"{MOOD}/animals/crickets.mp3", "lowpass=f=4000", 1.0, 150),
                                        (f"{MOOD}/animals/owl.mp3", None, 0.55, 0)]),
    ("sound_sheepfield",  None, 0.060, [(f"{MOOD}/animals/sheep.mp3", None, 1.0, 0),
                                        (f"{MOOD}/nature/wind.mp3", "lowpass=f=1000", 0.18, 25)]),
    ("sound_morningyard",   60, 0.055, [(f"{MOOD}/animals/chickens.mp3", None, 1.0, 30),
                                        (f"{MOOD}/animals/birds.mp3", None, 0.20, 100)]),
    ("sound_paperrustle", None, 0.050, [(f"{MOOD}/things/paper.mp3", None, 1.0, 0)]),
    ("sound_metrostation",  60, 0.065, [(f"{MOOD}/places/subway-station.mp3", None, 1.0, 30)]),
    ("sound_airportlounge", 60, 0.065, [(f"{MOOD}/places/airport.mp3", None, 1.0, 60)]),
    ("sound_morsecode",     60, 0.050, [(f"{MOOD}/things/morse-code.mp3", None, 1.0, 5)]),
    ("sound_quietoffice",   60, 0.055, [(f"{MOOD}/places/office.mp3", None, 1.0, 20)]),
    ("sound_springbirds", None, 0.055, [(f"{AMBIE}/birds.wav", None, 1.0, 0)]),
    ("sound_aquarium",    None, 0.055, [(f"{MOOD}/things/bubbles.mp3", None, 1.0, 0)]),
    ("sound_laundryroom", None, 0.070, [(f"{MOOD}/places/laundry-room.mp3", None, 1.0, 0)]),
    ("sound_heavyrain",     52, 0.095, [(f"{AMBIE}/rain.wav", None, 1.0, 2)]),
    ("sound_thunder",       54, 0.080, [(f"{AMBIE}/thunder.mp3", None, 1.0, 2)]),
    ("sound_train",       None, 0.080, [(f"{MOOD}/transport/train.mp3", None, 1.0, 0)]),
    ("sound_farbirds",    None, 0.040, [(f"{AMBIE}/birds.wav", "lowpass=f=3500,volume=0.6", 1.0, 0),
                                        (f"{MOOD}/nature/wind.mp3", "lowpass=f=800", 0.15, 20)]),
    ("sound_springmelt",  None, 0.080, [(f"{AMBIE}/waterfall.wav", "highpass=f=200", 1.0, 0)]),
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


def decode(src, af, tag):
    wav = f"{TMP}/{tag}.wav"
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", src]
    if af:
        cmd += ["-af", af]
    cmd += ["-ar", str(SR), "-ac", "2", wav]
    subprocess.run(cmd, check=True)
    _, x = wavfile.read(wav)
    return x.astype(np.float64).T / 32767.0


def fit_length(x, n):
    """프리루프 소스를 타일링/트림해 n샘플에 맞춤"""
    reps = int(np.ceil(n / x.shape[1]))
    return np.tile(x, (1, reps))[:, :n]


ONLY = set(sys.argv[1:])  # 인자로 출력명을 주면 해당 잡만 실행

for name, seg, rms_t, layers in JOBS:
    if ONLY and name not in ONLY:
        continue
    src, af, gain, start = layers[0]
    x = decode(src, af, f"{name}_0")
    dur = x.shape[1] / SR

    if seg is not None and dur > seg + 8:
        s = min(int(start * SR), max(0, x.shape[1] - int((seg + 2) * SR)))
        x = x[:, s:s + int(seg * SR)]
        x = make_loop(x, 2.0)
    mix = x * gain
    n = mix.shape[1]

    nf = int(2.0 * SR)
    for i, (src2, af2, g2, st2) in enumerate(layers[1:], 1):
        y = decode(src2, af2, f"{name}_{i}")
        s2 = min(int(st2 * SR), max(0, y.shape[1] - (n + nf)))
        if y.shape[1] - s2 >= n + nf:
            # n+2초 발췌 후 크로스페이드 → 정확히 n샘플의 심리스 루프
            y = make_loop(y[:, s2:s2 + n + nf], 2.0)
        else:
            y = fit_length(y, n)  # 프리루프 소스 타일링
        mix = mix + y[:, :n] * g2

    mix = mix - np.mean(mix, axis=1, keepdims=True)
    cur = np.sqrt(np.mean(mix ** 2))
    mix = mix * (rms_t / (cur + 1e-9))
    mix = soft_limit(mix)
    pk = np.max(np.abs(mix))
    if pk > 0.92:
        mix = mix * (0.92 / pk)

    out_wav = f"{TMP}/{name}_out.wav"
    wavfile.write(out_wav, SR, (mix.T * 32767).astype(np.int16))
    mp3 = os.path.normpath(f"{OUT}/{name}.mp3")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", out_wav, "-codec:a", "libmp3lame", "-b:a", "192k", mp3], check=True)

    m = mix.mean(axis=0)
    seam = np.concatenate([m[-int(0.15 * SR):], m[:int(0.15 * SR)]])
    ratio = np.sqrt((seam ** 2).mean()) / (np.sqrt((m ** 2).mean()) + 1e-9)
    print(f"{name}: {mix.shape[1]/SR:.1f}s rms={np.sqrt((mix**2).mean()):.3f} seam={ratio:.2f}")

print("done ->", os.path.normpath(OUT))
