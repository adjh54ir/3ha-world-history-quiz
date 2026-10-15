# 세계 상식 퀴즈 — 스토어 최초 출시 정보 (App Store / Google Play · 6개 언어)

> 이 문서만 보고 그대로 붙여 넣으면 두 스토어 제출이 끝나도록 만든 시트입니다.
> 모든 값은 **회색 박스 오른쪽 위 복사 버튼**으로 복사할 수 있습니다.
> 설명은 한국어, 스토어에 넣는 값은 **언어별로 따로** 적었습니다 (§4).
> 작성 기준일: **2026-10-15** (10-14 초안을 현재 코드로 다시 점검) · 코드 기준: `app.json` · `locales/*.json` · `src/translations/*` · `src/const/data/world/*`

**목차**

| § | 내용 |
|---|---|
| 0 | 제출 전 차단 항목 |
| 1 | 공통 식별 정보 · 지원 언어 |
| 2 | 앱 이름 중복 확인 (6개 언어) |
| 3 | 카테고리 · 연령 등급 |
| 4 | **언어별 입력 시트** — 4.1 한국어 · 4.2 English · 4.3 日本語 · 4.4 简体中文 · 4.5 Français · 4.6 Español |
| 5 | 연락처 · 심사 메모 · 앱 콘텐츠 |
| 6 | 데이터 수집 응답 |
| 7 | 스토어 에셋 규격 |
| 8 | 출시자 정보 |
| 9 | "유효하지 않은 문자" 예방 규칙 |
| 10 | 제출 순서 체크리스트 |

---

## 0. 제출 전 차단 항목 (먼저 해결)

| 항목 | 상태 | 해야 할 일 |
|---|---|---|
| **앱 안 번역** | ✅ 완료 (2026-10-14) | 화면 문구 6개 언어 모두 1,750~1,792개(`src/translations/*.json`), 세계 데이터 11주제 x 5개 언어 + 용어표(`src/const/data/world/i18n/`). `WorldI18n.spec.ts` 5개 테스트 통과(10-15 실행). **6개 언어 등록정보를 한 번에 올려도 됩니다** |
| 개인정보 처리방침 URL | ⚠️ **한국어판만 게시됨** | 받은 주소 `.../terms/spitogenie` 는 **"스피또 지니"** 방침이라 쓰지 않습니다. 세계 상식 퀴즈 방침은 `/terms/worldhistoryquiz`(한국어)가 배포 번들에 있고, 언어별 5개(`...En` `...Jp` `...Zh` `...Fr` `...Es`)는 웹사이트 저장소 커밋 `fe64025` 에만 있고 **아직 배포 전**입니다(10-15 배포 번들 확인). 웹사이트 배포 후 §8 의 언어별 URL 사용 |
| Firebase 설정 파일 | ✅ 교체 완료 | `google-services.json` · `GoogleService-Info.plist` 모두 `com.tha.worldhistoryquiz` |
| Android 버전 값 | ⚠️ iOS 와 다름 | `android/app/build.gradle` 이 `versionName "1.0.0"` · `versionCode 1`, iOS 는 `1.1.0` (빌드 3). Play 에 "1.0.0" 으로 보입니다. 두 스토어를 맞추려면 `versionName "1.1.0"` 으로 바꾼 뒤 빌드 (`eas.json` 이 `appVersionSource: local` 이라 네이티브 값이 그대로 쓰입니다) |
| App Store Connect App ID | ✅ 교체 완료 (2026-10-15) | 신규 앱 생성, Apple ID `6822964124` → `eas.json` `ascAppId` 반영 |
| EAS 프로젝트 ID · OTA URL | ⚠️ 다른 앱과 공유 | `app.json` `extra.eas.projectId` · `updates.url` 이 `4125cad1-…`. OTA 를 쓸 거라면 `eas init` 으로 분리 |
| AdMob App ID · 광고 단위 | ✅ 교체 완료 (2026-10-14) | App ID `~2106159208`(Android) / `~2074369616`(iOS), 배너·전면·보상형·오프닝 단위 `.env`·`.env.production` 반영. 보상형 전면·네이티브 고급 단위는 아직 비어 있어 테스트 광고로 폴백 |
| Play 그래픽 이미지 (1024x500) | ✅ 완료 (2026-10-15) | 6개 언어 `~/Desktop/world-history-quiz-graphic/<lang>.png`(프로젝트 밖) (사자 탐험가 아이콘 + 강점 + 다운로드 버튼). 재생성: `sh ~/Desktop/world-history-quiz-graphic/render.sh`. 10-15 Play Console 6개 언어 업로드 → 임시보관함 저장(검토 제출 전) |
| 스크린샷 | ✅ 완료 (2026-10-15) | 프로젝트 밖 `~/Desktop/world-history-quiz-screenshots/` 로 옮김 — iPhone 6.5" `release/` · iPad 13" `release_ipad/`(2064x2752) · Play 폰 `release_play/`, 원본 `screenshot*/`. 6개 언어 각 10장(Play 8장). 재생성: 그 폴더에서 `python3 make_release.py [--play\|--ipad]` |
| iPad 지원 | ✅ 켬 (2026-10-15) | `ios/…/project.pbxproj` `TARGETED_DEVICE_FAMILY` 를 `1` → `"1,2"`. ios 폴더가 커밋돼 있어 `app.json` `supportsTablet` 만으로는 빌드에 반영되지 않았음 |
| fastlane 메타데이터 | ⚠️ 낡음 | `fastlane/metadata/ko/*` 는 683개 · 8주제 기준 문구. 이 문서 값으로 덮어써야 `deliver` 업로드와 어긋나지 않음 |
| 스토어 URL 환경변수 | ⚠️ 빈 값 | `.env` 의 `EXPO_PUBLIC_APP_STORE_URL` · `EXPO_PUBLIC_GOOGLE_PLAY_STORE_URL` — 출시 후 채우기 |
| 수출 규정 | ✅ 해결됨 | `ITSAppUsesNonExemptEncryption = false` (iOS Info.plist) |
| 앱 이름 중복 | ✅ 6개 언어 모두 없음 (10-15 재조회) | §2 |
| 홈 화면 이름 · 권한 문구 현지화 | ✅ 완료 | `locales/*.json` 6개 (`app.json` `expo.locales`) |
| 인앱 결제 · 로그인 | ✅ 없음 | 심사용 데모 계정 불필요 |

---

## 1. 공통 식별 정보

| 필드 | 값 |
|---|---|
| 앱 표시 이름(기기 홈) | 언어별 — 아래 표 |
| Bundle ID / package | `com.tha.worldhistoryquiz` |
| 버전 | iOS `1.1.0` · Android `1.0.0` (§0 — 1.1.0 으로 맞추기 권장) |
| 빌드 / versionCode | iOS `3` · Android `1` |
| Apple Team ID | `XH6C349554` |
| 최소 지원 OS | iOS 16.0 / Android (Expo SDK 55 기본값) |
| 태블릿 지원 | 예 (`supportsTablet: true`) — **iPad 스크린샷 필수** |
| 가격 | 0원 (무료) · 인앱 결제 없음 |
| 판매 지역 | 모든 국가·지역 (App Store 는 중국 본토만 해제 — §3) |
| 광고 | 포함 (Google AdMob — 배너 · 앱 시작 광고 · 보상형 광고) |
| 로그인 | 없음 (랭킹은 익명 계정 + 랜덤 닉네임) |
| 저작권 | `© 2025 EcodeLab` |

### 지원 언어 (앱 코드에서 확인)

| 언어 | 앱 코드 | App Store 현지화 | Play 언어 코드 | 홈 화면 이름 (`locales/`) | 앱 안 번역 |
|---|---|---|---|---|---|
| 한국어 | `ko-KR` | 한국어 | `ko-KR` | 세계 상식 퀴즈 | ✅ 1,750 문구 + 데이터 원본 |
| 영어 | `en-EN` | 영어(미국) | `en-US` | World Trivia Quiz | ✅ 1,784 문구 + 데이터 |
| 일본어 | `ja-JP` | 일본어 | `ja-JP` | 世界の雑学クイズ | ✅ 1,750 문구 + 데이터 |
| 중국어 간체 | `zh-CN` | 중국어(간체) | `zh-CN` | 世界常识测验 | ✅ 1,760 문구 + 데이터 |
| 프랑스어 | `fr-FR` | 프랑스어 | `fr-FR` | Quiz Culture Mondiale | ✅ 1,792 문구 + 데이터 |
| 스페인어 | `es-ES` | 스페인어(스페인) | `es-ES` | Quiz de Cultura Mundial | ✅ 1,788 문구 + 데이터 |

앱 언어 결정: 설정에서 고른 언어 > 기기 언어 > 지원하지 않는 기기 언어면 영어 (`src/translations/index.ts` `resolveSystemLanguage`).

### 등록 전략

1. **6개 언어를 첫 제출에 모두 등록** — 앱 번역이 끝났으므로 §4.1~4.6 을 한 번에 올립니다.
2. **기본 언어는 영어(미국) / Play `en-US`** — 기본 언어는 현지화가 없는 나라(독일·브라질·인도 등)에 보이는 언어라, 영어가 한국어보다 훨씬 많은 사람에게 읽힙니다. 한국 사용자는 한국어 현지화(§4.1)를 그대로 봅니다. 그래서 App Store 신규 앱 생성 때 입력하는 이름은 영어 이름(§4.2)입니다.
3. **같은 값 복사로 노출 넓히기 (선택)** — App Store: 영어(영국) · 영어(호주) · 영어(캐나다) ← §4.2, 스페인어(멕시코) ← §4.6, 프랑스어(캐나다) ← §4.5. Play: `en-GB` ← §4.2, `es-419` ← §4.6, `fr-CA` ← §4.5.

App Store Connect `저작권` 입력란은 기호 없이 넣습니다:

