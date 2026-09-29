import React from 'react';
import Colors from '@/src/const/ConstColors';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';
import { FEATURE_ILLUSTRATIONS } from '@/src/const/ConstFeatureIllustrationAssets';

/** 타임 챌린지: 180초 안에 최대한 많이 맞히기 (전 주제 믹스) */
const QuizSpeed = () => (
	<LearnQuizPlayer
		title="타임 챌린지"
		accent={Colors.primary}
		modeLabel="타임 챌린지 결과"
		mode="time"
		// 결과에서 '홈으로'를 누르면 홈이 아니라 챌린지(타임챌린지 스코어) 화면으로 돌아간다
		homeHref="/(tabs)/challenge"
		timed
		timeSec={180}
		startIllustration={FEATURE_ILLUSTRATIONS.timeChallenge}
		suggestTimeChallenge={false}
		// 타임 챌린지는 난이도 순 정렬 예외 — 섞인 순서가 제한 시간 모드의 긴장감을 살린다
		orderByLevel={false}
		generate={() => LearnHubService.generateMixedQuiz(300)}
	/>
);

export default QuizSpeed;
