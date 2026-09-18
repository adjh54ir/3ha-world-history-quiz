import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { LifeType } from '@/src/types/data/LifeType';
import {
	DOMAIN_CATEGORIES,
	DOMAIN_ITEMS,
	isDomainItem,
	selectItemsByCategory,
	selectItemsByLevel,
} from '@/src/const/data/world/ConstWorldDomain';
import DateUtils from '@/src/utils/DateUtils';
import { LIFE_LEVELS } from '@/src/const/data/life/ConstLifeLevels';
import { BADGES, EXP } from '@/src/const/data/life/ConstLifeRewards';
import {
	DAILY_COUNT,
	allMissionsDone,
	applyWrongLogs,
	attendanceFeedReward,
	attendanceExpReward,
	attendancePetStatus,
	calcStreak,
	categoryStars,
	checkNewBadges,
	freshMissions,
	petStatus,
	pickDailyWordIds,
	quizBonus,
	toDateKey,
	type BadgeSnapshot,
} from '@/src/services/life/LifeRules';

/**
 * 학습 진행·성장 상태 — redux-persist 로 그대로 저장된다.
 */
export interface LifeState {
	/** 학습 완료 단어 id */
	/** 어느 학습 도메인의 기록인지 — 도메인을 갈아 끼운 뒤 옛 id 를 한 번만 걸러 내는 표시 */
	domainTag?: string;
	learned: string[];
	/** 즐겨찾기한 단어 id — 단어 사전에서 별을 눌러 모아 둔다 */
	favorites: string[];
	wrong: LifeType.WrongNote[];
	/** 최근 퀴즈 기록 (최신순, 최대 50) */
	records: LifeType.QuizRecord[];
	/** 출석일 YYYY-MM-DD */
	attendance: string[];
	exp: number;
	badges: LifeType.EarnedBadge[];
	/** 아직 확인하지 않은 새 뱃지 — 화면에서 토스트로 알리고 비운다 */
	pendingBadges: string[];
	daily: LifeType.DailyQuiz | null;
	dailyDoneCount: number;
	/** 오늘의 미션 진행 — 날짜가 바뀌면 새로 만든다 */
	missions: LifeType.DailyMissions;
	/** 펫 단계가 올랐는데 아직 안 보여 준 새 레벨 — 팝업이 보고 비운다 */
	pendingLevelUp: number | null;
	/** 먹이를 줘서 수호신 단계가 올랐는데 아직 안 보여 준 새 단계(0부터) — 성장 오버레이가 보고 비운다 */
	pendingPetGrowth: number | null;
	/** 한 판 최대 연속 정답 */
	bestCombo: number;
	/** 누적 번개 정답 */
	fastCount: number;
	/** 오늘의 미션을 모두 끝낸 날 수 */
	missionDoneCount: number;
	graduatedCount: number;
	bestTime: number;
	bestTower: number;
	petName: string;
	reminder: { enabled: boolean; hour: number; minute: number };
	/** 획순 애니메이션 재생 — 끄면 단어 상세에서 글씨체로 바로 보여 준다 */
	strokeAnim: boolean;
	/** 손에 든 펫 먹이 — 출석 도장을 찍으면 하루 한 개 들어온다 */
	petFeeds: number;
	/** 지금까지 준 먹이 수 — 출석 수호신의 성장 단계를 이 값으로 정한다 */
	petFedCount: number;
	/**
	 * 지금까지 맞힌 문제 수 — 기록(records)은 최근 50판만 남기므로 누적은 따로 센다.
	 * 통계 화면이 이식 저장소에 따로 들고 있던 '누적 점수' 를 이 값으로 대신한다.
	 */
	totalCorrect: number;
}

const initialState: LifeState = {
	learned: [],
	favorites: [],
	wrong: [],
	records: [],
	attendance: [],
	exp: 0,
	badges: [],
	pendingBadges: [],
	daily: null,
	dailyDoneCount: 0,
	missions: freshMissions(''),
	pendingLevelUp: null,
	pendingPetGrowth: null,
	bestCombo: 0,
	fastCount: 0,
	missionDoneCount: 0,
	graduatedCount: 0,
	bestTime: 0,
	bestTower: 0,
	/** 빈 값이면 화면이 지금 언어의 기본 이름(pet.defaultName)을 쓴다 — 저장된 이름이 옛 언어로 굳지 않게 */
	petName: '',
	reminder: { enabled: false, hour: 20, minute: 0 },
	strokeAnim: true,
	petFeeds: 0,
	petFedCount: 0,
	totalCorrect: 0,
};

