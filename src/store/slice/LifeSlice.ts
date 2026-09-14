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
import {
	EMPTY_SHOP_UPGRADES,
	EXP,
	FOCUS_CHARM_MAX,
	REWARD,
	SHIELD_MAX,
	SHOP_BOOST_MAX,
	SHOP_UPGRADES,
	shopUpgradeEffect,
	shopUpgradePrice,
	type ShopUpgradeKey,
} from '@/src/const/data/life/ConstLifeRewards';
import { DECORS, DECOR_SET_BONUS_PERCENT, isDecorSetComplete, selectDecor } from '@/src/const/data/life/ConstLifeDecor';
import {
	adCoinsLeft,
	CHEST_MIN_TOTAL,
	DAILY_COUNT,
	allMissionsDone,
	applyWrongLogs,
	attendanceFeedReward,
	attendanceReward,
	attendancePetStatus,
	calcStreak,
	categoryStars,
	checkNewBadges,
	freshMissions,
	isWeekend,
	needsShield,
	petStatus,
	pickDailyWordIds,
	quizBonus,
	quizReward,
	rollChest,
	shiftDateKey,
	toDateKey,
	type BadgeSnapshot,
} from '@/src/services/life/LifeRules';

/**
 * 학습 진행·보상 상태 — redux-persist 로 그대로 저장된다.
 * 코인은 쓰면 줄지만 경험치(exp)는 누적만 되므로 펫은 절대 퇴화하지 않는다.
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
	coins: number;
	exp: number;
	/** 가진 화면 꾸미기 id — 캐릭터에 입히지 않고 화면 제자리에 놓는 것들 */
	decors: string[];
	/** 갈래마다 하나씩 적용 중인 꾸미기 */
	decorEquipped: Partial<Record<LifeType.DecorKind, string>>;
	badges: LifeType.EarnedBadge[];
	/** 아직 확인하지 않은 새 뱃지 — 화면에서 토스트로 알리고 비운다 */
	pendingBadges: string[];
	daily: LifeType.DailyQuiz | null;
	dailyDoneCount: number;
	/** 오늘의 미션 진행 — 날짜가 바뀌면 새로 만든다 */
	missions: LifeType.DailyMissions;
	/** 아직 열지 않은 보물상자 — 안에 든 코인 액수. 여는 순간 코인이 붙는다 */
	pendingChests: number[];
	/** 펫 단계가 올랐는데 아직 안 보여 준 새 레벨 — 팝업이 보고 비운다 */
	pendingLevelUp: number | null;
	/** 먹이를 줘서 수호신 단계가 올랐는데 아직 안 보여 준 새 단계(0부터) — 성장 오버레이가 보고 비운다 */
	pendingPetGrowth: number | null;
	/** 한 판 최대 연속 정답 */
	bestCombo: number;
	/** 누적 번개 정답 */
	fastCount: number;
	/** 연 보물상자 수 */
	chestCount: number;
	/** 오늘의 미션을 모두 끝낸 날 수 */
	missionDoneCount: number;
	/** 스트릭 보호권 보유 수 */
	shields: number;
	/** 다음 퀴즈 문제 보상을 두 배로 만드는 집중 부적 보유 수 */
	quizBoosts: number;
	/** 다음 퀴즈에서 새 오답 기록을 막는 방패 */
	wrongGuards: number;
	/** 다음 퀴즈 완료 시 추가 상자를 주는 인장 */
	chestSeals: number;
	/** 다음 신규 학습 보상을 두 배로 만드는 책갈피 */
	learnBoosts: number;
	/** 다음 출석 보상을 두 배로 만드는 향 */
	attendanceBoosts: number;
	/** 보호권으로 막은 날 YYYY-MM-DD — 스트릭 계산에만 쓰인다 */
	shieldedDays: string[];
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
	/** 반복 구매로 레벨이 오르는 영구 상점 강화 */
	shopUpgrades: Record<ShopUpgradeKey, number>;
	/**
	 * 지금까지 맞힌 문제 수 — 기록(records)은 최근 50판만 남기므로 누적은 따로 센다.
	 * 통계 화면이 이식 저장소에 따로 들고 있던 '누적 점수' 를 이 값으로 대신한다.
	 */
	totalCorrect: number;
	/** 광고로 코인을 받은 날 YYYY-MM-DD — 날짜가 바뀌면 횟수를 되돌린다 */
	adCoinDate: string;
	/** 그날 광고로 코인을 받은 횟수 */
	adCoinCount: number;
	/**
	 * 찜해 둔 물건 하나 — 코인이 모자라 못 산 것을 사장이 대신 적어 둔다.
	 * 코인이 값에 닿으면 어느 화면에 있든 알려 주고 비운다. 한 번에 하나만 적어 둔다
	 * (여러 개를 모아 두면 "무엇을 모으는 중인지" 가 흐려진다).
	 */
	wish: { key: string; label: string; price: number } | null;
}

