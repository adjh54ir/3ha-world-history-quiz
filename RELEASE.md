# 생활한자 퀴즈 — 스토어 출시 매뉴얼 (Google Play / App Store)

> 이 저장소의 실제 코드·설정을 읽어서 정리한 출시 문서입니다.
> 문구(메타데이터)의 **원본**은 `fastlane/metadata/` 이고, 이 문서는 그 값과 출시 절차·정책 답변안을 함께 담습니다.
> 자동화 레인 상세는 `fastlane.md` · `fastlane/README.md` 참고.

작성 기준일: 2026-09-11 / 기준: `main` 브랜치 현재 워킹트리

---

## 0. 지금 바로 고쳐야 하는 것 (출시 차단 항목)

| # | 문제 | 위치 | 조치 |
|---|---|---|---|
| 1 | **EAS 프로젝트 ID·OTA URL 이 다른 앱(한픽)과 동일** — `4125cad1-b423-4398-9683-d676ee94bbf0` 은 `3ha-hanpick/app.json` 과 같은 값입니다. 이대로 OTA 를 올리면 두 앱이 같은 채널을 공유합니다 | `app.json` `extra.eas.projectId`, `updates.url` | `eas init` 으로 생활한자 전용 프로젝트를 만들고 두 값 교체 |
| 2 | **App Store Connect App ID 가 한픽 값** — `6785401301` 은 한픽의 앱 ID | `eas.json` `submit.production.ios.ascAppId` | App Store Connect 에 생활한자 앱 생성 후 새 ID 로 교체 |
| 3 | **AdMob App ID 가 한픽과 동일** — `~3451831828`(Android) / `~9825668482`(iOS) 가 `3ha-hanpick/app.json` 과 같은 값 | `app.json` plugins + 최하단 `react-native-google-mobile-ads` 블록, iOS `Info.plist` `GADApplicationIdentifier` | AdMob 콘솔에서 생활한자 앱을 등록하고 App ID·광고 단위 ID 전부 교체 |
| 4 | **키스토어·서비스 계정 키가 git 에 커밋되어 있음** | `android/app/release.keystore`, `android/gradle.properties`(비밀번호 평문), `credentials/google-service-account.json`, `.env`, `.env.production`, `GoogleService-Info.plist` | §5.3 보안 경고 참고 |
| 5 | **개인정보처리방침 URL 없음** — 두 스토어 모두 필수 | 문서 원문은 `term/LifeHanja.tsx` 에 있으나 웹에 게시되지 않음 | 웹에 게시 후 §9·§10 에 기입 |
| 6 | 스토어 리뷰 링크 무동작 — `.env` 의 스토어 URL 이 빈 값이고 `.env.production` 에는 키 자체가 없음 | `.env:8-9`, `.env.production`, `src/const/EnvCompat.ts:20-21`, `src/screens/life/LifeSettingScreen.tsx:365` | 스토어 등록 후 `EXPO_PUBLIC_APP_STORE_URL`, `EXPO_PUBLIC_GOOGLE_PLAY_STORE_URL` 채우기 |
| 7 | 스토어 메타데이터 본문이 **한픽 문구 그대로** — 급수 시험·어문회·모의고사 이야기라 이 앱과 맞지 않음 | `fastlane/metadata/ko/*`, `fastlane/metadata/android/ko-KR/*`, `STORE_LISTING.md` | 생활한자 기준으로 재작성 (§6) |
| 8 | 앱 내 약관 화면이 구버전 문구 | `src/screens/modal/SettingModal.tsx` | `term/LifeHanja.tsx` 내용으로 교체 |
| 9 | 스크린샷 0장 (`fastlane/screenshots` 디렉터리 없음) | — | §8 규격대로 촬영 |
| 10 | Play changelog 가 `changelogs/2.txt` 뿐 — 현재 versionCode 는 3 | `fastlane/metadata/android/ko-KR/changelogs/` | `3.txt` 추가 |

