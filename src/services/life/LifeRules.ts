/**
 * 생활 한자 앱의 순수 규칙 — 화면·저장소와 무관하게 값만 다룬다.
 * 러너 없이 `node --test` 로 검증하므로 런타임 import 는 상대 경로만 쓴다.
 */
import type { LifeType } from '../../types/data/LifeType';
import { ATTENDANCE_PET_STAGES, BADGES, CHEST_TABLE, EXP, MISSIONS, PET_STAGES, REWARD } from '../../const/data/life/ConstLifeRewards.ts';
import DateUtils from '../../utils/DateUtils.ts';

/** 오답 노트 졸업 — 마지막으로 틀린 뒤 이만큼 연속으로 맞히면 노트에서 빠진다 */
export const WRONG_NOTE_GRADUATE = 2;

/** 오늘의 퀴즈 단어 수 */
export const DAILY_COUNT = 5;

/**
 * 일반 퀴즈 한 판의 기본 문항 수 — 주소로 들어올 때 QuizEntry 가 이만큼 뽑는다.
 * 등급 화면의 "퀴즈 몇 판" 환산도 같은 값을 봐야 실제로 푸는 판수와 맞는다.
 */
export const QUIZ_COUNT = 10;

/** YYYY-MM-DD — 기기 타임존 기준 (DateUtils 가 Intl 로 타임존을 확정한다) */
export const toDateKey = (date: Date = DateUtils.now()): string => DateUtils.getLocalDateString(date);

export const shiftDateKey = (key: string, days: number): string => {
	const [y, m, d] = key.split('-').map(Number);
	const date = new Date(y, m - 1, d + days);
	return toDateKey(date);
};

/**
 * 연속 출석 일수 — 오늘 또는 어제부터 거슬러 올라가며 이어진 날을 센다.
 * 어제까지 이어졌고 오늘은 아직이면 스트릭은 살아 있는 것으로 본다.
 */
export const calcStreak = (attendance: string[], today: string, shielded: string[] = []): number => {
	// 보호권으로 막은 날은 출석한 것처럼 이어진다 (출석일 수에는 안 들어간다)
	const set = new Set([...attendance, ...shielded]);
	let cursor = set.has(today) ? today : shiftDateKey(today, -1);
	let streak = 0;
	while (set.has(cursor)) {
		streak += 1;
		cursor = shiftDateKey(cursor, -1);
	}
	return streak;
};

/**
 * 오늘 출석하면서 보호권을 써야 스트릭이 이어지는지.
 * 어제를 빼먹었고 그제까지는 이어져 있었을 때만 — 이틀 이상 빠지면 한 장으로는 못 막는다.
 */
export const needsShield = (attendance: string[], shielded: string[], today: string): boolean => {
	const set = new Set([...attendance, ...shielded]);
	return !set.has(shiftDateKey(today, -1)) && set.has(shiftDateKey(today, -2));
};

/** 토·일 — 퀴즈 코인이 두 배 */
export const isWeekend = (date: Date = DateUtils.now()): boolean => {
	const day = date.getDay();
	return day === 0 || day === 6;
};

/** 출석 보상 코인 — 기본 + 연속 일수 보너스 (상한) */
export const attendanceReward = (streak: number): number =>
	REWARD.attendance + Math.min(REWARD.streakBonusMax, Math.max(0, streak - 1) * REWARD.streakBonusPerDay);

/**
 * 출석으로 받는 펫 먹이 수 — 매일 한 개, 7일마다 특별 출석으로 더 준다.
 * 7일 +2 · 14일 +3 · 21일 +4 · 28일부터 +5 (그 뒤로는 더 늘지 않는다).
 */
export const ATTENDANCE_FEED_CYCLE = 7;

export const attendanceFeedReward = (streak: number): number => {
	if (streak <= 0 || streak % ATTENDANCE_FEED_CYCLE !== 0) {
		return 1;
	}
	return 1 + Math.min(5, streak / ATTENDANCE_FEED_CYCLE + 1);
};

