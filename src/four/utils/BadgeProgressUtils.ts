import AsyncStorage from '@react-native-async-storage/async-storage';
import { MainDataType } from '@/src/four/types/MainDataType';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import ProverbServices from '@/src/four/services/ProverbServices';
import { BADGE_CATEGORY_META, BADGE_LEVEL_META } from '@/src/four/services/interceptor/QuizBadgeInterceptor';

export type BadgeProgress = { current: number; goal: number; unit: string };

/**
 * 뱃지 획득까지 남은 진행도.
 *
 * 조건 문구(예: '한자어 10개 학습')를 파싱하지 않고 **뱃지 id 와 인터셉터가 보는 값**을 그대로 센다.
 * 문구는 사람이 고치면 바로 어긋나지만 id 와 집계 기준은 지급 로직과 같은 곳에서 오기 때문.
 *
 * 진행도를 셀 수 없는 뱃지는 null 을 돌려준다(팝업에서 막대를 감춘다).
 */
export const getBadgeProgress = async (badgeId: string): Promise<BadgeProgress | null> => {
	const [[, quizJson], [, studyJson], [, todayJson]] = await AsyncStorage.multiGet([
		MainStorageKeyType.USER_QUIZ_HISTORY,
		MainStorageKeyType.USER_STUDY_HISTORY,
		MainStorageKeyType.TODAY_QUIZ_LIST,
	]);

	const quiz: Partial<MainDataType.UserQuizHistory> = quizJson ? JSON.parse(quizJson) : {};
	const study: Partial<MainDataType.UserStudyHistory> = studyJson ? JSON.parse(studyJson) : {};
	const todayList: MainDataType.TodayQuizList[] = todayJson ? JSON.parse(todayJson) : [];

	const solvedSet = new Set([...(quiz.correctProverbId ?? []), ...(quiz.wrongProverbId ?? [])]);
	// 누적 풀이 수는 지급 로직(QuizBadgeInterceptor)과 같은 기준 — 중복 제거 없이 길이 합산
	const totalSolved = (quiz.correctProverbId?.length ?? 0) + (quiz.wrongProverbId?.length ?? 0);
	const proverbs = ProverbServices.selectProverbList();

	// 누적 카운트형 뱃지 (study_10, quiz_50, attend_30 …)
	const matched = badgeId.match(/^(study|quiz|combo|score|attend|today)_(\d+)$/);
	if (matched) {
		const [, kind, goalText] = matched;
		const goal = Number(goalText);
		switch (kind) {
			case 'study':
				return { current: study.studyProverbs?.length ?? 0, goal, unit: '개 학습' };
			case 'quiz':
				return { current: totalSolved, goal, unit: '문제 풀이' };
			case 'combo':
				return { current: quiz.bestCombo ?? 0, goal, unit: '연속 정답' };
			case 'score':
				return { current: quiz.totalScore ?? 0, goal, unit: '점' };
			case 'attend':
				return { current: todayList.filter((d) => d.isCheckedIn).length, goal, unit: '일 출석' };
			case 'today':
				return {
					current: todayList.filter(
						(d) =>
							(d.todayQuizIdArr?.length ?? 0) > 0 &&
							Object.keys(d.answerResults ?? {}).length >= (d.todayQuizIdArr?.length ?? 0),
					).length,
					goal,
					unit: '일 완료',
				};
		}
	}

	if (badgeId === 'study_all') {
		return { current: study.studyProverbs?.length ?? 0, goal: proverbs.length, unit: '개 학습' };
	}
	if (badgeId === 'quiz_all') {
		return { current: solvedSet.size, goal: proverbs.length, unit: '문제 풀이' };
	}

	const level = BADGE_LEVEL_META.find((m) => m.badgeId === badgeId);
	if (level) {
		const list = proverbs.filter((p) => p.level === level.level);
		return { current: list.filter((p) => solvedSet.has(p.id)).length, goal: list.length, unit: '문제 풀이' };
	}

	const category = BADGE_CATEGORY_META.find((m) => m.badgeId === badgeId);
	if (category) {
		const list = proverbs.filter((p) => p.category === category.category);
		return { current: list.filter((p) => solvedSet.has(p.id)).length, goal: list.length, unit: '문제 풀이' };
	}

	return null;
};

export default getBadgeProgress;
