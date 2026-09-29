// services/AttendanceService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';

/**
 * 출석체크 (기기 로컬 타임존 기준 일자)
 * - 하루 1회 출석. 어제 출석했으면 연속(streak) 증가.
 */
const KEY = 'ATTENDANCE_STATE';

export interface AttendanceState {
	dates: string[]; // 출석한 날짜 목록 'YYYY-MM-DD' (최근 90일)
	lastCheck: string | null;
	streak: number;
	bestStreak: number;
	/** 스트릭 보호권을 마지막으로 쓴 날짜 — 주 1회만 자동 방어 */
	lastShieldDate?: string | null;
	/** 보호권으로 살린 날짜 (달력에 따로 표시) */
	shieldDates?: string[];
}

const DEFAULT: AttendanceState = { dates: [], lastCheck: null, streak: 0, bestStreak: 0, lastShieldDate: null, shieldDates: [] };
const CAP = 90;
/** 보호권 재충전 간격(일) — 주 1회 */
const SHIELD_COOLDOWN_DAYS = 7;

/** 로컬 타임존 기준 오늘 'YYYY-MM-DD' */
const todayStr = (): string => DateUtils.getLocalDateString();
const yesterdayStr = (): string => DateUtils.addLocalDays(todayStr(), -1);

const AttendanceService = {
	async getState(): Promise<AttendanceState> {
		try {
			const raw = await AsyncStorage.getItem(KEY);
			return raw ? { ...DEFAULT, ...(JSON.parse(raw) as AttendanceState) } : { ...DEFAULT };
		} catch {
			return { ...DEFAULT };
		}
	},

	async isCheckedToday(): Promise<boolean> {
		const s = await this.getState();
		return s.lastCheck === todayStr();
	},

	/**
	 * 보호권 사용 가능 여부 — 하루만 빠졌고, 마지막 사용 후 7일이 지났을 때.
	 * (이틀 이상 비면 보호하지 않는다: 연속의 의미가 사라짐)
	 */
	canShield(s: AttendanceState): boolean {
		if (!s.lastCheck || s.streak <= 0) return false;
		const missedOneDay = s.lastCheck === DateUtils.addLocalDays(todayStr(), -2);
		if (!missedOneDay) return false;
		if (!s.lastShieldDate) return true;
		return DateUtils.differenceInLocalDays(s.lastShieldDate, todayStr()) >= SHIELD_COOLDOWN_DAYS;
	},

	/** 오늘 출석 (이미 했으면 checked:false). 하루 빠졌어도 보호권이 있으면 연속을 잇는다 */
	async checkIn(): Promise<{ checked: boolean; shielded: boolean; state: AttendanceState }> {
		const s = await this.getState();
		const today = todayStr();
		if (s.lastCheck === today) return { checked: false, shielded: false, state: s };

		const continued = s.lastCheck === yesterdayStr();
		const shielded = !continued && this.canShield(s);
		const streak = continued || shielded ? s.streak + 1 : 1;
		const missedDay = shielded ? DateUtils.addLocalDays(today, -1) : null;
		const next: AttendanceState = {
			dates: [...new Set([today, ...s.dates])].slice(0, CAP),
			lastCheck: today,
			streak,
			bestStreak: Math.max(s.bestStreak, streak),
			lastShieldDate: shielded ? today : s.lastShieldDate ?? null,
			shieldDates: missedDay ? [...new Set([missedDay, ...(s.shieldDates ?? [])])].slice(0, CAP) : s.shieldDates ?? [],
		};
		try {
			await AsyncStorage.setItem(KEY, JSON.stringify(next));
		} catch {
			/* noop */
		}
		return { checked: true, shielded, state: next };
	},

	async reset(): Promise<void> {
		try {
			await AsyncStorage.removeItem(KEY);
		} catch {
			/* noop */
		}
	},
};

export default AttendanceService;