/** 다음 특별 출석까지 남은 날 수 — 오늘까지의 연속 출석 기준 */
export const daysToFeedMilestone = (streak: number): number => ATTENDANCE_FEED_CYCLE - (Math.max(0, streak) % ATTENDANCE_FEED_CYCLE);

/** 퀴즈 한 판 보상 코인 */
export const quizReward = (correct: number, total: number): number =>
	correct * REWARD.correct + (total > 0 && correct === total ? REWARD.perfect : 0);

/**
 * 퀴즈 한 판의 보너스 — 정답 순서 그대로 훑는다.
 * - 번개: 3초 안에 맞힌 정답마다 +1
 * - 콤보: 연속 정답이 comboFrom 에 닿은 뒤로는 정답 코인이 두 배 (추가분만 여기서 센다)
 */
export const quizBonus = (logs: LifeType.AnswerLog[]): LifeType.QuizBonus => {
	let combo = 0;
	let maxCombo = 0;
	let fast = 0;
	let coins = 0;
	for (const log of logs) {
		if (!log.isCorrect) {
			combo = 0;
			continue;
		}
		combo += 1;
		maxCombo = Math.max(maxCombo, combo);
		if (log.fast) {
			fast += 1;
			coins += REWARD.fast;
		}
		if (combo >= REWARD.comboFrom) {
			coins += REWARD.correct;
		}
	}
	return { fast, maxCombo, coins };
};

/** 보물상자 한 개를 연다 — 비중대로 코인 액수를 뽑는다 */
export const rollChest = (random: () => number = Math.random): number => {
	const total = CHEST_TABLE.reduce((sum, item) => sum + item.weight, 0);
	let pick = random() * total;
	for (const item of CHEST_TABLE) {
		pick -= item.weight;
		if (pick < 0) {
			return item.coins;
		}
	}
	return CHEST_TABLE[CHEST_TABLE.length - 1].coins;
};

/** 보물상자가 나오는 만점 — 이보다 짧은 판은 만점이 너무 쉽다 */
export const CHEST_MIN_TOTAL = 5;

/** 새 날의 빈 미션 */
export const freshMissions = (date: string): LifeType.DailyMissions => ({
	date,
	progress: { quiz: 0, learn: 0, review: 0 },
	claimed: false,
});

/** 미션 하나가 끝났는지 */
export const isMissionDone = (missions: LifeType.DailyMissions, key: LifeType.MissionKey): boolean => {
	const mission = MISSIONS.find((item) => item.key === key);
	return !!mission && (missions.progress[key] ?? 0) >= mission.goal;
};

/** 셋 다 끝났는지 */
export const allMissionsDone = (missions: LifeType.DailyMissions): boolean => MISSIONS.every((item) => isMissionDone(missions, item.key));

/**
 * 카테고리 별점 0~3 — 스테이지 클리어 감각.
 * ★ 단어 전부 학습 · ★ 그 분야 퀴즈 80% 이상 · ★ 그 분야 퀴즈 만점 (5문제 이상 판만)
 */
export const categoryStars = (
	category: LifeType.CategoryKey,
	// 학습 도메인이 바뀌어도 쓰이도록 id 만 요구한다 (한자 단어든 세계 상식 항목이든 상관없다)
	words: { id: string }[],
	learned: Set<string>,
	records: LifeType.QuizRecord[],
): number => {
	const mine = records.filter((item) => item.category === category && item.total >= CHEST_MIN_TOTAL);
	const studied = words.length > 0 && words.every((word) => learned.has(word.id));
	const good = mine.some((item) => item.correct / item.total >= 0.8);
	const perfect = mine.some((item) => item.correct === item.total);
	return Number(studied) + Number(good) + Number(perfect);
};

