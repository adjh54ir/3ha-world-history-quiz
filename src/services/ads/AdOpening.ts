/**
 * 앱을 켤 때 한 번 — 오프닝 광고.
 * -------------------------------------------------
 * 켤 때마다 광고가 서면 앱을 여는 일 자체가 성가셔진다.
 * **처음 켤 때는 세우지 않고**(앱을 처음 보는 사람을 광고로 맞이하지 않는다), 그다음부터 **두 번에 한 번** 세운다 —
 * 실행 횟수를 기기에 세어 두고 짝수 번째 실행(2·4·6…)에만 띄운다.
 *
 * 요청을 아끼는 자리이기도 하다. 나간 요청은 광고를 못 받아도 요청수로 쌓이므로,
 * 켤 때마다 던지면 노출 없는 요청이 절반씩 쌓여 노출률(match rate)이 주저앉는다.
 * 그래서 **차례를 먼저 보고 띄울 실행에서만 요청한다** — 안 띄울 실행에서는 요청도 나가지 않는다.
 *
 * 시점: **받는 것**은 스플래시가 떠 있는 동안(prepareOpeningAd), **띄우는 것**은 첫 화면이 그려지고
 * ATT 팝업까지 끝난 뒤다(maybeShowOpeningAd). 스플래시 위에 띄우면 SDK 가 붙을 화면을 못 찾아
 * 요청만 나가고 노출은 안 된다 — 받아 두기만 하고 띄우는 것은 화면이 뜬 뒤로 미룬다.
 */
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadInterstitialAd, type LoadedAd } from './AdInterstitial';

/**
 * 개발 번들(__DEV__)에서는 오프닝 광고를 세우지 않는다.
 * 앱을 켤 때마다 전면 광고가 화면을 덮으면 고친 화면을 확인하려고 여는 매번이 한 박자 늦어진다.
 * 유닛(테스트/운영) 판정은 AdInterstitial.USE_TEST_ADS 가 따로 한다 — 스토어 밖 설치도 테스트 유닛이다.
 */
const IS_TEST_ENV = __DEV__;

/** 지금까지 앱을 켠 횟수 — 오프닝 광고 차례를 가르는 데만 쓴다 */
const LAUNCH_COUNT_KEY = 'OPENING_AD_LAUNCH_COUNT';

/** n 번째 실행에 오프닝 광고를 세우는가 — 첫 실행은 빼고, 그다음부터 두 번에 한 번(2·4·6…) */
export const isOpeningAdTurn = (launchCount: number): boolean => launchCount > 1 && launchCount % 2 === 0;

/** 이번 실행을 한 번 센다 — 저장소가 말을 안 들으면 첫 실행으로 친다(광고를 건너뛰는 쪽이 안전하다) */
const countLaunch = async (): Promise<number> => {
	try {
		const n = Number(await AsyncStorage.getItem(LAUNCH_COUNT_KEY)) + 1;
		await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(n));
		return n;
	} catch {
		return 1;
	}
};

/**
 * 앱 실행 직후라 기다려 줄 수 있는 자리다 — 내보내기(5초)보다 길게 잡는다.
 * 짧게 끊으면 느린 망에서 받아 온 광고가 도착하기 직전에 버려진다(요청만 쓰고 노출은 없다).
 */
const OPENING_LOAD_TIMEOUT_MS = 8_000;

/** 한 번 실행에 한 번만 — 앱이 다시 앞으로 나올 때마다 세지 않는다 */
let triedThisLaunch = false;
/** 스플래시 동안 받아 두는 중인 광고 (이번이 차례가 아니면 null 로 끝난다) */
let pending: Promise<LoadedAd | null> | null = null;

/**
 * 오프닝 광고를 **미리 받아 둔다** — 스플래시가 떠 있는 동안 부른다.
 * -------------------------------------------------
 * 첫 화면이 뜬 뒤에 받기 시작하면 몇 초 뒤 광고가 홈 위로 불쑥 덮는다. 미리 받아 두면
 * 화면이 뜨는 순간 곧바로 띄울 수 있다. 차례가 먼저다 — 안 띄울 실행에서는 요청도 내보내지 않는다.
 * 여러 번 불러도 한 번만 돈다(iOS 는 추적 동의를 묻기 전이면 동의 뒤에 부른다 — _layout).
 */
export const prepareOpeningAd = (): void => {
	if (IS_TEST_ENV || triedThisLaunch) return;
	triedThisLaunch = true;
	pending = countLaunch().then((n) => (isOpeningAdTurn(n) ? loadInterstitialAd(OPENING_LOAD_TIMEOUT_MS, true) : null));
};

/**
 * 받아 둔 오프닝 광고를 띄우고, 닫힐 때까지 기다린다.
 * 아직 받지 않았으면(추적 동의 전이었다) 여기서 받기 시작한다.
 * @returns 실제로 화면에 떴는지 (차례가 아니었거나 못 받았으면 false)
 */
export const maybeShowOpeningAd = async (): Promise<boolean> => {
	prepareOpeningAd();
	if (!pending) return false;
	const loaded = await pending;
	pending = null;
	// 받는 사이에 앱이 뒤로 내려갔으면 그만둔다 — 안 보이는 화면에 띄운 광고는 노출이 안 된다
	if (!loaded || AppState.currentState !== 'active') return false;
	return loaded.show();
};

export default { prepareOpeningAd, maybeShowOpeningAd };
