# 한국어 상식 퀴즈 (KoreaQuiz)

사자성어 · 속담 · 순우리말 · 위인 등 한국어 상식을 학습하는 Expo(React Native) 앱.

| 항목 | 값 |
| --- | --- |
| 앱 이름 | 한국어 상식 퀴즈 |
| slug | `3ha-korean-quiz` |
| 버전 | `1.0.0` (`app.json > expo.version`) |
| 딥링크 scheme | `koreaquiz` |
| 패키지 / 번들 ID | `com.tha.koreaquiz` (Android · iOS 동일) |
| EAS projectId | `4125cad1-b423-4398-9683-d676ee94bbf0` (owner: `ecodelab`) |

## 기술 스택

- Expo `~55.0` · React Native `0.83.6` · React `19.2` · TypeScript `6.0.3`
- 라우팅: `expo-router` (파일 기반, 진입점 `expo-router/entry`, 화면은 `app/`)
- 상태: Redux Toolkit + redux-persist · 서버: Supabase(랭킹) · axios
- 네이티브: New Architecture(`newArchEnabled=true`), Hermes, Firebase(Analytics/Crashlytics), AdMob(`react-native-google-mobile-ads`), IAP(`react-native-iap`), ironSource 미디에이션
- 다국어: i18next (`ko` / `en` / `fr`, `locales/`)
- 패키지 매니저: **yarn 4.17.0** (`packageManager` 고정, `.yarnrc.yml` 사용)

## 디렉터리

```
app/          expo-router 화면 (tabs, quiz, learn, special, library)
src/          screens · navigation · services · store · hooks · const · utils · types
assets/       앱 아이콘 · bootsplash · 이미지
android/      네이티브 Android 프로젝트 (prebuild 산출물, 커스텀 수정 포함)
ios/          네이티브 iOS 프로젝트 (KoreaQuiz.xcworkspace)
fastlane/     빌드·서명·배포 자동화 (Fastfile / Appfile / Matchfile / Deliverfile)
supabase/     랭킹 관련 SQL·설정
scripts/      shrink-assets.sh (에셋 최적화)
```

## 최초 세팅

```bash
yarn setup      # yarn install + ios/pod install
cp .env .env.local  # 필요 시. 실제 키는 팀 내부에서 전달받아 채움
```

`.env` 에 필요한 키 (모두 `EXPO_PUBLIC_` 접두사, `env.ts` 에서 로드):

| 키 | 용도 |
| --- | --- |
| `EXPO_PUBLIC_APP_MODE` | `loc` / `dev` / `prd` 모드 분기 |
| `EXPO_PUBLIC_API_URL` | 백엔드 API 베이스 URL |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 랭킹 서버 |
| `EXPO_PUBLIC_GOOGLE_ADMOV_{ANDROID,IOS}_{BANNER,FRONT,REWARD}` | AdMob 광고 단위 |
| `EXPO_PUBLIC_IAP_REMOVE_AD_KEY` | 광고 제거 인앱 상품 ID |
| `EXPO_PUBLIC_GOOGLE_PLAY_STORE_URL` / `EXPO_PUBLIC_APP_STORE_URL` | 스토어 링크 |

> `.env`, `credentials/`, `fastlane/.env`, 키스토어, `AuthKey*.p8` 는 커밋 금지.

## 공통 실행

```bash
yarn start          # Metro 시작
yarn start:clean    # 캐시 초기화 후 시작
yarn test           # jest (jest-expo)
npx tsc --noEmit    # 타입 검사 (완료 기준)
```

---

# Android

## 환경 요구사항

| 항목 | 값 |
| --- | --- |
| Gradle | `9.0.0` (wrapper 고정) |
| JDK | 17 이상 (Gradle 9 요구) |
| applicationId | `com.tha.koreaquiz` |
| versionCode / versionName | `1` / `1.0.0` (`android/app/build.gradle`) |
| ABI | `armeabi-v7a, arm64-v8a, x86, x86_64` |
| 특성 | New Architecture · Hermes · Edge-to-Edge(`edgeToEdgeEnabled=true`) |
| Firebase | `google-services.json` (루트, `app.json`에서 참조) |

## 권한 정책 (`app.json > android`)

- 요청: `POST_NOTIFICATIONS`
- **차단(blockedPermissions)**: `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`, `READ/WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`
  → 라이브러리가 자동으로 병합하는 권한을 제거해 Play 심사 리스크를 줄이는 설정. 라이브러리 추가 후 `expo prebuild` 시 매니페스트에 다시 끼어들지 않는지 확인할 것.
- 기타: `softwareKeyboardLayoutMode: "resize"`, `predictiveBackGestureEnabled: false`

## 실행

```bash
yarn android        # expo run:android (디버그 빌드 + 설치)
```

## 릴리즈 빌드 (로컬)

```bash
yarn build:apk      # android/app/build/outputs/apk/release/*.apk
yarn build:aab      # android/app/build/outputs/bundle/release/*.aab (Play 업로드용)
```

서명 설정은 `android/gradle.properties` 의 `RELEASE_STORE_FILE` / `RELEASE_STORE_PASSWORD` / `RELEASE_KEY_ALIAS` / `RELEASE_KEY_PASSWORD` 를 `android/app/build.gradle` 의 `signingConfigs.release` 가 참조한다. 키스토어 파일은 `android/app/release.keystore`.

> ⚠️ 현재 `android/gradle.properties` 에 릴리즈 키스토어 비밀번호가 평문으로 들어가 있다. 저장소 공개 전에 `~/.gradle/gradle.properties` 또는 환경변수로 옮길 것.