```
2025 EcodeLab
```

---

## 2. 앱 이름 중복 확인 결과 (2026-10-14 조회 · 10-15 재조회 동일)

App Store 는 iTunes Search API(`itunes.apple.com/search`)로 언어권별 스토어를 조회했고, Play 는 스토어 검색 결과 상위 제목을 확인했습니다.

| 이름 | 조회한 App Store | App Store 동일 이름 | Play 동일 이름 | 가까운 경쟁 앱 |
|---|---|---|---|---|
| 세계 상식 퀴즈 | KR | **없음** | 없음 | 세계 수도 퀴즈 · 두뇌게임 / 세계사 퀴즈 - 역사 게임 |
| World Trivia Quiz | US · GB · AU | **없음** | 없음 | Trivia World: Quiz / World Geography Trivia Quiz |
| 世界の雑学クイズ | JP | **없음** | 없음 | 国旗クイズ / 世界の首都・地理クイズ |
| 世界常识测验 | CN · SG · TW | **없음** | 없음 | 世界问答 — 国旗·首都·地理 |
| Quiz Culture Mondiale | FR · CA · BE | **없음** | 없음 | Quiz Histoire du Monde / Capitales & Pays: Quiz |
| Quiz de Cultura Mundial | ES · MX · AR | **없음** | 없음 | Quiz de Historia del Mundo / Geografía Mundial: Quiz |

스토어 이름은 기기 홈 이름 뒤에 검색량이 큰 단어(국기·수도·세계사)를 붙였습니다. 홈 이름과 스토어 이름의 앞부분이 같아야 Apple 4.1/2.3.8(이름 불일치) 지적을 피합니다.

> 검색 결과에 없다는 뜻이며, **최종 예약은 App Store Connect 에서 이름을 저장하는 순간 확정**됩니다. 거절되면 예비 이름을 쓰세요.

| 언어 | 예비 이름 |
|---|---|
| 한국어 | `세계 상식 퀴즈: 수도 국기 세계사` |
| English | `World Trivia Quiz: Flag Master` |
| 日本語 | `世界の雑学クイズ 国旗と首都` |
| 简体中文 | `世界常识测验 国旗首都问答` |
| Français | `Quiz Culture Mondiale: Pays` |
| Español | `Quiz de Cultura Mundial: Países` |

---

## 3. 카테고리 · 연령 등급 (ASO 판단 근거)

### 카테고리 (모든 언어 공통 — 카테고리는 앱 단위 설정)

| 스토어 | 선택 | 이유 |
|---|---|---|
| App Store 기본 | **게임 (Games)** | 아래 근거 |
| App Store 게임 하위 | **퀴즈 (Trivia)** (2026-10 기준 게임 하위에 "교육(Educational)" 없음) | 게임은 하위 카테고리 2개까지. 퀴즈 차트가 주 무대, 교육은 "공부" 성격 검색어 보조 |
| App Store 보조 | **교육 (Education)** | `상식 공부`·`geography study` 류 검색어에서 두 번째 진입로 |
| Google Play | **게임 > 퀴즈 (Trivia)** | Play 는 1개만 고릅니다 |
| Play 태그 (최대 5개) | `퀴즈` `트리비아` `교육` `두뇌 게임` `싱글 플레이어` | 콘솔 태그 목록에서 가장 가까운 항목 |

**왜 교육이 아니라 게임 > 퀴즈인가** (2026-10-14 조회)

- **경쟁 앱이 전부 게임에 있음** — 한국 `세계 수도 퀴즈 · 두뇌게임`, `세계사 퀴즈 - 역사 게임`, `한국사 퀴즈`(평가 19,048), 미국 `Trivia World: Quiz`, 일본 `国旗クイズ` 모두 게임 > 퀴즈. "연관 앱" 노출을 같이 탑니다.
- **퀴즈 차트는 진입 장벽이 낮음** — 한국 퀴즈 무료 TOP 100 의 71위가 평가 210개짜리 국기·수도 앱입니다.
- **교육 차트는 대형 서비스 독점** — 듀오링고·말해보카·오르조 같은 앱이 상위를 차지해 상식 퀴즈가 들어갈 자리가 없습니다. 영어·일본어권도 같습니다.
- 앱 구조(타임챌린지 랭킹 · 주간 리그 · 타워 보스 · 배지 85개)가 게임 루프라 심사자 분류와도 맞습니다.

> **중국 본토**: App Store **게임** 카테고리는 중국 본토 판매에 게임 판호(ISBN)가 필요합니다. **가격 및 사용 가능 여부에서 중국 본토만 해제**하세요. 간체 중국어(§4.4) 등록정보는 싱가포르·말레이시아와 각국의 간체 사용자에게 보입니다. Google Play 는 중국 본토에서 서비스되지 않아 영향 없습니다.

### 연령 등급 — 13+

| 스토어 | 설정 |
|---|---|
| App Store | **13+** (2025년 개편 등급 체계: 4+ / 9+ / 13+ / 16+ / 18+) |
| Google Play | IARC 설문 + **타겟층 및 콘텐츠 — 13세 이상** (가족 정책 비대상) |

App Store 연령 등급 설문 답변:

```
폭력(만화/판타지·사실적) : 없음
성적 콘텐츠·노출 : 없음
욕설·저속한 유머 : 없음
공포·놀라는 요소 : 없음
알코올·담배·약물 : 없음
도박(시뮬레이션 포함) : 없음
경쟁(콘테스트) : 없음
의료·치료 정보 : 없음
사용자 생성 콘텐츠 : 없음 (닉네임은 랜덤 생성만 가능, 직접 입력 불가)
제한 없는 웹 접근 : 없음
앱 내 광고 : 있음
위치 공유 : 없음
```

> 위 답변만으로는 4+ 가 산출됩니다. 마지막 화면에서 **연령 등급 직접 상향(13+)** 을 반드시 선택하세요.
> Play `타겟층 및 콘텐츠` 에서는 **13~15세 / 16~17세 / 18세 이상** 만 체크합니다. 12세 이하를 고르면 가족 정책 대상이 되어 AdMob 설정을 바꿔야 합니다.

---

## 4. 언어별 입력 시트

**필드 위치와 글자 수 제한**

| 필드 | App Store Connect | Google Play Console | 제한 |
|---|---|---|---|
| 이름 | 앱 정보 > 이름 | 기본 스토어 등록정보 > 앱 이름 | 30자 |
| 부제 | 앱 정보 > 부제 | — | 30자 |
| 키워드 | 버전 > 키워드 | — | 100자 |
| 프로모션 텍스트 | 버전 > 프로모션 텍스트 (심사 없이 교체 가능) | — | 170자 |
| 간단한 설명 | — | 간단한 설명 | 80자 |
| 설명 | 버전 > 설명 | 자세한 설명 (**같은 박스 사용**) | 4000자 |
| 새로운 기능 | 버전 > 이 버전의 새로운 기능 | 프로덕션 출시 > 출시 노트 (축약판) | 4000 / 500자 |
| 지원 · 마케팅 URL | 버전 > 지원 URL · 마케팅 URL | 스토어 설정 > 웹사이트 | — |

**모든 언어 공통 URL** (App Store 는 현지화마다 입력란이 있으니 같은 값을 넣습니다)

지원 URL

```
https://ecodelab.im
```

마케팅 URL

```
https://adjh5455.blogspot.com/
```

**키워드 작성 원칙**: 이름·부제에 들어간 단어는 Apple 이 자동으로 색인하므로 키워드에서 뺐습니다. Apple 은 이름·부제·키워드의 단어를 서로 조합해 색인하므로 `국기퀴즈`·`flag quiz` 같은 조합 검색어도 따로 넣지 않아도 걸립니다. 쉼표 뒤 공백은 없습니다. Play 는 키워드 필드가 없고 설명 본문을 색인하므로, 설명에 검색어를 자연스럽게 녹였습니다(같은 단어를 억지로 반복하면 Play 메타데이터 정책 위반).

**괄호 안 숫자는 실제 글자 수**이며, 모두 제한 안쪽인지 스크립트로 확인했습니다.

---

### 4.1 한국어 (ko)

#### App Store

**이름 (30자 제한 / 19자)**

```
세계 상식 퀴즈: 수도·국기·세계사
```

**부제 (30자 제한 / 22자)**

```
위인·랜드마크·신화까지 1,100개 상식
```

**키워드 (100자 제한 / 97자)**

```
별자리,태양계,우주,행성,그리스로마신화,올림픽,동계올림픽,월드컵,지리,나라,세계지리,역사,인물,명소,여행,OX,초성,두뇌게임,교양,잡학,일반상식,오답노트,공부,문제,랭킹,천문
```

**프로모션 텍스트 (170자 제한 / 83자)**

```
하루 10문제, 수도·국기·위인·랜드마크·신화까지 1,100개 세계 상식을 퀴즈로 익혀요. 오답은 다시 만나고 출석·리그·랭킹으로 꾸준히 이어 가요.
```

**이번 버전의 새로운 기능 (4000자 제한)**

```
세계 상식 퀴즈 1.1.0

1,100개 세계 상식을 퀴즈로 익히는 첫 버전입니다.

[새로워진 기능]
- 11개 주제: 세계 수도, 위인, 세계사 사건, 랜드마크, 그리스 로마 신화, 별자리와 천체, 세계 지형, 태양계, 하계 올림픽, 동계 올림픽, 월드컵
- 데일리 믹스, 그림 퀴즈, OX 퀴즈, 빈칸 채우기, 초성 퀴즈, 짝 맞추기 등 다양한 퀴즈 방식
- 오답 복습, 약점 집중, 즐겨찾기 퀴즈로 틀린 문제 다시 풀기
- 학습 카드, 쇼츠, 오늘의 읽을거리로 가볍게 익히기
- 180초 타임챌린지 랭킹, 타워 챌린지, 주간 리그
- 레벨 테스트와 유형 테스트
- 출석 체크, 배지 85개, 역사 사자 캐릭터 성장

[개선된 점]
- 회원가입 없이 바로 시작합니다.
- 매일 학습 알림, 다크 모드, 태블릿 화면을 지원합니다.
- 한국어, 영어, 일본어, 중국어(간체), 프랑스어, 스페인어를 지원합니다.

[버그 수정]
- 첫 출시입니다.

써 보시고 불편한 점은 언제든 알려 주세요.
문의: adjh54ir@gmail.com
```

