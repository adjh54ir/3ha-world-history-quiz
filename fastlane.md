# Fastlane 사용 가이드 — 한국어 퀴즈

Expo(React Native) 앱의 iOS/Android **빌드 · 서명 · 배포 자동화** 가이드입니다.

- iOS: `ios/KoreaQuiz.xcworkspace` · scheme `KoreaQuiz` · `com.tha.koreaquiz`
- Android: `android/` (Gradle) · `com.tha.koreaquiz`
- 설정 파일: `Gemfile`, `fastlane/Fastfile`, `fastlane/Appfile`, `fastlane/Matchfile`, `fastlane/Deliverfile`, `fastlane/Snapfile`, `fastlane/Screengrabfile`, `fastlane/Pluginfile`

> ⚠️ **iOS 빌드/배포는 macOS + Xcode 환경에서만 동작**합니다. Android 는 macOS/Linux 모두 가능합니다.

---

## 1. 최초 설치 (한 번만)

```bash
# Ruby(권장 3.x) + Bundler
gem install bundler

# 의존성 + 플러그인 설치 (Gemfile / Pluginfile 기준)
yarn fl:install
#   = bundle install && bundle exec fastlane install_plugins

# 자격증명 템플릿 복사 후 값 채우기
cp fastlane/.env.example fastlane/.env
```

`fastlane/.env` 에 채워야 하는 값(자세한 발급법은 아래 5번):
- Apple ID / 팀 ID / App Store Connect API 키
- match git 저장소 URL + 비밀번호
- Google Play 서비스 계정 JSON 경로
- (선택) Firebase 앱 ID

> 🔒 `fastlane/.env`, `AuthKey*.p8`, `play-service-account.json` 은 `.gitignore` 처리되어 있습니다. **절대 커밋하지 마세요.**

---

## 2. yarn/npm 단축어

`yarn <스크립트>` 또는 `npm run <스크립트>` 로 실행합니다.

### 공통
| 단축어 | 동작 |
|---|---|
| `yarn fl:install` | 번들 설치 + 플러그인 동기화 |
| `yarn fl:lanes` | 전체 lane 목록 출력 |

### iOS
| 단축어 | 동작 |
|---|---|
| `yarn fl:ios:setup` | yarn 설치 + (필요 시)prebuild + `pod install` |
| `yarn fl:ios:signing` | 코드사이닝 동기화 (`match`) |
| `yarn fl:ios:build` | 릴리즈 `.ipa` 생성 → `build/KoreaQuiz.ipa` |
| `yarn fl:ios:beta` | 빌드 → **TestFlight** 업로드 → dSYM 업로드 |
| `yarn fl:ios:release` | 빌드 → **App Store** 메타데이터/빌드 제출 |
| `yarn fl:ios:firebase` | **Firebase App Distribution** 배포 |
| `yarn fl:ios:screens` | 스크린샷 촬영(`snapshot`) + 프레임 |
| `yarn fl:ios:dsyms` | dSYM 다운로드 → Crashlytics 업로드 |
| `yarn fl:ios:bump` | `app.json` 버전 +0.0.1 (patch) |
| `yarn fl:ios:ci` | build → TestFlight → dSYM (CI 한 방) |

### Android
| 단축어 | 동작 |
|---|---|
| `yarn fl:and:setup` | yarn 설치 + (필요 시)prebuild |
| `yarn fl:and:apk` | 릴리즈 `.apk` 빌드 |
| `yarn fl:and:aab` | 릴리즈 `.aab` 빌드 (스토어용) |
| `yarn fl:and:beta` | versionCode↑ → AAB → **Play 내부테스트** |
| `yarn fl:and:release` | **Play 프로덕션** 출시 |
| `yarn fl:and:promote` | 내부 → 프로덕션 트랙 승격 |
| `yarn fl:and:firebase` | **Firebase App Distribution** 배포 |
| `yarn fl:and:bump` | `app.json` 버전 +0.0.1 |
| `yarn fl:and:bumpcode` | `versionCode` 자동 증가 |
| `yarn fl:and:ci` | bump → AAB → Play internal (CI 한 방) |