const MAX_RECORDS = 50;

/**
 * 경험치를 올리고 펫 단계가 오르면 팝업용으로 새 레벨을 적어 둔다.
 */
const gainExp = (state: LifeState, amount: number) => {
	const before = petStatus(state.exp).level;
	state.exp += Math.max(0, amount);
	const after = petStatus(state.exp).level;
	if (after > before) {
		state.pendingLevelUp = after;
	}
};

/**
 * 나중에 생긴 칸들을 채운다 — 이 칸이 없던 버전의 저장본은 redux-persist 가 그대로 올리므로 undefined 로 온다.
 * 값을 만지는 리듀서 첫머리에서 부른다.
 */
/**
 * 학습 도메인이 한자에서 세계 상식으로 바뀌기 전에 깔린 기록을 걷어낸다.
 *
 * redux-persist 는 기기에 저장된 상태를 그대로 되살린다. 진도(learned)·오답 노트·즐겨찾기·오늘의 세트에는
 * 지금 도메인에 없는 옛 한자 단어 id('daily-01')가 남아 있다. 그대로 두면
 * **배운 개수가 부풀고, 오답 노트에 열 수 없는 유령 항목이 뜬다.**
 * 한 번 걸러 내고, 다시 돌지 않게 표시를 남긴다.
 */
const DOMAIN_TAG = 'world-v1';
const REMOVED_REWARD_STATE_KEYS = [
	'coins',
	'pendingChests',
	'chestCount',
	'adCoinDate',
	'adCoinCount',
	'decors',
	'decorEquipped',
	'shields',
	'quizBoosts',
	'wrongGuards',
	'chestSeals',
	'learnBoosts',
	'attendanceBoosts',
	'shieldedDays',
	'shopUpgrades',
	'wish',
] as const;

const migrateDomain = (state: LifeState) => {
	if (state.domainTag === DOMAIN_TAG) {
		return;
	}
	state.learned = (state.learned ?? []).filter(isDomainItem);
	state.favorites = (state.favorites ?? []).filter(isDomainItem);
	state.wrong = (state.wrong ?? []).filter((note) => isDomainItem(note.wordId));
	// 오늘의 세트는 날짜가 바뀌면 어차피 새로 뽑는다 — 옛 id 가 섞였으면 통째로 버린다
	if (state.daily && !state.daily.wordIds.every(isDomainItem)) {
		state.daily = null;
	}
	state.domainTag = DOMAIN_TAG;
};

const ensureShape = (state: LifeState) => {
	migrateDomain(state);
	const persisted = state as LifeState & Record<string, unknown>;
	for (const key of REMOVED_REWARD_STATE_KEYS) {
		delete persisted[key];
	}
	const validBadgeIds = new Set(BADGES.map((badge) => badge.id));
	state.badges = (state.badges ?? []).filter((badge) => validBadgeIds.has(badge.id));
	state.pendingBadges = (state.pendingBadges ?? []).filter((id) => validBadgeIds.has(id));
	state.pendingLevelUp ??= null;
	state.pendingPetGrowth ??= null;
	state.bestCombo ??= 0;
	state.fastCount ??= 0;
	state.missionDoneCount ??= 0;
	state.favorites ??= [];
	state.strokeAnim ??= true;
	state.petFeeds ??= 0;
	// 먹이 방식으로 바뀌기 전 저장본 — 그때까지 쌓인 출석일을 먹인 것으로 이어받아 단계가 내려가지 않게 한다
	state.petFedCount ??= state.attendance.length;
	state.totalCorrect ??= 0;
};

/**
 * 오늘의 미션 칸을 오늘 날짜로 맞춘다 — 날짜가 바뀌었거나 미션이 없던 버전의 저장본이면 새로 만든다.
 * 미션 값을 만지는 리듀서 첫머리에서 부른다.
 */
const ensureMissions = (state: LifeState) => {
	ensureShape(state);
	const today = toDateKey();
	if (!state.missions || state.missions.date !== today) {
		state.missions = freshMissions(today);
	}
};

/** 미션 진행을 올린다 — 보상은 홈에서 완료 버튼을 눌러 받는다 */
const bumpMission = (state: LifeState, key: LifeType.MissionKey, amount: number) => {
	if (amount <= 0) {
		return;
	}
	ensureMissions(state);
	state.missions.progress[key] = (state.missions.progress[key] ?? 0) + amount;
	// 셋 다 채워도 보상은 자동으로 주지 않는다 — 홈에서 완료 보상을 눌러야 한다
};