---

## 1. 앱 기본 식별 정보

| 항목 | 값 | 출처 |
|---|---|---|
| 표시 이름 | 생활한자 퀴즈 | `app.json` `expo.name`, iOS `CFBundleDisplayName` |
| 스토어 등록명 (iOS) | 생활한자 퀴즈 | `fastlane/metadata/ko/name.txt` |
| 스토어 등록명 (Play) | `한픽: 한자 급수 퀴즈` ⚠️ 이전 앱 값 | `fastlane/metadata/android/ko-KR/title.txt` |
| iOS Bundle ID | `com.tha.lifehanja` | `app.json`, `project.pbxproj:495` |
| Android package | `com.tha.lifehanja` | `app.json`, `build.gradle:92` |
| Apple Team ID | `XH6C349554` | `eas.json`, `project.pbxproj:474` |
| App Store Connect App ID | `6785401301` ⚠️ 한픽 값 | `eas.json` submit.production.ios.ascAppId |
| Apple 계정 | `adjh54@naver.com` | `eas.json` |
| EAS project ID | `4125cad1-b423-4398-9683-d676ee94bbf0` ⚠️ 한픽과 동일 | `app.json` extra.eas |
| EAS owner | `ecodelab` | `app.json` |
| Xcode workspace / scheme | `ios/LifeHanja.xcworkspace` / `LifeHanja` | `fastlane/Fastfile:11-12` |
| URL scheme | `lifehanja` | `app.json` |
| 카테고리 | 교육 (Education) | 스토어 설정 |
| 가격 | 무료 (광고 포함, 인앱 결제 없음) | — |

### 버전 현황

| 위치 | 버전 | 빌드 |
|---|---|---|
| `app.json` | **키 없음** (`expo.version` 미정의) | 네이티브 값 사용 |
| `ios/LifeHanja.xcodeproj` | MARKETING_VERSION 1.1.0 | CURRENT_PROJECT_VERSION 3 |
| `android/app/build.gradle` | 1.1.0 | versionCode 3 |

> `eas.json` 의 `cli.appVersionSource` 가 `local` 이므로 네이티브 값이 그대로 쓰입니다. 두 네이티브 값은 현재 일치합니다.
>
> ⚠️ `fastlane/Fastfile` 의 `read_app_version` / `bump` 레인은 `app.json` 의 `expo.version` 을 읽고 씁니다. 지금은 그 키가 없어 **항상 `1.0.0` 으로 폴백**합니다. `yarn fl:ios:bump` 계열을 쓰려면 `app.json` 에 `version` 을 추가하거나 레인을 gradle/pbxproj 기준으로 고쳐야 합니다.

---

## 2. 기술 스택 / 빌드 환경

| 항목 | 값 |
|---|---|
| Expo SDK | 55 (`expo ~55.0.26`) — 문서: https://docs.expo.dev/versions/v55.0.0/ |
| React Native | 0.83.6 / React 19.2.0 |
| 아키텍처 | New Architecture 활성 (`newArchEnabled=true`), Hermes 활성 |
| 라우팅 | expo-router (`app/` 디렉터리, `main: expo-router/entry`) |
| 상태 | Redux Toolkit + redux-persist (AsyncStorage) |
| 패키지 매니저 | yarn 4.17.0 |
| Node (EAS) | 24.16.0 (`eas.json` base) |
| Android minSdk / target / compileSdk | Expo SDK 55 기본값 (gradle 에 숫자 명시 없음) — `cd android && ./gradlew :app:properties \| grep -i sdk` 로 확인 후 Play Console 요구 API 레벨 충족 여부 검증 |
| ABI | armeabi-v7a, arm64-v8a, x86, x86_64 |
| Edge-to-edge | 활성 (`edgeToEdgeEnabled=true`) |
| 화면 방향 | portrait 고정 |
| iOS 태블릿 지원 | `supportsTablet: true`, `requireFullScreen: true` → **iPad 스크린샷 필수** |
| 다국어 | 미지원 — 한국어 전용 (i18n 라이브러리·`locales/` 없음, iOS `CFBundleLocalizations` = ko) |

