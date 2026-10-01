/**
 * 앱 열기(오프닝) 광고 노출 빈도 제어
 * -------------------------------------------------
 * - 최초 설치 후 첫 실행: 무조건 1회 노출.
 * - 그 이후(백그라운드 → 포그라운드 복귀, 재실행): EVERY 번에 1번만 노출.
 * 스토리지 오류는 광고를 띄우지 않는 쪽(false)으로 넘어간다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAdClickCapped } from '@/src/services/AdClickGuard';

/** 최초 설치 1회 노출을 이미 소비했는지 */
const FIRST_KEY = 'APP_OPEN_FIRST_SHOWN';
/** 복귀 횟수 — EVERY 로 나눈 나머지만 저장한다(값이 무한히 커지지 않게) */
const COUNT_KEY = 'APP_OPEN_RESUME_COUNT';

/** 복귀 몇 번에 한 번 노출할지 */
export const EVERY = 2;

/**
 * 이번 앱 열기에서 광고를 띄울지 판단하고 카운터를 갱신한다.
 * ⚠️ 판단 시점에 카운터가 소비된다(로드 실패로 실제 노출이 안 되면 그 차례는 그냥 넘어간다).
 */
export const shouldShowAppOpenAd = async (): Promise<boolean> => {
	try {
		// 오늘 광고 클릭이 상한을 넘었으면 전면 광고는 띄우지 않는다 (카운터도 소비하지 않음)
		if (await isAdClickCapped()) return false;
		const first = await AsyncStorage.getItem(FIRST_KEY);
		// 최초 설치: 무조건 노출
		if (!first) {
			await AsyncStorage.setItem(FIRST_KEY, '1');
			return true;
		}
		const count = (parseInt((await AsyncStorage.getItem(COUNT_KEY)) ?? '0', 10) || 0) + 1;
		await AsyncStorage.setItem(COUNT_KEY, String(count % EVERY));
		return count % EVERY === 0;
	} catch {
		return false;
	}
};

export default { shouldShowAppOpenAd, EVERY };
