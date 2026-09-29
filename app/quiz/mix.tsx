import React from 'react';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** 데일리 믹스: 전 주제에서 섞인 4지선다 10문제 */
const QuizMix = () => (
	<LearnQuizPlayer
		title="데일리 믹스"
		accent={Colors.primary}
		modeLabel="데일리 믹스 결과"
		mode="mix"
		generate={() => LearnHubService.generateMixedQuiz(10)}
	/>
);

export default QuizMix;
