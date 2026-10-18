/**
 * 앱 열기(오프닝) 광고 노출 빈도 제어
 * -------------------------------------------------
 * - 최초 설치 후 첫 실행: 띄우지 않는다 (온보딩보다 광고가 먼저 뜨면 첫인상을 해친다 — Google 권장도 '몇 번 쓴 뒤').
 * - 그 이후(백그라운드 → 포그라운드 복귀, 재실행): EVERY 번에 1번만 노출.
 * - 마지막 노출 뒤 MIN_INTERVAL_MS 안에는 차례가 와도 띄우지 않는다 (앱을 잠깐 오가도 광고가 계속 뜨지 않게).
 * 스토리지 오류는 광고를 띄우지 않는 쪽(false)으로 넘어간다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAdClickCapped } from '@/src/services/AdClickGuard';
import DateUtils from '@/src/utils/DateUtils';

/** 최초 설치 첫 실행을 이미 지났는지 */
const FIRST_KEY = 'APP_OPEN_FIRST_SHOWN';
/** 복귀 횟수 — EVERY 로 나눈 나머지만 저장한다(값이 무한히 커지지 않게) */
const COUNT_KEY = 'APP_OPEN_RESUME_COUNT';
/** 마지막으로 노출을 허락한 시각(ms) */
const LAST_KEY = 'APP_OPEN_LAST_SHOWN_AT';

/** 복귀 몇 번에 한 번 노출할지 */
export const EVERY = 2;
/** 노출 사이 최소 간격 — 30분 */
export const MIN_INTERVAL_MS = 30 * 60 * 1000;

/**
 * 이번 앱 열기에서 광고를 띄울지 판단하고 카운터를 갱신한다.
 * ⚠️ 판단 시점에 카운터가 소비된다(로드 실패로 실제 노출이 안 되면 그 차례는 그냥 넘어간다).
 */
export const shouldShowAppOpenAd = async (): Promise<boolean> => {
	try {
		// 오늘 광고 클릭이 상한을 넘었으면 전면 광고는 띄우지 않는다 (카운터도 소비하지 않음)
		if (await isAdClickCapped()) return false;
		// 최초 설치: 띄우지 않고 표시만 남긴다
		if (!(await AsyncStorage.getItem(FIRST_KEY))) {
			await AsyncStorage.setItem(FIRST_KEY, '1');
			return false;
		}
		const now = DateUtils.getTimestamp();
		const last = parseInt((await AsyncStorage.getItem(LAST_KEY)) ?? '0', 10) || 0;
		// 간격 안의 복귀는 차례로 세지 않는다
		if (now - last < MIN_INTERVAL_MS) return false;
		const count = (parseInt((await AsyncStorage.getItem(COUNT_KEY)) ?? '0', 10) || 0) + 1;
		await AsyncStorage.setItem(COUNT_KEY, String(count % EVERY));
		if (count % EVERY !== 0) return false;
		await AsyncStorage.setItem(LAST_KEY, String(now));
		return true;
	} catch {
		return false;
	}
};

export default { shouldShowAppOpenAd, EVERY, MIN_INTERVAL_MS };