#### Google Play

**앱 이름 (30자 제한 / 19자)**

```
세계 상식 퀴즈: 수도·국기·세계사
```

**간단한 설명 (80자 제한 / 45자)**

```
수도·국기·위인·랜드마크·신화까지 1,100개 세계 상식을 하루 10문제 퀴즈로!
```

**출시 노트 (500자 제한)**

```
세계 상식 퀴즈 첫 출시!
- 수도·위인·세계사·랜드마크·신화·별자리 등 11개 주제, 1,100개 세계 상식
- 데일리 믹스, 그림·OX·초성 퀴즈, 짝 맞추기
- 오답 복습과 약점 집중
- 180초 타임챌린지 랭킹, 타워 챌린지, 주간 리그
- 출석 체크와 배지 85개
```

#### 설명 — App Store 설명 · Play 자세한 설명 공통 (4000자 제한)

```
여행 가서, 뉴스를 보다가, 친구와 이야기하다가 "어디였더라?" 하고 막혔던 세계 상식. 세계 상식 퀴즈는 나라와 도시, 인물과 사건, 신화와 밤하늘, 올림픽과 월드컵까지 1,100개의 세계 상식을 하루 몇 분짜리 퀴즈로 바꿨습니다. 외우지 말고 풀면서 익히세요.

[이런 분께 좋아요]
- 국기와 수도를 보면 늘 헷갈리는 분
- 세계사·교양 상식을 가볍게 다시 다지고 싶은 학생과 직장인
- 출퇴근길 5분, 머리를 깨우는 두뇌 게임을 찾는 분
- 세계 여행을 앞두고 그 나라를 미리 알고 싶은 분

[11개 주제, 1,100개 세계 상식]
- 세계 수도 242곳: 나라 이름, 수도, 대륙, 국기를 함께 익혀요
- 세계 위인 338명: 초상화를 보고 누구인지, 어느 나라 사람인지, 무엇을 했는지 맞혀요
- 세계사 사건 119개: 언제, 어디서, 어떤 일이었는지 흐름으로 이어져요
- 세계 랜드마크 96곳: 사진 한 장으로 어느 나라 어느 도시인지 맞혀요
- 그리스 로마 신화 90명: 신과 영웅이 맡은 자리와 이야기
- 별자리와 천체 60개, 태양계 29개: 대표 별과 잘 보이는 계절, 행성 이야기
- 세계 지형 48곳: 산, 강, 사막, 폭포 같은 지구의 명소
- 하계 올림픽, 동계 올림픽, 월드컵: 개최지와 우승국, 그 대회의 이야기

모든 항목은 위키백과, NASA, FIFA, IOC 등의 자료와 여러 차례 대조해 다듬었습니다. 답만 외우는 문제가 아니라, 한 줄 설명과 생활 속 예시까지 함께 읽게 됩니다.

[지루할 틈 없는 퀴즈 방식]
- 데일리 믹스: 전 주제에서 골고루 섞인 10문제로 매일 실력 점검
- 그림 퀴즈: 국기, 초상화, 랜드마크 사진만 보고 맞히기
- OX 퀴즈, 빈칸 채우기, 초성 퀴즈: 같은 지식도 다른 각도로
- 국기 짝 맞추기, 짝 맞추기: 카드를 뒤집는 메모리 게임
- 묶음 퀴즈: 원하는 주제만 골라 한 번에
- 테마 코스: 지리, 세계사, 교양 테마별로 한 회차씩
- 주제마다 수도 맞히기, 대륙 맞히기, 초상 맞히기, 언제 일어났나 등 40가지가 넘는 문제 유형

[틀린 문제는 다시 만나요]
- 오답 복습: 틀린 문제만 모아 다시 풀어요
- 약점 집중: 정답률이 낮은 주제를 찾아 집중 공략
- 즐겨찾기 퀴즈: 저장해 둔 항목으로 나만의 문제집
- 쉬운 항목부터 시작해, 배운 개수가 늘수록 다음 등급이 열립니다

[가볍게 읽고 익히기]
- 학습 카드: 주제별로 한 장씩 넘기며 공부
- 쇼츠: 위아래로 넘기며 짧게 익히는 카드
- 오늘의 읽을거리: 전 주제에서 모은 이야기를 피드처럼 가볍게
- 검색과 보관함: 궁금한 나라, 인물을 바로 찾아보기

[도전과 성장]
- 180초 타임챌린지: 시간 안에 더 많이 맞히고 전체 랭킹에 도전
- 타워 챌린지: 층마다 보스를 물리치고 정상까지
- 주간 리그: 경험치를 쌓아 매주 승급에 도전
- 레벨 테스트: 나의 세계 상식 등급을 6단계로 진단
- 유형 테스트: 내 취향에 맞는 추천 주제 찾기
- 출석 체크, 배지 85개, 역사 사자 캐릭터 성장
- 학습 리포트와 점수 상세로 내 실력 변화를 한눈에

[편하게 쓰도록]
- 회원가입이 없습니다. 바로 시작하세요.
- 랭킹 닉네임은 랜덤으로만 만들어져 안심하고 참여할 수 있어요.
- 학습 기록은 이 기기에 저장됩니다.
- 매일 정해 둔 시간에 학습 알림을 받을 수 있어요.
- 다크 모드와 태블릿 화면을 지원합니다.
- 한국어, 영어, 일본어, 중국어(간체), 프랑스어, 스페인어를 지원합니다.

하루 10문제면 한 달에 300개. 오늘부터 세계를 한 문제씩 넓혀 보세요.

앱은 무료이며 광고가 포함되어 있습니다.
문의: adjh54ir@gmail.com
```

---

### 4.2 English (영어 · App Store 영어(미국) / Play `en-US` · **기본 언어**)

> `초성 퀴즈`(한글 자음 퀴즈)는 영어에 해당하지 않아 뺐습니다.

#### App Store

**이름 (30자 제한 / 24자)**

```
World Trivia Quiz: Flags
```

**부제 (30자 제한 / 29자)**

```
Capitals, History & Landmarks
```

**키워드 (100자 제한 / 100자)**

```
geography,countries,mythology,greek,constellation,astronomy,planets,olympics,cup,famous,people,brain
```

> 영어 검색량 상위 `flag quiz` · `capitals quiz` · `world history quiz` · `geography quiz` · `general knowledge` 가 이름+부제+키워드 조합으로 모두 걸립니다. `knowledge` 까지 넣으면 100자를 넘어 `brain` 을 남겼습니다(두뇌 게임 검색 진입).

**프로모션 텍스트 (170자 제한 / 147자)**

```
10 questions a day. Learn 1,100 facts on capitals, flags, famous people, landmarks and myths. Missed answers come back, and streaks keep you going.
```

**What's New in This Version (4000자 제한)**

```
World Trivia Quiz 1.1.0

Our first release: learn 1,100 world facts through quizzes.

[New]
- 11 topics: world capitals, famous people, world history events, landmarks, Greek and Roman mythology, constellations and stars, natural wonders, the Solar System, Summer Olympics, Winter Olympics and the World Cup
- Daily Mix, picture quiz, true or false, fill in the blank, memory match and more
- Review mistakes, weak spots and favorites quiz to replay what you missed
- Study cards, shorts and today's reads for quick learning
- 180-second Time Challenge leaderboard, Tower Challenge and Weekly League
- Level test and personality test
- Daily check-in, 85 badges and a history lion who grows with you

[Improved]
- No sign-up. Open the app and start right away.
- Daily study reminders, dark mode and tablet layouts.
- Available in English, Korean, Japanese, Simplified Chinese, French and Spanish.

[Bug Fixes]
- This is our first release.

Tell us anytime if something feels off.
Contact: adjh54ir@gmail.com
```

#### Google Play

**App name (30자 제한 / 24자)**

```
World Trivia Quiz: Flags
```

**Short description (80자 제한 / 79자)**

```
Flags, capitals, famous people and myths: 1,100 world facts in 10 daily quizzes
```

**Release notes (500자 제한)**

```
World Trivia Quiz is here!
- 11 topics and 1,100 world facts: capitals, people, history, landmarks, myths, stars
- Daily Mix, picture quiz, true or false, memory match
- Review mistakes and train weak spots
- 180-second Time Challenge leaderboard, Tower Challenge, Weekly League
- Daily check-in and 85 badges
```

#### Description — App Store · Play 공통 (4000자 제한)

