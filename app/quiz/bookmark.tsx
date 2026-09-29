/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import CommonHeader from '@/src/screens/common/CommonHeader';
import ListSkeleton from '@/src/screens/common/atomic/ListSkeleton';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService, { BookmarkItem } from '@/src/services/LearnProgressService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { themed } from '@/src/utils/ThemedStyles';

/** Fisher-Yates — 매 판 다른 순서로 출제 */
const shuffleBookmarks = (list: BookmarkItem[]): BookmarkItem[] => {
	const a = [...list];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};

/**
 * 즐겨찾기 퀴즈 (나만의 퀴즈)
 * - 보관함에 모은 즐겨찾기 항목으로 4지선다 출제
 */
const QuizBookmark = () => {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState<BookmarkItem[]>([]);

	useEffect(() => {
		LearnProgressService.getBookmarks().then((list) => {
			setItems(list);
			setLoading(false);
		});
	}, []);

	if (loading) {
		return (
			<SafeAreaView style={styles.safe} edges={[]}>
				<CommonHeader title={t('quiz.modes.bookmark')} onBack={() => router.back()} />
				<ListSkeleton />
			</SafeAreaView>
		);
	}

	if (items.length < 1) {
		return (
			<SafeAreaView style={styles.safe} edges={[]}>
				<CommonHeader title={t('quiz.modes.bookmark')} onBack={() => router.back()} />
				<FadeInUp style={styles.center}>
					<IconComponent type="materialIcons" name="bookmark-border" size={scaledSize(52)} color={Colors.textMuted} />
					<Text style={styles.emptyTitle}>{t('quiz.bookmark.emptyTitle')}</Text>
					<Text style={styles.emptySub}>{t('quiz.bookmark.emptySub')}</Text>
					<TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={() => router.replace('/special/story-feed' as never)}>
						<Text style={styles.ctaText}>{t('quiz.bookmark.cta')}</Text>
					</TouchableOpacity>
				</FadeInUp>
			</SafeAreaView>
		);
	}

	return (
		<LearnQuizPlayer
			title={t('quiz.modes.bookmark')}
			accent={Colors.primary}
			modeLabel={t('quiz.common.resultOf', { title: t('quiz.modes.bookmark') })}
			mode="bookmark"
			suggestWrongReview={false}
			generate={() =>
				LearnHubService.generateReviewQuiz(
					// generateReviewQuiz 는 넘긴 순서를 지키므로 매번 다른 문제가 나오도록 여기서 섞는다
					shuffleBookmarks(items).map((b) => {
						const card = LearnHubService.getStudyCardByUid(b.domain, b.uid);
						// 해설이 정답을 그대로 반복하지 않도록 원본 카드의 설명·예문을 쓴다
						const detail = card?.description && card.description !== b.meaning ? card.description : card?.examples?.[0] ?? '';
						return {
							uid: b.uid,
							domain: b.domain,
							prompt: b.title,
							answer: b.meaning,
							explanation: detail ? `${b.title} — ${detail}` : b.meaning,
							examples: card?.examples,
						};
					}),
					Math.min(items.length, 10),
				)
			}
		/>
	);
};

export default QuizBookmark;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxxl },
	emptyTitle: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.lg },
	emptySub: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.sm, lineHeight: scaleHeight(20) },
	cta: { marginTop: SpacingV.xxl, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxl, paddingVertical: SpacingV.md, borderRadius: Radius.lg },
	ctaText: { flexShrink: 1, textAlign: 'center', color: Colors.textInverse, fontSize: Typography.body, fontWeight: '800' },
}));
