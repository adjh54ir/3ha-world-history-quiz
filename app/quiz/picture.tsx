import React from 'react';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';

/** 그림 퀴즈: 국기·초상·랜드마크 사진·천체 그림만 보고 이름 맞히기 */
const QuizPicture = () => (
	<LearnQuizPlayer
		title="그림 퀴즈"
		accent={Colors.primary}
		modeLabel="그림 퀴즈 결과"
		mode="picture"
		generate={() => LearnHubService.generatePictureQuiz(10)}
	/>
);

export default QuizPicture;
