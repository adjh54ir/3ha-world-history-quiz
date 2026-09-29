import React, { useEffect, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';
import LearnHubService from '@/src/services/LearnHubService';
import Colors from '@/src/const/ConstColors';

export default function SubQuizPlay() {
	const { t } = useTranslation();
	const params = useLocalSearchParams<{ domain?: string }>();
	const domainKey = typeof params.domain === 'string' ? params.domain : '';
	// 잘못된 domain 으로 들어오면 엉뚱한 퀴즈를 시작하지 않고 되돌린다
	const meta = useMemo(() => LearnHubService.getSubQuizDomainList().find((item) => item.key === domainKey), [domainKey]);
	useEffect(() => {
		if (!meta) router.canGoBack() ? router.back() : router.replace('/home' as never);
	}, [meta]);
	if (!meta) return null;
	const service = LearnHubService.getDomain(meta.key);
	const questionCount = Math.min(10, meta.total);

	return (
		<LearnQuizPlayer
			title={t('quiz.common.titleOf', { title: meta.title })}
			accent={Colors.primary}
			modeLabel={t('quiz.common.resultOf', { title: meta.title })}
			mode={`sub-${meta.key}`}
			homeHref="/home"
			trackProgress={false}
			suggestWrongReview={false}
			suggestTimeChallenge={false}
			generate={() => service.generateQuiz({ count: questionCount })}
		/>
	);
}
