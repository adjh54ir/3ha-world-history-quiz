import type { LifeType } from '@/src/types/data/LifeType';

/**
 * 펫 성장 단계 — 누적 경험치로 정해진다 (경험치는 쓰지 않으므로 줄지 않는다).
 * -------------------------------------------------
 * 경험치는 퀴즈 정답 10 EXP · 단어 학습 5 EXP 로만 크게 쌓인다(EXP 표 참고).
 * 구간을 1,000 → 2,000 → 5,000 → 10,000 → 20,000 으로 두어
 * 첫 단계는 퀴즈 100문제쯤에서 오르고, 마지막 단계는 오래 붙잡아 둔다.
 * (구간이 좁아지지 않는지·상한이 문제 수에 맞는지는 LifeRules.test.ts 에서 지킨다)
 */
export const PET_STAGES: LifeType.PetStage[] = [
	{ minExp: 0, label: '한자 새싹', emoji: '🐼' },
	{ minExp: 1000, label: '붓글씨 수련생', emoji: '🐼' },
	{ minExp: 2000, label: '한자 탐구가', emoji: '🐼' },
	{ minExp: 5000, label: '필법 고수', emoji: '🐼' },
	{ minExp: 10000, label: '한자 대사부', emoji: '🐼' },
	{ minExp: 20000, label: '황금 한자 신선', emoji: '👑' },
];

/**
 * 경험치 — 코인과 따로 센다.
 * 코인은 상점에서 쓰는 돈이라 값이 작지만, 등급은 "얼마나 풀었나"로만 올라야 해서 더 크게 준다.
 * 여기 없는 보상(출석·미션·상자 등)은 받은 코인만큼 그대로 경험치가 된다.
 */
export const EXP = {
	/** 퀴즈 정답 하나 */
	correct: 10,
	/** 단어 하나 학습 완료 */
	learnWord: 5,
} as const;

/** 출석 수호신 — 출석으로 받은 먹이를 준 수만큼 자란다 */
export const ATTENDANCE_PET_STAGES: LifeType.AttendancePetStage[] = [
	{ minFeeds: 1, label: '먹빛 신수알' },
	{ minFeeds: 7, label: '깨어나는 용알' },
	{ minFeeds: 14, label: '묵룡 새끼' },
	{ minFeeds: 21, label: '필법 청룡' },
	{ minFeeds: 28, label: '천자 청룡' },
	{ minFeeds: 35, label: '황금 천자룡' },
];


/**
 * 뱃지 희귀도 — 색·별 개수·연출 세기를 한 곳에서 정한다.
 * 등급이 오를수록 차분한 초록에서 강렬한 붉은색으로 올라간다 (게임 아이템 등급 램프).
 *
 * 값은 이식 화면의 등급 표(`src/four/const/ConstBadges.ts` 의 BADGE_RARITY_META)와 **같다**.
 * 뱃지 팝업이 두 벌(생활 한자 뱃지 · 퀴즈 뱃지)이라, 표가 어긋나면 같은 '전설' 이 화면마다 다른 색으로 나온다.
 * 팔레트와 무관한 고정 색이다 — 뱃지는 라이트·다크에서 같은 등급 색으로 보여야 한다.
 */
export const BADGE_RARITY: Record<LifeType.BadgeRarity, { label: string; color: string; soft: string; gradient: [string, string]; stars: number }> = {
	common: { label: '일반', color: '#10B981', soft: '#D1FAE5', gradient: ['#34D399', '#059669'], stars: 1 },
	rare: { label: '희귀', color: '#3B82F6', soft: '#DBEAFE', gradient: ['#60A5FA', '#2563EB'], stars: 2 },
	epic: { label: '영웅', color: '#F59E0B', soft: '#FEF3C7', gradient: ['#FBBF24', '#D97706'], stars: 3 },
	legendary: { label: '전설', color: '#EF4444', soft: '#FEE2E2', gradient: ['#FB7185', '#E11D48'], stars: 4 },
};

/** 희귀도 표를 안전하게 꺼낸다 — 목록에 없는 값이면 일반으로 본다 */
export const badgeRarity = (rarity?: LifeType.BadgeRarity) => BADGE_RARITY[rarity ?? 'common'] ?? BADGE_RARITY.common;