/**
 * 뱃지 판정에 쓰는 값만 모은다.
 * 리듀서(새 뱃지 지급)와 화면(진행도 막대)이 **같은 함수**를 쓴다 — 따로 적어 두면
 * "조건을 채웠다고 나오는데 뱃지가 안 들어오는" 어긋남이 생긴다.
 */
export const buildBadgeSnapshot = (state: LifeState): BadgeSnapshot => {
	const learnedSet = new Set(state.learned);
	/** 전부 학습한 분야 — '한 분야 정복'·'세 분야'·'전 분야' 뱃지가 같은 수를 본다 */
	const categoryDoneCount = DOMAIN_CATEGORIES.filter((category) => {
		const words = selectItemsByCategory(category.key);
		return words.length > 0 && words.every((word) => learnedSet.has(word.id));
	}).length;
	/**
	 * 전부 학습한 난이도 — 통계 화면이 따로 들고 있던 '난이도 마스터' 를 여기서 센다.
	 * 이식 저장소가 아니라 학습 기록(learned)으로 세므로 두 화면의 값이 어긋나지 않는다.
	 */
	const levelDoneCount = LIFE_LEVELS.filter((item) => {
		const words = selectItemsByLevel(item.level);
		return words.length > 0 && words.every((word) => learnedSet.has(word.id));
	}).length;
	return {
		learnedCount: state.learned.length,
		categoryDone: categoryDoneCount > 0,
		categoryDoneCount,
		categoryTotal: DOMAIN_CATEGORIES.length,
		attendanceDays: state.attendance.length,
		favoriteCount: state.favorites?.length ?? 0,
		levelDoneCount,
		levelTotal: LIFE_LEVELS.length,
		totalCorrect: state.totalCorrect ?? 0,
		petFedCount: state.petFedCount ?? 0,
		// 한 번이라도 졸업시킨 뒤 노트가 비었을 때만 인정한다 — 처음부터 빈 노트는 "비운" 것이 아니다
		wrongCleared: state.graduatedCount > 0 && state.wrong.length === 0,
		stars: DOMAIN_CATEGORIES.reduce((sum, category) => sum + categoryStars(category.key, selectItemsByCategory(category.key), learnedSet, state.records), 0),
		bestCombo: state.bestCombo,
		fastCount: state.fastCount,
		missionDoneCount: state.missionDoneCount,
		quizCount: state.records.length,
		// 만점 뱃지는 일반 퀴즈만 — 챌린지는 한두 문제 맞히고 끝나도 "만점"이 된다
		hasPerfect: state.records.some((item) => item.source !== 'time' && item.source !== 'tower' && item.total > 0 && item.correct === item.total),
		dailyDoneCount: state.dailyDoneCount,
		streak: calcStreak(state.attendance, toDateKey()),
		graduatedCount: state.graduatedCount,
		bestTime: state.bestTime,
		bestTower: state.bestTower,
		exp: state.exp,
	};
};

/** 상태를 훑어 새로 받을 뱃지를 붙인다 — 값이 바뀌는 리듀서 끝에서 한 번씩 부른다 */
const settleBadges = (state: LifeState) => {
	ensureShape(state);
	const fresh = checkNewBadges(
		buildBadgeSnapshot(state),
		state.badges.map((item) => item.id),
	);
	if (fresh.length === 0) {
		return;
	}
	const at = DateUtils.now().toISOString();
	state.badges.push(...fresh.map((id) => ({ id, at })));
	state.pendingBadges.push(...fresh);
};