```
Ever blanked on a capital while traveling, watching the news or chatting with friends? World Trivia Quiz turns 1,100 facts about countries and cities, people and events, myths and the night sky, the Olympics and the World Cup into quick daily quizzes. Don't memorize. Play, and it sticks.

[Perfect for you if]
- You always mix up flags and capitals
- You want to brush up on world history and general knowledge
- You need a 5-minute brain game for your commute
- You are planning a trip and want to know the country first

[11 topics, 1,100 world facts]
- World capitals (242): country names, capitals, continents and flags together
- Famous people (338): guess who from the portrait, where they came from and what they did
- World history events (119): when, where and what happened, linked as one timeline
- Landmarks (96): name the country and city from a single photo
- Greek and Roman mythology (90): gods, heroes and their stories
- Constellations and stars (60), Solar System (29): bright stars, the best season to see them, and planet stories
- Natural wonders (48): mountains, rivers, deserts and waterfalls of our planet
- Summer Olympics, Winter Olympics and the World Cup: host cities, winners and the story of each event

Every entry was cross-checked several times against sources such as Wikipedia, NASA, FIFA and the IOC. You don't just memorize answers: each one comes with a short explanation and a real-life example.

[Quiz modes that never get boring]
- Daily Mix: 10 questions from every topic to check yourself each day
- Picture quiz: guess from a flag, a portrait or a landmark photo
- True or false and fill in the blank: the same fact from a new angle
- Flag match and memory match: flip the cards and find the pairs
- Bundle quiz: pick only the topics you want
- Theme courses: geography, world history and general culture, one round at a time
- Over 40 question types, from "name the capital" and "which continent" to "whose portrait" and "when did it happen"

[Missed it? You will see it again]
- Review mistakes: replay only the questions you got wrong
- Weak spots: find your lowest-scoring topics and focus on them
- Favorites quiz: build your own set from saved entries
- Start with the easy ones; new levels unlock as you learn more

[Read and learn, lightly]
- Study cards: flip through each topic one card at a time
- Shorts: swipe through bite-sized cards
- Today's reads: stories from every topic in a light feed
- Search and library: look up any country or person instantly

[Challenge yourself and grow]
- 180-second Time Challenge: answer as many as you can and climb the leaderboard
- Tower Challenge: beat a boss on every floor and reach the top
- Weekly League: earn XP and get promoted every week
- Level test: find your world knowledge grade in 6 steps
- Personality test: discover the topics that suit you
- Daily check-in, 85 badges and a history lion who grows with you
- Learning reports and score details show your progress at a glance

[Made to be easy]
- No sign-up. Just open and play.
- Leaderboard nicknames are generated randomly, so you can join with peace of mind.
- Your progress is saved on your device.
- Get a daily study reminder at the time you choose.
- Dark mode and tablet screens supported.
- Available in English, Korean, Japanese, Simplified Chinese, French and Spanish.

10 questions a day is 300 a month. Start widening your world today, one question at a time.

The app is free and contains ads.
Contact: adjh54ir@gmail.com
```

---

### 4.3 日本語 (일본어 · App Store 일본어 / Play `ja-JP`)

> 일본 검색어는 `クイズ` 보다 `雑学` · `国旗` · `脳トレ` · `一般常識` 이 강해 키워드 중심을 맞췄습니다.

#### App Store

**名前 · 이름 (30자 제한 / 20자)**

```
世界の雑学クイズ - 国旗・首都・世界史
```

**サブタイトル · 부제 (30자 제한 / 18자)**

```
偉人・名所・神話まで1,100の教養
```

**キーワード · 키워드 (100자 제한 / 97자)**

```
地理,国,国名,星座,天体,宇宙,惑星,太陽系,ギリシャ神話,オリンピック,ワールドカップ,歴史,人物,世界遺産,観光,旅行,一般常識,常識,脳トレ,知育,勉強,暗記,検定,マルバツ,ランキング
```

**プロモーションテキスト · 프로모션 텍스트 (170자 제한 / 71자)**

```
1日10問で、首都・国旗・偉人・名所・神話まで1,100の世界の雑学が身につく。間違えた問題はもう一度出題、出席とリーグで楽しく続けられます。
```

**このバージョンの新機能 · 새로운 기능 (4000자 제한)**

```
世界の雑学クイズ 1.1.0

1,100の世界の雑学をクイズで身につける、最初のバージョンです。

【新機能】
・11のテーマ：世界の首都、偉人、世界史の出来事、名所、ギリシャ・ローマ神話、星座と天体、世界の地形、太陽系、夏季オリンピック、冬季オリンピック、ワールドカップ
・デイリーミックス、画像クイズ、マルバツクイズ、穴埋め、神経衰弱など多彩な出題
・間違えた問題の復習、苦手克服、お気に入りクイズ
・学習カード、ショート、今日の読みものでサクッと学習
・180秒タイムチャレンジのランキング、タワーチャレンジ、週間リーグ
・レベルテストとタイプ診断
・出席チェック、バッジ85個、歴史ライオンの成長

【改善点】
・会員登録なしですぐに始められます。
・毎日の学習通知、ダークモード、タブレット画面に対応しました。
・日本語、英語、韓国語、中国語(簡体字)、フランス語、スペイン語に対応しています。

【不具合の修正】
・初回リリースです。

ご意見はいつでもお寄せください。
お問い合わせ：adjh54ir@gmail.com
```

#### Google Play

**アプリ名 · 앱 이름 (30자 제한 / 20자)**

```
世界の雑学クイズ - 国旗・首都・世界史
```

**簡単な説明 · 간단한 설명 (80자 제한 / 40자)**

```
国旗・首都・偉人・名所・神話まで、1,100の世界の雑学を1日10問のクイズで！
```

**リリースノート · 출시 노트 (500자 제한)**

```
世界の雑学クイズ、リリース！
・首都、偉人、世界史、名所、神話、星座など11テーマ、1,100の雑学
・デイリーミックス、画像クイズ、マルバツ、神経衰弱
・間違えた問題の復習と苦手克服
・180秒タイムチャレンジ、タワーチャレンジ、週間リーグ
・出席チェックとバッジ85個
```

#### 説明 · 설명 — App Store · Play 공통 (4000자 제한)

```
旅行中に、ニュースを見ながら、友だちとの会話で「あれ、どこだっけ？」と詰まった世界の雑学。世界の雑学クイズは、国と都市、人物と出来事、神話と夜空、オリンピックとワールドカップまで、1,100の世界の知識を1日数分のクイズにしました。覚えるのではなく、解きながら身につけましょう。

【こんな方におすすめ】
・国旗と首都がいつもごちゃごちゃになる方
・世界史や一般常識を気軽におさらいしたい学生・社会人の方
・通勤中の5分で頭を目覚めさせる脳トレを探している方
・海外旅行の前に、その国のことを知っておきたい方

【11テーマ、1,100の世界の雑学】
・世界の首都242か所：国名、首都、大陸、国旗をまとめて覚える
・世界の偉人338人：肖像画から、誰なのか、どこの国の人で何をしたのかを当てる
・世界史の出来事119件：いつ、どこで、何が起きたのかを流れでつかむ
・世界の名所96か所：写真1枚から国と都市を当てる
・ギリシャ・ローマ神話90人：神々と英雄の役割と物語
・星座と天体60、太陽系29：代表的な星、見やすい季節、惑星の話
・世界の地形48か所：山、川、砂漠、滝など地球の絶景
・夏季オリンピック、冬季オリンピック、ワールドカップ：開催地と優勝国、大会の物語

すべての項目は、ウィキペディア、NASA、FIFA、IOCなどの資料と何度も照らし合わせて作りました。答えを覚えるだけでなく、ひとことの解説と身近な例も一緒に読めます。

【飽きない出題スタイル】
・デイリーミックス：全テーマからバランスよく10問、毎日の実力チェック
・画像クイズ：国旗、肖像画、名所の写真だけで答える
・マルバツクイズ、穴埋めクイズ：同じ知識を違う角度から
・国旗の神経衰弱、ペア合わせ：カードをめくる記憶ゲーム
・まとめクイズ：好きなテーマだけを選んで一気に
・テーマコース：地理、世界史、教養をテーマごとに1回ずつ
・首都当て、大陸当て、肖像当て、いつ起きたかなど40種類以上の出題形式

【間違えた問題は、また出会える】
・間違い復習：間違えた問題だけを集めてもう一度
・苦手克服：正答率の低いテーマを見つけて集中攻略
・お気に入りクイズ：保存した項目で自分だけの問題集
・やさしい項目から始まり、覚えた数が増えるほど次のランクが開きます

【気軽に読んで覚える】
・学習カード：テーマごとに1枚ずつめくって学習
・ショート：上下にスワイプしてサクッと覚えるカード
・今日の読みもの：全テーマから集めた話をフィード感覚で
・検索と保管箱：気になる国や人物をすぐに調べる

【挑戦と成長】
・180秒タイムチャレンジ：時間内にたくさん正解してランキングに挑戦
・タワーチャレンジ：階ごとのボスを倒して頂上へ
・週間リーグ：経験値を集めて毎週昇格を目指す
・レベルテスト：あなたの世界の雑学ランクを6段階で診断
・タイプ診断：好みに合ったおすすめテーマを発見
・出席チェック、バッジ85個、一緒に成長する歴史ライオン
・学習レポートとスコア詳細で実力の変化がひと目でわかる

【使いやすさ】
・会員登録は不要。すぐに始められます。
・ランキングのニックネームはランダム生成のみなので安心して参加できます。
・学習記録はこの端末に保存されます。
・毎日決まった時間に学習通知を受け取れます。
・ダークモードとタブレット画面に対応。
・日本語、英語、韓国語、中国語(簡体字)、フランス語、スペイン語に対応。

1日10問なら1か月で300問。今日から一問ずつ、世界を広げてみませんか。

アプリは無料で、広告が含まれています。
お問い合わせ：adjh54ir@gmail.com
```

---

### 4.4 简体中文 (중국어 간체 · App Store 중국어(간체) / Play `zh-CN`)

> App Store 는 중국 본토 판매를 해제하므로(§3) 이 등록정보는 싱가포르·말레이시아 등 간체 사용자에게 보입니다.

#### App Store

**名称 · 이름 (30자 제한 / 18자)**

```
世界常识测验 - 国旗·首都·世界史
```

**副标题 · 부제 (30자 제한 / 17자)**

```
名人·地标·神话，1100个知识点
```

**关键词 · 키워드 (100자 제한 / 92자)**

