import React from 'react';
import { useTranslation } from 'react-i18next';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** 초성 퀴즈: 설명 + 초성 힌트를 보고 이름 맞히기 */
const QuizInitial = () => {
	const { t } = useTranslation();
	return (
		<LearnQuizPlayer
			title={t('quiz.modes.initial')}
			accent={Colors.primary}
			modeLabel={t('quiz.common.resultOf', { title: t('quiz.modes.initial') })}
			mode="initial"
			generate={() => LearnHubService.generateInitialSoundQuiz(10)}
		/>
	);
};

export default QuizInitial;