const initialState: LifeState = {
	learned: [],
	favorites: [],
	wrong: [],
	records: [],
	attendance: [],
	coins: 0,
	exp: 0,
	decors: [],
	decorEquipped: {},
	badges: [],
	pendingBadges: [],
	daily: null,
	dailyDoneCount: 0,
	missions: freshMissions(''),
	pendingChests: [],
	pendingLevelUp: null,
	pendingPetGrowth: null,
	bestCombo: 0,
	fastCount: 0,
	chestCount: 0,
	missionDoneCount: 0,
	shields: 0,
	quizBoosts: 0,
	wrongGuards: 0,
	chestSeals: 0,
	learnBoosts: 0,
	attendanceBoosts: 0,
	shieldedDays: [],
	graduatedCount: 0,
	bestTime: 0,
	bestTower: 0,
	petName: '한자 판다',
	reminder: { enabled: false, hour: 20, minute: 0 },
	strokeAnim: true,
	petFeeds: 0,
	petFedCount: 0,
	shopUpgrades: { ...EMPTY_SHOP_UPGRADES },
	totalCorrect: 0,
	adCoinDate: '',
	adCoinCount: 0,
	wish: null,
};

const MAX_RECORDS = 50;

/** 개발 빌드에서 한 번에 더해 주는 코인 — 상점을 손으로 벌지 않고 바로 보기 위한 값 */
export const DEV_COINS = 10000;

/**
 * 코인·경험치를 함께 올린다 — 펫 단계가 오르면 팝업용으로 새 레벨을 적어 둔다.
 * 경험치를 따로 넘기지 않으면 받은 코인만큼 경험치도 오른다(출석·미션·상자가 그렇다).
 * 퀴즈·학습만 EXP 표(퀴즈 정답 10 / 단어 5)를 따로 넘긴다 — 등급이 코인 배율에 흔들리지 않게 한다.
 */
const earn = (state: LifeState, amount: number, exp: number = amount) => {
	const before = petStatus(state.exp).level;
	// 꾸미기 여섯 갈래를 모두 놓아 두면 코인만 조금 더 붙는다 (경험치는 그대로 — 등급 속도는 건드리지 않는다).
	// 코인이 빠지는 자리(구매)에서는 amount 가 음수로 오지 않는다. 들어오는 코인에만 얹는다.
	const setBonus = amount > 0 && isDecorSetComplete(state.decorEquipped) ? 1 + DECOR_SET_BONUS_PERCENT / 100 : 1;
	state.coins += Math.round(amount * setBonus);
	state.exp += Math.max(0, exp);
	const after = petStatus(state.exp).level;
	if (after > before) {
		state.pendingLevelUp = after;
	}
};

