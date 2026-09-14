import { LIFE_CATEGORIES } from '@/src/const/data/life/ConstLifeCategories';
import type { MainDataType } from '@/src/four/types/MainDataType';

/** 레벨 마스터 뱃지 ↔ 난이도 (진행도 계산에서도 같은 표를 쓴다) */
export const BADGE_LEVEL_META = [
	{ level: '초급', badgeId: 'level_easy_1' },
	{ level: '중급', badgeId: 'level_easy_2' },
	{ level: '고급', badgeId: 'level_medium' },
	{ level: '특급', badgeId: 'level_hard' },
];

/**
 * 카테고리 마스터 뱃지 ↔ 분야 — 분야 목록에서 그대로 만든다.
 * 손으로 적어 두었더니 사자성어 시절 분야 17개가 그대로 남아, 조건에 맞는 단어가 0개라
 * 뱃지 17개가 전부 지급되지 않았다. 목록에서 파생해 분야가 바뀌어도 어긋나지 않게 한다.
 */
export const BADGE_CATEGORY_META = LIFE_CATEGORIES.map((category) => ({
	category: category.label,
	badgeId: `category_${category.key}`,
}));

/** 누적 임계값 (진행도 계산에서도 같은 값을 쓴다) */
export const BADGE_THRESHOLDS = {
	study: [1, 10, 50, 100, 200, 300, 400, 500],
	quiz: [1, 10, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550],
	combo: [3, 5, 10, 15, 20, 25, 30, 40, 50, 60],
	score: [400, 900, 1600, 2400, 3400, 4600, 6000, 8000, 10000, 15000, 20000],
	attend: [1, 5, 10, 20, 30, 50, 100, 150, 200, 300],
	today: [1, 5, 10, 20, 30, 50, 100],
};

export const QuizBadgeInterceptor = (
	history: MainDataType.UserQuizHistory,
	allProverbs: MainDataType.ProverbType[],
): string[] => {
	const newBadges: string[] = [];
	const solvedSet = new Set([...(history.correctProverbId ?? []), ...(history.wrongProverbId ?? [])]);

	// 레벨별 마스터 조건 (난이도별 한자어 정복 여부)
	const LEVEL_META = BADGE_LEVEL_META;
	LEVEL_META.forEach(({ level, badgeId }) => {
		const levelList = allProverbs.filter((p) => p.level === level);
		const allSolved = levelList.length > 0 && levelList.every((p) => solvedSet.has(p.id));
		if (!history.badges.includes(badgeId) && allSolved) {
			newBadges.push(badgeId);
		}
	});

	// 카테고리별 마스터 뱃지
	const CATEGORY_META = BADGE_CATEGORY_META;
	CATEGORY_META.forEach(({ category, badgeId }) => {
		const categoryList = allProverbs.filter((p) => p.category === category);
		const allSolved = categoryList.length > 0 && categoryList.every((p) => solvedSet.has(p.id));
		if (!history.badges.includes(badgeId) && allSolved) {
			newBadges.push(badgeId);
		}
	});

	// 퀴즈 누적 횟수 뱃지
	const totalSolved = (history.correctProverbId?.length ?? 0) + (history.wrongProverbId?.length ?? 0);
	const quizThresholds = BADGE_THRESHOLDS.quiz;

	quizThresholds.forEach((n) => {
		const id = `quiz_${n}`;
		if (!history.badges.includes(id) && totalSolved >= n) {
			newBadges.push(id);
		}
	});

	// 콤보 뱃지
	const comboThresholds = BADGE_THRESHOLDS.combo;
	comboThresholds.forEach((n) => {
		const id = `combo_${n}`;
		if (!history.badges.includes(id) && (history.bestCombo ?? 0) >= n) {
			newBadges.push(id);
		}
	});

	// 점수 기준 뱃지 (업데이트된 점수 기준)
	const scoreThresholds = BADGE_THRESHOLDS.score;

	scoreThresholds.forEach((score) => {
		const id = `score_${score}`;
		if (!history.badges.includes(id) && (history.totalScore ?? 0) >= score) {
			newBadges.push(id);
		}
	});
	// 전체 퀴즈 정복
	if (!history.badges.includes('quiz_all') && allProverbs.every((p) => solvedSet.has(p.id))) {
		newBadges.push('quiz_all');
	}

	return newBadges;
};