---

## 3. 출시 전 체크리스트

```bash
yarn lint            # ESLint
npx tsc --noEmit     # 타입 체크
yarn test            # node:test (src/**/*.test.ts)
yarn verify:words    # 단어 데이터 검증 (표준국어대사전 대조)
```

- [ ] 위 4개 통과
- [ ] `build.gradle` / `project.pbxproj` 버전·빌드번호 일치 (현재 1.1.0 / 3)
- [ ] `fastlane/metadata/**/release_notes.txt`, `changelogs/<versionCode>.txt` 를 이번 버전 내용으로 갱신 (현재 changelog 파일은 `2.txt` 뿐)
- [ ] `.env.production` 의 AdMob 단위 ID 가 **생활한자 운영 ID** 인지 확인 (한픽 ID 나 테스트 ID 로 출시하면 수익이 엉킴)
- [ ] 실기기에서 릴리즈 빌드 스모크 테스트 (광고 노출, 알림 예약, 효과음 재생, 스플래시)
- [ ] Crashlytics 로 테스트 크래시 1건 올려서 수집 확인
- [ ] 개인정보처리방침 URL 접속 확인

---

## 4. 빌드 & 제출 명령

두 갈래가 모두 준비되어 있습니다. **한쪽만 골라서** 쓰세요.

### 4.1 EAS (권장 — 이미 설정 완료)

```bash
# Android: 로컬 빌드 → Play 업로드(프로덕션 트랙, draft 상태로 생성)
yarn deploy:android

# iOS: 로컬 빌드 → App Store Connect 업로드
yarn deploy:ios
```

프로필(`eas.json`):

| 프로필 | 채널 | 배포 | Android 산출물 | APP_ENV |
|---|---|---|---|---|
| development | development | internal | apk | development |
| preview | preview | internal | apk | preview |
| production | production | store | aab | production |

제출 설정: Android 는 `credentials/google-service-account.json` 으로 `production` 트랙에 **draft** 로 올라갑니다(Play Console 에서 수동 출시). iOS 는 위 §1 의 Apple 계정/ascAppId 사용 — **ascAppId 를 먼저 교체**해야 합니다(§0-2).

### 4.2 fastlane

```bash
yarn fl:install        # bundle install + 플러그인
cp fastlane/.env.example fastlane/.env   # 값 채우기 (커밋 금지)

# iOS
yarn fl:ios:signing    # match 로 인증서 동기화
yarn fl:ios:beta       # 빌드 → TestFlight → dSYM 업로드
yarn fl:ios:release    # 빌드 → deliver(메타데이터+빌드) 제출

# Android
yarn fl:and:aab        # 릴리즈 AAB
yarn fl:and:beta       # 내부 테스트 트랙 업로드
yarn fl:and:release    # 프로덕션 출시
yarn fl:and:promote    # internal → production 승격
```

빌드번호: `fl:ios:build` 는 `BUILD_NUMBER` 미지정 시 **타임스탬프(YYYYMMDDHHmm)** 를 씁니다.
`deliver` 는 기본적으로 `submit_for_review: false`, `automatic_release: false` (`fastlane/Deliverfile`) — 자동 제출하려면 `SUBMIT_FOR_REVIEW=true`.

### 4.3 Gradle 직접

```bash
yarn build:aab   # android/app/build/outputs/bundle/release/app-release.aab
yarn build:apk   # 내부 배포용
```

### 4.4 난독화 매핑 파일 (R8 mapping.txt)

Play Console 의 "이 App Bundle 유형과 연결된 가독화 파일이 없습니다" 경고는 **매핑 파일이 빠진 AAB**를 올렸을 때 나옵니다.