/** 오늘의 퀴즈 결과 공유 글 — 워들처럼 이모지 줄로 보인다 */
export const dailyShareText = (results: boolean[], dateKey: string, streak: number): string => {
	const correct = results.filter(Boolean).length;
	const grid = results.map((ok) => (ok ? '🟩' : '🟥')).join('');
	const streakLine = streak > 1 ? `\n🔥 ${streak}일 연속 출석` : '';
	return `세계 상식 · 오늘의 퀴즈 ${dateKey}\n${grid} ${correct}/${results.length}${streakLine}`;
};

export interface PetStatus {
	stage: LifeType.PetStage;
	/** 다음 단계 (마지막 단계면 null) */
	next: LifeType.PetStage | null;
	/** 이 단계 안에서의 진행률 0~1 */
	ratio: number;
	level: number;
}

export const petStatus = (exp: number): PetStatus => {
	let index = 0;
	for (let i = 0; i < PET_STAGES.length; i++) {
		if (exp >= PET_STAGES[i].minExp) {
			index = i;
		}
	}
	const stage = PET_STAGES[index];
	const next = PET_STAGES[index + 1] ?? null;
	const ratio = next ? Math.min(1, (exp - stage.minExp) / (next.minExp - stage.minExp)) : 1;
	return { stage, next, ratio, level: index + 1 };
};

export interface AttendancePetStatus {
	stage: LifeType.AttendancePetStage | null;
	next: LifeType.AttendancePetStage | null;
	ratio: number;
	/** 획득 전 -1, 획득 후 0부터 시작 */
	level: number;
}

/** 누적 출석일 → 출석 보상 청룡 단계 */
export const attendancePetStatus = (feeds: number): AttendancePetStatus => {
	let level = -1;
	for (let at = 0; at < ATTENDANCE_PET_STAGES.length; at++) {
		if (feeds >= ATTENDANCE_PET_STAGES[at].minFeeds) {
			level = at;
		}
	}
	if (level < 0) {
		return { stage: null, next: ATTENDANCE_PET_STAGES[0], ratio: 0, level };
	}
	const stage = ATTENDANCE_PET_STAGES[level];
	const next = ATTENDANCE_PET_STAGES[level + 1] ?? null;
	const ratio = next ? Math.min(1, Math.max(0, (feeds - stage.minFeeds) / (next.minFeeds - stage.minFeeds))) : 1;
	return { stage, next, ratio, level };
};

/** 문자열 → 32bit 해시 (날짜 시드) */
const hashSeed = (text: string): number => {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};