> 인자가 필요한 경우(예: minor 버전업)는 lane 직접 실행:
> ```bash
> bundle exec fastlane ios bump type:minor
> bundle exec fastlane ios signing type:development readonly:false
> ```

---

## 3. 자주 쓰는 흐름

```bash
# 1) 내부 베타 배포
yarn fl:ios:beta          # TestFlight
yarn fl:and:beta          # Play 내부테스트

# 2) 정식 출시
yarn fl:ios:release       # App Store 제출
yarn fl:and:release       # Play 프로덕션

# 3) 빌드만 (산출물 확인)
yarn fl:ios:build         # build/KoreaQuiz.ipa
yarn fl:and:aab           # android/app/build/outputs/bundle/release/app-release.aab
```

---

## 4. 산출물 위치

| 종류 | 경로 |
|---|---|
| iOS IPA | `build/KoreaQuiz.ipa` |
| Android AAB | `android/app/build/outputs/bundle/release/app-release.aab` |
| Android APK | `android/app/build/outputs/apk/release/app-release.apk` |
| 스크린샷 | `fastlane/screenshots/` (iOS), `fastlane/metadata/android/` (Android) |

---

## 5. 자격증명 발급 안내

- **App Store Connect API Key** (권장, 2FA 없이 자동화)
  App Store Connect → 사용자 및 액세스 → 통합 → App Store Connect API → `.p8` 발급 →
  `.env` 의 `APP_STORE_CONNECT_API_KEY_KEY_ID / ISSUER_ID / KEY_FILEPATH` 입력.
- **match** (인증서/프로비저닝)
  인증서 보관용 **private git repo** 생성 → `MATCH_GIT_URL`, `MATCH_PASSWORD` 설정 →
  최초 1회 `bundle exec fastlane ios signing type:appstore readonly:false`.
- **Google Play 서비스 계정**
  Google Cloud 콘솔에서 서비스 계정 생성 → Play Console 에서 권한 부여 → JSON 키를
  `fastlane/play-service-account.json` 으로 저장 (`PLAY_JSON_KEY_FILE`).
- **Firebase App Distribution** (선택)
  Firebase 콘솔 앱 ID 를 `FIREBASE_IOS_APP_ID` / `FIREBASE_ANDROID_APP_ID` 에 입력,
  인증은 `firebase login:ci` 토큰 또는 서비스 계정.

---

## 6. 트러블슈팅 / 참고

- **`bundle: command not found`** → `gem install bundler` 후 다시 시도.
- **iOS 빌드가 Linux 에서 실패** → 정상입니다. iOS 는 macOS/Xcode 필요.
- **Pods 오류** → `yarn fl:ios:setup` 으로 `pod install` 재실행. 네이티브 변경 시 `npx expo prebuild` 후 다시 빌드.
- **스크린샷 lane 동작 안 함** → `snapshot` 은 Xcode UITest, `screengrab` 은 Android Espresso 테스트 타깃이 있어야 동작합니다. 테스트가 없으면 해당 lane 은 건너뛰세요.
- **버전 관리** → 표시 버전(`version`)의 단일 출처는 `app.json` 입니다. `fl:*:bump` 가 이 값을 올립니다. iOS 빌드넘버는 빌드시 타임스탬프(또는 `BUILD_NUMBER`)로, Android `versionCode` 는 `bumpcode` 로 증가합니다.
- **사용 안 하는 채널** → Firebase/match 등 쓰지 않는 lane 은 실행하지 않으면 됩니다(설정만 있고 호출 안 하면 무해).

---

자세한 설정·환경변수 설명은 `fastlane/README.md` 와 `fastlane/.env.example` 를 참고하세요.
