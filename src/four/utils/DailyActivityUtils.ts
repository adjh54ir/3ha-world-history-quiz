import AsyncStorage from '@react-native-async-storage/async-storage';

import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import DateUtils from './DateUtils';

/**
 * 하루 단위 활동 카운터
 * -------------------------------------------------
 * 요일별 일일 미션(학습 5개 넘기기, 즐겨찾기 1개 추가 …)은
 * "오늘 그 행동을 몇 번 했는가" 가 필요한데, 기존 저장소는 전부 누적값이라 날짜를 알 수 없었다.
 * 여기서만 날짜별 카운터를 관리하고, 화면들은 bumpActivity 한 줄만 호출한다.
 *
 * 보관 기간은 14일. 미션은 오늘 것만 쓰지만 주간 리포트에서 최근 7일을 함께 본다.
 */

/** 추적하는 활동 종류 */
export type ActivityKind =
	| 'study' // 학습 카드 넘김
	| 'wordChain' // 끝말잇기 이어붙임
	| 'tower' // 타워 층 클리어
	| 'favorite' // 즐겨찾기 추가
	| 'hanja' // 한자 낱글자 상세 열람
	| 'wrongReview' // 오답노트 복습에서 정답
	| 'timeChallenge'; // 타임 챌린지 완주

export type DailyActivity = Partial<Record<ActivityKind, number>>;
export type ActivityLog = { [date: string]: DailyActivity };

/** 보관 일수 */
const KEEP_DAYS = 14;

/** 저장된 로그 전체를 읽는다 (손상 시 빈 객체) */
export const loadActivityLog = async (): Promise<ActivityLog> => {
	try {
		const json = await AsyncStorage.getItem(MainStorageKeyType.DAILY_ACTIVITY);
		const parsed = json ? JSON.parse(json) : {};
		return parsed && typeof parsed === 'object' ? (parsed as ActivityLog) : {};
	} catch {
		return {};
	}
};

/** 오늘 활동만 뽑아온다 */
export const loadTodayActivity = async (): Promise<DailyActivity> => {
	const log = await loadActivityLog();
	return log[DateUtils.getLocalDateString()] ?? {};
};

/** 보관 기간이 지난 날짜를 떨어낸다 */
const pruneOldDates = (log: ActivityLog): ActivityLog => {
	const dates = Object.keys(log).sort();
	if (dates.length <= KEEP_DAYS) {
		return log;
	}
	const keep = new Set(dates.slice(-KEEP_DAYS));
	const next: ActivityLog = {};
	keep.forEach((d) => {
		next[d] = log[d];
	});
	return next;
};

/**
 * 오늘 활동 카운터를 올린다. 실패해도 학습 흐름을 막지 않도록 조용히 무시한다.
 * @param kind 활동 종류
 * @param amount 증가량 (기본 1)
 */
export const bumpActivity = async (kind: ActivityKind, amount = 1): Promise<void> => {
	if (amount <= 0) {
		return;
	}
	try {
		const today = DateUtils.getLocalDateString();
		const log = await loadActivityLog();
		const day = log[today] ?? {};
		const next = pruneOldDates({ ...log, [today]: { ...day, [kind]: (day[kind] ?? 0) + amount } });
		await AsyncStorage.setItem(MainStorageKeyType.DAILY_ACTIVITY, JSON.stringify(next));
	} catch {
		// 카운터는 부가 기능이므로 실패해도 무시
	}
};

/** 최근 n일(오늘 포함) 활동을 오래된 날짜 → 최신 순으로 돌려준다 */
export const recentActivity = (log: ActivityLog, days: number, todayStr: string): { date: string; activity: DailyActivity }[] => {
	const [y, m, d] = todayStr.split('-').map(Number);
	const out: { date: string; activity: DailyActivity }[] = [];
	for (let i = days - 1; i >= 0; i--) {
		const date = new Date(y, m - 1, d - i);
		const key = DateUtils.getLocalDateString(date);
		out.push({ date: key, activity: log[key] ?? {} });
	}
	return out;
};

export default { loadActivityLog, loadTodayActivity, bumpActivity, recentActivity };
