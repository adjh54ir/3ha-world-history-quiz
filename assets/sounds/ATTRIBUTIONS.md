# 사운드 출처 및 라이선스

> 2026-07 카탈로그 정리: 53종 제거 (144→91종).
> ① 사용자 지정 34종(카페·도서관·메트로놈 등) ② 합성 품질 미달 13종(여름 매미·몽돌 해변·
> 다림질·첫눈·양철지붕 비 등) ③ 동일 원본 유사쌍 정리 6종(노천탕·빗방울 웅덩이·강가·
> 바다 동굴·태풍 전야·가을 숲바람 — 각각 찻주전자·처마 낙수·여울·밤바다·눈보라·들판의 오후 잔존).
> 아래 목록 중 제거된 항목은 파일도 함께 삭제됨. 현재 카탈로그는 `src/const/ConstMindSounds.ts` 참조.

## 앰비언트 (실제 녹음 — 오픈소스)

경유 프로젝트: [Blanket](https://github.com/rafaelmardojai/blanket) (사운드 라이선스 문서:
[SOUNDS_LICENSING.md](https://github.com/rafaelmardojai/blanket/blob/master/SOUNDS_LICENSING.md)),
[Muges/ambientsounds](https://github.com/Muges/ambientsounds)

| 파일 | 카드 | 원작자 | 원본 | 라이선스 |
|---|---|---|---|---|
| sound_thunder.mp3 | 비와 먼 천둥 | Digifish music | [freesound #41739](https://freesound.org/people/digifishmusic/sounds/41739/) | **CC BY** (표기 필요) |
| sound_waves.mp3 | 파도 | Luftrum | [freesound #48412](https://freesound.org/people/Luftrum/sounds/48412/) | **CC BY** (표기 필요) |
| sound_stream.mp3 | 시냇물 | gluckose | [freesound #333987](https://freesound.org/people/gluckose/sounds/333987/) | CC0 |
| sound_sparrow.mp3 | 아침 참새 | kvgarlic | [freesound #156826](https://freesound.org/people/kvgarlic/sounds/156826/) | CC0 |
| sound_crickets.mp3 | 밤의 풀벌레 | Lisa Redfern | [soundbible #2083](https://soundbible.com/2083-Crickets-Chirping-At-Night.html) | Public Domain |
| sound_lake.mp3 | 호숫가 | Falcet | [freesound #439365](https://freesound.org/people/Falcet/sounds/439365/) | CC0 |
| sound_winterwind.mp3 | 겨울 바람 | felix.blume | [freesound #217506](https://freesound.org/people/felix.blume/sounds/217506/) | CC0 |
| sound_forest.mp3 | 숲 바람 | felix.blume | [freesound #139337](https://freesound.org/people/felix.blume/sounds/139337/) | CC0 |
| sound_campfire.mp3 | 모닥불 | inchadney | [freesound #132534](https://freesound.org/people/inchadney/sounds/132534/) | CC0 |

| sound_heavyrain.mp3 | 거센 비 | D W | [freesound #136971](https://freesound.org/people/D%20W/sounds/136971/) | **CC BY** (표기 필요) |
| sound_forestrain.mp3 | 숲속 비 | Corsica_S | [freesound #169031](https://freesound.org/people/Corsica_S/sounds/169031/) | **CC BY** (표기 필요) |
| sound_storm2.mp3 | 폭우와 천둥 | RHumphries | [freesound #2523](https://freesound.org/people/RHumphries/sounds/2523/) | **CC BY** (표기 필요) |
| sound_brook.mp3 | 산속 개울 | mystiscool | [freesound #7138](https://freesound.org/people/mystiscool/sounds/7138/) | **CC BY** (표기 필요) |
| sound_train.mp3 | 기차 | SDLx | [freesound #259988](https://freesound.org/people/SDLx/sounds/259988/) | **CC BY 3.0** (표기 필요) |
| sound_city.mp3 | 도시의 소음 | gezortenplotz | [freesound #44796](https://freesound.org/people/gezortenplotz/sounds/44796/) | **CC BY** (표기 필요) |

편집 내용: 구간 발췌, 심리스 루프 크로스페이드, 음량 정규화, mp3 인코딩
(`scripts/master_opensource.py`, `scripts/master_batch2.py`).

### ⚠️ CC BY 표기 의무 (5종)
파도·숲속 비·폭우와 천둥·산속 개울·도시는 CC BY라서 **앱 내 표기가 필요**합니다.
(잔잔한 비·천둥·거센 비·기차는 2026-07 CC0/Pixabay 음원으로 교체되어 표기 의무 해제,
카페는 카탈로그에서 제거됨 — 위 표의 해당 행은 이력용)
권장: 설정 → 오픈소스 라이선스 화면에 아래 문구 추가.

> Ambient sounds by Luftrum, Corsica_S, RHumphries, mystiscool, gezortenplotz
> — freesound.org, CC BY 3.0/4.0. Edited (looped, normalized).

## 앰비언트 음질 개선 52종 (2026-07 — Moodist / Blanket 실녹음 교체)

경유 프로젝트: [Moodist](https://github.com/remvze/moodist) — 사운드는
[Pixabay Content License](https://pixabay.com/service/license-summary/) 또는 CC0
(상업적 사용 가능 · 앱 내 표기 불요, 단 음원 자체의 단독 재배포/판매 금지),
[Blanket](https://github.com/rafaelmardojai/blanket) — SOUNDS_LICENSING.md 참조.
마스터링: `scripts/master_moodist.py` (발췌 · 심리스 루프 · 레이어 믹스 · RMS 정규화 · 192kbps).

| 파일 | 카드 | 소스 |
|---|---|---|
| sound_rain.mp3 | 잔잔한 비 | Moodist rain/light-rain |
| sound_tentrain.mp3 | 텐트 위 빗소리 | Moodist rain/rain-on-tent |
| sound_drizzle.mp3 | 이슬비 | Moodist rain/rain-on-umbrella |
| sound_sunshower.mp3 | 여우비 | Moodist light-rain + birds 믹스 |
| sound_nightrain.mp3 | 밤비 | Moodist light-rain(LPF) + crickets 믹스 |
| sound_eaves.mp3 | 처마 낙수 | Moodist droplets + light-rain 믹스 |
| sound_puddles.mp3 | 빗방울 웅덩이 | Moodist droplets (템포·에코 가공) |
| sound_monsoon.mp3 | 장마 오후 | Moodist rain/heavy-rain (LPF) |
| sound_rapids.mp3 | 여울 | Moodist nature/river |
| sound_springmelt.mp3 | 눈 녹은 개울 | Blanket stream (gluckose CC0, 별도 구간·EQ) |
| sound_reeds.mp3 | 갈대밭 바람 | Moodist nature/wind-in-trees (HPF) |
| sound_morningforest.mp3 | 아침 숲 | Moodist birds + wind 믹스 |
| sound_farbirds.mp3 | 먼 산새 | Moodist birds (원거리 가공) + wind |
| sound_creekside.mp3 | 숲속 옹달샘 | Moodist droplets + Blanket stream 믹스 |
| sound_autumnnight.mp3 | 가을밤 | Moodist animals/crickets |
| sound_campfire.mp3 | 모닥불 | Moodist nature/campfire |
| sound_teakettle.mp3 | 찻주전자 | Moodist things/boiling-water |
| sound_clock.mp3 | 괘종시계 | Moodist things/clock |
| sound_catpurr.mp3 | 고양이 골골송 | Moodist animals/cat-purring |
| sound_keyboard.mp3 | 키보드 타이핑 | Moodist things/keyboard |
| sound_typewriter.mp3 | 타자기 | Moodist things/typewriter |
| sound_washer.mp3 | 세탁기 | Moodist things/washing-machine |
| sound_fan.mp3 | 선풍기 | Moodist things/ceiling-fan |
| sound_windchime.mp3 | 바람 종 | Moodist things/wind-chimes |
| sound_bowl.mp3 | 싱잉볼 | Moodist things/singing-bowl |
| sound_waterfall.mp3 | 폭포 | Moodist nature/waterfall |
| sound_sailboat.mp3 | 요트 항해 | Moodist transport/sailboat |
| sound_rowboat.mp3 | 노 젓는 호수 | Moodist transport/rowing-boat |
| sound_airplane.mp3 | 비행기 기내 | Moodist transport/airplane |
| sound_underwater.mp3 | 물속 | Moodist places/underwater |
| sound_junglefar.mp3 | 열대의 숲 | Moodist nature/jungle (원거리 가공) |
| sound_mountaintop.mp3 | 산마루 바람 | Moodist nature/wind (HPF) |
| sound_fireplace.mp3 | 벽난로 | Blanket fireplace (ezwa, Public Domain) |
| sound_leafrain.mp3 | 잎사귀 비 | Moodist rain/rain-on-leaves |
| sound_windowrain.mp3 | 창가의 비 | Moodist rain/rain-on-window |
| sound_carrain.mp3 | 차 안의 비 | Moodist rain/rain-on-car-roof |
| sound_distantthunder.mp3 | 먼 천둥 | Moodist thunder(LPF) + light-rain 믹스 |
| sound_blizzard.mp3 | 눈보라 | Moodist nature/howling-wind |
| sound_typhooneve.mp3 | 태풍 전야 | Moodist howling-wind (LPF, 눈보라와 동일 원본) |
| sound_nightsea.mp3 | 밤바다 | Moodist nature/waves (LPF) |
| sound_seacave.mp3 | 바다 동굴 | Moodist waves (LPF+에코, 밤바다와 동일 원본) |
| sound_cave.mp3 | 동굴 물방울 | Moodist droplets (동굴 에코 가공) |
| sound_eveningalley.mp3 | 저녁 골목 | Moodist places/night-village |
| sound_subway.mp3 | 지하철 | Moodist transport/inside-a-train (LPF) |
| sound_shipdeck.mp3 | 배 갑판 | Moodist submarine + waves 믹스 |
| sound_harbor.mp3 | 밤의 항구 | Blanket boat(호숫가와 동일 원본, 별도 구간) + seagulls |
| sound_meadow.mp3 | 들판의 오후 | Moodist wind-in-trees + birds + beehive 믹스 |
| sound_rivershore.mp3 | 강가 | Moodist river (여울과 동일 원본, 별도 구간+LPF) |
| sound_hotspring.mp3 | 노천탕 | Moodist boiling-water (찻주전자와 동일 원본, 템포·LPF 가공) |
| sound_pinewind.mp3 | 솔바람 | Moodist wind (산마루와 동일 원본, 별도 구간+LPF) |
| sound_autumnwind.mp3 | 가을 숲바람 | Moodist wind-in-trees (갈대밭과 동일 원본, LPF) |
| sound_springnight.mp3 | 봄밤 | Moodist crickets(가을밤과 동일 원본, 별도 구간) + wind |

### 4차 — 실녹음 신규 수집 10종 (2026-07, 신규 카드 9 + 옹달샘 교체)

Ambie([jenius-apps/ambie](https://github.com/jenius-apps/ambie)) 번들 음원은 전부 CC0
(freesound 원작자 정보는 저장소 `Assets/Data.json` 참조).

| 파일 | 카드 | 소스 |
|---|---|---|
| sound_whalesong.mp3 | 고래의 노래 | Moodist animals/whale |
| sound_gullbeach.mp3 | 갈매기 해변 | Moodist waves + seagulls 믹스 |
| sound_vinylcrackle.mp3 | LP 지직임 | Moodist things/vinyl-effect |
| sound_dryer.mp3 | 건조기 | Moodist things/dryer |
| sound_woodpecker.mp3 | 딱따구리 숲 | Moodist woodpecker + wind-in-trees + birds 믹스 |
| sound_wiperrain.mp3 | 빗길 와이퍼 | Moodist windshield-wipers + light-rain 믹스 |
| sound_snowwalk.mp3 | 눈길 산책 | Moodist nature/walk-in-snow |
| sound_rainforest.mp3 | 우림의 비 | Ambie Rainforest (INNORECORDS, CC0) |
| sound_beehive.mp3 | 꿀벌의 정원 | Moodist beehive + birds 믹스 |
| sound_creekside.mp3 | 숲속 옹달샘 (교체) | Ambie creek (hargissssound, CC0) + droplets |

### 5차 — 실녹음 20종 추가 수집 (2026-07, 신규 카드 15 + 업그레이드 5)

| 파일 | 카드 | 소스 |
|---|---|---|
| sound_templemorn.mp3 | 산사의 아침 | Moodist places/temple |
| sound_gravelwalk.mp3 | 자갈길 산책 | Moodist nature/walk-on-gravel |
| sound_leafwalk.mp3 | 낙엽 산책 (실녹음 복원) | Moodist nature/walk-on-leaves |
| sound_paddynight.mp3 | 여름 논둑 (실녹음 복원) | Moodist animals/frog |
| sound_owlforest.mp3 | 부엉이의 밤 (실녹음 복원) | Moodist crickets + owl 믹스 |
| sound_sheepfield.mp3 | 양떼 들판 | Moodist sheep + wind 믹스 |
| sound_morningyard.mp3 | 시골 아침 마당 | Moodist chickens + birds 믹스 |
| sound_paperrustle.mp3 | 종이의 사각임 | Moodist things/paper |
| sound_metrostation.mp3 | 지하철역 | Moodist places/subway-station |
| sound_airportlounge.mp3 | 공항 라운지 | Moodist places/airport |
| sound_morsecode.mp3 | 모스 부호 | Moodist things/morse-code |
| sound_quietoffice.mp3 | 고요한 사무실 | Moodist places/office |
| sound_springbirds.mp3 | 봄의 지저귐 | Ambie birds (hargissssound, CC0) |
| sound_aquarium.mp3 | 수족관 | Moodist things/bubbles |
| sound_laundryroom.mp3 | 빨래방 오후 | Moodist places/laundry-room |
| sound_heavyrain.mp3 | 거센 비 (교체) | Ambie rain (jmbphilmes, CC0) — 기존 CC BY 해소 |
| sound_thunder.mp3 | 비와 먼 천둥 (교체) | Ambie thunder (hifijohn, CC0) — 기존 CC BY 해소 |
| sound_train.mp3 | 기차 (교체) | Moodist transport/train — 기존 CC BY 3.0 해소 |
| sound_farbirds.mp3 | 먼 산새 (교체) | Ambie birds 원거리 가공 — 아침 숲과 원본 분리 |
| sound_springmelt.mp3 | 눈 녹은 개울 (교체) | Ambie waterfall/아이슬란드 강 (askeseverin, CC0) — 시냇물과 원본 분리 |

### 집중 소음 3종 (자체 생성)
백색소음·분홍소음·갈색소음은 수학적으로 정의된 신호를 그대로 생성한 것으로 라이선스 제약이 없습니다
(`scripts/master_batch2.py`).

## 앰비언트 (프로시저럴 합성 — 자체 제작, 라이선스 제약 없음)

sound_pageflip(책 넘기기) · sound_windchime(바람 종) · sound_bowl(싱잉볼) · sound_cave(동굴 물방울)
— `scripts/make_sounds.py`로 합성. 실녹음 교체 시 동일 파일명으로 덮어쓰면 됩니다.

## 효과음 (프로시저럴 합성 — 자체 제작)

sound_chime, sound_cue_in/hold/out, sound_fire, sound_click, sound_pop, sound_bubble,
sound_popwrap, sound_plop, sound_squish, sound_crash, sound_whoosh, sound_rustle, sound_scrape

## batch3 — 앰비언트 20종 (프로시저럴 합성 — 자체 제작, 라이선스 제약 없음)

`scripts/make_batch3.py`로 전량 수학적 합성 (실녹음 없음 → 표기 의무 없음).

| 파일 | 카드 | 그룹 |
|---|---|---|
| sound_waterfall.mp3 | 폭포 | 비와 물 |
| sound_tentrain.mp3 | 텐트 위 빗소리 | 비와 물 |
| sound_cicada.mp3 | 여름 매미 | 숲과 밤 |
| sound_reeds.mp3 | 갈대밭 바람 | 숲과 밤 |
| sound_snownight.mp3 | 눈 오는 밤 | 숲과 밤 |
| sound_omdrone.mp3 | 옴 드론 | 명상과 수면 |
| sound_heartbeat.mp3 | 심장박동 | 명상과 수면 |
| sound_lullaby.mp3 | 오르골 자장가 | 명상과 수면 |
| sound_space.mp3 | 우주 유영 | 명상과 수면 |
| sound_deepsleep.mp3 | 딥 슬립 | 명상과 수면 |
| sound_keyboard.mp3 | 키보드 타이핑 | 일상의 소리 |
| sound_pencil.mp3 | 연필 필기 | 일상의 소리 |
| sound_boiling.mp3 | 보글보글 찌개 | 일상의 소리 |
| sound_shower.mp3 | 샤워 | 일상의 소리 |
| sound_library.mp3 | 도서관 | 일상의 소리 |
| sound_fan.mp3 | 선풍기 | 집중 소음 |
| sound_airplane.mp3 | 비행기 기내 | 집중 소음 |
| sound_washer.mp3 | 세탁기 | 집중 소음 |
| sound_clock.mp3 | 괘종시계 | 집중 소음 |
| sound_greennoise.mp3 | 초록소음 | 집중 소음 |

참고: Blanket의 boat.ogg는 기존 '호숫가'(Falcet #439365)와 동일 원본이라 중복 회피를 위해
'텐트 위 빗소리' 합성으로 대체함.

## batch4 — 앰비언트 100종 (프로시저럴 합성 — 자체 제작, 라이선스 제약 없음)

`scripts/make_batch4.py`로 전량 수학적 합성 (실녹음 없음 → 표기 의무 없음).
용량 최적화: 텍스처류 80kbps, 톤·리듬류 96kbps, 36~40초 심리스 루프.
카탈로그(그룹·제목)는 `scripts/gen_catalog.py`가 `src/const/ConstMindSounds.ts`를 생성 — 목록은 해당 파일 참조.

- 비 +12: windowrain drizzle sunshower nightrain eaves carrain tinroof leafrain puddles distantthunder afterrain monsoon
- 물가 +12: nightsea pebblebeach rivershore fountain underwater hotspring harbor rapids springmelt marsh rowboat seacave
- 숲과 들 +12: bamboo morningforest pinewind meadow wheatfield mountaintop fallenleaves treecreak farbirds junglefar creekside autumnwind
- 밤과 계절 +10: frogs owlnight autumnnight firstsnow blizzard springnight summerdusk foggymorning wintermorning typhooneve
- 쉼의 공간 +10: fireplace candle teakettle templewind rockingchair hammockbreeze woodcabin gardennoon oldbookshop attictime
- 명상과 수면 +12: womb tibetanbowls zengarden crystalbowl moonlightdrone alphadrone nighttrainbed harpdream breathingpad dreamchime oceanbowl slumberhum
- 일상의 소리 +12: catpurr ironing dishwashing knitting ricecooker bathfill frypan coffeedrip typewriter vacuumfar eveningalley nightkitchen
- 길 위에서 +10: nightbus subway shipdeck countrystation highwayfar sailboat nightdrive tram ferry bicycle
- 리듬 +6: metronome watermill clockshop dripfaucet windmill radiostatic
- 집중 소음 +4: bluenoise graynoise aircon deephum

## 배경음 (BGM)

| 파일 | 용도 | 출처 |
|---|---|---|
| bgm_quiz.m4a | 급수 퀴즈 | 사내 프로젝트 `3ha-korea-quiz`에서 이관 (원본 bgm-quiz.mp3) |
| bgm_time.m4a | 무한 챌린지 | 사내 프로젝트 `3ha-korea-quiz`에서 이관 (원본 bgm-time.mp3) |
| bgm_study.m4a | 카드 학습 · 숏폼 학습 | Rafael Krux, "Happy Whistling Ukulele" (앨범 CinematicWaves) — 원배포처 FreePD, 현재 폐쇄. [SoundSafari/CC0-1.0-Music](https://github.com/SoundSafari/CC0-1.0-Music) 미러에서 받음. **CC0-1.0**, 표기 의무 없음 |

용량 최적화: 원본은 44.1kHz 스테레오 ~256kbps mp3(각 3.2MB). 배경음은 낮게 깔려
음질 여유가 커서 `afconvert -f m4af -d aac -b 64000 -s 0`으로 64kbps AAC 재인코딩 (합계 6.5MB → 1.6MB).

`bgm_study.m4a` 가공: 원곡 123초 중 118초 뒤는 페이드아웃이라 루프에 쓰면 매 바퀴 소리가 사라진다.
잘라낸 뒤 끝 2초를 앞 2초에 크로스페이드로 이어 116초 이음매 없는 루프로 만들고,
EBU R128(`loudnorm=I=-18:TP=-3:LRA=11`)로 라우드니스를 맞춘 뒤 64kbps AAC 로 인코딩 (4.7MB → 939KB).

> ⚠️ 원본 프로젝트의 `assets/sounds/LICENSE.txt`에는 효과음(Kenney, CC0)만 기록되어 있고
> 이 두 BGM 트랙의 원작자·라이선스 기록이 없다(도입 커밋 `cff1b5e`에도 출처 없음).
> 스토어 배포 전 출처 확인 필요.

## 효과음 (앱 내 피드백)

`src/utils/SoundUtils.ts`가 쓰는 매핑 — 위 Moodist/합성 카탈로그의 파일을 그대로 재사용한다.

| 용도 | 파일 |
|---|---|
| 정답 | sound_chime.mp3 |
| 오답 | sound_bonk.mp3 |
| 시간 초과 | sound_thunk.mp3 |
| 퀴즈 종료 · 학습 마무리 | sound_cue_in.mp3 |
| 학습 완료 표시 | sound_complete.m4a |
| 카드 뒤집기 | sound_rustle.mp3 |
| 카드 · 숏폼 다음 장으로 넘김 | sound_whoosh.mp3 |
| 남은 시간 카운트다운(5초) | sound_click.mp3 |
| 퀴즈 · 학습 시작 | sound_whoosh.mp3 |
| 가벼운 선택 피드백 | sound_pop.mp3 |
| 출석 도장 | sound_attendance.mp3 |

`sound_complete.m4a`는 사내 프로젝트 `3ha-spelling-quiz`의 학습 완료음(원본 Kenney Interface Sounds
`confirmation_002.ogg`, CC0)을 그대로 이관한 것(1.1초, 118kbps AAC). 이전에 쓰던 `sound_cue_hold.mp3`은
여운만 길고 끝맺음이 없어 "완료"로 들리지 않았다. 파일 자체는 다른 용도로 쓸 수 있게 남겨 둔다.

`sound_attendance.mp3`은 사내 프로젝트 `3ha-korea-quiz`의 출석체크 효과음(원본 `finish.wav`
= Kenney Interface Sounds `confirmation_004.ogg`, CC0)을 이관한 것. 원본은 1411kbps WAV
스테레오(610KB)라 `ffmpeg -b:a 96k -ac 1`로 재인코딩(42KB).