- 난독화 설정: `android/gradle.properties` 의 `android.enableMinifyInReleaseBuilds=true` (R8 ON) — `app.json` 의 `expo-build-properties` 에도 같은 값이 있습니다
- 규칙 파일: `android/app/proguard-rules.pro`
- 매핑 산출물: `android/app/build/outputs/mapping/release/mapping.txt`

AGP 는 `bundleRelease` 로 만든 AAB 안에 매핑을 자동으로 넣습니다
(`BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`). 따라서 **R8 이 켜진 상태로 빌드한 AAB 를 올리면 경고가 사라집니다.**

경고가 계속 나오면 순서대로 확인:

1. 빌드 시점에 R8 이 실제로 돌았는지 — `android/app/build/outputs/mapping/release/mapping.txt` 파일이 존재하는지 확인
2. 파일이 없으면 클린 빌드: `cd android && ./gradlew clean bundleRelease`
3. 그래도 없으면 매핑을 직접 업로드: Play Console → 앱 번들 탐색기 → 해당 버전 → **다운로드 탭 → ReTrace 매핑 파일 업로드**
4. APK 배포(내부 테스트)라면 매핑이 자동 포함되지 않으므로 3번 방식으로 직접 올려야 합니다

> 매핑 파일은 버전코드마다 다릅니다. 릴리스마다 `mapping.txt` 를 따로 보관하세요 (`build/` 는 clean 시 지워짐).

---

## 5. 서명 / 자격증명

### 5.1 iOS

- 방식: **fastlane match** (`fastlane/Matchfile`, type `appstore`, storage `git`)
- 필요 환경변수: `MATCH_GIT_URL`, `MATCH_PASSWORD`, `MATCH_READONLY`
- App Store Connect API 키 권장(2FA 회피): `APP_STORE_CONNECT_API_KEY_KEY_ID` / `_ISSUER_ID` / `_KEY_FILEPATH(./fastlane/AuthKey.p8)`
- EAS 를 쓸 경우 EAS 가 관리하는 자격증명과 match 자격증명이 **충돌하지 않도록** 한쪽으로 통일

### 5.2 Android

- 릴리즈 서명: `android/app/release.keystore`, alias `three-hundred-app` (`android/gradle.properties`)
- Play App Signing 사용 시 이 키는 **업로드 키**입니다. 분실하면 업로드 키 재등록 절차 필요.
- Play 업로드 서비스 계정: `credentials/google-service-account.json` (권한: Play Console → 사용자 및 권한 → 릴리즈 관리)

### 5.3 보안 경고 (중요)

현재 다음 파일들이 git 에 **추적되고 있습니다** (`git ls-files` 확인):

```
.env
.env.production
android/app/release.keystore
android/gradle.properties        (RELEASE_STORE_PASSWORD / RELEASE_KEY_PASSWORD 평문)
credentials/google-service-account.json
GoogleService-Info.plist
ios/LifeHanja/GoogleService-Info.plist
```

저장소가 공개(public)라면 릴리즈 서명 키와 Play 업로드 권한이 외부에 노출된 상태입니다. 권장 조치:

1. 저장소 공개 여부 확인. 공개였다면 **서비스 계정 키를 즉시 폐기하고 재발급**하고, 업로드 키 교체를 Play Console 에서 진행.
2. `.gitignore` 에 `android/app/release.keystore`, `android/gradle.properties`, `credentials/`, `.env*` 추가 후 `git rm --cached` 로 인덱스에서 제거.
3. 서명 비밀번호는 `~/.gradle/gradle.properties` 또는 환경변수로 이동.
4. 과거 커밋에 남은 키는 히스토리 재작성(`git filter-repo`) 없이는 사라지지 않습니다 — 재작성 전까지는 키가 유효하다고 가정하고 대응하세요.

이 조치는 되돌리기 어려운 작업(히스토리 재작성, 키 폐기)을 포함하므로 진행 전 백업과 팀 합의를 권합니다.

---

## 6. 스토어 메타데이터 (업로드되는 실제 값)

