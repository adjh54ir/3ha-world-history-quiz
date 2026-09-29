/**
 * 전면 광고 노출 빈도 제어
 * -------------------------------------------------
 * 퀴즈를 끝낼 때마다 전면 광고를 띄우면 이탈이 커진다.
 * 완료 횟수를 세어 N회에 1번만 통과시키고, 최소 간격도 함께 둔다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const COUNT_KEY = 'INTERSTITIAL_COUNT';
const LAST_SHOWN_KEY = 'INTERSTITIAL_LAST_AT';

/** 몇 번에 한 번 노출할지 */
const EVERY = 3;
/** 직전 노출 후 최소 간격(ms) — 연속 플레이 시 광고 도배 방지 */
const MIN_GAP_MS = 3 * 60 * 1000;

/**
 * 이번 완료에서 전면 광고를 띄울지 판단하고 카운터를 갱신한다.
 * 실패(스토리지 오류)하면 광고를 띄우지 않는 쪽(false)으로 넘어간다.
 */
export const shouldShowInterstitial = async (now: number): Promise<boolean> => {
	try {
		const [rawCount, rawLast] = await AsyncStorage.multiGet([COUNT_KEY, LAST_SHOWN_KEY]);
		const count = (parseInt(rawCount[1] ?? '0', 10) || 0) + 1;
		const lastAt = parseInt(rawLast[1] ?? '0', 10) || 0;
		const due = count % EVERY === 0 && now - lastAt >= MIN_GAP_MS;
		if (due) {
			await AsyncStorage.multiSet([
				[COUNT_KEY, '0'],
				[LAST_SHOWN_KEY, String(now)],
			]);
		} else {
			await AsyncStorage.setItem(COUNT_KEY, String(count));
		}
		return due;
	} catch {
		return false;
	}
};

export default { shouldShowInterstitial };
