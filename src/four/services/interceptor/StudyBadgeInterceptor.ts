import type { MainDataType } from '@/src/four/types/MainDataType';
import ProverbServices from '../ProverbServices';
import { BADGE_THRESHOLDS } from './QuizBadgeInterceptor';

/**
 * 학습 기반 뱃지 인터셉터
 */
export const StudyBadgeInterceptor = (study: MainDataType.UserStudyHistory): string[] => {
	const newBadges: string[] = [];

	const count = study.studyProverbs.length;
	const existing = new Set(study.badges ?? []);
	const total = ProverbServices.selectProverbList().length;

	// 누적 학습 개수 뱃지 — 임계값은 퀴즈 쪽과 한 곳에서 관리한다
	BADGE_THRESHOLDS.study.forEach((n) => {
		const id = `study_${n}`;
		if (!existing.has(id) && count >= n) {
			newBadges.push(id);
		}
	});

	// ✅ 전체 한자어 학습 완료 시 부여
	if (!existing.has('study_all') && count >= total) {
		newBadges.push('study_all');
	}

	return newBadges;
};
