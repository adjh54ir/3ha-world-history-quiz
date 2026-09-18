import type { LifeType } from '@/src/types/data/LifeType';

/**
 * 펫 성장 단계 — 누적 경험치로 정해진다 (경험치는 쓰지 않으므로 줄지 않는다).
 * -------------------------------------------------
 * 경험치는 퀴즈 정답 10 EXP · 항목 학습 5 EXP 로만 크게 쌓인다(EXP 표 참고).
 * 구간을 1,000 → 2,000 → 5,000 → 10,000 → 20,000 으로 두어
 * 첫 단계는 퀴즈 100문제쯤에서 오르고, 마지막 단계는 오래 붙잡아 둔다.
 *
 * 항목을 전부 학습해도 3,415 EXP 라 학습만으로는 마지막 단계에 닿지 못한다 — 그건 의도다.
 * 퀴즈 정답은 반복해서 쌓이므로 마지막 단계는 정답 2,000개쯤에서 열린다.
 * (구간이 좁아지지 않는지·상한이 닿을 만한지는 LifeRules.test.ts 에서 지킨다)
 */
export const PET_STAGES: LifeType.PetStage[] = [
	{ minExp: 0, key: 'sprout', emoji: '🦁' },
	{ minExp: 1000, key: 'apprentice', emoji: '🦁' },
	{ minExp: 2000, key: 'seeker', emoji: '🦁' },
	{ minExp: 5000, key: 'traveler', emoji: '🦁' },
	{ minExp: 10000, key: 'explorer', emoji: '🦁' },
	{ minExp: 20000, key: 'golden', emoji: '👑' },
];

/**
 * 경험치 — 학습과 활동 보상을 한 곳에서 정한다.
 */
export const EXP = {
	/** 퀴즈 정답 하나 */
	correct: 10,
	/** 항목 하나 학습 완료 */
	learnWord: 5,
	attendance: 10,
	streakBonusPerDay: 2,
	streakBonusMax: 30,
	daily: 10,
	mission: 10,
} as const;

/** 출석 펫 — 출석으로 받은 먹이를 준 수만큼 자란다 */
export const ATTENDANCE_PET_STAGES: LifeType.AttendancePetStage[] = [
	{ minFeeds: 1, key: 'eggAsleep' },
	{ minFeeds: 7, key: 'eggWaking' },
	{ minFeeds: 14, key: 'owlet' },
	{ minFeeds: 21, key: 'mapwing' },
	{ minFeeds: 28, key: 'guardian' },
	{ minFeeds: 35, key: 'golden' },
];


/**
 * 뱃지 희귀도 — 색·별 개수·연출 세기를 한 곳에서 정한다.
 * 등급이 오를수록 차분한 초록에서 강렬한 붉은색으로 올라간다 (게임 아이템 등급 램프).
 *
 * 값은 이식 화면의 등급 표(`src/four/const/ConstBadges.ts` 의 BADGE_RARITY_META)와 **같다**.
 * 뱃지 팝업이 두 벌(학습 뱃지 · 퀴즈 뱃지)이라, 표가 어긋나면 같은 '전설' 이 화면마다 다른 색으로 나온다.
 * 팔레트와 무관한 고정 색이다 — 뱃지는 라이트·다크에서 같은 등급 색으로 보여야 한다.
 */
export const BADGE_RARITY: Record<LifeType.BadgeRarity, { color: string; soft: string; gradient: [string, string]; stars: number }> = {
	common: { color: '#10B981', soft: '#D1FAE5', gradient: ['#34D399', '#059669'], stars: 1 },
	rare: { color: '#3B82F6', soft: '#DBEAFE', gradient: ['#60A5FA', '#2563EB'], stars: 2 },
	epic: { color: '#F59E0B', soft: '#FEF3C7', gradient: ['#FBBF24', '#D97706'], stars: 3 },
	legendary: { color: '#EF4444', soft: '#FEE2E2', gradient: ['#FB7185', '#E11D48'], stars: 4 },
};

/** 희귀도 표를 안전하게 꺼낸다 — 목록에 없는 값이면 일반으로 본다 */
export const badgeRarity = (rarity?: LifeType.BadgeRarity) => BADGE_RARITY[rarity ?? 'common'] ?? BADGE_RARITY.common;

/**
 * 뱃지 목록 — 이름·설명·조건은 번역 파일(badge.<id>.label / .description / .requirement)에 있다.
 * 여기에는 그림과 등급만 둔다. 모듈 상수는 앱이 읽히는 순간 한 번 만들어져, 언어를 바꿔도
 * 다시 만들어지지 않기 때문이다 (그 자리만 옛 언어로 남는다).
 */
