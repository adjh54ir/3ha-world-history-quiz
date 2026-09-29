import React from 'react';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** OX 퀴즈: 제시된 답이 맞는지 O/X 판단 */
const QuizOX = () => (
	<LearnQuizPlayer
		title="OX 퀴즈"
		accent={Colors.primary}
		modeLabel="OX 퀴즈 결과"
		mode="ox"
		generate={() => LearnHubService.generateOXQuiz(10)}
	/>
);

export default QuizOX;