/** 시드 난수 — 같은 시드면 같은 순서 */
const seededRandom = (seed: number) => {
	let state = seed || 1;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

export const shuffle = <T>(list: T[], random: () => number = Math.random): T[] => {
	const copy = [...list];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};

/**
 * 난이도 가중 뽑기 — 배운 단어가 적을수록 쉬운 말이 나온다.
 *
 * 데이터가 초급 10% · 특급 37% 라 그냥 섞으면 첫날부터 특급이 쏟아진다.
 * 그래서 배운 수(learned)로 "지금 열어 줄 등급"을 정하고 그 안에서 뽑는다.
 * 등급을 다 열면(400개 이상) 가중치 없이 전체에서 고르게 나온다.
 *
 * @param learned 지금까지 배운 단어 수
 */
export const openLevel = (learned: number): LifeType.Level => {
	if (learned < 60) {
		return 1;
	}
	if (learned < 160) {
		return 2;
	}
	if (learned < 400) {
		return 3;
	}
	return 4;
};

/**
 * 열린 등급 안에서 고른다. 그 등급이 모자라면 위 등급으로 넓히고, 그래도 모자라면 아무거나 채운다.
 * (분류 하나만 골라 풀 때 초급이 서너 개뿐인 분류가 있어 넓히는 길이 꼭 있어야 한다)
 *
 * 이식 화면은 등급을 한글('초급')로 들고 있어 타입이 다르다 — 등급을 읽는 법을 받아 양쪽이 같이 쓴다.
 * @param levelOf 항목에서 1~4 등급을 꺼내는 함수
 */
export const pickByLevel = <T>(
	items: T[],
	learned: number,
	count: number,
	random: () => number = Math.random,
	levelOf: (item: T) => number = (item) => (item as { level: number }).level,
): T[] => {
	const open = openLevel(learned);
	const picked: T[] = [];
	const used = new Set<T>();
	const take = (candidates: T[]) => {
		for (const item of candidates) {
			if (picked.length >= count) {
				return;
			}
			if (!used.has(item)) {
				used.add(item);
				picked.push(item);
			}
		}
	};
	for (let level = open; level <= 4; level++) {
		take(shuffle(items.filter((item) => levelOf(item) === level), random));
	}
	// 열린 등급 아래쪽(더 쉬운 말)까지 훑어도 모자라면 그때 채운다
	take(shuffle(items, random));
	return picked;
};

/**
 * 오늘의 퀴즈 단어 — 같은 날엔 언제 열어도 같은 단어.
 * @param learned 배운 단어 수 — 넘기면 난이도를 맞춰 뽑는다
 */
export const pickDailyWordIds = (words: { id: string; level: number }[], dateKey: string, count = DAILY_COUNT, learned = 0): string[] =>
	pickByLevel(words, learned, count, seededRandom(hashSeed(dateKey))).map((item) => item.id);

/**
 * 채점 결과를 오답 노트에 반영한다.
 * - 틀리면 항목을 만들거나 횟수를 올리고 연속 정답을 0으로 되돌린다.
 * - 맞히면 연속 정답을 올리고, 목표치를 채우면 졸업시킨다.
 */
export const applyWrongLogs = (
	notes: LifeType.WrongNote[],
	logs: LifeType.AnswerLog[],
	nowIso: string,
): { notes: LifeType.WrongNote[]; graduated: string[] } => {
	const map = new Map(notes.map((item) => [item.wordId, { ...item }]));
	const graduated: string[] = [];
	for (const log of logs) {
		const current = map.get(log.wordId);
		if (!log.isCorrect) {
			map.set(log.wordId, { wordId: log.wordId, count: (current?.count ?? 0) + 1, lastAt: nowIso, passed: 0 });
			continue;
		}
		if (!current) {
			continue;
		}
		const passed = current.passed + 1;
		if (passed >= WRONG_NOTE_GRADUATE) {
			map.delete(log.wordId);
			graduated.push(log.wordId);
		} else {
			map.set(log.wordId, { ...current, passed });
		}
	}
	return { notes: [...map.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt)), graduated };
};

/** 뱃지 판정에 필요한 값만 모은 스냅샷 */
export interface BadgeSnapshot {
	learnedCount: number;
	/** 카테고리 하나를 전부 학습했는지 */
	categoryDone: boolean;
	quizCount: number;
	hasPerfect: boolean;
	dailyDoneCount: number;
	streak: number;
	graduatedCount: number;
	bestTime: number;
	bestTower: number;
	/** 누적 획득 코인 (= 경험치) */
	exp: number;
	bestCombo: number;
	fastCount: number;
	chestCount: number;
	missionDoneCount: number;
	/** 카테고리 별 합계 */
	stars: number;
	/** 전부 학습한 분야 수 */
	categoryDoneCount: number;
	/** 전체 분야 수 — '전 분야 정복' 목표가 데이터 개수에 따라 움직인다 */
	categoryTotal: number;
	/** 누적 출석일 (연속이 아니라 전체) */
	attendanceDays: number;
	/** 즐겨찾기한 단어 수 */
	favoriteCount: number;
	/** 가진 화면 꾸미기 수 */
	decorCount: number;
	/** 전체 화면 꾸미기 수 — '꾸미기 완성' 목표가 데이터 개수에 따라 움직인다 */
	decorTotal: number;
	/** 단어를 전부 학습한 난이도 수 */
	levelDoneCount: number;
	/** 전체 난이도 수 — '모든 난이도 정복' 목표가 데이터 개수에 따라 움직인다 */
	levelTotal: number;
	/** 지금까지 맞힌 문제 수 (누적) */
	totalCorrect: number;
	/** 청룡 펫에게 준 먹이 수 */
	petFedCount: number;
	/** 상점 영구 강화 레벨 합계 */
	upgradeLevel: number;
	/** 오답을 하나 이상 졸업시킨 뒤 노트를 완전히 비웠는지 */
	wrongCleared: boolean;
}