| 스토어 | 경로 |
|---|---|
| App Store (deliver) | `fastlane/metadata/ko/` — `name.txt` · `subtitle.txt` · `description.txt` · `keywords.txt` · `promotional_text.txt` · `release_notes.txt` |
| Google Play (supply) | `fastlane/metadata/android/ko-KR/` — `title.txt` · `short_description.txt` · `full_description.txt` · `changelogs/<versionCode>.txt` · `images/featureGraphic.png` |

문구를 고칠 땐 **두 곳을 함께** 고칩니다(본문 동일).

### 6.1 현재 값 상태

> ⚠️ **`name.txt` 를 뺀 나머지 문구는 전부 한픽(한자 급수 시험 앱) 것입니다.** 어문회·진흥회·배정한자 6,182자·모의고사 이야기라 이 앱의 기능과 맞지 않습니다. 출시 전 전면 재작성이 필요합니다.

| 필드 | 현재 값 | 상태 | 제한 |
|---|---|---|---|
| 앱 이름 (iOS) | 생활한자 퀴즈 | 정상 | 30자 |
| 제목 (Play title) | 한픽: 한자 급수 퀴즈 | ⚠️ 교체 | 30자 |
| 부제 (iOS subtitle) | 급수 한자부터 모의고사까지, 합격까지 함께 | ⚠️ 교체 | 30자 |
| 짧은 설명 (Play) | 급수별 배정한자 6,182자를… | ⚠️ 교체 | 80자 |
| 키워드 (iOS) | 한자,한자능력검정시험,급수시험,어문회,… | ⚠️ 교체 | 100자(쉼표 포함) |
| 프로모션 텍스트 (iOS) | 한국어문회·한자교육진흥회 배정한자 6,182자를… | ⚠️ 교체 | 170자 |
| 상세 설명 | 급수 시험 앱 본문 | ⚠️ 교체 | iOS 4000자, Play 4000자 |
| 릴리즈 노트 | `release_notes.txt` / `changelogs/2.txt` | ⚠️ 교체 + `3.txt` 추가 | iOS 4000자, Play 500자 |

> ⚠️ Play changelog 는 **500자 제한**입니다. iOS release_notes 를 그대로 복사하면 초과할 수 있으니 확인하세요.

### 6.2 다국어

앱과 스토어 메타데이터 모두 **한국어 전용**입니다. 앱에 i18n 구성이 없고 `fastlane/metadata/` 에도 `ko` / `android/ko-KR` 만 있습니다.

### 6.3 앱 설명에 명시할 사실 (심사 답변용)

- 학습 기록·보상·설정은 **기기 내부에만** 저장(AsyncStorage + redux-persist), 서버 전송 없음
- 회원가입·로그인 없음, 백엔드 API 없음
- 무료, 배너/전면/앱오프닝 광고 포함, 인앱 결제 없음
- 수록량: 생활 한자어 약 5,046개 (`src/const/data/life/ConstLifeWords.ts`), 학습 카테고리 26개 (`ConstLifeCategories.ts`)
- 학습 요소: 주제별 세계 상식 학습, 퀴즈, 오답 노트, 오늘의 문제, 출석·스트릭, 경험치·펫 성장

---

## 7. 아이콘 / 스플래시 에셋

| 용도 | 파일 | 비고 |
|---|---|---|
| 앱 아이콘 | `assets/icon.png` | iOS 1024×1024 알파 없음 필요. Android 도 같은 파일 사용 |
| Android 적응형 아이콘 | `assets/adaptive-icon.png` (foreground) | 배경색 `#1249C9` (`app.json`) |
| 네이티브 스플래시 | `assets/icon.png` | `expo-splash-screen` 플러그인, 폭 220, 배경 `#1249C9` |
| 커스텀 스플래시 | `src/screens/common/AnimatedSplash.tsx` | JS 로 그리는 연출 |
| 웹 파비콘 | `assets/favicon.png` | 스토어 무관 |

