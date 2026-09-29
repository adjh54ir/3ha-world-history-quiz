import React from 'react';
import { useTranslation } from 'react-i18next';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** 데일리 믹스: 전 주제에서 섞인 4지선다 10문제 */
const QuizMix = () => {
	const { t } = useTranslation();
	return (
		<LearnQuizPlayer
			title={t('quiz.modes.mix')}
			accent={Colors.primary}
			modeLabel={t('quiz.common.resultOf', { title: t('quiz.modes.mix') })}
			mode="mix"
			generate={() => LearnHubService.generateMixedQuiz(10)}
		/>
	);
};

export default QuizMix;