```
地理,国家,星座,天文,太空,行星,太阳系,希腊神话,奥运会,冬奥会,世界杯,历史,人物,世界遗产,旅游,知识问答,百科,常识,益智,脑力,答题,学习,排行榜,判断题,游戏,题库,免费
```

**推广文本 · 프로모션 텍스트 (170자 제한 / 62자)**

```
每天10道题，轻松掌握首都、国旗、名人、地标、神话等1100个世界常识。答错的题会再次出现，签到、联赛和排行榜让你坚持下去。
```

**此版本的新内容 · 새로운 기능 (4000자 제한)**

```
世界常识测验 1.1.0

用测验掌握1100个世界常识的首个版本。

【新功能】
- 11个主题：世界首都、名人、世界史事件、地标、希腊罗马神话、星座与天体、世界地形、太阳系、夏季奥运会、冬季奥运会、世界杯
- 每日混合、看图答题、判断题、填空、翻牌配对等多种玩法
- 错题复习、弱项突破、收藏测验
- 学习卡片、短卡片、今日阅读，轻松学习
- 180秒限时挑战排行榜、爬塔挑战、每周联赛
- 等级测试与类型测试
- 每日签到、85枚徽章、历史狮子角色成长

【优化】
- 无需注册，打开即玩。
- 支持每日学习提醒、深色模式和平板界面。
- 支持简体中文、英语、韩语、日语、法语和西班牙语。

【问题修复】
- 首次发布。

如有任何问题，欢迎随时联系我们。
联系邮箱：adjh54ir@gmail.com
```

#### Google Play

**应用名称 · 앱 이름 (30자 제한 / 18자)**

```
世界常识测验 - 国旗·首都·世界史
```

**简短说明 · 간단한 설명 (80자 제한 / 35자)**

```
国旗、首都、名人、地标、神话，每天10道题轻松掌握1100个世界常识！
```

**版本说明 · 출시 노트 (500자 제한)**

```
世界常识测验正式上线！
- 首都、名人、世界史、地标、神话、星座等11个主题，1100个世界常识
- 每日混合、看图答题、判断题、翻牌配对
- 错题复习与弱项突破
- 180秒限时挑战排行榜、爬塔挑战、每周联赛
- 每日签到与85枚徽章
```

#### 说明 · 설명 — App Store · Play 공통 (4000자 제한)

```
旅行途中、看新闻时、和朋友聊天时，你是否也曾突然想不起某个世界常识？世界常识测验把国家与城市、人物与事件、神话与星空、奥运会与世界杯等1100个世界常识，变成每天几分钟的小测验。不用死记硬背，边答边学。

【适合这样的你】
- 总是分不清国旗和首都
- 想轻松复习世界史和百科常识的学生与上班族
- 想在通勤路上用5分钟做个益智脑力游戏
- 出国旅行前，想先了解那个国家

【11个主题，1100个世界常识】
- 世界首都242个：国名、首都、大洲、国旗一起记
- 世界名人338位：看肖像猜出是谁、来自哪个国家、做过什么
- 世界史事件119个：何时、何地、发生了什么，串成一条时间线
- 世界地标96处：一张照片猜出国家和城市
- 希腊罗马神话90位：众神与英雄的职责和故事
- 星座与天体60个、太阳系29个：代表恒星、最佳观测季节、行星故事
- 世界地形48处：山脉、河流、沙漠、瀑布等地球奇观
- 夏季奥运会、冬季奥运会、世界杯：举办地、冠军和每届赛事的故事

所有内容都与维基百科、NASA、FIFA、IOC等资料反复核对。不只是记答案，还能读到一句话解说和生活中的例子。

【玩法多样，不会无聊】
- 每日混合：从所有主题中均衡抽出10道题，每天检测实力
- 看图答题：只看国旗、肖像或地标照片作答
- 判断题、填空题：从不同角度巩固同一个知识点
- 国旗翻牌、配对游戏：翻卡片的记忆游戏
- 组合测验：只选想练的主题一次答完
- 主题课程：地理、世界史、通识，按主题一轮一轮学
- 猜首都、猜大洲、猜肖像、猜年代等40多种题型

【答错的题，还会再见】
- 错题复习：只把答错的题集中再做一遍
- 弱项突破：找出正确率低的主题集中攻克
- 收藏测验：用收藏的条目组成专属题库
- 从简单的开始，学会的越多，解锁的等级越高

【轻松阅读，轻松记住】
- 学习卡片：按主题一张张翻看
- 短卡片：上下滑动，快速记忆
- 今日阅读：汇集各主题的小故事，像刷信息流一样轻松
- 搜索与收藏夹：想查的国家、人物马上找到

【挑战与成长】
- 180秒限时挑战：在时间内答对更多题，冲击排行榜
- 爬塔挑战：每层击败首领，登上塔顶
- 每周联赛：积累经验值，每周争取晋级
- 等级测试：用6个等级诊断你的世界常识水平
- 类型测试：找到适合你的推荐主题
- 每日签到、85枚徽章、与你一起成长的历史狮子
- 学习报告和成绩详情，进步一目了然

【简单好用】
- 无需注册，打开即玩。
- 排行榜昵称只能随机生成，放心参与。
- 学习记录保存在本设备上。
- 可在每天设定的时间收到学习提醒。
- 支持深色模式和平板界面。
- 支持简体中文、英语、韩语、日语、法语和西班牙语。

每天10道题，一个月就是300道。从今天开始，一题一题拓宽你的世界。

本应用免费，含有广告。
联系邮箱：adjh54ir@gmail.com
```

---

### 4.5 Français (프랑스어 · App Store 프랑스어 / Play `fr-FR`)

> 프랑스 검색어 1순위는 `culture générale` 이라 이름의 `Culture` 와 키워드의 `générale` 이 조합되게 했습니다. 프랑스어 문장부호 앞 공백은 **일반 공백**으로 썼습니다(줄바꿈 없는 공백은 오류 원인 — §9).

#### App Store

**Nom · 이름 (30자 제한 / 21자)**

```
Quiz Culture Mondiale
```

**Sous-titre · 부제 (30자 제한 / 29자)**

```
Drapeaux, capitales, histoire
```

**Mots-clés · 키워드 (100자 제한 / 98자)**

```
générale,géographie,pays,monde,mythologie,grecque,astronomie,planètes,olympiques,coupe,jeu,cerveau
```

**Texte promotionnel · 프로모션 텍스트 (170자 제한 / 157자)**

```
10 questions par jour pour retenir 1 100 connaissances : capitales, drapeaux, personnages, monuments et mythes. Vos erreurs reviennent, la ligue vous motive.
```

**Nouveautés de cette version · 새로운 기능 (4000자 제한)**

```
Quiz Culture Mondiale 1.1.0

Première version : apprenez 1 100 connaissances du monde grâce aux quiz.

[Nouveautés]
- 11 thèmes : capitales du monde, personnages célèbres, événements historiques, monuments, mythologie grecque et romaine, constellations et astres, merveilles naturelles, système solaire, Jeux olympiques d'été et d'hiver, Coupe du monde
- Mix du jour, quiz en images, vrai ou faux, texte à trous, jeu de paires et plus encore
- Révision des erreurs, points faibles et quiz favoris
- Fiches, shorts et lectures du jour pour apprendre en douceur
- Classement du défi chrono de 180 secondes, défi de la tour et ligue hebdomadaire
- Test de niveau et test de profil
- Présence quotidienne, 85 badges et un lion de l'histoire qui grandit avec vous

[Améliorations]
- Aucune inscription : ouvrez l'app et jouez.
- Rappel d'étude quotidien, mode sombre et écrans de tablette.
- Disponible en français, anglais, coréen, japonais, chinois simplifié et espagnol.

[Corrections]
- Première version.

Un souci ? Écrivez-nous à tout moment.
Contact : adjh54ir@gmail.com
```

#### Google Play

**Nom de l'application · 앱 이름 (30자 제한 / 30자)**

```
Quiz Culture Mondiale: Drapeau
```

> Play 는 부제가 없어 이름에 `Drapeau` 를 붙였습니다. App Store 이름(21자)과 달라도 문제없습니다.

**Description courte · 간단한 설명 (80자 제한 / 78자)**

```
Drapeaux, capitales, personnages, mythes : 1 100 questions de culture générale
```

**Notes de version · 출시 노트 (500자 제한)**

```
Quiz Culture Mondiale est là !
- 11 thèmes et 1 100 connaissances : capitales, personnages, histoire, monuments, mythes, étoiles
- Mix du jour, quiz en images, vrai ou faux, jeu de paires
- Révision des erreurs et points faibles
- Défi chrono 180 secondes, défi de la tour, ligue hebdomadaire
- Présence quotidienne et 85 badges
```

#### Description · 설명 — App Store · Play 공통 (4000자 제한)