> `assets/android-icon-foreground.png` · `-background.png` · `-monochrome.png` · `assets/splash.png` · `splash-blank.png` · `splash-icon.png` 은 저장소에 있지만 `app.json` 이 참조하지 않습니다. 모노크롬(테마) 아이콘을 쓰려면 `app.json` 의 `adaptiveIcon` 에 `backgroundImage` · `monochromeImage` 를 추가해야 합니다.

**Play Console 별도 업로드**: 앱 아이콘 512×512 PNG(`src/assets/play_store_512.png` 활용 가능), **그래픽 이미지 1024×500** — `fastlane/metadata/android/ko-KR/images/featureGraphic.png` 에 파일이 있으나 한픽용인지 확인 후 교체하세요.

---

## 8. 스크린샷 규격 (현재 0장 — 전부 촬영 필요)

### App Store (필수)

| 기기 | 해상도 | 장수 |
|---|---|---|
| iPhone 6.9" (16 Pro Max / 15 Pro Max) | 1320×2868 또는 1290×2796 | 최소 1, 최대 10 |
| iPad 13" | 2064×2752 또는 2048×2732 | `supportsTablet: true` 이므로 **필수** |

> 6.9" 를 올리면 하위 iPhone 사이즈는 자동 축소 적용됩니다. iPad 지원을 끄고 싶다면 `app.json` 의 `supportsTablet` 을 `false` 로 바꾸면 iPad 스크린샷 의무가 사라집니다.

자동화: `yarn fl:ios:screens` (snapshot, `fastlane/Snapfile`) — UI 테스트 타깃이 없으면 수동 촬영.

### Google Play (필수)

| 항목 | 규격 |
|---|---|
| 휴대전화 스크린샷 | 최소 2장(권장 4~8), 16:9 또는 9:16, 짧은 변 ≥ 320px, 긴 변 ≤ 3840px |
| 7"/10" 태블릿 | 태블릿 지원 표기 시 권장 |
| 그래픽 이미지 | 1024×500 PNG/JPG (필수) |

자동화: `bundle exec fastlane android screenshots` (screengrab, `fastlane/Screengrabfile`) — Espresso 테스트가 없으면 수동 촬영.

### 촬영 추천 화면 (코드 기준)

홈(출석·스트릭·펫) → 주제별 학습 → 퀴즈 → 오늘의 문제 → 타워 / 타임 챌린지 → 나의 활동 → 학습 통계

---

## 9. Google Play Console 설정

### 9.1 앱 콘텐츠(App content) 답변안

| 항목 | 답변 | 근거 |
|---|---|---|
| 개인정보처리방침 URL | **작성 필요** | 광고 SDK·Analytics 사용 → 필수 |
| 광고 포함 | **예** | AdMob 배너/전면/앱오프닝 |
| 앱 액세스 권한 | 제한 없음 (로그인 불필요) | 회원 기능 없음 |
| 콘텐츠 등급 | IARC 설문 → 교육/참고, 폭력·성적 콘텐츠 없음, 광고 있음 → 전체이용가 예상 | — |
| 타깃 층 및 콘텐츠 | **13세 이상** 권장 | 아래 주의 |
| 뉴스 앱 | 아니요 | |
| 코로나19 접촉 확인 앱 | 아니요 | |
| 데이터 보안 | §9.2 | |
| 정부 앱 | 아니요 | |
| 금융 기능 | 없음 | |
| 광고 ID 사용 | **예** | `com.google.android.gms.permission.AD_ID` 선언됨 |

> **주의 — 아동 대상(Families) 정책**: 타깃 연령에 13세 미만을 포함하면 AdMob 광고를 **아동 대상 처리(TFUA/TFCD)** 로 설정해야 하고, `AD_ID` 권한 사용이 제한됩니다. 현재 코드에는 아동 대상 광고 설정이 없으므로, 타깃 연령은 **13세 이상**으로 두는 편이 현재 구현과 일치합니다.

