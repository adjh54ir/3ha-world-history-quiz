import React from 'react';
import { useTranslation } from 'react-i18next';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** 그림 퀴즈: 국기·초상·랜드마크 사진·천체 그림만 보고 이름 맞히기 */
const QuizPicture = () => {
	const { t } = useTranslation();
	return (
		<LearnQuizPlayer
			title={t('quiz.modes.picture')}
			accent={Colors.primary}
			modeLabel={t('quiz.common.resultOf', { title: t('quiz.modes.picture') })}
			mode="picture"
			generate={() => LearnHubService.generatePictureQuiz(10)}
		/>
	);
};

export default QuizPicture;
