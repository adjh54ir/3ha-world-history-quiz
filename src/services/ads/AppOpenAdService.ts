import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AppOpenAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { logAdEvent } from '@/src/services/ads/AdAnalytics';
import { GOOGLE_ADMOV_ANDROID_APP_OPEN, GOOGLE_ADMOV_IOS_APP_OPEN, REACT_NATIVE_APP_MODE } from '@env';
import AdGuardService from '@/src/services/ads/AdGuardService';

/**
 * 앱 오프닝(App Open) 광고
 * -------------------------------------------------
 * - 앱을 켤 때(스플래시가 끝난 직후) 한 번 노출한다.
 * - 노출 규칙: 설치 후 첫 실행은 무조건, 그 뒤로는 두 번에 한 번 (실행 횟수 홀수일 때).
 *   확률(Math.random)이 아니라 실행 횟수로 가르기 때문에 "2번 중 1번"이 정확히 지켜진다.
 * - 클릭 시 Firebase 이벤트 `ad_app_open_clicked` 를 남긴다 (전면 광고와 동일한 파라미터 구성).
 * - 클릭 어뷰징/일일 노출 상한은 AdGuardService('appOpen') 가 관리한다.
 */

/**
 * 테스트 광고 조건: 디버그 빌드이거나, 번들된 env 가 운영(prd)이 아닐 때.
 * (AdmobFrontAd / AdmobBannerAd 와 같은 기준 — 로컬 릴리스 빌드에서 운영 광고가 나가지 않게)
 */
const USE_TEST_ADS = __DEV__ || REACT_NATIVE_APP_MODE !== 'prd';

const AD_UNIT_ID = USE_TEST_ADS
	? TestIds.APP_OPEN
	: Platform.select({ ios: GOOGLE_ADMOV_IOS_APP_OPEN, android: GOOGLE_ADMOV_ANDROID_APP_OPEN }) || TestIds.APP_OPEN;

/** 실행 횟수 저장 키 — 앱을 지우면 같이 사라져서 재설치 시 다시 1회차가 된다 */
const LAUNCH_COUNT_KEY = 'AD_APP_OPEN_LAUNCH_COUNT';

/** 이 시간(ms) 안에 로드되지 않으면 포기한다 — 홈 화면을 다 본 뒤에 광고가 튀어나오지 않게 */
const LOAD_TIMEOUT_MS = 5000;

/** 이번 실행에서 이미 처리했는지 (Fast Refresh/중복 호출 방지) */
let handled = false;

/** 개발 빌드 전용 진단 로그 — 어느 단계에서 멈추는지 Metro 콘솔에서 바로 보이게 */
const devLog = (...args: unknown[]) => {
	if (__DEV__) console.log('[AppOpen]', ...args);
};

/** 이번 실행이 몇 번째인지 세고, 노출 대상인지 판단한다 (1회차 무조건, 이후 홀수 회차) */
const shouldShowThisLaunch = async (): Promise<boolean> => {
	// 개발 빌드에서는 실행마다 노출한다 (홀짝 규칙 때문에 두 번에 한 번만 뜨면 확인이 어렵다)
	if (__DEV__) return true;

	let count = 1;
	try {
		const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
		count = (Number.parseInt(raw ?? '0', 10) || 0) + 1;
		await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(count));
	} catch (e) {
		console.warn('앱 오프닝 광고 실행 횟수 저장 실패:', e);
	}
	// 1회차(설치 직후) 노출 → 2회차 건너뜀 → 3회차 노출 … = 2번 중 1번
	return count % 2 === 1;
};

/**
 * 앱 오프닝 광고를 (조건에 맞으면) 로드해서 보여 준다.
 * - 실패하거나 조건에 맞지 않으면 아무 것도 하지 않는다. 호출한 쪽 흐름을 막지 않는다.
 */
// 임시 OFF 스위치 — 오프닝 광고를 잠시 끈다. 다시 켜려면 false 로.
const DISABLED = true;

const showAppOpenAd = async (): Promise<void> => {
	if (DISABLED) {
		devLog('중단: DISABLED 플래그로 오프닝 광고 꺼짐');
		return;
	}
	devLog('호출됨 · unitId =', AD_UNIT_ID, '· testAds =', USE_TEST_ADS);
	if (handled) {
		devLog('중단: 이번 실행에서 이미 처리됨 (앱 완전 재시작 필요)');
		return;
	}
	handled = true;

	// 🛡️ 클릭 어뷰징 차단 중이거나 오늘 노출 상한을 채웠으면 요청 자체를 하지 않는다
	// (개발 빌드는 테스트 광고라 무효 트래픽이 없다 — 하루 5회 상한에 막혀 확인이 끊기지 않게 건너뛴다)
	if (!__DEV__) {
		await AdGuardService.init();
		if (AdGuardService.isBlocked('appOpen')) return;
	}

	if (!(await shouldShowThisLaunch())) {
		devLog('중단: 이번 실행은 노출 대상이 아님 (운영 홀짝 규칙)');
		return;
	}

	const ad = AppOpenAd.createForAdRequest(AD_UNIT_ID);

	let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
		timer = null;
		ad.removeAllListeners();
		devLog(`중단: ${LOAD_TIMEOUT_MS}ms 안에 로드되지 않아 포기`);
		logAdEvent('ad_app_open_timeout', 'app_open', AD_UNIT_ID);
	}, LOAD_TIMEOUT_MS);
	const clearWait = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	};

	ad.addAdEventListener(AdEventType.LOADED, () => {
		// 타임아웃으로 이미 포기한 뒤 늦게 도착한 광고는 띄우지 않는다 (홈 화면을 보다가 가려지는 것 방지)
		if (!timer) return;
		clearWait();
		devLog('로드 완료 · show() 호출');
		logAdEvent('ad_app_open_loaded', 'app_open', AD_UNIT_ID);
		AdGuardService.registerShow('appOpen');
		ad.show()
			.then(() => devLog('노출 성공'))
			.catch((e: unknown) => console.warn('❌ 앱 오프닝 광고 노출 실패:', e));
	});

	ad.addAdEventListener(AdEventType.CLICKED, () => {
		AdGuardService.registerClick('appOpen');
		logAdEvent('ad_app_open_clicked', 'app_open', AD_UNIT_ID);
	});

	ad.addAdEventListener(AdEventType.CLOSED, () => {
		logAdEvent('ad_app_open_closed', 'app_open', AD_UNIT_ID);
		ad.removeAllListeners();
	});

	ad.addAdEventListener(AdEventType.ERROR, (error) => {
		clearWait();
		console.warn('❌ 앱 오프닝 광고 로딩 실패:', error?.message ?? error);
		logAdEvent('ad_app_open_failed', 'app_open', AD_UNIT_ID, { error_message: error?.message ?? String(error) });
		ad.removeAllListeners();
	});

	devLog('요청 시작 (load)');
	logAdEvent('ad_app_open_request', 'app_open', AD_UNIT_ID);
	ad.load();
};

const AppOpenAdService = { showAppOpenAd };

export default AppOpenAdService;