export const BADGES: LifeType.Badge[] = [
	{
		id: 'first_study',
		label: '첫 걸음',
		description: '단어를 처음 학습했어요',
		requirement: '단어 1개 학습 완료',
		rarity: 'common',
		icon: 'foot-print',
	},
	{
		id: 'learn_30',
		label: '단어 수집가',
		description: '단어 30개를 학습했어요',
		requirement: '단어 30개 학습 완료',
		rarity: 'common',
		icon: 'book-open-variant',
	},
	{
		id: 'learn_100',
		label: '한자 박사',
		description: '단어 100개를 학습했어요',
		requirement: '단어 100개 학습 완료',
		rarity: 'rare',
		icon: 'school',
	},
	{
		id: 'category_master',
		label: '한 분야 정복',
		description: '카테고리 하나를 모두 학습했어요',
		requirement: '한 분야의 단어를 모두 학습',
		rarity: 'rare',
		icon: 'flag-checkered',
	},
	{
		id: 'first_quiz',
		label: '도전자',
		description: '퀴즈를 처음 풀었어요',
		requirement: '퀴즈 1판 완료',
		rarity: 'common',
		icon: 'gamepad-variant',
	},
	{
		id: 'perfect_quiz',
		label: '완벽주의',
		description: '퀴즈에서 만점을 받았어요',
		requirement: '퀴즈 한 판 만점',
		rarity: 'rare',
		icon: 'star-circle',
	},
	{
		id: 'daily_7',
		label: '꾸준함',
		description: '오늘의 퀴즈를 7번 끝냈어요',
		requirement: '오늘의 퀴즈 7회 완료',
		rarity: 'rare',
		icon: 'calendar-check',
	},
	{
		id: 'streak_3',
		label: '3일 연속',
		description: '3일 연속 출석했어요',
		requirement: '3일 연속 출석',
		rarity: 'common',
		icon: 'fire',
	},
	{
		id: 'streak_7',
		label: '일주일 개근',
		description: '7일 연속 출석했어요',
		requirement: '7일 연속 출석',
		rarity: 'rare',
		icon: 'fire',
	},
	{
		id: 'streak_30',
		label: '한 달 개근',
		description: '30일 연속 출석했어요',
		requirement: '30일 연속 출석',
		rarity: 'legendary',
		icon: 'trophy',
	},
	{
		id: 'wrong_10',
		label: '복습의 힘',
		description: '오답 10개를 졸업시켰어요',
		requirement: '오답 10개 졸업',
		rarity: 'rare',
		icon: 'notebook-check',
	},
	{
		id: 'time_20',
		label: '번개손',
		description: '타임 챌린지에서 20점을 넘었어요',
		requirement: '타임 챌린지 20점 달성',
		rarity: 'rare',
		icon: 'lightning-bolt',
	},
	{
		id: 'tower_10',
		label: '탑 등반가',
		description: '타워 챌린지 10층에 올랐어요',
		requirement: '타워 챌린지 10층 도달',
		rarity: 'epic',
		icon: 'office-building',
	},
	{
		id: 'rich_500',
		label: '알부자',
		description: '코인을 500개 모았어요',
		requirement: '누적 코인 500개 모으기',
		rarity: 'epic',
		icon: 'treasure-chest',
	},
	{
		id: 'combo_10',
		label: '콤보 마스터',
		description: '한 판에서 10연속 정답을 냈어요',
		requirement: '한 판에서 10연속 정답',
		rarity: 'epic',
		icon: 'fire-circle',
	},
	{
		id: 'fast_30',
		label: '전광석화',
		description: '3초 안에 번개 정답을 30개 냈어요',
		requirement: '3초 안에 맞힌 정답 30개',
		rarity: 'epic',
		icon: 'flash',
	},
	{
		id: 'chest_10',
		label: '상자 사냥꾼',
		description: '보물상자를 10개 열었어요',
		requirement: '보물상자 10개 개봉',
		rarity: 'rare',
		icon: 'gift-open',
	},
	{
		id: 'mission_7',
		label: '미션 완수자',
		description: '오늘의 미션을 7번 모두 끝냈어요',
		requirement: '오늘의 미션 7일 모두 완료',
		rarity: 'epic',
		icon: 'clipboard-check',
	},
	{
		id: 'star_30',
		label: '별 수집가',
		description: '카테고리 별을 30개 모았어요',
		requirement: '분야 별 30개 모으기',
		rarity: 'legendary',
		icon: 'star-shooting',
	},

	// ── 학습 ──────────────────────────────────────────────────
	{ id: 'learn_10', label: '열 단어', description: '단어 10개를 학습했어요', requirement: '단어 10개 학습 완료', rarity: 'common', icon: 'numeric-10-box-multiple' },
	{ id: 'learn_300', label: '한자 달인', description: '단어 300개를 학습했어요', requirement: '단어 300개 학습 완료', rarity: 'legendary', icon: 'book-multiple' },
	{ id: 'category_3', label: '세 분야 정복', description: '분야 세 개를 모두 학습했어요', requirement: '분야 3개 전부 학습', rarity: 'epic', icon: 'flag-variant' },
	{ id: 'category_all', label: '전 분야 정복', description: '모든 분야의 단어를 학습했어요', requirement: '모든 분야 전부 학습', rarity: 'legendary', icon: 'map-marker-check' },
	{ id: 'favorite_20', label: '별표 수집가', description: '단어 20개에 별표를 달았어요', requirement: '단어 사전에서 즐겨찾기 20개', rarity: 'common', icon: 'star-box-multiple' },

	// ── 퀴즈 ──────────────────────────────────────────────────
	{ id: 'quiz_50', label: '퀴즈 단골', description: '퀴즈를 50판 풀었어요', requirement: '퀴즈 50판 완료', rarity: 'rare', icon: 'gamepad-square' },
	{ id: 'quiz_200', label: '백전노장', description: '퀴즈를 200판 풀었어요', requirement: '퀴즈 200판 완료', rarity: 'epic', icon: 'sword-cross' },
	{ id: 'combo_20', label: '콤보 대가', description: '한 판에서 20연속 정답을 냈어요', requirement: '한 판에서 20연속 정답', rarity: 'legendary', icon: 'fire-circle' },
	{ id: 'daily_30', label: '한 달의 하루', description: '오늘의 퀴즈를 30번 끝냈어요', requirement: '오늘의 퀴즈 30회 완료', rarity: 'epic', icon: 'calendar-month' },

	// ── 출석 ──────────────────────────────────────────────────
	{ id: 'streak_14', label: '2주 개근', description: '14일 연속 출석했어요', requirement: '14일 연속 출석', rarity: 'epic', icon: 'fire' },
	{ id: 'attend_50', label: '오십 번의 아침', description: '모두 50일 출석했어요', requirement: '누적 출석 50일', rarity: 'rare', icon: 'calendar-heart' },
	{ id: 'attend_100', label: '백 번의 아침', description: '모두 100일 출석했어요', requirement: '누적 출석 100일', rarity: 'epic', icon: 'calendar-star' },

	// ── 오답 ──────────────────────────────────────────────────
	{ id: 'wrong_clear', label: '깨끗한 오답 노트', description: '오답을 모두 졸업시켜 노트를 비웠어요', requirement: '오답 노트를 한 번 완전히 비우기', rarity: 'rare', icon: 'broom' },
	{ id: 'wrong_50', label: '오답 정복자', description: '오답 50개를 졸업시켰어요', requirement: '오답 50개 졸업', rarity: 'epic', icon: 'notebook-check-outline' },

	// ── 펫·수집 ───────────────────────────────────────────────
	{ id: 'pet_fed_10', label: '청룡 돌보기', description: '청룡 펫에게 먹이를 10개 줬어요', requirement: '펫 먹이 10개 주기', rarity: 'common', icon: 'food-drumstick' },
	{ id: 'pet_fed_35', label: '황금 천자룡', description: '청룡 펫을 마지막 단계까지 키웠어요', requirement: '펫 먹이 35개 주기', rarity: 'legendary', icon: 'shield-crown' },
	{ id: 'decor_6', label: '글방 주인', description: '화면 꾸미기 6종을 모았어요', requirement: '화면 꾸미기 6종 보유', rarity: 'rare', icon: 'bookshelf' },
	{ id: 'upgrade_10', label: '강화 애호가', description: '영구 강화를 모두 합쳐 10단계 올렸어요', requirement: '상점 영구 강화 합계 Lv.10', rarity: 'epic', icon: 'trending-up' },

	// ── 통계 화면에서 옮겨 온 뱃지 ────────────────────────────
	// 통계 탭이 따로 들고 있던 뱃지 표(콤보 · 누적 점수 · 학습/퀴즈 구간)를 여기로 합쳤다.
	// 두 벌을 따로 두니 같은 화면에서 "딴 뱃지 수" 가 서로 달랐다.
	{ id: 'learn_50', label: '오십 단어', description: '단어 50개를 학습했어요', requirement: '단어 50개 학습 완료', rarity: 'common', icon: 'book-open-page-variant' },
	{ id: 'learn_200', label: '이백 단어', description: '단어 200개를 학습했어요', requirement: '단어 200개 학습 완료', rarity: 'epic', icon: 'library' },
	{ id: 'learn_500', label: '오백 단어', description: '단어 500개를 학습했어요', requirement: '단어 500개 학습 완료', rarity: 'legendary', icon: 'bookshelf' },
	{ id: 'quiz_10', label: '열 판', description: '퀴즈를 10판 풀었어요', requirement: '퀴즈 10판 완료', rarity: 'common', icon: 'numeric-10-box' },
	{ id: 'quiz_100', label: '백 판의 승부', description: '퀴즈를 100판 풀었어요', requirement: '퀴즈 100판 완료', rarity: 'rare', icon: 'gamepad-variant-outline' },
	{ id: 'quiz_500', label: '오백 판의 전설', description: '퀴즈를 500판 풀었어요', requirement: '퀴즈 500판 완료', rarity: 'legendary', icon: 'crown-outline' },
	{ id: 'combo_5', label: '연속 5정답', description: '한 판에서 5연속 정답을 냈어요', requirement: '한 판에서 5연속 정답', rarity: 'common', icon: 'fire' },
	{ id: 'combo_15', label: '불붙은 집중', description: '한 판에서 15연속 정답을 냈어요', requirement: '한 판에서 15연속 정답', rarity: 'epic', icon: 'fire-circle' },
	{ id: 'combo_30', label: '무결점 30연타', description: '한 판에서 30연속 정답을 냈어요', requirement: '한 판에서 30연속 정답', rarity: 'legendary', icon: 'lightning-bolt-circle' },
	{ id: 'fast_100', label: '번개의 손', description: '3초 안에 번개 정답을 100개 냈어요', requirement: '3초 안에 맞힌 정답 100개', rarity: 'legendary', icon: 'flash-outline' },
	{ id: 'exp_5000', label: '경험의 무게', description: '경험치를 5,000 모았어요', requirement: '누적 5,000EXP 달성', rarity: 'rare', icon: 'chart-line' },
	{ id: 'exp_20000', label: '한자 신선의 길', description: '경험치를 20,000 모았어요', requirement: '누적 20,000EXP 달성', rarity: 'legendary', icon: 'chart-timeline-variant-shimmer' },
	{ id: 'daily_100', label: '백 일의 문제', description: '오늘의 퀴즈를 100번 끝냈어요', requirement: '오늘의 퀴즈 100회 완료', rarity: 'legendary', icon: 'calendar-multiple-check' },
	{ id: 'attend_200', label: '이백 번의 아침', description: '모두 200일 출석했어요', requirement: '누적 출석 200일', rarity: 'legendary', icon: 'calendar-account' },
	{ id: 'time_40', label: '시간의 지배자', description: '타임 챌린지에서 40점을 넘었어요', requirement: '타임 챌린지 40점 달성', rarity: 'epic', icon: 'timer-sand-complete' },
	{ id: 'tower_5', label: '첫 오름', description: '타워 챌린지 5층에 올랐어요', requirement: '타워 챌린지 5층 도달', rarity: 'rare', icon: 'stairs-up' },
	{ id: 'tower_20', label: '탑의 주인', description: '타워 챌린지 20층에 올랐어요', requirement: '타워 챌린지 20층 도달', rarity: 'legendary', icon: 'castle' },
	{ id: 'chest_50', label: '보물 수집광', description: '보물상자를 50개 열었어요', requirement: '보물상자 50개 개봉', rarity: 'epic', icon: 'treasure-chest' },
	{ id: 'star_60', label: '별의 정원', description: '카테고리 별을 60개 모았어요', requirement: '분야 별 60개 모으기', rarity: 'legendary', icon: 'star-four-points' },
	{ id: 'decor_all', label: '꾸미기 완성', description: '화면 꾸미기를 모두 모았어요', requirement: '화면 꾸미기 전부 보유', rarity: 'legendary', icon: 'palette-advanced' },
	{ id: 'level_1', label: '한 급수 정복', description: '한 난이도의 단어를 모두 학습했어요', requirement: '한 난이도의 단어 전부 학습', rarity: 'rare', icon: 'signal-cellular-1' },
	{ id: 'level_all', label: '전 급수 정복', description: '초급부터 특급까지 모두 학습했어요', requirement: '모든 난이도의 단어 전부 학습', rarity: 'legendary', icon: 'signal-cellular-3' },
	{ id: 'correct_100', label: '백 개의 정답', description: '문제를 모두 100개 맞혔어요', requirement: '누적 정답 100개', rarity: 'common', icon: 'check-all' },
	{ id: 'correct_500', label: '오백 개의 정답', description: '문제를 모두 500개 맞혔어요', requirement: '누적 정답 500개', rarity: 'epic', icon: 'check-decagram-outline' },
	{ id: 'correct_2000', label: '이천 개의 정답', description: '문제를 모두 2,000개 맞혔어요', requirement: '누적 정답 2,000개', rarity: 'legendary', icon: 'medal-outline' },
];

