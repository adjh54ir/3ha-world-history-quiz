/**
 * four-idioms 이식 호환용 env 모듈.
 *
 * 기존 four-idioms는 react-native-dotenv 의 `@env` 모듈을 사용했지만,
 * korea-quiz(Expo)는 `EXPO_PUBLIC_*` 환경변수 규칙을 사용합니다.
 * babel module-resolver 에서 `@env` -> 이 파일로 alias 처리합니다.
 *
 * .env(.local/.production) 에 아래 키들을 EXPO_PUBLIC_ 접두사로 정의하세요.
 *
 * ⚠️ babel-preset-expo 는 `process.env.EXPO_PUBLIC_*` 를 "직접 멤버 접근" 할 때만
 *    빌드 타임에 값으로 인라인합니다. `const env = process.env; env.X` 처럼 간접
 *    참조하면 인라인이 되지 않아 릴리스 빌드에서 값이 비어(undefined) 광고 unitId
 *    크래시가 발생합니다. 따라서 반드시 아래처럼 직접 접근으로 작성합니다.
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
export const GOOGLE_ADMOV_ANDROID_APP_OPEN = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_ANDROID_APP_OPEN ?? '';
export const GOOGLE_ADMOV_IOS_APP_OPEN = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_IOS_APP_OPEN ?? '';
export const GOOGLE_ADMOV_ANDROID_REWARD = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_ANDROID_REWARD ?? '';
export const GOOGLE_ADMOV_IOS_REWARD = process.env.EXPO_PUBLIC_GOOGLE_ADMOV_IOS_REWARD ?? '';

export const IAP_REMOVE_AD_KEY = process.env.EXPO_PUBLIC_IAP_REMOVE_AD_KEY ?? '';
