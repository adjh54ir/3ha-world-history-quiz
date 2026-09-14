# Fastlane — 한국어 퀴즈

Expo(React Native) 앱의 iOS/Android 빌드·서명·배포 자동화 구성입니다.
**iOS 빌드는 macOS + Xcode 환경에서만 동작**합니다. Android 빌드는 macOS/Linux 모두 가능합니다.

## 1. 설치

```bash
# Ruby(권장 3.x) + Bundler
gem install bundler
bundle install          # Gemfile 기준 fastlane + cocoapods + 플러그인 설치

# fastlane 플러그인 동기화
bundle exec fastlane install_plugins
```

> Homebrew 사용 시 `brew install fastlane` 도 가능하지만, 프로젝트 고정 버전 관리를 위해 `bundle exec` 사용을 권장합니다.

## 2. 환경 변수

```bash
cp fastlane/.env.example fastlane/.env
# fastlane/.env 의 값(Apple ID, 팀 ID, Play 서비스 계정 등)을 채웁니다.
```

비밀값 파일은 절대 커밋하지 마세요: `fastlane/.env`, `fastlane/AuthKey.p8`, `fastlane/play-service-account.json`.

## 3. 최초 1회 설정

```bash
# 의존성 + Pods (iOS)
bundle exec fastlane ios setup
# 의존성 (Android)
bundle exec fastlane android setup

# iOS 코드사이닝 저장소 준비 (별도 private git repo 필요)
bundle exec fastlane ios signing type:appstore readonly:false
```

## 4. 자주 쓰는 레인

### iOS
| 명령 | 설명 |
|---|---|
| `bundle exec fastlane ios build` | 릴리즈 `.ipa` 생성 (`build/LifeHanja.ipa`) |
| `bundle exec fastlane ios beta` | 빌드 → **TestFlight** 업로드 → dSYM 업로드 |
| `bundle exec fastlane ios release` | 빌드 → **App Store** 메타데이터/빌드 제출 |
| `bundle exec fastlane ios firebase_ios` | **Firebase App Distribution** 배포 |
| `bundle exec fastlane ios screenshots` | 스크린샷 촬영 + 프레임 |
| `bundle exec fastlane ios bump type:minor` | app.json 버전 올리기 |

### Android
| 명령 | 설명 |
|---|---|
| `bundle exec fastlane android build_aab` | 릴리즈 `.aab` 빌드 |
| `bundle exec fastlane android build_apk` | 릴리즈 `.apk` 빌드 |
| `bundle exec fastlane android beta` | versionCode↑ → AAB → **Play 내부테스트** |
| `bundle exec fastlane android release` | **Play 프로덕션** 출시 |
| `bundle exec fastlane android promote` | 내부 → 프로덕션 트랙 승격 |
| `bundle exec fastlane android firebase_android` | **Firebase App Distribution** 배포 |

### CI 한 방 파이프라인
```bash
bundle exec fastlane ios ci        # build → TestFlight → dSYM
bundle exec fastlane android ci    # bump → AAB → Play internal
```

## 5. 필요한 자격 증명 발급 안내
- **App Store Connect API Key**: App Store Connect → 사용자 및 액세스 → 통합 → App Store Connect API 에서 `.p8` 키 발급 후 `.env` 에 KEY_ID/ISSUER_ID/경로 입력. (2FA 없이 자동화 가능, 권장)
- **match git repo**: 인증서/프로비저닝을 보관할 private git 저장소를 만들고 `MATCH_GIT_URL`, `MATCH_PASSWORD` 설정.
- **Google Play 서비스 계정**: Google Cloud 콘솔에서 서비스 계정 생성 → Play Console 에서 권한 부여 → JSON 키를 `fastlane/play-service-account.json` 로 저장.
- **Firebase(App Distribution)**: Firebase 콘솔의 앱 ID 를 `FIREBASE_*_APP_ID` 에 입력, 인증은 `firebase login:ci` 토큰 또는 서비스 계정.

## 6. 참고
- 스크린샷(snapshot/screengrab)은 각각 Xcode UITest, Android Espresso 테스트 타깃이 있어야 동작합니다. 테스트가 없으면 해당 레인은 건너뛰세요.
- Expo 네이티브 폴더(`ios/`, `android/`)가 이미 존재하므로 `gym`/`gradle` 로 직접 빌드합니다. 네이티브 설정을 바꾼 경우 `npx expo prebuild` 후 다시 빌드하세요.