export const BADGES: LifeType.Badge[] = [
	{
		id: 'first_study',
		rarity: 'common',
		icon: 'foot-print',
	},
	{
		id: 'learn_30',
		rarity: 'common',
		icon: 'book-open-variant',
	},
	{
		id: 'learn_100',
		rarity: 'rare',
		icon: 'school',
	},
	{
		id: 'category_master',
		rarity: 'rare',
		icon: 'flag-checkered',
	},
	{
		id: 'first_quiz',
		rarity: 'common',
		icon: 'gamepad-variant',
	},
	{
		id: 'perfect_quiz',
		rarity: 'rare',
		icon: 'star-circle',
	},
	{
		id: 'daily_7',
		rarity: 'rare',
		icon: 'calendar-check',
	},
	{
		id: 'streak_3',
		rarity: 'common',
		icon: 'fire',
	},
	{
		id: 'streak_7',
		rarity: 'rare',
		icon: 'fire',
	},
	{
		id: 'streak_30',
		rarity: 'legendary',
		icon: 'trophy',
	},
	{
		id: 'wrong_10',
		rarity: 'rare',
		icon: 'notebook-check',
	},
	{
		id: 'time_20',
		rarity: 'rare',
		icon: 'lightning-bolt',
	},
	{
		id: 'tower_10',
		rarity: 'epic',
		icon: 'office-building',
	},
	{
		id: 'combo_10',
		rarity: 'epic',
		icon: 'fire-circle',
	},
	{
		id: 'fast_30',
		rarity: 'epic',
		icon: 'flash',
	},
	{
		id: 'mission_7',
		rarity: 'epic',
		icon: 'clipboard-check',
	},
	{
		id: 'star_30',
		rarity: 'legendary',
		icon: 'star-shooting',
	},

	// ── 학습 ──────────────────────────────────────────────────
	{ id: 'learn_10', rarity: 'common', icon: 'numeric-10-box-multiple' },
	{ id: 'learn_300', rarity: 'legendary', icon: 'book-multiple' },
	{ id: 'category_3', rarity: 'epic', icon: 'flag-variant' },
	{ id: 'category_all', rarity: 'legendary', icon: 'map-marker-check' },
	{ id: 'favorite_20', rarity: 'common', icon: 'star-box-multiple' },

	// ── 퀴즈 ──────────────────────────────────────────────────
	{ id: 'quiz_50', rarity: 'rare', icon: 'gamepad-square' },
	{ id: 'quiz_200', rarity: 'epic', icon: 'sword-cross' },
	{ id: 'combo_20', rarity: 'legendary', icon: 'fire-circle' },
	{ id: 'daily_30', rarity: 'epic', icon: 'calendar-month' },

	// ── 출석 ──────────────────────────────────────────────────
	{ id: 'streak_14', rarity: 'epic', icon: 'fire' },
	{ id: 'attend_50', rarity: 'rare', icon: 'calendar-heart' },
	{ id: 'attend_100', rarity: 'epic', icon: 'calendar-star' },

	// ── 오답 ──────────────────────────────────────────────────
	{ id: 'wrong_clear', rarity: 'rare', icon: 'broom' },
	{ id: 'wrong_50', rarity: 'epic', icon: 'notebook-check-outline' },

	// ── 펫·수집 ───────────────────────────────────────────────
	{ id: 'pet_fed_10', rarity: 'common', icon: 'food-drumstick' },
	{ id: 'pet_fed_35', rarity: 'legendary', icon: 'shield-crown' },

	// ── 통계 화면에서 옮겨 온 뱃지 ────────────────────────────
	// 통계 탭이 따로 들고 있던 뱃지 표(콤보 · 누적 점수 · 학습/퀴즈 구간)를 여기로 합쳤다.
	// 두 벌을 따로 두니 같은 화면에서 "딴 뱃지 수" 가 서로 달랐다.
	{ id: 'learn_50', rarity: 'common', icon: 'book-open-page-variant' },
	{ id: 'learn_200', rarity: 'epic', icon: 'library' },
	{ id: 'learn_500', rarity: 'legendary', icon: 'bookshelf' },
	{ id: 'quiz_10', rarity: 'common', icon: 'numeric-10-box' },
	{ id: 'quiz_100', rarity: 'rare', icon: 'gamepad-variant-outline' },
	{ id: 'quiz_500', rarity: 'legendary', icon: 'crown-outline' },
	{ id: 'combo_5', rarity: 'common', icon: 'fire' },
	{ id: 'combo_15', rarity: 'epic', icon: 'fire-circle' },
	{ id: 'combo_30', rarity: 'legendary', icon: 'lightning-bolt-circle' },
	{ id: 'fast_100', rarity: 'legendary', icon: 'flash-outline' },
	{ id: 'exp_5000', rarity: 'rare', icon: 'chart-line' },
	{ id: 'exp_20000', rarity: 'legendary', icon: 'chart-timeline-variant-shimmer' },
	{ id: 'daily_100', rarity: 'legendary', icon: 'calendar-multiple-check' },
	{ id: 'attend_200', rarity: 'legendary', icon: 'calendar-account' },
	{ id: 'time_40', rarity: 'epic', icon: 'timer-sand-complete' },
	{ id: 'tower_5', rarity: 'rare', icon: 'stairs-up' },
	{ id: 'tower_20', rarity: 'legendary', icon: 'castle' },
	{ id: 'star_60', rarity: 'legendary', icon: 'star-four-points' },
	{ id: 'level_1', rarity: 'rare', icon: 'signal-cellular-1' },
	{ id: 'level_all', rarity: 'legendary', icon: 'signal-cellular-3' },
	{ id: 'correct_100', rarity: 'common', icon: 'check-all' },
	{ id: 'correct_500', rarity: 'epic', icon: 'check-decagram-outline' },
	{ id: 'correct_2000', rarity: 'legendary', icon: 'medal-outline' },
];

/** 오늘의 미션 — 셋 다 채우면 경험치 보상 */
export const MISSIONS: LifeType.Mission[] = [
	{ key: 'quiz', goal: 1, icon: 'head-question' },
	{ key: 'learn', goal: 5, icon: 'cards' },
	{ key: 'review', goal: 2, icon: 'notebook-edit' },
];
