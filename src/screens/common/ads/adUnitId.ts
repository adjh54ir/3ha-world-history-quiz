/**
 * AdMob 광고 유닛 ID 결정 (공통)
 * - 개발(__DEV__)에서는 항상 테스트 유닛.
 * - 운영 광고는 "운영 모드(APP_MODE=prd) 릴리즈 빌드 + 스토어에서 설치한 앱" 일 때만 쓴다.
 *   로컬에서 prd/Release 로 기기·시뮬레이터에 바로 설치한 앱은 테스트 유닛 — 내 운영 광고 노출·클릭으로
 *   무효 트래픽이 잡혀 AdMob 계정이 제한되는 것을 막는다.
 * - iOS TestFlight(=App Store 심사 설치와 같은 샌드박스 영수증)는 운영 유닛 — 심사에서 'Test Ad' 가 보이면 반려될 수 있다.
 * - 운영에서도 .env 값이 실제 유닛 ID 형식이 아니면(미설정·자리 표시자) 테스트 유닛으로 폴백한다.
 *   → 유효하지 않은 ID로 요청해 아무 광고도 뜨지 않는 상태를 막는다.
 * - 실제 ID를 .env 에 넣으면 자동으로 운영 광고로 전환된다(코드 수정 불필요).
 *   ⚠️ 광고 유닛 ID는 `.env` 한 곳에서만 관리한다. `.env.production` 에는 넣지 않는다.
 */

import DeviceInfo from 'react-native-device-info';

/** 설치 출처 — iOS 는 react-native-device-info 가 영수증으로 판별한 'AppStore', 안드로이드는 스토어 앱 패키지명 */
const STORE_INSTALLERS = [
	'AppStore',
	'TestFlight', // App Store 심사 설치도 여기로 판별된다
	'com.android.vending', // Google Play
	'com.sec.android.app.samsungapps', // Galaxy Store
	'com.skt.skaf.A000Z00040', // ONE store
	'com.amazon.venezia', // Amazon Appstore
];

/** 스토어에서 설치한 앱인지 (adb·Xcode·시뮬레이터 설치는 false) */
export const isStoreInstall = (): boolean => {
	try {
		return STORE_INSTALLERS.includes(DeviceInfo.getInstallerPackageNameSync());
	} catch {
		return false;
	}
};

/** ca-app-pub-<16자리>/<7~12자리> 형식만 실제 유닛 ID로 인정한다 */
const UNIT_ID_PATTERN = /^ca-app-pub-\d{16}\/\d{7,12}$/;

export const isRealAdUnitId = (id?: string | null): boolean => !!id && UNIT_ID_PATTERN.test(id.trim());

/**
 * @param configured .env 에서 읽은 플랫폼별 유닛 ID
 * @param testId react-native-google-mobile-ads 의 TestIds 값
 * @param label 어떤 광고인지 식별용 이름(폴백 경고에 표시)
 */
export const resolveAdUnitId = (configured: string | undefined, testId: string, label = 'unknown'): string => {
	// EXPO_PUBLIC_* 는 번들 시점에 인라인되므로 반드시 process.env.EXPO_PUBLIC_X 로 직접 참조한다
	if (__DEV__ || process.env.EXPO_PUBLIC_APP_MODE !== 'prd' || !isStoreInstall()) return testId;
	if (isRealAdUnitId(configured)) return configured!.trim();
	console.warn(
		`⚠️ [AdMob] "${label}" 운영 유닛 ID 미설정(값: ${configured || '(없음)'}) → 테스트 광고로 대체됨. .env 확인 필요.`,
	);
	return testId;
};
