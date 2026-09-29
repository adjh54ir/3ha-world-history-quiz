import React from 'react';
import { useTranslation } from 'react-i18next';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** OX 퀴즈: 제시된 답이 맞는지 O/X 판단 */
const QuizOX = () => {
	const { t } = useTranslation();
	return (
		<LearnQuizPlayer
			title={t('quiz.modes.ox')}
			accent={Colors.primary}
			modeLabel={t('quiz.common.resultOf', { title: t('quiz.modes.ox') })}
			mode="ox"
			generate={() => LearnHubService.generateOXQuiz(10)}
		/>
	);
};

export default QuizOX;