```
En voyage, devant les infos ou entre amis, vous avez déjà séché sur une capitale ? Quiz Culture Mondiale transforme 1 100 connaissances sur les pays et les villes, les personnages et les événements, les mythes et le ciel étoilé, les Jeux olympiques et la Coupe du monde en petits quiz de quelques minutes par jour. Inutile d'apprendre par cœur : jouez, et ça reste.

[Fait pour vous si]
- Vous confondez toujours drapeaux et capitales
- Vous voulez réviser l'histoire du monde et votre culture générale en douceur
- Vous cherchez un jeu de réflexion de 5 minutes pour le trajet
- Vous préparez un voyage et voulez connaître le pays avant de partir

[11 thèmes, 1 100 connaissances du monde]
- Capitales du monde (242) : nom du pays, capitale, continent et drapeau ensemble
- Personnages célèbres (338) : devinez qui c'est d'après le portrait, son pays et ce qu'il a fait
- Événements historiques (119) : quand, où et quoi, reliés en une seule frise
- Monuments (96) : trouvez le pays et la ville à partir d'une seule photo
- Mythologie grecque et romaine (90) : dieux, héros et leurs histoires
- Constellations et astres (60), système solaire (29) : étoiles principales, meilleure saison d'observation, histoires de planètes
- Merveilles naturelles (48) : montagnes, fleuves, déserts et chutes d'eau
- Jeux olympiques d'été et d'hiver, Coupe du monde : villes hôtes, vainqueurs et histoire de chaque édition

Chaque fiche a été vérifiée plusieurs fois à partir de sources comme Wikipédia, la NASA, la FIFA et le CIO. Vous ne retenez pas seulement la réponse : une explication courte et un exemple concret l'accompagnent.

[Des quiz qui ne lassent jamais]
- Mix du jour : 10 questions de tous les thèmes pour faire le point chaque jour
- Quiz en images : répondez à partir d'un drapeau, d'un portrait ou d'une photo
- Vrai ou faux, texte à trous : la même connaissance sous un autre angle
- Paires de drapeaux, jeu de mémoire : retournez les cartes
- Quiz groupé : choisissez seulement les thèmes qui vous plaisent
- Parcours thématiques : géographie, histoire, culture générale, une manche à la fois
- Plus de 40 types de questions : trouver la capitale, le continent, le portrait, la date

[Vos erreurs reviennent]
- Révision des erreurs : rejouez uniquement les questions ratées
- Points faibles : repérez vos thèmes les moins réussis et travaillez-les
- Quiz favoris : votre propre série à partir des fiches enregistrées
- On commence par le plus facile ; de nouveaux niveaux s'ouvrent à mesure que vous apprenez

[Lire et retenir, en douceur]
- Fiches : un thème, une carte à la fois
- Shorts : faites défiler de courtes cartes
- Lectures du jour : des histoires de tous les thèmes, comme un fil d'actualité
- Recherche et bibliothèque : retrouvez tout de suite un pays ou un personnage

[Défis et progression]
- Défi chrono de 180 secondes : un maximum de bonnes réponses pour grimper au classement
- Défi de la tour : battez le boss de chaque étage jusqu'au sommet
- Ligue hebdomadaire : gagnez de l'XP et montez de division chaque semaine
- Test de niveau : votre rang de culture mondiale en 6 paliers
- Test de profil : les thèmes qui vous correspondent
- Présence quotidienne, 85 badges et un lion de l'histoire qui grandit avec vous
- Rapports d'apprentissage et détail des scores pour suivre vos progrès

[Simple à utiliser]
- Aucune inscription. Ouvrez et jouez.
- Les pseudos du classement sont générés au hasard : participez l'esprit tranquille.
- Votre progression est enregistrée sur votre appareil.
- Recevez un rappel d'étude chaque jour à l'heure choisie.
- Mode sombre et écrans de tablette pris en charge.
- Disponible en français, anglais, coréen, japonais, chinois simplifié et espagnol.

10 questions par jour, c'est 300 par mois. Élargissez votre monde dès aujourd'hui, une question à la fois.

L'application est gratuite et contient des publicités.
Contact : adjh54ir@gmail.com
```

---

### 4.6 Español (스페인어 · App Store 스페인어(스페인) / Play `es-ES`)

> 스페인어권 검색어 1순위는 `cultura general` · `preguntas` · `banderas` 입니다. 같은 값을 스페인어(멕시코) · Play `es-419` 에도 복사하면 중남미 노출이 열립니다(§1).

#### App Store

**Nombre · 이름 (30자 제한 / 23자)**

```
Quiz de Cultura Mundial
```

**Subtítulo · 부제 (30자 제한 / 30자)**

```
Banderas, capitales e historia
```

**Palabras clave · 키워드 (100자 제한 / 98자)**

```
general,preguntas,trivia,geografía,países,mitología,astronomía,planetas,olímpicos,copa,juego,mente
```

**Texto promocional · 프로모션 텍스트 (170자 제한 / 151자)**

```
10 preguntas al día para dominar 1.100 datos: capitales, banderas, personajes, monumentos y mitos. Tus errores vuelven y la liga te mantiene con ganas.
```

**Novedades de esta versión · 새로운 기능 (4000자 제한)**

```
Quiz de Cultura Mundial 1.1.0

Primera versión: aprende 1.100 datos del mundo jugando.

[Novedades]
- 11 temas: capitales del mundo, personajes célebres, hechos históricos, monumentos, mitología griega y romana, constelaciones y astros, maravillas naturales, sistema solar, Juegos Olímpicos de verano e invierno, Mundial de fútbol
- Mezcla diaria, quiz de imágenes, verdadero o falso, completar huecos, juego de parejas y más
- Repaso de errores, puntos débiles y quiz de favoritos
- Tarjetas, shorts y lecturas del día para aprender sin esfuerzo
- Ranking del desafío de 180 segundos, desafío de la torre y liga semanal
- Test de nivel y test de perfil
- Asistencia diaria, 85 insignias y un león de la historia que crece contigo

[Mejoras]
- Sin registro: abre la app y empieza.
- Recordatorio diario de estudio, modo oscuro y pantallas de tableta.
- Disponible en español, inglés, coreano, japonés, chino simplificado y francés.

[Correcciones]
- Primera versión.

Si algo no va bien, escríbenos cuando quieras.
Contacto: adjh54ir@gmail.com
```

#### Google Play

**Nombre de la aplicación · 앱 이름 (30자 제한 / 23자)**

```
Quiz de Cultura Mundial
```

**Descripción breve · 간단한 설명 (80자 제한 / 75자)**

```
Banderas, capitales, personajes y mitos: 1.100 preguntas de cultura general
```

**Notas de la versión · 출시 노트 (500자 제한)**

```
¡Llega Quiz de Cultura Mundial!
- 11 temas y 1.100 datos: capitales, personajes, historia, monumentos, mitos, estrellas
- Mezcla diaria, quiz de imágenes, verdadero o falso, parejas
- Repaso de errores y puntos débiles
- Desafío de 180 segundos, desafío de la torre, liga semanal
- Asistencia diaria y 85 insignias
```

#### Descripción · 설명 — App Store · Play 공통 (4000자 제한)

```
¿Alguna vez te quedaste en blanco con una capital mientras viajabas, veías las noticias o hablabas con amigos? Quiz de Cultura Mundial convierte 1.100 datos sobre países y ciudades, personajes y acontecimientos, mitos y el cielo nocturno, los Juegos Olímpicos y el Mundial de fútbol en preguntas de pocos minutos al día. No memorices: juega y se te quedará.

[Ideal para ti si]
- Siempre confundes banderas y capitales
- Quieres repasar historia universal y cultura general sin agobios
- Buscas un juego mental de 5 minutos para el trayecto
- Vas a viajar y quieres conocer el país antes de llegar

[11 temas, 1.100 datos del mundo]
- Capitales del mundo (242): país, capital, continente y bandera a la vez
- Personajes célebres (338): adivina quién es por su retrato, de dónde era y qué hizo
- Hechos históricos (119): cuándo, dónde y qué pasó, unidos en una línea del tiempo
- Monumentos (96): descubre el país y la ciudad con una sola foto
- Mitología griega y romana (90): dioses, héroes y sus historias
- Constelaciones y astros (60), sistema solar (29): estrellas principales, mejor estación para verlas e historias de planetas
- Maravillas naturales (48): montañas, ríos, desiertos y cascadas
- Juegos Olímpicos de verano e invierno, Mundial de fútbol: sedes, campeones y la historia de cada edición

Cada dato se comparó varias veces con fuentes como Wikipedia, la NASA, la FIFA y el COI. No solo memorizas la respuesta: cada una trae una explicación breve y un ejemplo cotidiano.

[Formas de jugar que no aburren]
- Mezcla diaria: 10 preguntas de todos los temas para medirte cada día
- Quiz de imágenes: responde con solo ver una bandera, un retrato o una foto
- Verdadero o falso y completar huecos: el mismo dato desde otro ángulo
- Parejas de banderas y juego de memoria: da la vuelta a las cartas
- Quiz por paquetes: elige solo los temas que quieras
- Rutas temáticas: geografía, historia y cultura general, ronda a ronda
- Más de 40 tipos de pregunta: adivina la capital, el continente, el retrato o la fecha

[Tus errores vuelven]
- Repaso de errores: vuelve a jugar solo las preguntas falladas
- Puntos débiles: encuentra tus temas con menos aciertos y refuérzalos
- Quiz de favoritos: tu propia colección con los datos guardados
- Empiezas por lo fácil y se abren nuevos niveles a medida que aprendes

[Lee y aprende sin esfuerzo]
- Tarjetas: un tema, una tarjeta cada vez
- Shorts: desliza tarjetas breves
- Lecturas del día: historias de todos los temas, como un feed
- Búsqueda y biblioteca: encuentra al instante un país o un personaje

[Retos y progreso]
- Desafío de 180 segundos: acierta todo lo que puedas y sube en el ranking
- Desafío de la torre: vence al jefe de cada piso y llega a la cima
- Liga semanal: gana XP y asciende cada semana
- Test de nivel: descubre tu rango de cultura mundial en 6 niveles
- Test de perfil: encuentra los temas que van contigo
- Asistencia diaria, 85 insignias y un león de la historia que crece contigo
- Informes de aprendizaje y detalle de puntuaciones para ver tu progreso

[Fácil de usar]
- Sin registro. Abre y juega.
- Los apodos del ranking se generan al azar, así que participas con tranquilidad.
- Tu progreso se guarda en tu dispositivo.
- Recibe un recordatorio de estudio cada día a la hora que elijas.
- Compatible con modo oscuro y tabletas.
- Disponible en español, inglés, coreano, japonés, chino simplificado y francés.

10 preguntas al día son 300 al mes. Empieza hoy a ampliar tu mundo, pregunta a pregunta.

La aplicación es gratuita y contiene anuncios.
Contacto: adjh54ir@gmail.com
```