### 9.2 데이터 보안(Data safety) 답변안

앱 자체는 서버로 데이터를 보내지 않지만, **SDK 가 수집**합니다.

| 데이터 유형 | 수집 | 공유 | 목적 | 출처 |
|---|---|---|---|---|
| 기기 또는 기타 ID (광고 ID) | 예 | 예(Google) | 광고, 분석 | AdMob |
| 앱 상호작용 등 이벤트 | 예 | 아니요 | 분석 | Firebase Analytics |
| 진단(크래시 로그, 성능) | 예 | 아니요 | 앱 기능·분석 | Crashlytics |
| 대략적 위치 | AdMob 이 IP 기반으로 처리할 수 있음 → Google 안내 확인 | — | 광고 | AdMob |
| 개인정보(이름·이메일 등) | **아니요** | — | — | 로그인 없음 |
| 학습 기록 | **수집 안 함**(기기 내 저장) | — | — | AsyncStorage |

- 전송 중 암호화: 예 (SDK 는 HTTPS)
- 사용자 데이터 삭제 요청 방법: 앱 삭제 시 로컬 데이터 소멸 — 개인정보처리방침에 명시

### 9.3 권한 근거 (심사 문의 대비)

| 권한 | 용도 |
|---|---|
| `INTERNET` | 광고·Analytics·Crashlytics |
| `POST_NOTIFICATIONS` | 학습 리마인더 알림 |
| `RECEIVE_BOOT_COMPLETED` | 재부팅 후 예약 알림 복원 |
| `com.google.android.gms.permission.AD_ID` | AdMob 광고 ID |

`SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` / `VIBRATE` / 외부 저장소 권한은 매니페스트에서 **명시적으로 제거**(`tools:node="remove"`)되어 있습니다. 정확 알람 권한은 Play 정책상 알람/캘린더 앱만 허용되므로 학습 리마인더에는 `AlarmType.SET_AND_ALLOW_WHILE_IDLE` 을 사용합니다(`src/utils/NotifactionHelper.ts`). 이 결정은 유지하세요.

### 9.4 출시 트랙 순서

내부 테스트(internal) → 비공개 테스트(closed) → 프로덕션. `eas.json` 은 preview 프로필이 internal 트랙, production 이 production 트랙(draft)로 설정되어 있습니다.

---

## 10. App Store Connect 설정

| 항목 | 값 / 답변 |
|---|---|
| 카테고리 | 교육 (2차: 참고) |
| 연령 등급 | 4+ 예상 (폭력/성인 콘텐츠 없음) — 심사 설문에서 광고 여부 반영 |
| 개인정보처리방침 URL | **작성 필요** (필수) |
| 저작권 | 예: `2026 EcodeLab` |
| 심사 정보 | 로그인 불필요 → 데모 계정 없음. 메모에 "회원가입 없이 모든 기능 사용 가능, 학습 데이터는 기기 내 저장" 기재 |
| 수출 규정 | `ITSAppUsesNonExemptEncryption = false` (Info.plist) → 추가 서류 불필요 |
| IDFA 사용 | **예** (Deliverfile `submission_information`: uses_idfa true, serves_ads true, tracks_install true, limits_tracking true) |
| ATT | `NSUserTrackingUsageDescription` 설정됨, 앱 시작 시 `requestAppTrackingPermission()` 호출 (`app/_layout.tsx:105`) |
| SKAdNetwork | Info.plist 에 AdMob 네트워크 ID 목록 등록됨 |
| 지원 URL | **필요** (미정) |
| 마케팅 URL | 선택 |

### 개인정보 보호 세부사항(Nutrition Label) 답변안

| 데이터 | 수집 | 추적 목적 | 연결 |
|---|---|---|---|
| 식별자 → 기기 ID(IDFA) | 예 | **예(추적)** | 사용자에 미연결 |
| 사용 데이터 → 제품 상호작용 | 예 | 아니요 | 미연결 |
| 진단 → 크래시/성능 데이터 | 예 | 아니요 | 미연결 |
| 연락처·위치·콘텐츠 | 아니요 | — | — |