/** 보상 코인 — 한 곳에서만 정한다 */
export const REWARD = {
	/** 단어를 처음 학습 완료 */
	learnWord: 2,
	/** 퀴즈 정답 하나 */
	correct: 3,
	/** 퀴즈 만점 보너스 */
	perfect: 10,
	/** 출석 기본 */
	attendance: 10,
	/** 연속 출석 하루당 추가 (상한 있음) */
	streakBonusPerDay: 2,
	streakBonusMax: 30,
	/** 오늘의 퀴즈 완료 */
	daily: 10,
	/** 타워 한 층 클리어 */
	towerFloor: 5,
	/** 3초 안에 맞힌 정답 하나 (번개) */
	fast: 1,
	/** 이 연속 정답부터 정답 코인이 두 배 */
	comboFrom: 5,
	/** 오늘의 미션 셋 다 완료 */
	mission: 10,
	/** 스트릭 보호권 한 장 값 — 하루 결석을 막아 준다 */
	shieldPrice: 100,
	/** 집중 부적 한 장 값 — 다음 퀴즈의 문제 보상을 두 배로 만든다 */
	focusCharmPrice: 60,
	focusCharmMultiplier: 2,
	/** 펫 간식 한 개 값 — 코인을 경험치로 바꾼다 */
	snackPrice: 30,
	/** 펫 간식 하나가 주는 경험치 */
	snackExp: 50,
	/** 학습 두루마리 — 간식보다 큰 묶음 경험치 */
	studyScrollPrice: 90,
	studyScrollExp: 180,
	/** 복습 정리 붓 — 가장 오래된 오답 하나를 정리한다 */
	reviewBrushPrice: 40,
	/** 대나무 도시락·명필 벼루 — 단계별 펫 성장 아이템 */
	bambooLunchPrice: 50,
	bambooLunchExp: 100,
	masterInkstonePrice: 180,
	masterInkstoneExp: 400,
	/** 복습 빗자루 — 오래된 오답을 한 번에 세 개 정리한다 */
	reviewBroomPrice: 90,
	reviewBroomCount: 3,
	/** 다음 행동에 쓰이는 학습 부스터 */
	wrongGuardPrice: 70,
	chestSealPrice: 85,
	learnBookmarkPrice: 55,
	attendanceIncensePrice: 60,
	/** 보물 묶음 아이템 */
	treasureMapPrice: 45,
	goldenKeyPrice: 65,
	goldenChestCoins: 50,
	/** 상점 신규 즉시 적용 아이템 */
	moonTeaPrice: 40,
	moonTeaExp: 75,
	memoryOrbPrice: 120,
	memoryOrbCount: 5,
	scholarElixirPrice: 280,
	scholarElixirExp: 700,
	treasureCompassPrice: 70,
	treasureCompassCount: 3,
	/** 상점 카테고리 확장 묶음 */
	guardianCratePrice: 100,
	guardianCrateFeeds: 3,
	studyToolkitPrice: 150,
	attendanceKitPrice: 135,
	reviewBrazierPrice: 220,
	fiveColorChestPrice: 100,
	fiveColorChestRandomCount: 2,
	/**
	 * 출석 수호신 먹이 한 개 값.
	 * 출석으로 하루 한 개가 들어오므로 상점 먹이는 "기다리지 않고 앞당기는" 값이다 —
	 * 출석 보상(10~40 코인)보다 살짝 높게 둬서 매일 오는 쪽이 계속 이득이게 한다.
	 */
	petFeedPrice: 40,
	/** 행운의 상자 열쇠 한 개 값 — 상자 기대값(18 코인)보다 높게 둬서 코인 소모처가 되게 한다 */
	chestKeyPrice: 25,
	/** 주말(토·일) 퀴즈 보상 배수 */
	weekendMultiplier: 2,
	/** 광고를 끝까지 보면 받는 코인 — 하루 adCoinDailyMax 번까지 */
	adCoins: 40,
	adCoinDailyMax: 3,
} as const;

