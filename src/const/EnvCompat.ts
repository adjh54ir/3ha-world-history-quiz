/**
 * four-idioms 이식 호환용 env 모듈.
 *
 * 기존 four-idioms는 react-native-dotenv 의 `@env` 모듈을 사용했지만,
 * 이 앱(Expo)은 `EXPO_PUBLIC_*` 환경변수 규칙을 사용합니다.
 * babel module-resolver 에서 `@env` -> 이 파일로 alias 처리합니다.
 *
 * .env(.local/.production) 에 아래 키들을 EXPO_PUBLIC_ 접두사로 정의하세요.
 *
 * ⚠️ 반드시 `process.env.EXPO_PUBLIC_X` 형태로 "직접" 참조해야 합니다.
 *    `const env = process.env` 같은 간접 참조는 babel(babel-preset-expo)이
 *    번들 시점에 값을 인라인하지 못해 릴리즈 빌드에서 전부 undefined가 됩니다.
 *    (→ BannerAd unitId 빈값 크래시의 원인이었음)
 */

export const REACT_NATIVE_APP_MODE = process.env.EXPO_PUBLIC_APP_MODE ?? 'local';

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? '';
export const APP_DESCRIPTION = process.env.EXPO_PUBLIC_APP_DESCRIPTION ?? '';
export const APP_STORE_URL = process.env.EXPO_PUBLIC_APP_STORE_URL ?? '';
export const GOOGLE_PLAY_STORE_URL = process.env.EXPO_PUBLIC_GOOGLE_PLAY_STORE_URL ?? '';

export const GOOGLE_ADMOV_ANDROID_BANNER = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_ANDROID_BANNER ?? '';
export const GOOGLE_ADMOV_IOS_BANNER = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_IOS_BANNER ?? '';
export const GOOGLE_ADMOV_ANDROID_FRONT = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_ANDROID_FRONT ?? '';
export const GOOGLE_ADMOV_IOS_FRONT = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_IOS_FRONT ?? '';
export const GOOGLE_ADMOV_ANDROID_REWARD = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_ANDROID_REWARD ?? '';
export const GOOGLE_ADMOV_IOS_REWARD = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_IOS_REWARD ?? '';
export const GOOGLE_ADMOV_ANDROID_REWARD_FRONT = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_ANDROID_REWARD_FRONT ?? '';
export const GOOGLE_ADMOV_IOS_REWARD_FRONT = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_IOS_REWARD_FRONT ?? '';
export const GOOGLE_ADMOV_ANDROID_OPEN_APP = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_ANDROID_OPEN_APP ?? '';
export const GOOGLE_ADMOV_IOS_OPEN_APP = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_IOS_OPEN_APP ?? '';
export const GOOGLE_ADMOV_ANDROID_NATIVE_ADVANCED = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_ANDROID_NATIVE_ADVANCED ?? '';
export const GOOGLE_ADMOV_IOS_NATIVE_ADVANCED = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_IOS_NATIVE_ADVANCED ?? '';

