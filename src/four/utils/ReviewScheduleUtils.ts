import AsyncStorage from '@react-native-async-storage/async-storage';

import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import DateUtils from './DateUtils';

/**
 * 오답 간격 반복(Leitner 3박스) 일정
 * -------------------------------------------------
 * 기존 오답노트는 "한 번 맞히면 목록에서 즉시 제거" 였다.
 * 우연히 맞힌 문제까지 사라져 진짜 외웠는지 확인할 방법이 없었다.
 *
 * 여기서는 문제마다 박스(1·2·3)를 두고, 맞히면 한 칸 올라가며 다음 복습일이 멀어진다.
 *   박스1 → 1일 뒤, 박스2 → 3일 뒤, 박스3 → 7일 뒤
 * 박스3까지 통과하면 졸업(schedule 에서 제거 + 오답 목록에서도 제외)한다.
 * 틀리면 박스1로 강등되어 다음 날 다시 나온다.
 */

/** 박스별 다음 복습까지의 간격(일). index 0 = 박스1 */
export const BOX_INTERVALS = [1, 3, 7] as const;
/** 마지막 박스 번호 (여기서 또 맞히면 졸업) */
export const MAX_BOX = BOX_INTERVALS.length;

export interface ReviewEntry {
	/** 1 ~ MAX_BOX */
	box: number;
	/** 다음 복습 예정일 'YYYY-MM-DD' */
	due: string;
}

export type ReviewSchedule = { [proverbId: string]: ReviewEntry };

const addDays = (dateStr: string, days: number): string => {
	const [y, m, d] = dateStr.split('-').map(Number);
	return DateUtils.getLocalDateString(new Date(y, m - 1, d + days));
};

const clampBox = (box: number): number => Math.min(MAX_BOX, Math.max(1, Math.floor(box) || 1));

/** 박스 번호에 맞는 다음 복습일 */
export const nextDueDate = (box: number, todayStr: string): string =>
	addDays(todayStr, BOX_INTERVALS[clampBox(box) - 1]);

/**
 * 오답 처리 — 박스1로 강등하고 다음 날 다시 출제한다. (순수 함수)
 */
export const applyWrong = (schedule: ReviewSchedule, proverbId: number, todayStr: string): ReviewSchedule => ({
	...schedule,
	[String(proverbId)]: { box: 1, due: nextDueDate(1, todayStr) },
});

/**
 * 정답 처리 — 박스를 한 칸 올린다. 마지막 박스에서 맞히면 졸업. (순수 함수)
 * @returns 갱신된 일정과 졸업 여부
 */
export const applyCorrect = (
	schedule: ReviewSchedule,
	proverbId: number,
	todayStr: string,
): { schedule: ReviewSchedule; graduated: boolean; box: number } => {
	const key = String(proverbId);
	const entry = schedule[key];
	// 일정에 없던 문제를 맞힌 경우: 복습 대상이 아니므로 그대로 둔다
	if (!entry) {
		return { schedule, graduated: true, box: MAX_BOX };
	}

	const nextBox = clampBox(entry.box) + 1;
	if (nextBox > MAX_BOX) {
		const next = { ...schedule };
		delete next[key];
		return { schedule: next, graduated: true, box: MAX_BOX };
	}
	return {
		schedule: { ...schedule, [key]: { box: nextBox, due: nextDueDate(nextBox, todayStr) } },
		graduated: false,
		box: nextBox,
	};
};

/** 오늘 복습해야 하는 문제 id 목록 (due <= 오늘) */
export const dueProverbIds = (schedule: ReviewSchedule, todayStr: string): number[] =>
	Object.entries(schedule)
		.filter(([, entry]) => entry.due <= todayStr)
		.map(([id]) => Number(id))
		.filter((id) => !Number.isNaN(id));

/**
 * 오답 목록과 일정을 맞춘다.
 * 앱을 쓰던 중간에 이 기능이 들어왔으므로, 일정이 없는 기존 오답은 오늘 복습 대상으로 채워 넣는다.
 */
export const backfillSchedule = (schedule: ReviewSchedule, wrongIds: number[], todayStr: string): ReviewSchedule => {
	const next = { ...schedule };
	let changed = false;
	wrongIds.forEach((id) => {
		if (!next[String(id)]) {
			next[String(id)] = { box: 1, due: todayStr };
			changed = true;
		}
	});
	// 오답 목록에서 빠진 항목의 일정은 정리한다
	const wrongSet = new Set(wrongIds.map(String));
	Object.keys(next).forEach((key) => {
		if (!wrongSet.has(key)) {
			delete next[key];
			changed = true;
		}
	});
	return changed ? next : schedule;
};

export const loadSchedule = async (): Promise<ReviewSchedule> => {
	try {
		const json = await AsyncStorage.getItem(MainStorageKeyType.REVIEW_SCHEDULE);
		const parsed = json ? JSON.parse(json) : {};
		return parsed && typeof parsed === 'object' ? (parsed as ReviewSchedule) : {};
	} catch {
		return {};
	}
};

export const saveSchedule = async (schedule: ReviewSchedule): Promise<void> => {
	try {
		await AsyncStorage.setItem(MainStorageKeyType.REVIEW_SCHEDULE, JSON.stringify(schedule));
	} catch {
		// 일정 저장 실패가 퀴즈 진행을 막지 않도록 무시한다
	}
};

/** 사람이 읽는 다음 복습 안내 문구 */
export const describeDue = (due: string, todayStr: string): string => {
	if (due <= todayStr) {
		return '오늘 복습';
	}
	const [ty, tm, td] = todayStr.split('-').map(Number);
	const [dy, dm, dd] = due.split('-').map(Number);
	const diff = Math.round((new Date(dy, dm - 1, dd).getTime() - new Date(ty, tm - 1, td).getTime()) / 86400000);
	return `${diff}일 뒤 복습`;
};

export default {
	BOX_INTERVALS,
	MAX_BOX,
	applyWrong,
	applyCorrect,
	dueProverbIds,
	backfillSchedule,
	loadSchedule,
	saveSchedule,
	describeDue,
};