/** 반복 구매할수록 효과가 커지는 영구 강화 상품. */
export const SHOP_UPGRADES = {
	engravingInkstone: { maxLevel: 5, basePrice: 120, priceStep: 70, effectPerLevel: 1 },
	answerAbacus: { maxLevel: 5, basePrice: 150, priceStep: 80, effectPerLevel: 5 },
	attendanceLantern: { maxLevel: 5, basePrice: 130, priceStep: 70, effectPerLevel: 2 },
	treasureLoupe: { maxLevel: 5, basePrice: 180, priceStep: 90, effectPerLevel: 3 },
	guardianBowl: { maxLevel: 5, basePrice: 140, priceStep: 70, effectPerLevel: 10 },
} as const;

export type ShopUpgradeKey = keyof typeof SHOP_UPGRADES;

export const EMPTY_SHOP_UPGRADES: Record<ShopUpgradeKey, number> = {
	engravingInkstone: 0,
	answerAbacus: 0,
	attendanceLantern: 0,
	treasureLoupe: 0,
	guardianBowl: 0,
};

export const shopUpgradePrice = (key: ShopUpgradeKey, level: number) => {
	const upgrade = SHOP_UPGRADES[key];
	return upgrade.basePrice + upgrade.priceStep * Math.min(level, upgrade.maxLevel - 1);
};