## 배포

```bash
yarn deploy:android   # EAS 로컬 빌드(.aab) → Play 업로드
# = eas build -p android --profile production --local --output ./build/app.aab
#   && eas submit -p android --profile production --path ./build/app.aab
```

Fastlane 사용 시:

```bash
yarn fl:and:setup      # prebuild(android)
yarn fl:and:bumpcode   # versionCode 증가
yarn fl:and:aab        # 릴리즈 AAB 빌드
yarn fl:and:beta       # Play 내부 테스트 업로드
yarn fl:and:release    # Play 프로덕션 출시
yarn fl:and:promote    # 내부 → 프로덕션 승격
yarn fl:and:firebase   # Firebase App Distribution 배포
yarn fl:and:ci         # 빌드 → 내부테스트 (풀 파이프라인)
```

Play 업로드 자격증명: `credentials/google-service-account.json` (`eas.json > submit`). 프로덕션 트랙은 `releaseStatus: "draft"` 로 올라가므로 콘솔에서 수동 출시 필요.

스토어 등록 정보는 `RELEASE.md` 2번(Google Play 출시) 참고.

---

# iOS

## 환경 요구사항

| 항목 | 값 |
| --- | --- |
| 개발 환경 | macOS + Xcode (필수) |
| Deployment Target | **iOS 15.1** |
| Workspace / Scheme | `ios/KoreaQuiz.xcworkspace` / `KoreaQuiz` |
| Bundle ID | `com.tha.koreaquiz` |
| MARKETING_VERSION / BUILD | `1.0.0` / `1` |
| iPad | `supportsTablet: true` → **App Store 심사에 iPad 스크린샷 필수** |
| Firebase | `GoogleService-Info.plist` (루트) |

## 네이티브 빌드 설정 (`app.json > expo-build-properties`, `ios/Podfile.properties.json`)

- `useFrameworks: "static"` — Firebase 사용을 위해 필수
- `forceStaticLinking: ["RNFBAnalytics", "RNFBApp", "RNFBCrashlytics"]`
- `apple.privacyManifestAggregationEnabled: true` — 서드파티 privacy manifest 자동 병합
- `react-native-permissions` 는 `Podfile` 상단 `setup` 스크립트로 핸들러를 컴파일에 포함시킨다. 이 설정이 빠지면 런타임에 `No permission handler detected` 크래시.
- StoreKit 로컬 테스트: `ios/KoreaQuiz.storekit`

## 권한 (`app.json`)

- `AppTrackingTransparency`, `Notifications` (`react-native-permissions` 플러그인)
- `NSUserTrackingUsageDescription` 문구는 `app.json > ios.infoPlist` 에 정의. AdMob 개인화 광고에 필요.

## 실행

```bash
yarn pod            # cd ios && pod install (실패 시 --repo-update 재시도)
yarn ios            # npx expo run:ios
yarn ios:16         # iPhone 16 시뮬레이터 (포트 8082)
yarn ios:16pro      # iPhone 16 Pro 시뮬레이터
```

네이티브 의존성 변경 후에는 항상 `yarn pod` 를 먼저 실행한다.

## 배포

```bash
yarn deploy:ios     # EAS 로컬 빌드(.ipa) → App Store Connect 업로드
# = eas build --platform ios --profile production --local --output ./build/app.ipa
#   && eas submit --platform ios --profile production --path ./build/app.ipa
```

Fastlane 사용 시:

```bash
yarn fl:ios:setup     # 의존성 + prebuild + pod install
yarn fl:ios:signing   # match 로 코드사이닝 동기화
yarn fl:ios:build     # 릴리즈 .ipa 생성
yarn fl:ios:beta      # TestFlight 업로드
yarn fl:ios:release   # App Store 제출 (메타데이터 + 빌드)
yarn fl:ios:dsyms     # dSYM 다운로드 → Crashlytics 업로드
yarn fl:ios:screens   # 스크린샷 촬영 + 프레임
yarn fl:ios:ci        # 빌드 → TestFlight → dSYM (풀 파이프라인)
```

제출 정보 (`eas.json > submit.production.ios`): Apple ID `adjh54@naver.com`, `ascAppId` `6785401301`, `appleTeamId` `XH6C349554`.

> Crashlytics 심볼화를 위해 배포 후 `yarn fl:ios:dsyms` 로 dSYM 업로드 필요 (Bitcode/스토어 재컴파일 대응).

스토어 등록 정보는 `RELEASE.md` 3번(App Store 출시) 참고.

---

## EAS 빌드 프로파일 (`eas.json`)

| 프로파일 | 채널 | APP_MODE | 배포 방식 | Android 산출물 |
| --- | --- | --- | --- | --- |
| `development` | development | `loc` | internal (dev client, iOS 시뮬레이터) | APK |
| `preview` | preview | `dev` | internal | APK |
| `production` | production | `prd` | store (`autoIncrement`) | AAB |

OTA 업데이트: `expo-updates`, `runtimeVersion: "1.0.0"`, URL `https://u.expo.dev/4125cad1-...`. 네이티브 변경이 있으면 `runtimeVersion` 을 올려야 한다.

## 관련 문서

| 문서 | 내용 |
| --- | --- |
| `RELEASE.md` | 출시 통합 가이드 — 스토어 등록 정보(Play·App Store), 인앱결제, 광고 ID 교체, Fastlane·EAS 배포, 출시 전 체크리스트 |
| `CLAUDE.md` / `AGENTS.md` | AI 에이전트 작업 규칙 |
