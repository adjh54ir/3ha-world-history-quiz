import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';
import { stringParam } from '@/src/navigation/expoRouterUtils';

/**
 * 통합 퀴즈 화면 (도메인별 4지선다)
 * - 전체 문제를 출제하며(제한 없음, 종료 버튼으로 중간 종료), 결과는 자동으로 통계/오답노트에 저장됩니다.
 */
const LearnQuiz = () => {
	const { t } = useTranslation();
	const params = useLocalSearchParams();
	const category = stringParam(params.category, 'capital');
	const level = stringParam(params.level, '전체');
	const domain = LearnHubService.getDomain(category);
	const levelSuffix = level && level !== '전체' ? ` · ${level}` : '';
	const quizTitle = t('quiz.common.titleOf', { title: domain.meta.title });

	return (
		<LearnQuizPlayer
			title={`${quizTitle}${levelSuffix}`}
			accent={domain.meta.color}
			modeLabel={`${t('quiz.common.resultOf', { title: quizTitle })}${levelSuffix}`}
			mode="domain"
			generate={() => {
				const all = domain.generateQuiz({ count: domain.meta.total });
				if (!level || level === '전체') return all;
				const filtered = all.filter((q) => q.level === level);
				// 해당 난이도 문제가 없으면 전체로 폴백
				return filtered.length > 0 ? filtered : all;
			}}
		/>
	);
};

export default LearnQuiz;