/** 뱃지 하나의 진행도 — 지금 얼마까지 왔고 목표가 얼마인지 */
export interface BadgeProgress {
	done: number;
	goal: number;
	/** 목표를 채웠는지 */
	cleared: boolean;
	/** 0~1 */
	ratio: number;
	/**
	 * 개수로 세는 조건인지.
	 * '한 분야 정복'·'만점' 처럼 예·아니오 하나로 끝나는 조건은 막대를 그려도 0% 아니면 100% 뿐이다.
	 */
	countable: boolean;
}

/**
 * 뱃지마다 "지금 얼마 / 목표 얼마".
 *
 * 예전에는 조건을 boolean 로만 적어 두어 "얼마나 남았나"를 화면에서 다시 계산해야 했다.
 * 판정과 진행도가 이 표 하나에서 나오므로 두 값이 어긋날 수 없다.
 */
const BADGE_GOALS: Record<string, (s: BadgeSnapshot) => { done: number; goal: number; countable?: boolean }> = {
	first_study: (s) => ({ done: s.learnedCount, goal: 1 }),
	learn_30: (s) => ({ done: s.learnedCount, goal: 30 }),
	learn_100: (s) => ({ done: s.learnedCount, goal: 100 }),
	category_master: (s) => ({ done: s.categoryDone ? 1 : 0, goal: 1, countable: false }),
	first_quiz: (s) => ({ done: s.quizCount, goal: 1 }),
	perfect_quiz: (s) => ({ done: s.hasPerfect ? 1 : 0, goal: 1, countable: false }),
	daily_7: (s) => ({ done: s.dailyDoneCount, goal: 7 }),
	streak_3: (s) => ({ done: s.streak, goal: 3 }),
	streak_7: (s) => ({ done: s.streak, goal: 7 }),
	streak_30: (s) => ({ done: s.streak, goal: 30 }),
	wrong_10: (s) => ({ done: s.graduatedCount, goal: 10 }),
	time_20: (s) => ({ done: s.bestTime, goal: 20 }),
	tower_10: (s) => ({ done: s.bestTower, goal: 10 }),
	rich_500: (s) => ({ done: s.exp, goal: 500 }),
	combo_10: (s) => ({ done: s.bestCombo, goal: 10 }),
	fast_30: (s) => ({ done: s.fastCount, goal: 30 }),
	chest_10: (s) => ({ done: s.chestCount, goal: 10 }),
	mission_7: (s) => ({ done: s.missionDoneCount, goal: 7 }),
	star_30: (s) => ({ done: s.stars, goal: 30 }),

	// ── 학습 ──
	learn_10: (s) => ({ done: s.learnedCount, goal: 10 }),
	learn_300: (s) => ({ done: s.learnedCount, goal: 300 }),
	category_3: (s) => ({ done: s.categoryDoneCount, goal: 3 }),
	category_all: (s) => ({ done: s.categoryDoneCount, goal: s.categoryTotal }),
	favorite_20: (s) => ({ done: s.favoriteCount, goal: 20 }),

	// ── 퀴즈 ──
	quiz_50: (s) => ({ done: s.quizCount, goal: 50 }),
	quiz_200: (s) => ({ done: s.quizCount, goal: 200 }),
	combo_20: (s) => ({ done: s.bestCombo, goal: 20 }),
	daily_30: (s) => ({ done: s.dailyDoneCount, goal: 30 }),

	// ── 출석 ──
	streak_14: (s) => ({ done: s.streak, goal: 14 }),
	attend_50: (s) => ({ done: s.attendanceDays, goal: 50 }),
	attend_100: (s) => ({ done: s.attendanceDays, goal: 100 }),

	// ── 오답 ──
	wrong_clear: (s) => ({ done: s.wrongCleared ? 1 : 0, goal: 1, countable: false }),
	wrong_50: (s) => ({ done: s.graduatedCount, goal: 50 }),

	// ── 펫·수집 ──
	pet_fed_10: (s) => ({ done: s.petFedCount, goal: 10 }),
	pet_fed_35: (s) => ({ done: s.petFedCount, goal: 35 }),
	decor_6: (s) => ({ done: s.decorCount, goal: 6 }),
	upgrade_10: (s) => ({ done: s.upgradeLevel, goal: 10 }),

	// ── 통계 화면에서 옮겨 온 뱃지 ──
	learn_50: (s) => ({ done: s.learnedCount, goal: 50 }),
	learn_200: (s) => ({ done: s.learnedCount, goal: 200 }),
	learn_500: (s) => ({ done: s.learnedCount, goal: 500 }),
	quiz_10: (s) => ({ done: s.quizCount, goal: 10 }),
	quiz_100: (s) => ({ done: s.quizCount, goal: 100 }),
	quiz_500: (s) => ({ done: s.quizCount, goal: 500 }),
	combo_5: (s) => ({ done: s.bestCombo, goal: 5 }),
	combo_15: (s) => ({ done: s.bestCombo, goal: 15 }),
	combo_30: (s) => ({ done: s.bestCombo, goal: 30 }),
	fast_100: (s) => ({ done: s.fastCount, goal: 100 }),
	exp_5000: (s) => ({ done: s.exp, goal: 5000 }),
	exp_20000: (s) => ({ done: s.exp, goal: 20000 }),
	daily_100: (s) => ({ done: s.dailyDoneCount, goal: 100 }),
	attend_200: (s) => ({ done: s.attendanceDays, goal: 200 }),
	time_40: (s) => ({ done: s.bestTime, goal: 40 }),
	tower_5: (s) => ({ done: s.bestTower, goal: 5 }),
	tower_20: (s) => ({ done: s.bestTower, goal: 20 }),
	chest_50: (s) => ({ done: s.chestCount, goal: 50 }),
	star_60: (s) => ({ done: s.stars, goal: 60 }),
	decor_all: (s) => ({ done: s.decorCount, goal: s.decorTotal }),
	level_1: (s) => ({ done: s.levelDoneCount, goal: 1 }),
	level_all: (s) => ({ done: s.levelDoneCount, goal: s.levelTotal }),
	correct_100: (s) => ({ done: s.totalCorrect, goal: 100 }),
	correct_500: (s) => ({ done: s.totalCorrect, goal: 500 }),
	correct_2000: (s) => ({ done: s.totalCorrect, goal: 2000 }),
};