---

## 5. 연락처 · 심사 메모 · 앱 콘텐츠

**App Store 앱 심사 정보 — 메모 (영문)**

```
Thank you for reviewing World Trivia Quiz.

- No login is required. All features are available immediately after launch.
- The app follows the device language (Korean, English, Japanese, Simplified Chinese, French, Spanish; other languages fall back to English). The language can also be changed in My > Settings > Language.
- Leaderboard (Time Challenge ranking) uses an anonymous account created automatically. Nicknames are generated randomly by the app; users cannot type their own nickname, so there is no user-generated content.
- Ads: Google AdMob banner, app open, and rewarded ads. The rewarded ad is optional and grants an extra Tower Challenge attempt (up to 3 per day).
- App Tracking Transparency prompt is shown before any personalized ad request.
- Notifications are local daily study reminders set by the user; no remote push content.
- No in-app purchases.
```

**연락처 (앱 심사 정보)**

| 필드 | 값 |
|---|---|
| 이름 | `Jonghoon` / 성 `Lee` |
| 전화번호 | `+821073605455` |
| 이메일 | `adjh54ir@gmail.com` |
| 로그인 필요 | 아니요 (체크 해제) |

**Google Play 연락처 세부정보**

| 항목 | 값 |
|---|---|
| 이메일 | `adjh54ir@gmail.com` |
| 전화번호 | `+821073605455` |
| 웹사이트 | `https://ecodelab.im` |

**권한 설명 (Info.plist · `locales/*.json` 에 이미 들어간 문구 — 확인용)**

| 언어 | NSUserTrackingUsageDescription |
|---|---|
| ko | 사용자님께 더 관련성 높은 광고를 제공하기 위해 기기의 광고 식별자 사용 권한이 필요합니다. |
| en | Your device's advertising identifier is used to show you more relevant ads. |
| ja | より関連性の高い広告をお届けするため、デバイスの広告識別子を使用します。 |
| zh-Hans | 需要使用设备的广告标识符，以便为您提供更相关的广告。 |
| fr | L'identifiant publicitaire de votre appareil est utilisé pour vous proposer des publicités plus pertinentes. |
| es | Usamos el identificador de publicidad de tu dispositivo para mostrarte anuncios más relevantes. |

사진 보관함 권한 2종(`NSPhotoLibraryAddUsageDescription` · `NSPhotoLibraryUsageDescription`)도 6개 언어로 들어가 있습니다. `CFBundleAllowMixedLocalizations = true` 이므로 iOS 가 기기 언어에 맞는 문구를 고릅니다.

**수출 규정 준수**: `ITSAppUsesNonExemptEncryption = false` 가 Info.plist 에 있어 업로드 후 질문이 나오지 않습니다. 나오면 **"아니요(표준 암호화만 사용)"**.

**광고 식별자(IDFA)**: 예 — "앱 내 광고 게재" 체크.

**Google Play 앱 콘텐츠**

| 항목 | 답변 |
|---|---|
| 앱 액세스 권한 | 모든 기능을 특별한 액세스 권한 없이 사용 가능 |
| 광고 | 예, 광고가 포함되어 있습니다 |
| 광고 ID | 예 — 광고, 애널리틱스 (`com.google.android.gms.permission.AD_ID` 선언됨) |
| 콘텐츠 등급 | IARC 설문 — 카테고리 "게임", 폭력·성·도박·욕설 전부 아니요, 사용자 상호작용 아니요(랜덤 닉네임 랭킹만 존재) |
| 타겟층 | 13~15세, 16~17세, 18세 이상 |
| 뉴스 앱 · 정부 앱 · 건강 앱 | 아니요 |
| 금융 기능 | 없음 |
| 정확한 알람 권한 | 해당 없음 (`SCHEDULE_EXACT_ALARM` 차단됨) |

---

## 6. 데이터 수집 응답 (App Privacy / 데이터 보안)

데이터 수집 응답은 **언어와 무관하게 앱 단위로 한 번** 입력합니다.

### 6.1 App Store Connect — 앱 개인정보 보호

**1단계 — 수집하는 데이터 유형**

| 분류 | 항목 |
|---|---|
| 식별자 | **기기 ID** |
| 사용 데이터 | **제품 상호 작용**, **광고 데이터** |

나머지(연락처 정보, 건강, 금융, 위치, 민감한 정보, 연락처, 사용자 콘텐츠, 검색 기록, 구입 항목, 진단 등)는 체크하지 않습니다.

**2단계 — 사용 목적 (위 세 항목 각각)**

```
타사 광고
분석
```

**3단계 — 사용자 신원에 연결됩니까?**

```
예
```

**4단계 — 추적 목적으로 사용됩니까?**

| 항목 | 답변 |
|---|---|
| 광고 데이터 | **예, 추적 목적으로 사용** |
| 기기 ID | 아니요 (받은 지시대로) — 아래 참고 |
| 제품 상호 작용 | 아니요 |

> 참고: 이 앱은 ATT 권한 문구가 있고 `NSPrivacyTracking = true` 로 IDFA 를 광고에 씁니다. Apple 기준으로는 **기기 ID 도 "추적에 사용 — 예"** 가 더 정확합니다. 심사에서 "개인정보 라벨과 앱 동작 불일치" 지적을 받으면 기기 ID 도 예로 바꾸세요.

### 6.2 Google Play Console — 데이터 보안

**1단계 — 데이터 수집 및 보안**

| 질문 | 답변 |
|---|---|
| 앱에서 필수 사용자 데이터 유형을 수집하거나 공유하나요? | **예** |
| 전송 중 데이터 암호화 | 예 (HTTPS — AdMob · Firebase · Supabase) |
| 앱에서 지원하는 계정 생성 방법 | **앱에서 사용자가 계정을 만들도록 허용하지 않음** |
| 사용자가 앱 외부에서 만든 계정으로 로그인할 수 있나요? | **아니요** |
| 데이터 삭제 요청 방법 | 이메일 `adjh54ir@gmail.com` 로 요청 (계정이 없어 URL 불필요) |

**2단계 — 데이터 유형**

| 분류 | 항목 |
|---|---|
| 앱 활동 | **앱 상호작용** |
| 앱 정보 및 성능 | **비정상 종료 로그**, **진단** |
| 기기 또는 기타 ID | **기기 또는 기타 ID** |

**3단계 — 각 데이터 유형 공통 답변**

| 질문 | 답변 |
|---|---|
| 수집 / 공유 | **수집됨** |
| 임시 처리 여부 | **아니요, 수집된 데이터가 임시적으로 처리되지 않습니다** |
| 필수 / 선택 | **데이터 수집은 필수입니다** (사용자가 이 데이터 수집을 중지할 수 없음) |
| 수집 목적 | **애널리틱스**, **광고 또는 마케팅** |

### 6.3 근거 (코드에서 확인한 SDK)

| SDK | 수집 | 스토어 항목 |
|---|---|---|
| `react-native-google-mobile-ads` | 광고 ID, 광고 상호작용 | 기기 ID · 광고 데이터 |
| `@react-native-firebase/analytics` | 화면·이벤트 로그 | 제품 상호 작용 · 앱 상호작용 |
| `@react-native-firebase/crashlytics` | 비정상 종료 로그 | 비정상 종료 로그 · 진단 (Play) |
| Supabase (랭킹) | 익명 사용자 ID, 랜덤 닉네임, 점수 | 기기 또는 기타 ID · 앱 상호작용 |

학습 기록 · 즐겨찾기 · 출석 · 고른 언어는 기기 안에만 저장되어 수집 항목이 아닙니다.

---

## 7. 스토어 에셋 규격

### App Store

| 항목 | 규격 | 필수 |
|---|---|---|
| iPhone 6.9" 스크린샷 | 1320 x 2868 (세로) · 2~10장 | 필수 (현지화마다) |
| iPad 13" 스크린샷 | 2064 x 2752 (세로) · 2~10장 | 필수 (`supportsTablet: true`) |
| 앱 아이콘 | 빌드에 포함 (`assets/icon.png`) | — |

현지화에 스크린샷을 따로 올리지 않으면 기본 언어 스크린샷이 그대로 보입니다. **영어 등록정보에 한국어 화면**이 보이면 전환율이 크게 떨어지니, 언어마다 그 언어로 바꾼 앱 화면을 찍으세요(마이 > 설정 > 언어로 전환 후 촬영).

### Google Play

| 항목 | 규격 | 필수 |
|---|---|---|
| 앱 아이콘 | 512 x 512 PNG (32비트, 1MB 이하) | 필수 |
| 그래픽 이미지 | 1024 x 500 PNG/JPG | 필수 (언어별 교체 가능) |
| 휴대전화 스크린샷 | 1080 x 1920 이상 · 2~8장 | 필수 (언어별 교체 가능) |
| 7인치 · 10인치 태블릿 스크린샷 | 각 1장 이상 | 권장 |

**스크린샷 순서와 캡션 (첫 3장이 전환을 좌우합니다)**

