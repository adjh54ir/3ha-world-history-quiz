/**
 * [공통] 앱 열기(오프닝) 광고
 * -------------------------------------------------
 * 설계 원칙
 * 1) "보여줄 때 로드"하지 않는다. AdMob 초기화 직후 곧바로 요청해서 미리 받아두고,
 *    노출 시점에는 show() 만 호출한다. (앱 열기 광고 로드가 가장 느려서 화면이 늦게 뜬다)
 * 2) show() 는 미로드 상태면 "동기 throw" 하므로 반드시 try 안에서 호출한다.
 * 3) 로드·노출 실패는 Firebase 이벤트로 남긴다(운영에서 원인 추적).
 *
 * 노출 규칙은 AppOpenAdGate 참고 — 최초 설치 1회 무조건, 이후 복귀 2번 중 1번.
 */
import { AppState, AppStateStatus, Platform } from 'react-native';
import { AdEventType, AppOpenAd, TestIds } from 'react-native-google-mobile-ads';
import { GOOGLE_ADMOV_ANDROID_OPEN_APP, GOOGLE_ADMOV_IOS_OPEN_APP } from '@env';

import { shouldShowAppOpenAd } from '@/src/services/AppOpenAdGate';
import { resolveAdUnitId } from '@/src/screens/common/ads/adUnitId';
import { logAdEvent } from '@/src/screens/common/ads/adLogEvent';

const AD_UNIT_ID = resolveAdUnitId(
	Platform.select({ ios: GOOGLE_ADMOV_IOS_OPEN_APP, android: GOOGLE_ADMOV_ANDROID_OPEN_APP }),
	TestIds.APP_OPEN,
	'app-open',
);

const LOG = { adFormat: 'app_open', adUnitId: AD_UNIT_ID };

/** AdMob 앱 열기 광고 유효시간(4시간). 지나면 폐기하고 다시 받는다. */
const EXPIRY_MS = 4 * 60 * 60 * 1000;
/** 광고를 닫고 돌아온 직후의 active 전환은 복귀로 세지 않는다(자기 광고가 자기를 다시 트리거하는 것 방지) */
const SELF_RETURN_GUARD_MS = 5 * 1000;

let ad: AppOpenAd | null = null;
let loadedAt = 0;
let loading = false;
let showing = false;
let lastShowAt = 0;
/** 로드가 끝나면 즉시 노출할지 — 조건 판단이 로드보다 먼저 끝난 경우 */
let pendingShow = false;
let watching = false;

/** 받아둔 광고가 아직 쓸 수 있는 상태인지 */
const isFresh = (): boolean => !!ad && ad.loaded && Date.now() - loadedAt < EXPIRY_MS;

/**
 * 광고를 미리 받아둔다. 중복 호출·유효 광고 보유 시에는 아무것도 하지 않는다.
 */
export const preloadAppOpenAd = (): void => {
	if (loading || showing || isFresh()) return;

	loading = true;
	// 이전 인스턴스의 리스너를 남기면 이벤트가 중복으로 들어온다
	ad?.removeAllListeners();

	const next = AppOpenAd.createForAdRequest(AD_UNIT_ID);
	ad = next;

	next.addAdEventListener(AdEventType.LOADED, () => {
		loading = false;
		loadedAt = Date.now();
		void logAdEvent('ad_app_open_loaded', LOG);
		if (pendingShow) {
			pendingShow = false;
			void showAppOpenAd();
		}
	});

	next.addAdEventListener(AdEventType.ERROR, (error) => {
		loading = false;
		loadedAt = 0;
		pendingShow = false;
		console.warn('❌ [AdMob] 앱 열기 광고 로드 실패:', error?.message ?? error);
		void logAdEvent('ad_app_open_failed', LOG, { error_message: error?.message ?? String(error) });
	});

	next.addAdEventListener(AdEventType.OPENED, () => void logAdEvent('ad_app_open_opened', LOG));
	next.addAdEventListener(AdEventType.CLICKED, () => void logAdEvent('ad_app_open_clicked', LOG));

	next.addAdEventListener(AdEventType.CLOSED, () => {
		showing = false;
		loadedAt = 0;
		void logAdEvent('ad_app_open_closed', LOG);
		// 다음 복귀 때 기다리지 않도록 바로 다시 받아둔다
		preloadAppOpenAd();
	});

	void logAdEvent('ad_app_open_request', LOG);
	next.load();
};

/**
 * 받아둔 광고를 노출한다(로드는 하지 않는다).
 * - show() 가 동기 throw / 프라미스 reject 둘 다 가능하므로 양쪽을 잡는다.
 */
const showAppOpenAd = async (): Promise<void> => {
	if (showing || !isFresh()) return;

	showing = true;
	lastShowAt = Date.now();
	try {
		await ad!.show();
	} catch (e) {
		showing = false;
		loadedAt = 0;
		const message = e instanceof Error ? e.message : String(e);
		console.warn('❌ [AdMob] 앱 열기 광고 노출 실패:', message);
		void logAdEvent('ad_app_open_show_failed', LOG, { error_message: message });
		preloadAppOpenAd();
	}
};

/**
 * 노출 조건을 판단해서, 광고가 준비돼 있으면 즉시 / 아직이면 로드 완료 시점에 노출한다.
 * 조건 판단(스토리지 I/O)이 로드를 막지 않도록 프리로드와 병렬로 돌린다.
 */
const requestShowIfDue = async (): Promise<void> => {
	if (!(await shouldShowAppOpenAd())) return;
	if (isFresh()) {
		void showAppOpenAd();
		return;
	}
	pendingShow = true;
	preloadAppOpenAd();
};

/**
 * 백그라운드 → 포그라운드 복귀 감지.
 * - iOS 는 알림센터·권한 팝업만으로도 'inactive' 가 되므로 'background' 였던 경우만 복귀로 본다.
 */
const watchForeground = (): void => {
	if (watching) return;
	watching = true;
	let prev: AppStateStatus = AppState.currentState;
	AppState.addEventListener('change', (state) => {
		const returned = state === 'active' && prev === 'background';
		prev = state;
		if (!returned || showing) return;
		if (Date.now() - lastShowAt < SELF_RETURN_GUARD_MS) return;
		void requestShowIfDue();
	});
};

/**
 * 앱 시작 시 1회 호출 (AdMob 초기화 직후).
 * 프리로드를 가장 먼저 걸고, 노출 판단·복귀 감시를 이어서 붙인다.
 */
export const initAppOpenAd = (): void => {
	preloadAppOpenAd();
	void requestShowIfDue();
	watchForeground();
};

export default { initAppOpenAd, preloadAppOpenAd };
