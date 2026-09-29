import React from 'react';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** 초성 퀴즈: 설명 + 초성 힌트를 보고 이름 맞히기 */
const QuizInitial = () => (
	<LearnQuizPlayer
		title="초성 퀴즈"
		accent={Colors.primary}
		modeLabel="초성 퀴즈 결과"
		mode="initial"
		generate={() => LearnHubService.generateInitialSoundQuiz(10)}
	/>
);

export default QuizInitial;
