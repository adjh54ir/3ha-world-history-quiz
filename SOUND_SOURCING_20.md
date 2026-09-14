# 실녹음 사운드 20개 수집 가이드 (CC0 우선)

> 목적: 합성 없이 **실제 자연·일상 녹음** 20개를 저작권 걱정 없이 수집.
> 이 작업 환경(샌드박스)은 보안상 오디오 파일을 직접 내려받을 수 없어, **출처·검색어·라이선스**를 정리했습니다.
> mp3 20개를 `assets/sounds/` 에 넣어주시면 카탈로그 등록·태그까지 제가 연결합니다.

> **2026-09-14 — 저장 형식이 바뀌었습니다.** `assets/sounds/` 에 모여 있던 앰비언스 141개는
> 44.1kHz 192kbps mp3 라 합쳐서 115MB 였고, 앱에 넣기엔 너무 커서 **AAC 64k `.m4a`** 로 다시 인코딩했습니다(44MB).
> 아래 표의 파일명은 `.mp3` 로 적혀 있지만 실제 파일은 같은 이름의 **`.m4a`** 입니다.
> 새로 받은 mp3 를 넣을 때도 같게 맞춰 주세요:
> `ffmpeg -nostdin -i 새파일.mp3 -c:a aac -b:a 64k 새파일.m4a`
> (`-nostdin` 을 빠뜨리면 여러 파일을 도는 셸 반복문에서 ffmpeg 가 입력을 삼켜 파일명이 잘립니다.)
> 코드가 실제로 쓰는 효과음 8개(`sound_chime` 등)는 짧아서 `.mp3` 그대로 두었습니다.

## 권장 소스 (둘 다 상업적 사용 O, 출처표기 불필요)

- **Pixabay Sound Effects** — Pixabay License, 무저작권·출처표기 불필요. 검색 페이지 URL이 안정적.
  링크: https://pixabay.com/sound-effects/
- **Freesound (CC0 필터)** — CC0만 고르면 출처표기 의무 없음. CC BY 항목은 피하세요.
  CC0 태그: https://freesound.org/browse/tags/cc0/

> ⚠️ 다운로드 시 각 파일의 라이선스가 **CC0 또는 Pixabay License** 인지 반드시 확인. (Freesound엔 CC BY도 섞여 있음)

## 자연 소리 12

| # | 제안 파일명 | 카드(한글) | English | 추천 검색(Pixabay) | Freesound CC0 검색어 |
|---|---|---|---|---|---|
| 1 | sound_rain_real.mp3 | 잔잔한 비 | Gentle rain | https://pixabay.com/sound-effects/search/rain/ | `rain cc0` |
| 2 | sound_thunder_real.mp3 | 천둥 번개 | Thunderstorm | https://pixabay.com/sound-effects/search/thunderstorm/ | `thunderstorm cc0` |
| 3 | sound_stream_real.mp3 | 시냇물 | Stream | https://pixabay.com/sound-effects/search/stream/ | `stream creek cc0` |
| 4 | sound_ocean_real.mp3 | 파도 | Ocean waves | https://pixabay.com/sound-effects/search/ocean%20waves/ | `ocean waves cc0` |
| 5 | sound_waterfall_real.mp3 | 폭포 | Waterfall | https://pixabay.com/sound-effects/search/waterfall/ | `waterfall cc0` |
| 6 | sound_forestbirds_real.mp3 | 숲 새소리 | Forest birds | https://pixabay.com/sound-effects/search/forest%20birds/ | `forest birds cc0` |
| 7 | sound_morningbirds_real.mp3 | 아침 새 | Morning birds | https://pixabay.com/sound-effects/search/birds%20morning/ | `birds morning cc0` |
| 8 | sound_forestwind_real.mp3 | 숲 바람 | Forest wind | https://pixabay.com/sound-effects/search/wind%20forest/ | `wind trees cc0` |
| 9 | sound_crickets_real.mp3 | 밤 귀뚜라미 | Night crickets | https://pixabay.com/sound-effects/search/crickets/ | `crickets night cc0` |
| 10 | sound_campfire_real.mp3 | 모닥불 | Campfire | https://pixabay.com/sound-effects/search/campfire/ | `campfire cc0` |
| 11 | sound_rainwindow_real.mp3 | 창가 빗소리 | Rain on window | https://pixabay.com/sound-effects/search/rain%20window/ | `rain window cc0` |
| 12 | sound_fountain_real.mp3 | 분수 | Fountain | https://pixabay.com/sound-effects/search/fountain/ | `fountain cc0` |

## 일상 소리 8

| # | 제안 파일명 | 카드(한글) | English | 추천 검색(Pixabay) | Freesound CC0 검색어 |
|---|---|---|---|---|---|
| 13 | sound_cafe_real.mp3 | 카페 | Cafe ambience | https://pixabay.com/sound-effects/search/cafe/ | `cafe ambience cc0` |
| 14 | sound_keyboard_real.mp3 | 키보드 타이핑 | Keyboard | https://pixabay.com/sound-effects/search/keyboard%20typing/ | `keyboard typing cc0` |
| 15 | sound_pencil_real.mp3 | 연필 필기 | Pencil writing | https://pixabay.com/sound-effects/search/pencil/ | `pencil writing cc0` |
| 16 | sound_coffee_real.mp3 | 커피 내리기 | Coffee pour | https://pixabay.com/sound-effects/search/coffee/ | `coffee pour cc0` |
| 17 | sound_pageturn_real.mp3 | 책장 넘김 | Page turning | https://pixabay.com/sound-effects/search/page%20turn/ | `page turn book cc0` |
| 18 | sound_catpurr_real.mp3 | 고양이 골골 | Cat purr | https://pixabay.com/sound-effects/search/cat%20purr/ | `cat purr cc0` |
| 19 | sound_train_real.mp3 | 기차 | Train | https://pixabay.com/sound-effects/search/train/ | `train interior cc0` |
| 20 | sound_fireplace_real.mp3 | 벽난로 | Fireplace | https://pixabay.com/sound-effects/search/fireplace/ | `fireplace crackle cc0` |

## 수집 시 체크리스트

- 포맷: **mp3**, 44.1kHz, 모노/스테레오 무관. 루프용이면 30초 이상 권장(앱은 반복 재생).
- 앞뒤 무음/클릭 없이 자연스러운 시작·끝(페이드) — 필요하면 제가 후처리(fade/normalize)해 드립니다.
- 라이선스가 **CC0 / Pixabay License** 인지 확인. (CC BY면 출처표기 필요)

## 파일 주시면 제가 할 일 (자동 연동)

1. `assets/sounds/` 에 배치 확인 + 필요 시 EQ/노멀라이즈 후처리
2. `src/const/ConstMindSounds.ts`(또는 생성기) 에 20종 등록 — key/group/icon/color/source
3. `sounds.items.<key>.{title,desc}` 한국어 문구 추가
4. 그룹 배치 + 원하시면 `추천` 지정
5. `assets/sounds/ATTRIBUTIONS.md` 에 20종 출처·라이선스 기록

## ATTRIBUTIONS.md 추가 템플릿 (수집 후)

```
| sound_rain_real.mp3 | 잔잔한 비 | <원작자> | <Pixabay/Freesound URL> | CC0 / Pixabay License |
```
