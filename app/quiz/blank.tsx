import React from 'react';
import { useTranslation } from 'react-i18next';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** 빈칸 채우기: 설명 문장 속 가려진 이름을 보기에서 고르기 */
const QuizBlank = () => {
	const { t } = useTranslation();
	return (
		<LearnQuizPlayer
			title={t('quiz.modes.blank')}
			accent={Colors.primary}
			modeLabel={t('quiz.common.resultOf', { title: t('quiz.modes.blank') })}
			mode="blank"
			generate={() => LearnHubService.generateBlankQuiz(10)}
		/>
	);
};

export default QuizBlank;