/** 코인 없이 경험치만 올리고 펫 레벨업 알림은 유지한다. */
const gainExp = (state: LifeState, amount: number) => {
	if (amount <= 0) return;
	const before = petStatus(state.exp).level;
	state.exp += amount;
	const after = petStatus(state.exp).level;
	if (after > before) state.pendingLevelUp = after;
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
	state.pendingChests ??= [];
	state.pendingLevelUp ??= null;
	state.pendingPetGrowth ??= null;
	state.bestCombo ??= 0;
	state.fastCount ??= 0;
	state.chestCount ??= 0;
	state.missionDoneCount ??= 0;
	state.shields ??= 0;
	state.quizBoosts ??= 0;
	state.wrongGuards ??= 0;
	state.chestSeals ??= 0;
	state.learnBoosts ??= 0;
	state.attendanceBoosts ??= 0;
	state.shieldedDays ??= [];
	state.favorites ??= [];
	state.strokeAnim ??= true;
	state.petFeeds ??= 0;
	// 먹이 방식으로 바뀌기 전 저장본 — 그때까지 쌓인 출석일을 먹인 것으로 이어받아 단계가 내려가지 않게 한다
	state.petFedCount ??= state.attendance.length;
	state.totalCorrect ??= 0;
	state.adCoinDate ??= '';
	state.adCoinCount ??= 0;
	state.wish ??= null;
	state.shopUpgrades ??= { ...EMPTY_SHOP_UPGRADES };
	for (const key of Object.keys(EMPTY_SHOP_UPGRADES) as ShopUpgradeKey[]) {
		state.shopUpgrades[key] ??= 0;
	}
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

/** 미션 진행을 올린다 — 보상은 홈에서 보물상자를 눌러 받는다 */
const bumpMission = (state: LifeState, key: LifeType.MissionKey, amount: number) => {
	if (amount <= 0) {
		return;
	}
	ensureMissions(state);
	state.missions.progress[key] = (state.missions.progress[key] ?? 0) + amount;
	// 셋 다 채워도 보상은 자동으로 주지 않는다 — 홈의 보물상자를 눌러야 열린다(claimMissions)
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
		decorCount: state.decors?.length ?? 0,
		decorTotal: DECORS.length,
		levelDoneCount,
		levelTotal: LIFE_LEVELS.length,
		totalCorrect: state.totalCorrect ?? 0,
		petFedCount: state.petFedCount ?? 0,
		upgradeLevel: Object.values(state.shopUpgrades ?? EMPTY_SHOP_UPGRADES).reduce((sum, level) => sum + (level ?? 0), 0),
		// 한 번이라도 졸업시킨 뒤 노트가 비었을 때만 인정한다 — 처음부터 빈 노트는 "비운" 것이 아니다
		wrongCleared: state.graduatedCount > 0 && state.wrong.length === 0,
		stars: DOMAIN_CATEGORIES.reduce((sum, category) => sum + categoryStars(category.key, selectItemsByCategory(category.key), learnedSet, state.records), 0),
		bestCombo: state.bestCombo,
		fastCount: state.fastCount,
		chestCount: state.chestCount,
		missionDoneCount: state.missionDoneCount,
		quizCount: state.records.length,
		// 만점 뱃지는 일반 퀴즈만 — 챌린지는 한두 문제 맞히고 끝나도 "만점"이 된다
		hasPerfect: state.records.some((item) => item.source !== 'time' && item.source !== 'tower' && item.total > 0 && item.correct === item.total),
		dailyDoneCount: state.dailyDoneCount,
		streak: calcStreak(state.attendance, toDateKey(), state.shieldedDays),
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
		/** 학습 카드에서 "알았어요" — 처음 배운 단어만 보상 */
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
				const multiplier = state.learnBoosts > 0 ? 2 : 1;
				const permanentBonus = shopUpgradeEffect('engravingInkstone', state.shopUpgrades.engravingInkstone);
				// 상점 '새김 벼루'·학습 부스터는 설명에 "코인·EXP" 라고 적혀 있다 — 경험치에도 같이 먹인다.
				// 기본값(단어 하나 5 EXP)은 EXP 표가 그대로 정한다.
				earn(state, fresh * (REWARD.learnWord + permanentBonus) * multiplier, fresh * (EXP.learnWord + permanentBonus) * multiplier);
				if (state.learnBoosts > 0) {
					state.learnBoosts -= 1;
				}
				bumpMission(state, 'learn', fresh);
			}
			settleBadges(state);
		},

		/** 퀴즈 한 판 끝 — 기록·오답 노트·보상을 한 번에 반영 */
		finishQuiz(
			state,
			action: PayloadAction<{
				source: LifeType.QuizSource;
				category?: LifeType.CategoryKey;
				logs: LifeType.AnswerLog[];
				/** 챌린지는 화면이 계산한 보상·점수를 넘긴다 */
				reward?: number;
				score?: number;
			}>,
		) {
			const { source, category, logs, score } = action.payload;
			ensureShape(state);
			const correct = logs.filter((item) => item.isCorrect).length;
			const now = DateUtils.now().toISOString();
			state.records.unshift({ playedAt: now, source, category, total: logs.length, correct, ...(score !== undefined ? { score } : {}) });
			state.records = state.records.slice(0, MAX_RECORDS);

			const usesWrongGuard = state.wrongGuards > 0 && logs.length > 0;
			const wrongLogs = usesWrongGuard ? logs.filter((item) => item.isCorrect) : logs;
			const { notes, graduated } = applyWrongLogs(state.wrong, wrongLogs, now);
			state.wrong = notes;
			state.graduatedCount += graduated.length;
			if (usesWrongGuard) {
				state.wrongGuards -= 1;
			}
			// 챌린지는 화면이 계산한 보상을 그대로 쓰고, 일반 퀴즈는 정답 수 + 번개·콤보 보너스로 계산한다.
			// 주말은 전부 두 배.
			const bonus = quizBonus(logs);
			const base = action.payload.reward ?? quizReward(correct, logs.length) + bonus.coins;
			const usesFocusCharm = state.quizBoosts > 0 && logs.length > 0;
			const focusMultiplier = usesFocusCharm ? REWARD.focusCharmMultiplier : 1;
			const permanentMultiplier = 1 + shopUpgradeEffect('answerAbacus', state.shopUpgrades.answerAbacus) / 100;
			// 경험치는 정답 수로만 센다 — 코인 쪽 보너스(번개·콤보·주말)는 태우지 않는다.
			// 다만 '집중 부적'·'정답 주판' 은 보상 배율 아이템이라 경험치에도 같이 먹인다(주말 2배는 코인 전용).
			earn(
				state,
				Math.round(base * (isWeekend() ? REWARD.weekendMultiplier : 1) * focusMultiplier * permanentMultiplier),
				Math.round(correct * EXP.correct * focusMultiplier * permanentMultiplier),
			);
			if (usesFocusCharm) {
				state.quizBoosts -= 1;
			}
			state.bestCombo = Math.max(state.bestCombo, bonus.maxCombo);
			state.fastCount += bonus.fast;
			state.totalCorrect += correct;

			// 보물상자 — 일반 퀴즈 만점(5문제 이상) · 타워 3층마다 만점. 타임은 한두 문제 맞히고 끝나도 "만점"이라 뺀다
			const perfect = logs.length > 0 && correct === logs.length;
			const generalChest = source !== 'time' && source !== 'tower' && logs.length >= CHEST_MIN_TOTAL && perfect;
			const towerChest = source === 'tower' && perfect && !!score && score % 3 === 0;
			if (generalChest || towerChest) {
				state.pendingChests.push(rollChest());
			}
			if (state.chestSeals > 0 && logs.length > 0) {
				state.chestSeals -= 1;
				state.pendingChests.push(rollChest());
			}

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
				earn(state, REWARD.daily);
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

		/** 보물상자 하나를 연다 — 맨 앞 상자의 코인이 붙고 목록에서 빠진다 */
		openChest(state) {
			ensureMissions(state);
			const coins = state.pendingChests.shift();
			if (coins) {
				state.chestCount += 1;
				earn(state, coins + shopUpgradeEffect('treasureLoupe', state.shopUpgrades.treasureLoupe));
				settleBadges(state);
			}
		},

		/**
		 * 오늘의 미션 보상 받기 — 홈에서 빛나는 보물상자를 눌렀을 때.
		 * 셋 다 채웠고 아직 안 받았을 때만 보너스 코인과 보물상자가 나온다 (하루 한 번).
		 */
		claimMissions(state) {
			ensureMissions(state);
			if (state.missions.claimed || !allMissionsDone(state.missions)) {
				return;
			}
			state.missions.claimed = true;
			state.missionDoneCount += 1;
			earn(state, REWARD.mission);
			state.pendingChests.push(rollChest());
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

		/** 스트릭 보호권 구매 — 코인이 모자라거나 이미 최대치면 아무 일도 없다 */
		buyShield(state) {
			ensureShape(state);
			if (state.shields >= SHIELD_MAX || state.coins < REWARD.shieldPrice) {
				return;
			}
			state.coins -= REWARD.shieldPrice;
			state.shields += 1;
		},

		/** 집중 부적 — 다음에 완료하는 문제가 있는 퀴즈의 문제 보상을 두 배로 만든다 */
		buyFocusCharm(state) {
			ensureShape(state);
			if (state.quizBoosts >= FOCUS_CHARM_MAX || state.coins < REWARD.focusCharmPrice) {
				return;
			}
			state.coins -= REWARD.focusCharmPrice;
			state.quizBoosts += 1;
		},

		/** 펫 간식 — 코인을 경험치로 바꾼다. earn 과 달리 코인은 늘지 않는다 */
		buyPetSnack(state) {
			ensureShape(state);
			if (state.coins < REWARD.snackPrice) {
				return;
			}
			state.coins -= REWARD.snackPrice;
			const before = petStatus(state.exp).level;
			state.exp += REWARD.snackExp;
			const after = petStatus(state.exp).level;
			if (after > before) {
				state.pendingLevelUp = after;
			}
			settleBadges(state);
		},

		/** 학습 두루마리 — 코인을 큰 묶음 펫 경험치로 바꾼다 */
		buyStudyScroll(state) {
			ensureShape(state);
			if (state.coins < REWARD.studyScrollPrice) {
				return;
			}
			state.coins -= REWARD.studyScrollPrice;
			const before = petStatus(state.exp).level;
			state.exp += REWARD.studyScrollExp;
			const after = petStatus(state.exp).level;
			if (after > before) {
				state.pendingLevelUp = after;
			}
			settleBadges(state);
		},

		/** 복습 정리 붓 — 최신순 오답 목록의 마지막(가장 오래된) 항목 하나를 지운다 */
		buyReviewBrush(state) {
			ensureShape(state);
			if (state.wrong.length === 0 || state.coins < REWARD.reviewBrushPrice) {
				return;
			}
			state.coins -= REWARD.reviewBrushPrice;
			state.wrong.pop();
		},

		/** 대나무 도시락 — 중간 크기의 펫 경험치를 즉시 준다 */
		buyBambooLunch(state) {
			ensureShape(state);
			if (state.coins < REWARD.bambooLunchPrice) return;
			state.coins -= REWARD.bambooLunchPrice;
			const before = petStatus(state.exp).level;
			state.exp += REWARD.bambooLunchExp;
			const after = petStatus(state.exp).level;
			if (after > before) state.pendingLevelUp = after;
			settleBadges(state);
		},

		/** 명필 벼루 — 가장 큰 묶음 펫 경험치를 즉시 준다 */
		buyMasterInkstone(state) {
			ensureShape(state);
			if (state.coins < REWARD.masterInkstonePrice) return;
			state.coins -= REWARD.masterInkstonePrice;
			const before = petStatus(state.exp).level;
			state.exp += REWARD.masterInkstoneExp;
			const after = petStatus(state.exp).level;
			if (after > before) state.pendingLevelUp = after;
			settleBadges(state);
		},

		/** 복습 빗자루 — 가장 오래된 오답을 최대 세 개 정리한다 */
		buyReviewBroom(state) {
			ensureShape(state);
			if (state.wrong.length === 0 || state.coins < REWARD.reviewBroomPrice) return;
			state.coins -= REWARD.reviewBroomPrice;
			state.wrong.splice(Math.max(0, state.wrong.length - REWARD.reviewBroomCount));
		},

		buyWrongGuard(state) {
			ensureShape(state);
			if (state.wrongGuards >= SHOP_BOOST_MAX || state.coins < REWARD.wrongGuardPrice) return;
			state.coins -= REWARD.wrongGuardPrice;
			state.wrongGuards += 1;
		},

		buyChestSeal(state) {
			ensureShape(state);
			if (state.chestSeals >= SHOP_BOOST_MAX || state.coins < REWARD.chestSealPrice) return;
			state.coins -= REWARD.chestSealPrice;
			state.chestSeals += 1;
		},

		buyLearnBookmark(state) {
			ensureShape(state);
			if (state.learnBoosts >= SHOP_BOOST_MAX || state.coins < REWARD.learnBookmarkPrice) return;
			state.coins -= REWARD.learnBookmarkPrice;
			state.learnBoosts += 1;
		},

		buyAttendanceIncense(state) {
			ensureShape(state);
			if (state.attendanceBoosts >= SHOP_BOOST_MAX || state.coins < REWARD.attendanceIncensePrice) return;
			state.coins -= REWARD.attendanceIncensePrice;
			state.attendanceBoosts += 1;
		},

		buyTreasureMap(state) {
			ensureShape(state);
			if (state.coins < REWARD.treasureMapPrice) return;
			state.coins -= REWARD.treasureMapPrice;
			state.pendingChests.push(rollChest(), rollChest());
		},

		buyGoldenKey(state) {
			ensureShape(state);
			if (state.coins < REWARD.goldenKeyPrice) return;
			state.coins -= REWARD.goldenKeyPrice;
			state.pendingChests.push(REWARD.goldenChestCoins);
		},

		buyMoonTea(state) {
			ensureShape(state);
			if (state.coins < REWARD.moonTeaPrice) return;
			state.coins -= REWARD.moonTeaPrice;
			const before = petStatus(state.exp).level;
			state.exp += REWARD.moonTeaExp;
			const after = petStatus(state.exp).level;
			if (after > before) state.pendingLevelUp = after;
			settleBadges(state);
		},

		buyMemoryOrb(state) {
			ensureShape(state);
			if (state.wrong.length === 0 || state.coins < REWARD.memoryOrbPrice) return;
			state.coins -= REWARD.memoryOrbPrice;
			state.wrong.splice(Math.max(0, state.wrong.length - REWARD.memoryOrbCount));
		},

		buyScholarElixir(state) {
			ensureShape(state);
			if (state.coins < REWARD.scholarElixirPrice) return;
			state.coins -= REWARD.scholarElixirPrice;
			const before = petStatus(state.exp).level;
			state.exp += REWARD.scholarElixirExp;
			const after = petStatus(state.exp).level;
			if (after > before) state.pendingLevelUp = after;
			settleBadges(state);
		},

		buyTreasureCompass(state) {
			ensureShape(state);
			if (state.coins < REWARD.treasureCompassPrice) return;
			state.coins -= REWARD.treasureCompassPrice;
			for (let index = 0; index < REWARD.treasureCompassCount; index += 1) {
				state.pendingChests.push(rollChest());
			}
		},

		buyGuardianCrate(state) {
			ensureShape(state);
			if (state.coins < REWARD.guardianCratePrice || !attendancePetStatus(state.petFedCount).next) return;
			state.coins -= REWARD.guardianCratePrice;
			state.petFeeds += REWARD.guardianCrateFeeds;
		},

		buyStudyToolkit(state) {
			ensureShape(state);
			const hasFullItem = state.quizBoosts >= FOCUS_CHARM_MAX || state.wrongGuards >= SHOP_BOOST_MAX || state.learnBoosts >= SHOP_BOOST_MAX;
			if (state.coins < REWARD.studyToolkitPrice || hasFullItem) return;
			state.coins -= REWARD.studyToolkitPrice;
			state.quizBoosts = Math.min(FOCUS_CHARM_MAX, state.quizBoosts + 1);
			state.wrongGuards = Math.min(SHOP_BOOST_MAX, state.wrongGuards + 1);
			state.learnBoosts = Math.min(SHOP_BOOST_MAX, state.learnBoosts + 1);
		},

		buyAttendanceKit(state) {
			ensureShape(state);
			const hasFullItem = state.shields >= SHIELD_MAX || state.attendanceBoosts >= SHOP_BOOST_MAX;
			if (state.coins < REWARD.attendanceKitPrice || hasFullItem) return;
			state.coins -= REWARD.attendanceKitPrice;
			state.shields = Math.min(SHIELD_MAX, state.shields + 1);
			state.attendanceBoosts = Math.min(SHOP_BOOST_MAX, state.attendanceBoosts + 1);
		},

		buyReviewBrazier(state) {
			ensureShape(state);
			if (state.coins < REWARD.reviewBrazierPrice || state.wrong.length === 0) return;
			state.coins -= REWARD.reviewBrazierPrice;
			state.wrong = [];
		},

		buyFiveColorChest(state) {
			ensureShape(state);
			if (state.coins < REWARD.fiveColorChestPrice) return;
			state.coins -= REWARD.fiveColorChestPrice;
			for (let index = 0; index < REWARD.fiveColorChestRandomCount; index += 1) {
				state.pendingChests.push(rollChest());
			}
			state.pendingChests.push(REWARD.goldenChestCoins);
		},

		buyShopUpgrade(state, action: PayloadAction<ShopUpgradeKey>) {
			ensureShape(state);
			const key = action.payload;
			const level = state.shopUpgrades[key];
			const upgrade = SHOP_UPGRADES[key];
			const price = shopUpgradePrice(key, level);
			const guardianDone = key === 'guardianBowl' && !attendancePetStatus(state.petFedCount).next;
			if (level >= upgrade.maxLevel || guardianDone || state.coins < price) return;
			state.coins -= price;
			state.shopUpgrades[key] += 1;
		},

		/**
		 * 광고를 끝까지 본 보상 — 코인을 바로 준다.
		 * 하루 횟수는 여기서 센다(화면이 세면 앱을 껐다 켜는 것으로 초기화된다).
		 * 보상형 광고가 실제로 완주됐을 때만 부른다.
		 */
		claimAdCoins(state) {
			ensureShape(state);
			const today = toDateKey();
			if (adCoinsLeft(state.adCoinDate, state.adCoinCount, today) <= 0) {
				return;
			}
			// 날짜가 바뀌었으면 오늘치로 갈아 끼우고 첫 번째를 센다
			state.adCoinCount = state.adCoinDate === today ? state.adCoinCount + 1 : 1;
			state.adCoinDate = today;
			earn(state, REWARD.adCoins);
			settleBadges(state);
		},

		/** 행운의 상자 열쇠 — 상자 하나를 대기열에 넣는다. 여는 연출·코인 지급은 ChestModal 이 맡는다 */
		buyChestKey(state) {
			ensureShape(state);
			if (state.coins < REWARD.chestKeyPrice) {
				return;
			}
			state.coins -= REWARD.chestKeyPrice;
			state.pendingChests.push(rollChest());
		},

		/**
		 * 코인이 모자란 물건을 찜해 둔다 — 코인이 값에 닿으면 LifeWatcher 가 알리고 비운다.
		 * 이미 살 수 있는 물건은 적어 둘 이유가 없다(바로 사면 된다).
		 */
		setWish(state, action: PayloadAction<{ key: string; label: string; price: number }>) {
			ensureShape(state);
			if (state.coins >= action.payload.price) {
				return;
			}
			state.wish = action.payload;
		},

		/** 찜을 비운다 — 알림을 보여 준 뒤, 또는 사용자가 직접 지울 때 */
		clearWish(state) {
			ensureShape(state);
			state.wish = null;
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
			// 어제만 빼먹었고 보호권이 있으면 어제를 막아 스트릭을 잇는다
			if (state.shields > 0 && needsShield(state.attendance, state.shieldedDays, today)) {
				state.shields -= 1;
				state.shieldedDays.push(shiftDateKey(today, -1));
			}
			state.attendance.push(today);
			const streak = calcStreak(state.attendance, today, state.shieldedDays);
			const attendanceMultiplier = state.attendanceBoosts > 0 ? 2 : 1;
			const permanentBonus = shopUpgradeEffect('attendanceLantern', state.shopUpgrades.attendanceLantern);
			earn(state, (attendanceReward(streak) + permanentBonus) * attendanceMultiplier);
			// 수호신은 출석만으로 자라지 않는다 — 출석은 먹이를 주고, 먹이를 줘야 단계가 오른다
			// 하루 한 개가 기본, 7일마다 오는 특별 출석에는 더 얹어 준다
			state.petFeeds += attendanceFeedReward(streak);
			if (state.attendanceBoosts > 0) state.attendanceBoosts -= 1;
			settleBadges(state);
		},

		/**
		 * 출석 수호신 먹이 사기 — 출석을 기다리지 않고 성장을 앞당긴다.
		 * 이미 마지막 단계면 팔지 않는다 (줘도 자라지 않아 코인만 나간다).
		 */
		buyPetFeed(state) {
			ensureShape(state);
			if (state.coins < REWARD.petFeedPrice || !attendancePetStatus(state.petFedCount).next) {
				return;
			}
			state.coins -= REWARD.petFeedPrice;
			state.petFeeds += 1;
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
			gainExp(state, shopUpgradeEffect('guardianBowl', state.shopUpgrades.guardianBowl));
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

		/**
		 * 화면 꾸미기 구매 — 사면 같은 갈래에 바로 적용된다.
		 * 갈래마다 한 개만 적용되므로 새로 사면 앞서 놓아 둔 것이 자동으로 내려간다.
		 */
		buyDecor(state, action: PayloadAction<string>) {
			// 꾸미기가 없던 버전에서 올라온 저장본에는 이 칸이 아예 없다
			if (!state.decors) {
				state.decors = [];
			}
			if (!state.decorEquipped) {
				state.decorEquipped = {};
			}
			const decor = selectDecor(action.payload);
			if (!decor || state.decors.includes(decor.id) || state.coins < decor.price) {
				return;
			}
			state.coins -= decor.price;
			state.decors.push(decor.id);
			state.decorEquipped[decor.kind] = decor.id;
		},

		/** 같은 걸 다시 누르면 내려놓는다 */
		toggleDecor(state, action: PayloadAction<string>) {
			if (!state.decorEquipped) {
				state.decorEquipped = {};
			}
			const decor = selectDecor(action.payload);
			if (!decor || !(state.decors ?? []).includes(decor.id)) {
				return;
			}
			if (state.decorEquipped[decor.kind] === decor.id) {
				delete state.decorEquipped[decor.kind];
			} else {
				state.decorEquipped[decor.kind] = decor.id;
			}
		},

		clearPendingBadges(state) {
			state.pendingBadges = [];
		},

		setReminder(state, action: PayloadAction<LifeState['reminder']>) {
			state.reminder = action.payload;
		},

		/** 학습·퀴즈 기록만 지운다 (코인·펫·뱃지는 남긴다) */
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

		/** [DEV] 코인을 더한다 — 누를 때마다 payload 만큼 쌓인다. 상점을 손으로 벌지 않고 바로 보기 위한 단축키 */
		devFillCoins(state, action: PayloadAction<number>) {
			ensureShape(state);
			state.coins += action.payload;
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
	openChest,
	claimMissions,
	clearLevelUp,
	clearPetGrowth,
	buyShield,
	buyFocusCharm,
	buyPetSnack,
	buyStudyScroll,
	buyReviewBrush,
	buyBambooLunch,
	buyMasterInkstone,
	buyReviewBroom,
	buyWrongGuard,
	buyChestSeal,
	buyLearnBookmark,
	buyAttendanceIncense,
	buyTreasureMap,
	buyGoldenKey,
	buyMoonTea,
	buyMemoryOrb,
	buyScholarElixir,
	buyTreasureCompass,
	buyGuardianCrate,
	buyStudyToolkit,
	buyAttendanceKit,
	buyReviewBrazier,
	buyFiveColorChest,
	buyShopUpgrade,
	buyChestKey,
	claimAdCoins,
	setStrokeAnim,
	checkIn,
	buyPetFeed,
	feedAttendancePet,
	recordTimeChallenge,
	recordTower,
	buyDecor,
	toggleDecor,
	setWish,
	clearWish,
	clearPendingBadges,
	toggleFavorite,
	setFavorite,
	syncDomain,
	setReminder,
	resetProgress,
	resetAll,
	restoreLife,
	devFillCoins,
	devCompleteQuiz,
} = LifeSlice.actions;

export default LifeSlice.reducer;