| # | 화면 | 한국어 | English | 日本語 | 简体中文 | Français | Español |
|---|---|---|---|---|---|---|---|
| 1 | 홈 | 1,100개 세계 상식, 하루 10문제 | 1,100 world facts, 10 a day | 1,100の雑学を1日10問 | 1100个常识，每天10题 | 1 100 questions, 10 par jour | 1.100 datos, 10 al día |
| 2 | 국기 그림 퀴즈 | 국기만 보고 맞혀 보세요 | Guess the country by its flag | 国旗だけで国を当てよう | 看国旗猜国家 | Devinez le pays par son drapeau | Adivina el país por su bandera |
| 3 | 위인 초상 퀴즈 | 338명의 세계 위인 | 338 famous people | 世界の偉人338人 | 338位世界名人 | 338 personnages célèbres | 338 personajes célebres |
| 4 | 랜드마크 사진 퀴즈 | 사진 한 장으로 떠나는 세계 여행 | Travel the world in one photo | 写真1枚で世界旅行 | 一张照片环游世界 | Le tour du monde en une photo | Viaja por el mundo con una foto |
| 5 | 오답 복습 | 틀린 문제는 다시 만나요 | Missed it? See it again | 間違えた問題はもう一度 | 答错的题再练一次 | Vos erreurs reviennent | Tus errores vuelven |
| 6 | 180초 타임챌린지 | 랭킹에 도전하세요 | Climb the leaderboard | ランキングに挑戦 | 冲击排行榜 | Grimpez au classement | Sube en el ranking |
| 7 | 타워 챌린지 | 층마다 보스를 물리치고 | Beat a boss on every floor | 階ごとのボスを倒せ | 逐层击败首领 | Battez le boss de chaque étage | Vence al jefe de cada piso |
| 8 | 배지 · 출석 | 배지 85개를 모아 보세요 | Collect 85 badges | バッジ85個を集めよう | 收集85枚徽章 | Collectionnez 85 badges | Consigue 85 insignias |

---

## 8. 출시자 정보

| 항목 | 값 |
|---|---|
| 지원 URL | `https://ecodelab.im` |
| 마케팅 URL | `https://adjh5455.blogspot.com/` |
| 개인정보 처리방침 URL | 언어별 — 아래 표 (`spitogenie` 는 다른 앱 방침이라 쓰지 않음) |
| 저작권 | `© 2025 EcodeLab` (입력란에는 `2025 EcodeLab`) |
| 이름 | Lee Jonghoon |
| 연락처 번호 | `+821073605455` |
| 이메일 | `adjh54ir@gmail.com` |
| 가격 | 0원 (무료) |
| 판매 지역 | 모든 국가·지역 (App Store 는 중국 본토 해제 — §3) |
| 광고 | 포함 |

**개인정보 처리방침 URL — 언어별**

App Store 는 현지화마다 방침 URL 입력란이 있습니다. Play 는 앱 콘텐츠 > 개인정보처리방침에 1개만 넣습니다.

| 언어 | 게시 상태 (10-15) | URL |
|---|---|---|
| 한국어 | ✅ 배포됨 | `https://www.ecodelab.im/terms/worldhistoryquiz` |
| English | ⚠️ 배포 전 | `https://www.ecodelab.im/terms/worldhistoryquizEn` |
| 日本語 | ⚠️ 배포 전 | `https://www.ecodelab.im/terms/worldhistoryquizJp` |
| 简体中文 | ⚠️ 배포 전 | `https://www.ecodelab.im/terms/worldhistoryquizZh` |
| Français | ⚠️ 배포 전 | `https://www.ecodelab.im/terms/worldhistoryquizFr` |
| Español | ⚠️ 배포 전 | `https://www.ecodelab.im/terms/worldhistoryquizEs` |

> 웹사이트 배포 전에 제출해야 한다면 6개 언어 모두 한국어판 URL 을 넣고, 배포 후 언어별로 바꾸세요(심사 없이 수정 가능).

한국어

```
https://www.ecodelab.im/terms/worldhistoryquiz
```

English · Play 앱 콘텐츠 (기본 언어가 영어이므로 Play 에는 이 값)

```
https://www.ecodelab.im/terms/worldhistoryquizEn
```

日本語

```
https://www.ecodelab.im/terms/worldhistoryquizJp
```

简体中文

```
https://www.ecodelab.im/terms/worldhistoryquizZh
```

Français

```
https://www.ecodelab.im/terms/worldhistoryquizFr
```

Español

```
https://www.ecodelab.im/terms/worldhistoryquizEs
```

---

## 9. "유효하지 않은 문자" 오류 예방 규칙

App Store Connect 가 `필드에 하나 이상의 유효하지 않은 문자가 포함되어 있습니다` 를 띄우는 원인입니다.
**§4 의 복사용 박스 값은 아래 규칙대로 작성했고, 스크립트로 이모지 · 특수 기호 · 보이지 않는 공백 검사를 통과했습니다.**

| 쓰면 안 되는 것 | 이유 |
|---|---|
| 이모지 (🌍 ✈️ ✅ 등) | 이름·부제·키워드·프로모션 텍스트에서 즉시 거부. 설명에서도 반려 사례 다수 |
| 특수 기호 ™ ® ★ ✓ ■ ● ▶ ♪ 와 긴 대시 – — | 유효하지 않은 문자로 잡힙니다 (일본어 목록에 흔한 ■ ★ 도 금지) |
| 물결 대시 〜 (U+301C) | 일본어 입력기에서 자주 들어갑니다 |
| 전각 공백 (U+3000) · 줄바꿈 없는 공백 (U+00A0, U+202F) | 눈에 보이지 않습니다. 프랑스어 편집기는 `:` `?` 앞에 자동으로 넣으니 주의 |
| 스마트 따옴표 " " ' ' | 편집기 자동 변환 주의. 이 문서는 곧은 따옴표 `"` `'` 만 씁니다 |
| 키워드 필드의 공백 | 쉼표 뒤 공백도 글자 수에 포함됩니다 |

써도 되는 것: 각 언어 글자(한글·가나·한자·악센트 문자), 숫자, 줄바꿈, `. , : ; ( ) [ ] - / · % + ! ? " ' & ¿ ¡`, 일본어·중국어 문장부호 `、 。 ・ ： ！ ？ 「 」 【 】 ，`

붙여 넣은 뒤 오류가 나면 아래 명령으로 문제 문자를 찾을 수 있습니다 (값을 `/tmp/desc.txt` 에 저장 후 실행):

```bash
python3 -c "
import unicodedata
s=open('/tmp/desc.txt',encoding='utf-8').read()
for i,ch in enumerate(s):
    if (unicodedata.category(ch) in ('So','Sk','Cf','Zs','Pd') and ch not in ' -') or ord(ch)>0xFFFF or ch in '“”‘’〜':
        print(i, repr(ch), hex(ord(ch)), unicodedata.name(ch,'?'))
"
```

---

## 10. 제출 순서 체크리스트

**App Store**

```
1. §0 남은 항목 해결 (웹사이트 방침 배포 · ascAppId · 스크린샷 · Play 그래픽 이미지 · Android 버전)
2. App Store Connect > 나의 앱 > + > 신규 앱
   - 플랫폼 iOS / 이름 "World Trivia Quiz: Flags" / 기본 언어 영어(미국)
   - 번들 ID com.tha.worldhistoryquiz / SKU worldhistoryquiz-1000
3. 앱 정보: 기본 카테고리 게임(하위 퀴즈 + 교육), 보조 카테고리 교육, 연령 등급 13+
4. 앱 정보 오른쪽 위 언어 메뉴에서 현지화 추가:
   한국어 · 일본어 · 중국어(간체) · 프랑스어 · 스페인어(스페인)
   - 각 언어에서 이름 · 부제 · 개인정보 처리방침 URL 입력 (§4.x · §8)
5. 가격 및 사용 가능 여부: 무료, 모든 국가 및 지역 (중국 본토만 해제)
6. 앱 개인정보 보호: §6.1 단계대로 입력 (언어 무관, 1회)
7. 버전 정보: 언어마다 §4.x 값 붙여넣기 (키워드 · 프로모션 · 설명 · 새로운 기능 · URL)
8. 스크린샷 업로드: 언어마다 iPhone 6.9" + iPad 13"
9. 빌드 업로드: Xcode Archive 또는 eas build -p ios --profile production
10. 앱 심사 정보에 §5 메모 · 연락처, 로그인 필요 해제
11. 광고 식별자(IDFA) 사용: 예 - 앱 내 광고 게재 체크
12. 심사 제출
```

**Google Play**

```
1. Play Console > 앱 만들기 (앱 이름 World Trivia Quiz: Flags / 기본 언어 영어 en-US / 게임 / 무료)
2. 앱 설정 대시보드 전 항목 처리 (§5 Google Play 앱 콘텐츠 표)
   - 데이터 보안: §6.2 단계대로
3. 스토어 설정: 앱 카테고리 게임 > 퀴즈, 태그 5개, 연락처 세부정보
4. 기본 스토어 등록정보: §4.2 Google Play 값 + 아이콘 512 + 그래픽 이미지 + 스크린샷
5. 기본 스토어 등록정보 > 번역 관리 > 직접 번역 추가:
   ko-KR · ja-JP · zh-CN · fr-FR · es-ES 에 §4.x Google Play 값 입력
   (Google 기계 번역 자동 적용은 쓰지 않습니다 — 품질이 이 문서보다 낮습니다)
6. 프로덕션 트랙에 AAB 업로드 (eas build -p android --profile production 또는 ./gradlew bundleRelease)
7. 출시 노트: 언어 태그별로 §4.x 출시 노트 입력
   <ko-KR> ... </ko-KR>
   <en-US> ... </en-US>
   <ja-JP> ... </ja-JP>
   <zh-CN> ... </zh-CN>
   <fr-FR> ... </fr-FR>
   <es-ES> ... </es-ES>
8. 국가/지역: 모든 국가 선택
9. 출시 검토 후 제출
```

**출시 직후 할 일**

```
- .env 와 .env.production 의 EXPO_PUBLIC_APP_STORE_URL / EXPO_PUBLIC_GOOGLE_PLAY_STORE_URL 채우기
- fastlane/metadata/{ko,en-US,ja,zh-Hans,fr-FR,es-ES}/* 와 fastlane/metadata/android/{ko-KR,en-US,ja-JP,zh-CN,fr-FR,es-ES}/* 를 이 문서 값으로 갱신
- 루트의 RELEASE.md(생활한자 시절 문서) · STORE_LISTING.md(683개 기준) 는 낡은 값이니 정리
```
