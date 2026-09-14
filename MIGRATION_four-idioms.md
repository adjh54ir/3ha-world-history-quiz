# four-idioms → korea-quiz 이식 정리

bare React Native(React Navigation) 프로젝트 `3ha-four-idioms`를
Expo bare workflow(Expo Router) 프로젝트 `3ha-korea-quiz`로 이식한 작업 내역입니다.

## 무엇을 했나

### 1. 소스 이식 (src/)
- four-idioms `src/`의 `screens, services, store, translations, types, utils, const, context, hooks, navigation/conf, assets`를 전부 `3ha-korea-quiz/src/`로 병합.
- 경로 별칭 차이 해결: four-idioms는 `@`=`./src`, korea-quiz는 `@`=`./`.
  → 이식한 모든 파일의 `@/...` 임포트를 `@/src/...`로 일괄 치환.
- 219개 파일 내부 alias import 해석 검증 완료(미해석 0건).

### 2. 라우팅: React Navigation → Expo Router 전면 전환
- `app/` 파일 기반 라우트의 **파일명을 기존 `Paths` enum 값과 동일**하게 생성.
  → 화면 내부의 `navigation.navigate(Paths.X, params)`, `useRoute().params`,
    `useNavigation`, `useFocusEffect` 등 react-navigation 코드를 **수정 없이 그대로** 사용
    (Expo Router는 내부적으로 react-navigation 위에 동작).
- 메인 하단 탭(`MAIN_TAB/_layout.tsx`)에 LIST / TODAY_QUIZ / HOME / RESULT / SETTING 탭 구성(초기 HOME).
- 루트 스택(`app/_layout.tsx`)에 QUIZ, QUIZ_MODE, QUIZ_ARRANGE, TOWER_* 등 14개 스택 화면 등록.
- **four-idioms를 메인으로**: `app/index.tsx` → `/MAIN_TAB/HOME` 리다이렉트.
  기존 출결 로그인 화면(구 `app/index.tsx`)은 `app/checkin.tsx`로 보존.
- 기존 proto-a / proto-b / proto-c / space / login / mypage / notification / study-timer 라우트는 그대로 유지.

### 3. Store 통합
- 단일 Provider로 통합. 루트는 four-idioms store(`src/store/Store.ts`) 사용.
- four-idioms `RootReducer`에 korea-quiz의 `userAuth(AuthSlice)`를 추가하여
  AxiosInstance / proto 토큰 로직 호환 유지.
- `src/config/store/Store.ts`는 통합 store를 재-export(기존 proto 임포트 경로 보존).

### 4. 앱 초기화(App.tsx 로직 이식)
- `app/_layout.tsx`에 i18n(`I18nextProvider`), 오늘의 퀴즈 자동 발급(`checkTodayQuiz`),
  AdMob 초기화, notifee 알림 딥링크 처리 이식.
- 네이티브 모듈은 미설치 상태에서도 앱이 죽지 않도록 `require` + try/catch 가드.
- 기존 korea-quiz의 Sentry / SplashScreen / PersistGate 유지.

### 5. 환경변수(@env) 호환
- four-idioms의 `react-native-dotenv` `@env` → Expo `EXPO_PUBLIC_*` 규칙으로 전환.
- `src/const/EnvCompat.ts` 생성(필요 변수 전부 export), babel/tsconfig에서 `@env` alias 매핑.
- `.env`에 `EXPO_PUBLIC_APP_NAME`, AdMob 광고 단위 ID 등 추가.

### 6. 설정 파일
- `package.json`: notifee, @react-navigation/*, i18next, ironsource, vector-icons,
  google-mobile-ads, reanimated, gesture-handler, calendars, fast-image, iap 등 의존성 추가.
- `babel.config.js`: `@env` alias, `react-native-reanimated/plugin` 추가.
- `app.json`: `react-native-google-mobile-ads`(테스트 App ID), `expo-font`(vector-icons ttf) 플러그인 추가.
- `tsconfig.json`: `@env` paths 매핑 추가.

---

## ⚠️ 반드시 직접 수행해야 할 후속 작업

이 환경에서는 네이티브 설치/빌드를 실행할 수 없습니다. 아래를 로컬에서 진행하세요.

1. **의존성 설치 및 버전 정렬**
   ```bash
   cd 3ha-korea-quiz
   yarn install
   npx expo install --fix   # Expo SDK 55 호환 버전으로 자동 정렬 (중요)
   ```

2. **네이티브 프로젝트 재생성 + Pod**
   ```bash
   npx expo prebuild --clean
   yarn pod        # 또는 cd ios && pod install
   ```

3. **실행**
   ```bash
   npx expo run:ios      # 또는 run:android
   ```

## 알려진 위험/확인 필요 포인트

- **react-native-reanimated 버전**: 현재 `^3.16.3`로 명시. Expo SDK 55(RN 0.83)는
  reanimated v4 + `react-native-worklets`를 요구할 수 있습니다. `npx expo install --fix`로 정렬하고,
  실패 시 v4 API 변경 여부를 확인하세요.
- **AdMob App ID**: `app.json`에 Google 테스트 App ID를 넣어두었습니다. 실제 운영 ID로 교체하세요.
  광고 단위 ID는 `.env`의 `EXPO_PUBLIC_GOOGLE_ADMOV_*` 값을 확인/교체하세요.
- **react-native-vector-icons**: `expo-font` 플러그인으로 ttf를 번들합니다. 사용하지 않는 폰트는
  `app.json` fonts 목록에서 빼도 됩니다. (대안: `@expo/vector-icons`로 교체)
- **react-native-permissions / ironsource / notifee**: 일부는 추가 네이티브 설정(Podfile/AndroidManifest)이
  필요할 수 있습니다. 각 라이브러리의 Expo 설정 문서를 확인하세요.
- **Store 형상 차이**: 메인 화면은 four-idioms store(`userInfo`,`userDeviceInfo`)를 사용합니다.
  proto 화면이 korea-quiz의 `userInfo` 형상을 직접 읽는다면 검토가 필요합니다(현재 proto는 영향 적음).
- **레거시 네비게이터 파일**(`src/navigation/AppLayout.tsx` 등)은 어디서도 import되지 않아 번들에 포함되지
  않습니다. 정리하려면 해당 파일들을 삭제하세요(현재 환경에서는 삭제 권한 문제로 남겨둠).
