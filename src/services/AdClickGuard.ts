/**
 * 광고 클릭 가드 (AdGuard)
 * -------------------------------------------------
 * 하루(기기 타임존 기준)에 광고를 통틀어 LIMIT 번 이상 누르면 그날은 전면 광고(앱 열기·전면)를 띄우지 않는다.
 * 실수·연속 클릭이 무효 트래픽으로 잡혀 AdMob 계정이 제한되는 것을 막는다.
 * 보상형 광고는 사용자가 직접 골라서 보는 광고라 막지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';

const KEY = 'AD_CLICK_GUARD';
/** 하루 광고 클릭 상한 */
export const LIMIT = 5;

type Stored = { date: string; count: number };

/** 저장소 오류는 그대로 던진다 — 호출부가 '광고를 띄우지 않는 쪽'으로 처리한다 */
const read = async (): Promise<Stored> => {
	const today = DateUtils.getLocalDateString();
	const raw = await AsyncStorage.getItem(KEY);
	let v: Stored | null;
	try {
		v = raw ? (JSON.parse(raw) as Stored) : null;
	} catch {
		v = null;
	}
	// 날짜가 바뀌면 0부터 다시 센다
	return v && v.date === today && Number.isFinite(v.count) ? v : { date: today, count: 0 };
};

/** 광고 클릭 1회 기록 (배너·앱 열기·보상형 공통) */
export const recordAdClick = async (): Promise<void> => {
	try {
		const cur = await read();
		await AsyncStorage.setItem(KEY, JSON.stringify({ date: cur.date, count: cur.count + 1 }));
	} catch {
		// 기록 실패는 무시 — 광고 흐름을 막지 않는다
	}
};

/**
 * 오늘 클릭 상한에 걸렸으면 true → 전면 광고를 띄우지 않는다.
 * 저장소를 못 읽으면 다른 광고 게이트와 같이 '띄우지 않는 쪽'(true)으로 넘어간다.
 */
export const isAdClickCapped = async (): Promise<boolean> => {
	try {
		return (await read()).count >= LIMIT;
	} catch {
		return true;
	}
};

export default { recordAdClick, isAdClickCapped, LIMIT };