export const LifeSlice = createSlice({
	name: 'life',
	initialState,
	reducers: {
		/** 학습 카드에서 "알았어요" — 처음 배운 항목만 경험치 지급 */
		markLearned(state, action: PayloadAction<string[]>) {
			ensureShape(state);
			let fresh = 0;
			for (const id of action.payload) {
				if (!state.learned.includes(id)) {
					state.learned.push(id);
					fresh += 1;
				}
			}
			if (fresh) {
				gainExp(state, fresh * EXP.learnWord);
				bumpMission(state, 'learn', fresh);
			}
			settleBadges(state);
		},

		/** 퀴즈 한 판 끝 — 기록·오답 노트·경험치를 한 번에 반영 */
		finishQuiz(
			state,
			action: PayloadAction<{
				source: LifeType.QuizSource;
				category?: LifeType.CategoryKey;
				logs: LifeType.AnswerLog[];
				score?: number;
			}>,
		) {
			const { source, category, logs, score } = action.payload;
			ensureShape(state);
			const correct = logs.filter((item) => item.isCorrect).length;
			const now = DateUtils.now().toISOString();
			state.records.unshift({ playedAt: now, source, category, total: logs.length, correct, ...(score !== undefined ? { score } : {}) });
			state.records = state.records.slice(0, MAX_RECORDS);

			const { notes, graduated } = applyWrongLogs(state.wrong, logs, now);
			state.wrong = notes;
			state.graduatedCount += graduated.length;
			const bonus = quizBonus(logs);
			gainExp(state, correct * EXP.correct);
			state.bestCombo = Math.max(state.bestCombo, bonus.maxCombo);
			state.fastCount += bonus.fast;
			state.totalCorrect += correct;

			// 오늘의 미션 — 한 판 풀었고(문제가 있었고), 오답 복습에서 맞힌 만큼
			if (logs.length > 0) {
				bumpMission(state, 'quiz', 1);
			}
			if (source === 'wrong') {
				bumpMission(state, 'review', correct);
			}

			if (source === 'daily' && state.daily && !state.daily.done) {
				state.daily.done = true;
				state.daily.correct = correct;
				state.dailyDoneCount += 1;
				gainExp(state, EXP.daily);
			}
			settleBadges(state);
		},

		/**
		 * 저장된 상태를 되살린 직후 한 번 — 학습 도메인이 바뀌기 전 기록을 걸러 낸다.
		 * 리듀서가 하나도 돌지 않으면 ensureShape 도 안 도는데, 홈만 열고 가만히 있으면
		 * 그 사이 배운 개수가 옛 한자 기록까지 세어 부풀어 보인다.
		 */
		syncDomain(state) {
			ensureShape(state);
		},

		/** 오늘의 퀴즈 세트 확보 — 날짜가 바뀌었으면 새로 뽑는다 */
		ensureDaily(state) {
			const today = toDateKey();
			if (state.daily?.date !== today) {
				// 배운 수를 넘겨 난이도를 맞춘다 — 시작한 지 얼마 안 됐으면 쉬운 말부터 나온다
				state.daily = { date: today, wordIds: pickDailyWordIds(DOMAIN_ITEMS, today, DAILY_COUNT, state.learned.length), done: false, correct: 0 };
			}
			ensureMissions(state);
		},

		/**
		 * 오늘의 미션 보상 받기 — 셋 다 채웠고 아직 안 받았을 때만 경험치를 준다.
		 */
		claimMissions(state) {
			ensureMissions(state);
			if (state.missions.claimed || !allMissionsDone(state.missions)) {
				return;
			}
			state.missions.claimed = true;
			state.missionDoneCount += 1;
			gainExp(state, EXP.mission);
			settleBadges(state);
		},

		/** 레벨업 팝업을 봤다 */
		clearLevelUp(state) {
			state.pendingLevelUp = null;
		},

		/** 수호신 성장 오버레이를 봤다 */
		clearPetGrowth(state) {
			state.pendingPetGrowth = null;
		},

		/** 획순 애니메이션 켜기/끄기 — 설정에서 전역으로 바꾼다 */
		setStrokeAnim(state, action: PayloadAction<boolean>) {
			state.strokeAnim = action.payload;
		},

		/** 출석 체크 — 하루 한 번만. 보상은 화면이 미리 계산해 보여 주므로 여기서도 같은 규칙을 쓴다 */
		checkIn(state) {
			const today = toDateKey();
			if (state.attendance.includes(today)) {
				return;
			}
			ensureShape(state);
			state.attendance.push(today);
			const streak = calcStreak(state.attendance, today);
			gainExp(state, attendanceExpReward(streak));
			// 수호신은 출석만으로 자라지 않는다 — 출석은 먹이를 주고, 먹이를 줘야 단계가 오른다
			// 하루 한 개가 기본, 7일마다 오는 특별 출석에는 더 얹어 준다
			state.petFeeds += attendanceFeedReward(streak);
			settleBadges(state);
		},

		/**
		 * 출석 수호신에게 먹이 하나를 준다.
		 * 먹이가 없거나 이미 마지막 단계면 아무 일도 없다 — 더 자라지 않는데 먹이가 사라지면 손해다.
		 */
		feedAttendancePet(state) {
			ensureShape(state);
			if (state.petFeeds <= 0 || !attendancePetStatus(state.petFedCount).next) {
				return;
			}
			const before = attendancePetStatus(state.petFedCount).level;
			state.petFeeds -= 1;
			state.petFedCount += 1;
			const after = attendancePetStatus(state.petFedCount).level;
			// 단계가 올랐으면 검은 오버레이 축하 화면이 한 번 뜬다 (PetGrowthModal 이 보고 비운다)
			if (after > before) {
				state.pendingPetGrowth = after;
			}
			settleBadges(state);
		},

		recordTimeChallenge(state, action: PayloadAction<number>) {
			state.bestTime = Math.max(state.bestTime, action.payload);
			settleBadges(state);
		},

		recordTower(state, action: PayloadAction<number>) {
			state.bestTower = Math.max(state.bestTower, action.payload);
			settleBadges(state);
		},

		clearPendingBadges(state) {
			state.pendingBadges = [];
		},

		setReminder(state, action: PayloadAction<LifeState['reminder']>) {
			state.reminder = action.payload;
		},

		/** 학습·퀴즈 기록만 지운다 (경험치·펫·뱃지는 남긴다) */
		/** 단어 즐겨찾기 켜기/끄기 — 보상과 무관한 순수 표시라 뱃지 계산을 돌리지 않는다 */
		toggleFavorite(state, action: PayloadAction<string>) {
			// 즐겨찾기가 없던 버전에서 올라온 저장본에는 이 배열 자체가 없다
			if (!state.favorites) {
				state.favorites = [];
			}
			const at = state.favorites.indexOf(action.payload);
			if (at >= 0) {
				state.favorites.splice(at, 1);
				return;
			}
			state.favorites.push(action.payload);
		},

		/**
		 * 즐겨찾기를 켜거나 끈다 — 값이 정해진 쪽에서 부른다.
		 * 이식 화면(오늘의 퀴즈·오답노트)의 별과 단어 사전의 별을 한 목록으로 맞출 때 쓴다.
		 * toggle 로 맞추면 두 저장소가 서로를 뒤집어 값이 엇갈린다.
		 */
		setFavorite(state, action: PayloadAction<{ id: string; on: boolean }>) {
			if (!state.favorites) {
				state.favorites = [];
			}
			const { id, on } = action.payload;
			const at = state.favorites.indexOf(id);
			if (on && at < 0) {
				state.favorites.push(id);
				return;
			}
			if (!on && at >= 0) {
				state.favorites.splice(at, 1);
			}
		},

		resetProgress(state) {
			state.learned = [];
			state.wrong = [];
			state.records = [];
			state.daily = null;
		},

		resetAll() {
			return initialState;
		},

		/** 초기화 되돌리기 — 지우기 직전 상태를 통째로 되돌린다 */
		restoreLife(_state, action: PayloadAction<LifeState>) {
			return action.payload;
		},

		/** [DEV] 퀴즈를 다 푼 상태로 — 기록·미션·뱃지 화면을 채워 놓고 확인할 때 쓴다 */
		devCompleteQuiz(state) {
			ensureShape(state);
			// 오늘의 퀴즈를 한 번도 안 열었으면 세트가 없다 — 먼저 뽑아야 '완료' 가 기록된다
			LifeSlice.caseReducers.ensureDaily(state);
			const words = state.daily?.wordIds.length
				? state.daily.wordIds.map((id) => DOMAIN_ITEMS.find((item) => item.id === id)).filter((item) => !!item)
				: DOMAIN_ITEMS.slice(0, DAILY_COUNT);
			const logs: LifeType.AnswerLog[] = words.map((word) => ({
				wordId: word.id,
				mode: 'meaning',
				selected: word.summary,
				isCorrect: true,
				fast: true,
			}));
			LifeSlice.caseReducers.finishQuiz(state, {
				type: 'life/finishQuiz',
				payload: { source: 'daily', logs },
			});
		},
	},
});

export const {
	markLearned,
	finishQuiz,
	ensureDaily,
	claimMissions,
	clearLevelUp,
	clearPetGrowth,
	setStrokeAnim,
	checkIn,
	feedAttendancePet,
	recordTimeChallenge,
	recordTower,
	clearPendingBadges,
	toggleFavorite,
	setFavorite,
	syncDomain,
	setReminder,
	resetProgress,
	resetAll,
	restoreLife,
	devCompleteQuiz,
} = LifeSlice.actions;

export default LifeSlice.reducer;