export const shopUpgradeEffect = (key: ShopUpgradeKey, level: number) => SHOP_UPGRADES[key].effectPerLevel * level;

/** 스트릭 보호권 최대 보유 수 — 쌓아 두고 매일 빠지는 걸 막는다 */
export const SHIELD_MAX = 2;

/** 다음 퀴즈 보상 부적 최대 보유 수 */
export const FOCUS_CHARM_MAX = 2;

/** 다음 행동에 쓰이는 부스터는 과도하게 쌓이지 않게 같은 상한을 쓴다 */
export const SHOP_BOOST_MAX = 2;

/** 오늘의 미션 — 셋 다 채우면 보너스 + 보물상자 */
export const MISSIONS: LifeType.Mission[] = [
	{ key: 'quiz', label: '퀴즈 1판 풀기', goal: 1, icon: 'head-question' },
	{ key: 'learn', label: '단어 5개 학습', goal: 5, icon: 'cards' },
	{ key: 'review', label: '오답 2개 복습', goal: 2, icon: 'notebook-edit' },
];

/**
 * 보물상자 — 코인 액수와 뽑힐 비중. 확정 보상보다 "얼마 나올까"가 다시 열게 만든다.
 * ponytail: 코인만 준다. 할인권 같은 아이템은 소비처가 생기면 붙인다.
 */
export const CHEST_TABLE: { coins: number; weight: number }[] = [
	{ coins: 10, weight: 50 },
	{ coins: 20, weight: 30 },
	{ coins: 30, weight: 15 },
	{ coins: 50, weight: 5 },
];