/** 뱃지 하나의 진행도 — 표에 없는 뱃지는 0/0 으로 돌려준다 (화면은 그때 막대를 감춘다) */
export const badgeProgress = (badgeId: string, snapshot: BadgeSnapshot): BadgeProgress => {
	const slot = BADGE_GOALS[badgeId]?.(snapshot);
	if (!slot) {
		return { done: 0, goal: 0, cleared: false, ratio: 0, countable: false };
	}
	const done = Math.max(0, Math.min(slot.done, slot.goal));
	return {
		done,
		goal: slot.goal,
		cleared: slot.done >= slot.goal,
		ratio: slot.goal > 0 ? done / slot.goal : 0,
		countable: slot.countable ?? true,
	};
};

/** 아직 못 받은 뱃지 중 조건을 채운 것 */
export const checkNewBadges = (snapshot: BadgeSnapshot, earned: string[]): string[] => {
	const have = new Set(earned);
	return BADGES.filter((badge) => !have.has(badge.id) && badgeProgress(badge.id, snapshot).cleared).map((badge) => badge.id);
};

/**
 * 광고 보상 — 오늘 코인을 더 받을 수 있는 횟수.
 * 날짜가 바뀌면 저장된 횟수와 상관없이 하루치가 통째로 다시 열린다.
 * 리듀서(지급)와 상점 화면(버튼 상태)이 같은 함수를 쓴다 — 따로 적어 두면 "받기" 가 눌리는데 코인이 안 붙는다.
 */
