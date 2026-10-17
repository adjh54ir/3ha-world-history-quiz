import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import DateUtils from '@/src/utils/DateUtils';
import type { RootState } from '../RootReducer';

/** 타워 한 판 기록 — 챌린지 탭 개인 랭킹에 쓴다 */
export interface TowerRun {
	level: number;
	correct: number;
	total: number;
	cleared: boolean;
	/** 플레이 시각(timestamp) */
	at: number;
}

/** 개인 랭킹 정렬 — 높은 층 → 많이 맞힌 판 → 최근 판 */
export const compareTowerRun = (a: TowerRun, b: TowerRun): number => b.level - a.level || b.correct - a.correct || b.at - a.at;
/** 보관하는 판 수 (랭킹 상위만 남긴다) */
const TOWER_RUN_KEEP = 20;

/** 타워 챌린지 진행 상태 (redux-persist 로 저장된다) */
export interface TowerState {
	/** 깬 층 번호 — 보상 코스튬과 그 지속 효과가 모두 이 목록에서 나온다 */
	clearedLevels: number[];
	/** 오늘 남은 도전 기회 */
	attempts: number;
	/** 오늘 광고로 받은 추가 기회 수 */
	adRewardUsed: number;
	/** 기회를 마지막으로 채운 날 'YYYY-MM-DD' — 날짜가 바뀌면 다시 채운다 */
	lastAttemptDate: string;
	/** 판별 기록 (랭킹순, 상위 20판) — 예전 저장본에는 없다 */
	runs?: TowerRun[];
}

/** 하루 기본 도전 기회 */
export const TOWER_DAILY_ATTEMPTS = 1;
/** 광고로 하루 더 받을 수 있는 최대 기회 */
export const TOWER_AD_REWARD_MAX = 3;

const initialState: TowerState = { clearedLevels: [], attempts: TOWER_DAILY_ATTEMPTS, adRewardUsed: 0, lastAttemptDate: '', runs: [] };

/** 날짜가 바뀌었으면 오늘 몫 기회를 다시 채운다 */
export const rollTowerDay = (tower: TowerState, today: string): TowerState =>
	tower.lastAttemptDate === today
		? { ...tower, attempts: Math.max(0, tower.attempts ?? TOWER_DAILY_ATTEMPTS) }
		: { ...tower, attempts: TOWER_DAILY_ATTEMPTS, adRewardUsed: 0, lastAttemptDate: today };

const TowerSlice = createSlice({
	name: 'tower',
	initialState,
	reducers: {
		recordTower(state, action: PayloadAction<number>) {
			if (!state.clearedLevels.includes(action.payload)) state.clearedLevels.push(action.payload);
		},
		logTowerRun(state, action: PayloadAction<TowerRun>) {
			state.runs = [...(state.runs ?? []), action.payload].sort(compareTowerRun).slice(0, TOWER_RUN_KEEP);
		},
		ensureTowerDay(state) {
			return rollTowerDay(state, DateUtils.getLocalDateString());
		},
		spendTowerAttempt(state) {
			if (state.attempts > 0) state.attempts -= 1;
		},
		addTowerAttemptByAd(state) {
			if (state.adRewardUsed >= TOWER_AD_REWARD_MAX) return;
			state.attempts += 1;
			state.adRewardUsed += 1;
		},
		devResetTower() {
			return { ...initialState, lastAttemptDate: DateUtils.getLocalDateString() };
		},
	},
});

export const { recordTower, logTowerRun, ensureTowerDay, spendTowerAttempt, addTowerAttemptByAd, devResetTower } = TowerSlice.actions;

export const useTower = (): TowerState => useSelector((state: RootState) => state.tower ?? initialState);

export default TowerSlice.reducer;
