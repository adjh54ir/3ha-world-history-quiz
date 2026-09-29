import React from 'react';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** 빈칸 채우기: 설명 문장 속 가려진 이름을 보기에서 고르기 */
const QuizBlank = () => (
	<LearnQuizPlayer
		title="빈칸 채우기"
		accent={Colors.primary}
		modeLabel="빈칸 채우기 결과"
		mode="blank"
		generate={() => LearnHubService.generateBlankQuiz(10)}
	/>
);

export default QuizBlank;
