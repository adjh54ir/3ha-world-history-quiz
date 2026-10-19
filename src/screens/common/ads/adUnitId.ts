/**
 * AdMob 광고 유닛 ID 결정 (공통)
 * - 배너·오프닝·보상형 모두 이 함수를 거친다. 테스트/운영 판정은 USE_TEST_ADS 하나만 본다.
 *   ⚠️ 광고 유닛 ID는 `.env` 한 곳에서만 관리한다. `.env.production` 에는 넣지 않는다.
 */
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { REACT_NATIVE_APP_MODE } from '@env';

/**
 * 스토어에서 받은 설치인가.
 * -------------------------------------------------
 * 번들 종류만으로는 테스트 기기를 가려낼 수 없다 — Xcode 로 기기에 올린 Release 빌드도 __DEV__ 가 false 이고
 * .env.production(APP_MODE=prd)을 읽는다. 설치 경로는 속일 수 없다:
 * iOS 는 App Store 영수증이면 'AppStore', TestFlight 는 'TestFlight', Xcode·Ad-Hoc 은 'Other'.
 * 안드로이드는 Play 스토어만 운영으로 친다 — adb·파일로 받은 APK 의 설치 주체는 스토어가 아니다.
 * 판정이 실패하면(null) 스토어로 친다 — 운영 앱이 테스트 광고로 떨어지면 수익이 조용히 사라진다.
 */
const PLAY_INSTALLERS = ['com.android.vending', 'com.google.android.feedback'];
const INSTALLER = (() => {
	try {
		return DeviceInfo.getInstallerPackageNameSync();
	} catch {
		return null;
	}
})();

export const isStoreInstall = (installer: string | null = INSTALLER, os: string = Platform.OS): boolean => {
	if (installer === null) return true;
	return os === 'ios' ? installer === 'AppStore' : PLAY_INSTALLERS.includes(installer);
};

/**
 * 테스트 광고 조건 — 앱 전체(배너·오프닝·보상형)가 이 값 하나를 본다.
 * 개발 번들(__DEV__), 운영 env(APP_MODE=prd)가 아닌 빌드, 스토어 밖에서 설치한 빌드(Xcode·TestFlight·APK)는 테스트 유닛.
 */
export const USE_TEST_ADS = __DEV__ || REACT_NATIVE_APP_MODE !== 'prd' || !isStoreInstall();

// 어느 유닛으로 나가는지 남긴다 — 테스트 광고도 실제 소재를 써서 눈으로는 구분이 안 된다
console.log('[ads]', USE_TEST_ADS ? 'test units' : 'prod units', { dev: __DEV__, mode: REACT_NATIVE_APP_MODE, installer: INSTALLER });

/**
 * @param configured .env 에서 읽은 플랫폼별 운영 유닛 ID — 비어 있으면 테스트 유닛으로 떨어진다(빈 unitId 는 배너 크래시)
 * @param testId react-native-google-mobile-ads 의 TestIds 값
 */
export const resolveAdUnitId = (configured: string | undefined, testId: string, useTest: boolean = USE_TEST_ADS): string =>
	useTest ? testId : (configured ?? '').trim() || testId;
