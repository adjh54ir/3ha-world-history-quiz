import { LIFE_CATEGORIES } from '@/src/const/data/life/ConstLifeCategories';
import type { MainDataType } from '@/src/four/types/MainDataType';

/**
 * 희귀도별 표시 메타 (라벨 / 색상 / 그라데이션 / 별 개수)
 * BadgeDetailScreen, 나의 활동 등에서 공통 사용합니다.
 */
export const BADGE_RARITY_META: Record<
	MainDataType.BadgeRarity,
	{ label: string; color: string; soft: string; gradient: [string, string]; stars: number }
> = {
	// 등급별 4색 구분(게임풍) — 등급이 오를수록 차분 → 강렬/선명해지는 그린→블루→앰버→레드 램프
	common: { label: '일반', color: '#10B981', soft: '#D1FAE5', gradient: ['#34D399', '#059669'], stars: 1 },
	rare: { label: '희귀', color: '#3B82F6', soft: '#DBEAFE', gradient: ['#60A5FA', '#2563EB'], stars: 2 },
	epic: { label: '영웅', color: '#F59E0B', soft: '#FEF3C7', gradient: ['#FBBF24', '#D97706'], stars: 3 },
	legendary: { label: '전설', color: '#EF4444', soft: '#FEE2E2', gradient: ['#FB7185', '#E11D48'], stars: 4 },
};

/*
=========================================
📚 학습 관련 뱃지
=========================================
- 첫 학습: 🎈 첫 한자어을 학습했습니다! 시작이 반입니다!
- 10개 학습: 📝 한자어 10개 돌파! 슬슬 감이 오죠?
- 50개 학습: 📖 한자어 50개 달성! 지식이 쌓이고 있습니다!
- 100개 학습: 🎓 한자어 100개 학습! 당신은 진정한 학자!
- 200개 학습: 🧠 무려 200개! 한자어 마스터의 길에 들어섰습니다!
- 학습 완료: 🌟 모든 한자어을 학습 완료! 완벽한 정복입니다!

=========================================
🧠 퀴즈 관련 뱃지
=========================================
- 첫 퀴즈 완료: 🚀 첫 문제 풀기 성공! 이제 진짜 시작입니다!
- 10개 퀴즈 완료: ✍️ 10문제 돌파! 꾸준함이 빛납니다!
- 50개 퀴즈 완료: 🏅 50문제 클리어! 퀴즈 고수의 기운이!
- 100개 퀴즈 완료: 🧭 100문제 완주! 대단한 집중력입니다!
- 150개 퀴즈 완료: 🎖️ 벌써 150개? 이건 거의 대륙 탐험이죠!
- 200개 퀴즈 완료: 🌍 200문제! 당신은 퀴즈의 전설!
- 퀴즈 완료: 🌈 모든 문제 완료! 세계 정복 완료입니다!

=========================================
🎯 레벨별 마스터 뱃지
(난이도별 완벽 정복)
=========================================
- 아주 쉬움 마스터: 🌱 기초 한자어은 다 외웠습니다! 깔끔한 출발!
- 쉬움 마스터: 🍃 쉬운 한자어도 완벽하게 마스터!
- 보통 마스터: 🌳 보통 난이도? 문제없죠!
- 어려움 마스터: 🧠 어려운 한자어까지 모두 정복했습니다!

=========================================
💬 카테고리별 마스터 뱃지
(한자어 주제 정복자)
=========================================
- 운/우연 마스터: 🍀 운과 우연에 관한 한자어을 전부 익혔습니다!
- 인간관계 마스터: 👫 관계의 지혜, 당신은 인간관계 달인!
- 세상 이치 마스터: 🌐 세상 돌아가는 이치, 한자어으로 다 알았죠!
- 근면/검소 마스터: 🧺 성실과 절약, 삶의 기본이죠!
- 노력/성공 마스터: 🏃‍♂️ 노력 끝에 성공한 자에게!
- 경계/조심 마스터: ⚠️ 조심 또 조심! 지혜롭게 살아갑니다!
- 욕심/탐욕 마스터: 🤑 욕심에 관한 교훈, 뼛속까지 새겼습니다!
- 배신/불신 마스터: 🤝 신뢰의 중요성, 확실히 배웠네요!

=========================================
🔥 콤보 달성 뱃지
(연속 정답의 쾌감!)
=========================================
- 콤보 3: 🔥 연속 3문제! 워밍업 완료!
- 콤보 5: 🔥🔥 집중력 5단계 돌입!
- 콤보 10: 🔥🔥🔥 집중력 끝판왕 등장!
- 콤보 15: 🔥🔥🔥🔥 불꽃처럼 타오르고 있습니다!
- 콤보 20: ⚡ 전설의 20콤보! 퀴즈 신이시군요!

=========================================
🏆 점수 달성 뱃지
(누적 점수로 보는 성장)
=========================================
- 600점: ✈️ 퀴즈 여행을 시작했습니다! 첫 발걸음 축하합니다!
- 1200점: 🏞️ 대륙을 넘나드는 정복자!
- 1800점: 🧳 국가 탐험가! 이제 세계가 무대입니다!
- 2460점: 👑 한자어 마스터! 전 세계 한자어을 정복했습니다!
*/
/**
 * 분야 마스터 뱃지 — 분야 목록에서 그대로 만든다.
 *
 * 예전에는 사자성어 시절 분야('감정/심리', '인간관계' …) 17개를 손으로 적어 두었는데,
 * 학습 단위가 생활 한자어로 바뀌며 분야가 26개로 달라져 조건에 맞는 단어가 하나도 없었다.
 * 그 17개는 전부 영영 획득할 수 없는 뱃지였다. 분야가 바뀌어도 어긋나지 않도록 목록에서 파생한다.
 */