> IDFA 를 추적 목적으로 신고하면 ATT 프롬프트 노출이 **필수**입니다 — 현재 구현되어 있습니다.

---

## 11. 광고(AdMob) 구성

| 항목 | 값 |
|---|---|
| Android App ID | `ca-app-pub-1996095472780376~3451831828` ⚠️ 한픽과 동일 (`app.json` plugins + 최하단 블록) |
| iOS App ID | `ca-app-pub-1996095472780376~9825668482` ⚠️ 한픽과 동일 (`app.json` plugins, Info.plist `GADApplicationIdentifier`) |
| 광고 단위 ID | `.env` / `.env.production` 의 `EXPO_PUBLIC_GOOGLE_ADMOV_{ANDROID,IOS}_{BANNER,FRONT,REWARD,APP_OPEN}` |
| 포맷 | 배너 · 전면 · 앱오프닝 · 리워드 |
| 노출 정책 | `src/services/ads/AdGuardService.ts` — 형식별 1일 클릭 5회 초과 시 24시간 해당 형식만 숨김, 전면·앱오프닝은 하루 5회 노출 상한 |

출시 전: AdMob 콘솔에 **생활한자 앱을 별도 등록**하고 App ID·단위 ID 를 교체하세요(§0-3). 한픽 ID 로 출시하면 두 앱 수익·리포트가 섞입니다.

> `EXPO_PUBLIC_IAP_REMOVE_AD_KEY` 가 `src/const/EnvCompat.ts:32` 에 정의되어 있으나 인앱 결제 라이브러리는 설치되어 있지 않습니다. 광고 제거 상품을 출시하지 않는다면 스토어의 "인앱 구매" 항목은 **없음**으로 신고하세요.

---

## 12. OTA 업데이트 (expo-updates)

- `updates.url`: `https://u.expo.dev/4125cad1-b423-4398-9683-d676ee94bbf0` ⚠️ 한픽 프로젝트와 동일 — §0-1 먼저 해결
- `runtimeVersion`: `1.0.0` (고정 문자열) — **현재 앱 버전(1.1.0)과 어긋나 있습니다.** 네이티브 변경이 있는 릴리즈에서는 반드시 올려야 구버전에 잘못된 번들이 내려가지 않습니다.
- 채널: `production` (eas.json)
- OTA 로는 기능 추가/변경을 자유롭게 내릴 수 없습니다(양 스토어 정책상 앱의 주요 목적 변경 금지).

앱 내 버전 안내는 `src/screens/common/modal/VersionCheckModal.tsx` 가 `react-native-version-check` 로 스토어 최신 버전을 조회합니다 — **스토어 최초 등록 후에야 동작**합니다.

---

## 13. 출시 후

- [ ] iOS dSYM 업로드: `yarn fl:ios:dsyms` (Crashlytics 심볼화)
- [ ] Play Console → 프로덕션 트랙 draft 를 수동 출시(rollout %)
- [ ] Crashlytics / Analytics 첫 24시간 모니터링
- [ ] 스토어 등록 완료 후 `.env*` 의 스토어 URL 을 실제 링크로 교체 (§0-6)
- [ ] 다음 버전 준비 시 버전 올리기 — `fl:*:bump` 레인은 §1 의 경고 확인 후 사용

---

## 14. 참고 문서

- 제품 정의: `PRODUCT.md`
- 스토어 등록 문구: `STORE_LISTING.md`
- 약관·개인정보처리방침 원문: `term/LifeHanja.tsx`
- Expo SDK 55: https://docs.expo.dev/versions/v55.0.0/
- fastlane 레인 상세: `fastlane.md`, `fastlane/README.md`
- 사운드 라이선스 정리: `SOUND_SOURCING_20.md`