export const adCoinsLeft = (date: string | undefined, count: number | undefined, today: string = toDateKey()): number =>
	date === today ? Math.max(0, REWARD.adCoinDailyMax - (count ?? 0)) : REWARD.adCoinDailyMax;

/** 타워 — 층이 오를수록 한 문제에 주는 시간이 준다 */
export const towerTimeLimit = (floor: number): number => Math.max(5, 15 - Math.floor((floor - 1) / 2));

/** 타워 — 한 층의 문제 수 */
export const TOWER_FLOOR_SIZE = 3;

/** 타워 — 목숨 */
export const TOWER_LIVES = 3;

/** 타임 챌린지 제한 시간(초) */
export const TIME_CHALLENGE_SEC = 180;

/**
 * 부수 이름을 훈과 음으로 쪼갠다 — ('말두', ['두']) → { hun: '말', eum: '두' }.
 * -------------------------------------------------
 * 이름이 부수 글자의 독음으로 끝날 때만 쪼갠다. '초두머리'·'책받침'처럼
 * 훈음이 아닌 별칭은 그대로 둔다 (억지로 끊으면 '초두머 리' 가 된다).
 */
export const splitRadicalName = (name?: string, readings: string[] = []): { hun: string; eum: string } => {
	if (!name) {
		return { hun: '', eum: '' };
	}
	const eum = readings.find((reading) => !!reading && name.length > reading.length && name.endsWith(reading));
	return eum ? { hun: name.slice(0, name.length - eum.length), eum } : { hun: name, eum: '' };
};

/**
 * 남은 경험치를 "얼마나 더 해야 하나"로 환산한다.
 * -------------------------------------------------
 * 숫자만 보면 막막하다. 실제로 하는 행동 단위로 바꿔 준다.
 * - 퀴즈 판수 : 일반 퀴즈 한 판(10문제)을 다 맞혔을 때 들어오는 경험치로 나눈다
 * - 정답 개수 : 판수만 보면 "한 판에 몇 문제인지" 가 빠져 계산이 안 맞아 보인다. 문제 단위도 같이 준다
 * - 단어 개수 : 새 단어 하나를 학습 완료했을 때 들어오는 경험치로 나눈다
 * 보너스(번개·콤보·주말 2배)는 안 세므로 "적어도 이만큼" 이라는 뜻이고, 실제로는 더 빨리 찬다.
 */
export const expToActions = (remainExp: number): { quizzes: number; corrects: number; words: number } => {
	const remain = Math.max(0, remainExp);
	// 경험치는 코인과 별개다 — 일반 퀴즈 한 판(10문제)을 다 맞혔을 때 들어오는 EXP 로 나눈다.
	// 오늘의 퀴즈(5문제)로 나누면 실제로 푸는 판수의 두 배가 나와 "계산이 안 맞는다".
	const perQuiz = QUIZ_COUNT * EXP.correct;
	return {
		quizzes: Math.ceil(remain / perQuiz),
		corrects: Math.ceil(remain / EXP.correct),
		words: Math.ceil(remain / EXP.learnWord),
	};
};