export const CATEGORY_BADGES: MainDataType.UserBadge[] = LIFE_CATEGORIES.map((category) => ({
	id: `category_${category.key}`,
	name: `${category.label} 마스터`,
	description: `${category.label} 분야의 한자어를 모두 익혔습니다!`,
	iconType: 'materialCommunityIcons',
	icon: category.icon,
	type: 'quiz',
	condition: `${category.label} 분야 한자어 전체 정복`,
	rarity: 'rare',
}));

export const CONST_BADGES: MainDataType.UserBadge[] = [
	// 학습 뱃지
	{
		id: 'study_1',
		name: '시작이 반이다',
		description: '첫 번째 한자어을 학습했습니다! 시작이 반입니다!',
		iconType: 'materialIcons',
		icon: 'school',
		type: 'study',
		condition: '한자어 1개 학습',
		rarity: 'common',
	},
	{
		id: 'study_10',
		name: '10개 학습 완료',
		description: '한자어 10개 돌파! 슬슬 감이 오죠?',
		iconType: 'materialIcons',
		icon: 'travel-explore',
		type: 'study',
		condition: '한자어 10개 학습',
		rarity: 'common',
	},
	{
		id: 'study_50',
		name: '50개 학습 완료',
		description: '한자어 50개 달성! 지식이 쌓이고 있습니다!',
		iconType: 'materialIcons',
		icon: 'menu-book',
		type: 'study',
		condition: '한자어 50개 학습',
		rarity: 'rare',
	},
	{
		id: 'study_100',
		name: '100개 학습 완료',
		description: '한자어 100개 학습! 당신은 진정한 학자!',
		iconType: 'materialIcons',
		icon: 'public',
		type: 'study',
		condition: '한자어 100개 학습',
		rarity: 'rare',
	},
	{
		id: 'study_200',
		name: '200개 학습 완료',
		description: '무려 200개! 한자어 마스터의 길에 들어섰습니다!',
		iconType: 'materialIcons',
		icon: 'school',
		type: 'study',
		condition: '한자어 200개 학습',
		rarity: 'epic',
	},
	{
		id: 'study_300',
		name: '300개 학습 완료',
		description: '벌써 300개? 놀라운 집중력과 끈기입니다!',
		iconType: 'materialIcons',
		icon: 'lightbulb',
		type: 'study',
		condition: '한자어 300개 학습',
		rarity: 'epic',
	},
	{
		id: 'study_400',
		name: '400개 학습 완료',
		description: '400개 학습 돌파! 당신은 한자어 백과사전!',
		iconType: 'materialIcons',
		icon: 'emoji-objects',
		type: 'study',
		condition: '한자어 400개 학습',
		rarity: 'epic',
	},
	{
		id: 'study_500',
		name: '500개 학습 완료',
		description: '500개 완벽 정복! 한자어의 신이시군요!',
		iconType: 'materialIcons',
		icon: 'stars',
		type: 'study',
		condition: '한자어 500개 학습',
		rarity: 'legendary',
	},
	{
		id: 'study_all',
		name: '학습 완전 정복',
		description: '모든 한자어을 학습 완료! 완벽한 정복입니다!',
		iconType: 'materialIcons',
		icon: 'verified',
		type: 'study',
		condition: '모든 한자어 학습 완료',
		rarity: 'legendary',
	},

	// 퀴즈 뱃지
	{
		id: 'quiz_1',
		name: '첫 퀴즈 완료',
		description: '첫 문제 풀기 성공! 이제 진짜 시작입니다!',
		iconType: 'materialIcons',
		icon: 'looks-one',
		type: 'quiz',
		condition: '퀴즈 1문제 완료',
		rarity: 'common',
	},
	{
		id: 'quiz_10',
		name: '10문제 퀴즈 완료',
		description: '10문제 돌파! 꾸준함이 빛납니다!',
		iconType: 'materialIcons',
		icon: 'military-tech',
		type: 'quiz',
		condition: '퀴즈 10문제 완료',
		rarity: 'common',
	},
	{
		id: 'quiz_50',
		name: '50문제 퀴즈 완료',
		description: '50문제 클리어! 퀴즈 고수의 기운이!',
		iconType: 'materialIcons',
		icon: 'workspace-premium',
		type: 'quiz',
		condition: '퀴즈 50문제 완료',
		rarity: 'rare',
	},
	{
		id: 'quiz_100',
		name: '100문제 퀴즈 완료',
		description: '100문제 완주! 대단한 집중력입니다!',
		iconType: 'materialIcons',
		icon: 'emoji-events',
		type: 'quiz',
		condition: '퀴즈 100문제 완료',
		rarity: 'rare',
	},
	{
		id: 'quiz_150',
		name: '150문제 퀴즈 완료',
		description: '벌써 150개? 이건 거의 한자어 탐험가죠!',
		iconType: 'materialIcons',
		icon: 'military-tech',
		type: 'quiz',
		condition: '퀴즈 150문제 완료',
		rarity: 'rare',
	},
	{
		id: 'quiz_200',
		name: '200문제 퀴즈 완료',
		description: '200문제! 당신은 퀴즈의 전설!',
		iconType: 'materialIcons',
		icon: 'grade',
		type: 'quiz',
		condition: '퀴즈 200문제 완료',
		rarity: 'epic',
	},

	// 퀴즈 문제 수 추가 뱃지
	{
		id: 'quiz_250',
		name: '250문제 퀴즈 완료',
		description: '250문제 돌파! 실력이 눈에 띄게 늘고 있습니다!',
		iconType: 'materialIcons',
		icon: 'military-tech',
		type: 'quiz',
		condition: '퀴즈 250문제 완료',
		rarity: 'epic',
	},
	{
		id: 'quiz_300',
		name: '300문제 퀴즈 완료',
		description: '300문제 완료! 당신의 집중력은 대단합니다!',
		iconType: 'materialIcons',
		icon: 'workspace-premium',
		type: 'quiz',
		condition: '퀴즈 300문제 완료',
		rarity: 'epic',
	},
	{
		id: 'quiz_350',
		name: '350문제 퀴즈 완료',
		description: '350문제나 풀었습니다! 놀라운 끈기입니다!',
		iconType: 'materialIcons',
		icon: 'emoji-events',
		type: 'quiz',
		condition: '퀴즈 350문제 완료',
		rarity: 'epic',
	},
	{
		id: 'quiz_400',
		name: '400문제 퀴즈 완료',
		description: '400문제 클리어! 당신은 퀴즈 챔피언!',
		iconType: 'materialIcons',
		icon: 'military-tech',
		type: 'quiz',
		condition: '퀴즈 400문제 완료',
		rarity: 'epic',
	},
	{
		id: 'quiz_450',
		name: '450문제 퀴즈 완료',
		description: '450문제! 이제 퀴즈 달인의 반열에 올랐습니다!',
		iconType: 'materialIcons',
		icon: 'workspace-premium',
		type: 'quiz',
		condition: '퀴즈 450문제 완료',
		rarity: 'legendary',
	},
	{
		id: 'quiz_500',
		name: '500문제 퀴즈 완료',
		description: '500문제 돌파! 당신은 진정한 한자어 고수!',
		iconType: 'materialIcons',
		icon: 'stars',
		type: 'quiz',
		condition: '퀴즈 500문제 완료',
		rarity: 'legendary',
	},
	{
		id: 'quiz_550',
		name: '550문제 퀴즈 완료',
		description: '550문제 정복! 퀴즈의 신이 여기 있었군요!',
		iconType: 'materialIcons',
		icon: 'verified',
		type: 'quiz',
		condition: '퀴즈 550문제 완료',
		rarity: 'legendary',
	},
	{
		id: 'quiz_all',
		name: '퀴즈 정복자',
		description: '모든 문제 완료! 한자어 퀴즈 정복 완료입니다!',
		iconType: 'materialIcons',
		icon: 'verified',
		type: 'quiz',
		condition: '모든 퀴즈 문제 완료',
		rarity: 'legendary',
	},

	// 레벨 마스터 (퀴즈 유형)
	{
		id: 'level_easy_1',
		name: '초급 마스터',
		description: '기초 한자어은 다 외웠습니다! 깔끔한 출발!',
		iconType: 'fontAwesome6',
		icon: 'seedling',
		type: 'quiz',
		condition: '아주 쉬움 난이도 전체 정답',
		rarity: 'rare',
	},
	{
		id: 'level_easy_2',
		name: '중급 마스터',
		description: '쉬운 한자어도 완벽하게 마스터!',
		iconType: 'fontAwesome6',
		icon: 'leaf',
		type: 'quiz',
		condition: '쉬움 난이도 전체 정답',
		rarity: 'rare',
	},
	{
		id: 'level_medium',
		name: '고급 마스터',
		description: '보통 난이도? 문제없죠!',
		iconType: 'fontAwesome6',
		icon: 'tree',
		type: 'quiz',
		condition: '보통 난이도 전체 정답',
		rarity: 'epic',
	},
	{
		id: 'level_hard',
		name: '특급 마스터',
		description: '어려운 한자어까지 모두 정복했습니다!',
		iconType: 'fontAwesome6',
		icon: 'trophy',
		type: 'quiz',
		condition: '어려움 난이도 전체 정답',
		rarity: 'legendary',
	},

	// 카테고리 마스터 (퀴즈 유형) — 분야 목록에서 파생
	...CATEGORY_BADGES,

	// 콤보 달성 (퀴즈)
	{
		id: 'combo_3',
		name: '콤보 3 연속',
		description: '연속 3문제! 워밍업 완료!',
		iconType: 'materialCommunityIcons',
		icon: 'fire',
		type: 'quiz',
		condition: '퀴즈 3연속 정답',
		rarity: 'common',
	},
	{
		id: 'combo_5',
		name: '콤보 5 연속',
		description: '집중력 5단계 돌입!',
		iconType: 'materialCommunityIcons',
		icon: 'fire',
		type: 'quiz',
		condition: '퀴즈 5연속 정답',
		rarity: 'rare',
	},
	{
		id: 'combo_10',
		name: '콤보 10 연속',
		description: '집중력 끝판왕 등장!',
		iconType: 'materialCommunityIcons',
		icon: 'fire',
		type: 'quiz',
		condition: '퀴즈 10연속 정답',
		rarity: 'epic',
	},
	{
		id: 'combo_15',
		name: '콤보 15 연속',
		description: '불꽃처럼 타오르고 있습니다!',
		iconType: 'materialCommunityIcons',
		icon: 'fire',
		type: 'quiz',
		condition: '퀴즈 15연속 정답',
		rarity: 'epic',
	},
	{
		id: 'combo_20',
		name: '콤보 20 연속',
		description: '전설의 20콤보! 퀴즈 신이시군요!',
		iconType: 'materialCommunityIcons',
		icon: 'fire-alert',
		type: 'quiz',
		condition: '퀴즈 20연속 정답',
		rarity: 'legendary',
	},

	// 점수 달성 (퀴즈) - 등급 획득 강조 버전
	{
		id: 'score_400',
		name: '📘 수습 등급 획득!',
		description: '400점 달성! 기초를 다지며 학문의 길에 들어섰습니다!',
		iconType: 'fontAwesome6',
		icon: 'seedling',
		type: 'quiz',
		condition: '누적 점수 400점 달성',
		rarity: 'common',
	},
	{
		id: 'score_900',
		name: '📖 학자 등급 획득!',
		description: '900점 달성! 다양한 한자어가 익숙해지고 있습니다!',
		iconType: 'fontAwesome6',
		icon: 'leaf',
		type: 'quiz',
		condition: '누적 점수 900점 달성',
		rarity: 'rare',
	},
	{
		id: 'score_1600',
		name: '🗣 강자 등급 획득!',
		description: '1600점 달성! 이제 남에게 설명할 수 있는 수준입니다!',
		iconType: 'fontAwesome6',
		icon: 'book',
		type: 'quiz',
		condition: '누적 점수 1600점 달성',
		rarity: 'rare',
	},
	{
		id: 'score_2400',
		name: '🏆 현인 등급 획득!',
		description: '2400점 달성! 통찰력 있는 한자어 고수가 되었습니다!',
		iconType: 'fontAwesome6',
		icon: 'mountain',
		type: 'quiz',
		condition: '누적 점수 2400점 달성',
		rarity: 'epic',
	},
	{
		id: 'score_3400',
		name: '👑 성인 등급 획득!',
		description: '3400점 달성! 지식과 인격을 겸비한 진정한 학자!',
		iconType: 'fontAwesome6',
		icon: 'crown',
		type: 'quiz',
		condition: '누적 점수 3400점 달성',
		rarity: 'epic',
	},
	{
		id: 'score_4600',
		name: '🌌 도인 등급 획득!',
		description: '4600점 달성! 세속을 초월한 한자어의 대가!',
		iconType: 'fontAwesome6',
		icon: 'yin-yang',
		type: 'quiz',
		condition: '누적 점수 4600점 달성',
		rarity: 'legendary',
	},

	// =========================================
	// 📅 출석 뱃지 (누적 출석일) — 신규
	// =========================================
	{
		id: 'attend_1',
		name: '첫 출석',
		description: '🌅 첫 출석을 완료했습니다! 좋은 습관의 시작입니다!',
		iconType: 'materialIcons',
		icon: 'event-available',
		type: 'attendance',
		condition: '누적 출석 1일',
		rarity: 'common',
	},
	{
		id: 'attend_5',
		name: '출석 5일',
		description: '📅 벌써 5일째 출석! 꾸준함이 보입니다!',
		iconType: 'materialIcons',
		icon: 'event-available',
		type: 'attendance',
		condition: '누적 출석 5일',
		rarity: 'common',
	},
	{
		id: 'attend_10',
		name: '출석 10일',
		description: '🗓️ 출석 10일 달성! 루틴이 자리 잡고 있습니다!',
		iconType: 'materialIcons',
		icon: 'date-range',
		type: 'attendance',
		condition: '누적 출석 10일',
		rarity: 'common',
	},
	{
		id: 'attend_20',
		name: '출석 20일',
		description: '📆 출석 20일! 어느새 습관이 됐네요!',
		iconType: 'materialIcons',
		icon: 'date-range',
		type: 'attendance',
		condition: '누적 출석 20일',
		rarity: 'rare',
	},
	{
		id: 'attend_30',
		name: '한 달 개근',
		description: '🏅 출석 30일 달성! 한 달 개근, 정말 대단합니다!',
		iconType: 'materialIcons',
		icon: 'calendar-month',
		type: 'attendance',
		condition: '누적 출석 30일',
		rarity: 'rare',
	},
	{
		id: 'attend_50',
		name: '출석 50일',
		description: '🎖️ 출석 50일! 꾸준함의 아이콘입니다!',
		iconType: 'materialIcons',
		icon: 'calendar-month',
		type: 'attendance',
		condition: '누적 출석 50일',
		rarity: 'epic',
	},
	{
		id: 'attend_100',
		name: '출석 100일',
		description: '🏆 출석 100일 돌파! 백일의 정성을 모았습니다!',
		iconType: 'materialIcons',
		icon: 'workspace-premium',
		type: 'attendance',
		condition: '누적 출석 100일',
		rarity: 'epic',
	},
	{
		id: 'attend_150',
		name: '출석 150일',
		description: '🌟 출석 150일! 이쯤 되면 진정한 고수입니다!',
		iconType: 'materialIcons',
		icon: 'workspace-premium',
		type: 'attendance',
		condition: '누적 출석 150일',
		rarity: 'legendary',
	},
	{
		id: 'attend_200',
		name: '출석 200일',
		description: '💎 출석 200일! 흔들리지 않는 꾸준함의 결정체!',
		iconType: 'materialIcons',
		icon: 'diamond',
		type: 'attendance',
		condition: '누적 출석 200일',
		rarity: 'legendary',
	},
	{
		id: 'attend_300',
		name: '출석 300일',
		description: '👑 출석 300일! 당신은 출석의 전설입니다!',
		iconType: 'materialIcons',
		icon: 'emoji-events',
		type: 'attendance',
		condition: '누적 출석 300일',
		rarity: 'legendary',
	},

	// =========================================
	// 🔥 콤보 뱃지 (확장) — 신규
	// =========================================
	{
		id: 'combo_25',
		name: '🔥 25콤보',
		description: '연속 25문제 정답! 손이 풀렸군요!',
		iconType: 'materialIcons',
		icon: 'local-fire-department',
		type: 'quiz',
		condition: '연속 정답 25회',
		rarity: 'rare',
	},
	{
		id: 'combo_30',
		name: '🔥 30콤보',
		description: '연속 30문제 정답! 집중력이 불타오릅니다!',
		iconType: 'materialIcons',
		icon: 'local-fire-department',
		type: 'quiz',
		condition: '연속 정답 30회',
		rarity: 'rare',
	},
	{
		id: 'combo_40',
		name: '🔥 40콤보',
		description: '연속 40문제 정답! 멈출 줄 모르는 기세!',
		iconType: 'materialIcons',
		icon: 'whatshot',
		type: 'quiz',
		condition: '연속 정답 40회',
		rarity: 'epic',
	},
	{
		id: 'combo_50',
		name: '⚡ 50콤보',
		description: '연속 50문제 정답! 경지에 올랐습니다!',
		iconType: 'materialIcons',
		icon: 'bolt',
		type: 'quiz',
		condition: '연속 정답 50회',
		rarity: 'epic',
	},
	{
		id: 'combo_60',
		name: '⚡ 60콤보',
		description: '연속 60문제 정답! 콤보의 신이 강림했습니다!',
		iconType: 'materialIcons',
		icon: 'bolt',
		type: 'quiz',
		condition: '연속 정답 60회',
		rarity: 'legendary',
	},

	// =========================================
	// 🏆 점수 뱃지 (확장) — 신규
	// =========================================
	{
		id: 'score_6000',
		name: '6000점 돌파',
		description: '🚀 누적 6000점! 끝없이 성장하고 있습니다!',
		iconType: 'materialIcons',
		icon: 'military-tech',
		type: 'quiz',
		condition: '누적 점수 6000점 달성',
		rarity: 'rare',
	},
	{
		id: 'score_8000',
		name: '8000점 돌파',
		description: '🌠 누적 8000점! 어휘력이 빛나고 있습니다!',
		iconType: 'materialIcons',
		icon: 'military-tech',
		type: 'quiz',
		condition: '누적 점수 8000점 달성',
		rarity: 'epic',
	},
	{
		id: 'score_10000',
		name: '1만점 클럽',
		description: '🎉 누적 10000점 돌파! 1만점 클럽에 입성했습니다!',
		iconType: 'materialIcons',
		icon: 'emoji-events',
		type: 'quiz',
		condition: '누적 점수 10000점 달성',
		rarity: 'epic',
	},
	{
		id: 'score_15000',
		name: '15000점 돌파',
		description: '💫 누적 15000점! 한자어 고수의 반열에!',
		iconType: 'materialIcons',
		icon: 'stars',
		type: 'quiz',
		condition: '누적 점수 15000점 달성',
		rarity: 'legendary',
	},
	{
		id: 'score_20000',
		name: '2만점 레전드',
		description: '👑 누적 20000점! 당신은 살아있는 전설입니다!',
		iconType: 'materialIcons',
		icon: 'workspace-premium',
		type: 'quiz',
		condition: '누적 점수 20000점 달성',
		rarity: 'legendary',
	},
	// =========================================
	// 📅 오늘의 퀴즈 뱃지 (누적 완료 일수) — 신규
	// =========================================
	{
		id: 'today_1',
		name: '오늘의 퀴즈 첫 도전',
		description: '🌱 오늘의 퀴즈를 처음으로 완료했습니다! 좋은 시작입니다!',
		iconType: 'materialIcons',
		icon: 'today',
		type: 'quiz',
		condition: '오늘의 퀴즈 1일 완료',
		rarity: 'common',
	},
	{
		id: 'today_5',
		name: '오늘의 퀴즈 5일',
		description: '📅 오늘의 퀴즈 5일 완료! 꾸준함이 보입니다!',
		iconType: 'materialIcons',
		icon: 'event-available',
		type: 'quiz',
		condition: '오늘의 퀴즈 5일 완료',
		rarity: 'common',
	},
	{
		id: 'today_10',
		name: '오늘의 퀴즈 10일',
		description: '🗓️ 오늘의 퀴즈 10일 완료! 루틴이 자리 잡고 있습니다!',
		iconType: 'materialIcons',
		icon: 'date-range',
		type: 'quiz',
		condition: '오늘의 퀴즈 10일 완료',
		rarity: 'rare',
	},
	{
		id: 'today_20',
		name: '오늘의 퀴즈 20일',
		description: '📆 오늘의 퀴즈 20일 완료! 어느새 습관이 됐네요!',
		iconType: 'materialIcons',
		icon: 'date-range',
		type: 'quiz',
		condition: '오늘의 퀴즈 20일 완료',
		rarity: 'rare',
	},
	{
		id: 'today_30',
		name: '오늘의 퀴즈 한 달',
		description: '🏅 오늘의 퀴즈 30일 완료! 한 달 개근, 정말 대단합니다!',
		iconType: 'materialIcons',
		icon: 'calendar-month',
		type: 'quiz',
		condition: '오늘의 퀴즈 30일 완료',
		rarity: 'epic',
	},
	{
		id: 'today_50',
		name: '오늘의 퀴즈 50일',
		description: '🎖️ 오늘의 퀴즈 50일 완료! 꾸준함의 아이콘입니다!',
		iconType: 'materialIcons',
		icon: 'auto-awesome',
		type: 'quiz',
		condition: '오늘의 퀴즈 50일 완료',
		rarity: 'epic',
	},
	{
		id: 'today_100',
		name: '오늘의 퀴즈 100일',
		description: '🏆 오늘의 퀴즈 100일 완료! 백일의 정성을 모았습니다!',
		iconType: 'materialIcons',
		icon: 'emoji-events',
		type: 'quiz',
		condition: '오늘의 퀴즈 100일 완료',
		rarity: 'legendary',
	},
];
