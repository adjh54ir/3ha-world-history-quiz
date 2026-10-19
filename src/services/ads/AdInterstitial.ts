/**
 * 전면(앱 오프닝 포함) 광고 한 장 받기 · 띄우기.
 * -------------------------------------------------
 * 이 앱에서 전면 광고가 나가는 자리는 **앱을 켤 때 한 번**(AdOpening — 첫 실행 제외, 두 번에 한 번)뿐이다.
 *
 * 규칙 하나: **광고는 사용자의 행동을 막지 못한다.**
 * 로드가 안 되든, 한도에 걸리든, 몇 초가 지나든 이 함수는 반드시 끝나고 호출부는 다음 일을 한다.
 * 그래서 실패는 모두 조용히 넘기고 boolean(실제로 보여 줬는가)만 돌려준다.
 */
import { Platform } from 'react-native';
import { AdEventType, AppOpenAd, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';
import { GOOGLE_ADMOV_ANDROID_FRONT, GOOGLE_ADMOV_ANDROID_OPEN_APP, GOOGLE_ADMOV_IOS_FRONT, GOOGLE_ADMOV_IOS_OPEN_APP } from '@env';

import AdGuardService from './AdGuardService';
import { resolveAdUnitId } from '@/src/screens/common/ads/adUnitId';
import { logAdEvent } from '@/src/screens/common/ads/adLogEvent';
import { ensureAudioMode } from '@/src/utils/SoundUtils';

const AD_UNIT_ID = resolveAdUnitId(Platform.select({ ios: GOOGLE_ADMOV_IOS_FRONT, android: GOOGLE_ADMOV_ANDROID_FRONT }), TestIds.INTERSTITIAL);

/** 오프닝 광고 전용 유닛 — AdMob 은 앱 오프닝 유닛을 전면 광고로 부르면 광고를 내주지 않는다 */
const APP_OPEN_UNIT_ID = resolveAdUnitId(Platform.select({ ios: GOOGLE_ADMOV_IOS_OPEN_APP, android: GOOGLE_ADMOV_ANDROID_OPEN_APP }), TestIds.APP_OPEN);

/** 로드를 기다리는 한도 — 느린 망에서는 광고를 포기하고 흐름을 이어 간다 */
const LOAD_TIMEOUT_MS = 5_000;

/** 받아 둔 광고 한 장 — show() 는 닫힐 때까지 기다렸다가 실제로 보여 줬는지 돌려준다 */
export interface LoadedAd {
	show: () => Promise<boolean>;
}

/**
 * 광고를 받아만 둔다(띄우지 않는다).
 * -------------------------------------------------
 * 받는 것과 띄우는 것을 나눈 이유 — 오프닝 광고는 스플래시가 떠 있는 동안 미리 받아 두고,
 * 첫 화면이 그려지는 순간 바로 띄운다. 화면이 뜬 뒤에 받기 시작하면 홈 위로 광고가 불쑥 덮는다.
 *
 * @returns 받았으면 LoadedAd, 한도·실패·시간 초과면 null (광고는 사용자를 막지 못한다)
 */
export const loadInterstitialAd = async (timeoutMs: number = LOAD_TIMEOUT_MS, appOpen = false): Promise<LoadedAd | null> => {
	await AdGuardService.init();
	// 클릭 어뷰징 가드·하루 노출 상한에 걸렸으면 아무것도 하지 않는다
	if (AdGuardService.isBlocked('interstitial')) return null;

	const unitId = appOpen ? APP_OPEN_UNIT_ID : AD_UNIT_ID;
	const format = appOpen ? 'app_open' : 'interstitial';
	const ad = (appOpen ? AppOpenAd : InterstitialAd).createForAdRequest(unitId);

	return new Promise<LoadedAd | null>((resolve) => {
		let settled = false;
		const settle = (value: LoadedAd | null) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			ad.removeAllListeners();
			resolve(value);
		};
		// 느린 망에서 늦게 도착한 광고는 버린다 — 그때쯤 사용자는 이미 화면을 쓰고 있다
		const timer = setTimeout(() => settle(null), timeoutMs);
		ad.addAdEventListener(AdEventType.LOADED, () => settle({ show: () => showLoaded(ad, format, unitId) }));
		// 광고가 없거나 네트워크가 없는 것은 흔한 일이다 — 조용히 넘긴다
		ad.addAdEventListener(AdEventType.ERROR, () => settle(null));
		try {
			ad.load();
		} catch (e) {
			console.warn('전면 광고 로드 실패:', e);
			settle(null);
		}
	});
};

/** 받아 둔 광고를 띄우고 닫힐 때까지 기다린다 */
const showLoaded = (ad: InterstitialAd | AppOpenAd, format: string, unitId: string): Promise<boolean> =>
	new Promise<boolean>((resolve) => {
		const log = { adFormat: format, adUnitId: unitId };
		let shown = false;
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			ad.removeAllListeners();
			// 광고 SDK 가 소재를 틀며 iOS 오디오 세션을 ambient(무음 스위치를 따름)로 바꿔 둔다.
			// 앱 안에서 뜨고 닫혀 AppState 도 안 바뀌므로 여기서 되돌린다 — 안 하면 광고 뒤 효과음이 무음 모드에서 안 난다
			ensureAudioMode().catch(() => {});
			resolve(shown);
		};
		ad.addAdEventsListener(({ type }) => {
			switch (type) {
				case AdEventType.OPENED:
					shown = true;
					AdGuardService.registerShow('interstitial');
					void logAdEvent(`ad_${format}_opened`, log);
					break;
				case AdEventType.CLICKED:
					// 하루 클릭 한도를 넘기면 이 형식(과 전체)을 내린다 — AdMob 무효 트래픽 보호
					AdGuardService.registerClick('interstitial');
					void logAdEvent(`ad_${format}_clicked`, log);
					break;
				case AdEventType.CLOSED:
				case AdEventType.ERROR:
					finish();
					break;
				default:
					break;
			}
		});
		// 받아 두는 사이에 가드에 걸렸으면(다른 광고를 연달아 눌렀다) 띄우지 않는다
		if (AdGuardService.isBlocked('interstitial')) {
			finish();
			return;
		}
		ad.show().catch((e) => {
			console.warn('전면 광고 표시 실패:', e);
			finish();
		});
	});

export default { loadInterstitialAd };
