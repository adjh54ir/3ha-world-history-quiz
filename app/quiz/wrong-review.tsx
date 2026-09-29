/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import CommonHeader from '@/src/screens/common/CommonHeader';
import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from '@/src/screens/common/CharacterGuide';
import ListSkeleton from '@/src/screens/common/atomic/ListSkeleton';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import Colors from '@/src/const/ConstColors';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import { scaleArt, scaledSize, scaleHeight, scaleWidth, isTablet } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService, { WrongItem } from '@/src/services/LearnProgressService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';
import { playPop } from '@/src/utils/SoundUtils';
import LearnItemCard, { learnListFields } from '@/src/screens/common/LearnItemCard';
import { stringParam } from '@/src/navigation/expoRouterUtils';
import DetailSheet from '@/src/screens/modal/DetailSheet';
import { categoryIcon, difficultyIcon } from '@/src/const/ConstQuizMeta';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { Spacing, SpacingV, Radius, Typography, Layout } from '@/src/const/ConstDesign';
import DateUtils from '@/src/utils/DateUtils';
import { useToast } from '@/src/context/ToastContext';
import { SHARED_STATE_ILLUSTRATIONS } from '@/src/const/ConstIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 목록에서는 정답을 한 번만 보여주고, 정답 문구를 반복하는 해설 머리말만 제거한다. */
const cleanReviewExplanation = (explanation: string, answer: string): string => {
	const text = explanation.trim();
	if (!text) return '';
	const escapedAnswer = escapeRegExp(answer.trim());
	const withoutAnswerPrefix = text.replace(
		new RegExp(`^(?:정답|올바른\\s*답)\\s*[:：]?\\s*${escapedAnswer}\\s*(?:입니다|이에요|예요)?[.!。]?\\s*`, 'i'),
		'',
	);
	return withoutAnswerPrefix.trim() === answer.trim() ? '' : withoutAnswerPrefix.trim();
};

/**
 * 오답 복습 퀴즈
 * - 보관함에 쌓인 오답을 4지선다로 재구성해 복습
 * - 정답을 맞히면 해당 항목은 오답노트에서 자동 제거(reviewMode)
 */
const QuizWrongReview = () => {
	const params = useLocalSearchParams();
	const category = stringParam(params.category, '');
	const scoped = !!category && LearnHubService.isValidCategory(category);
	const headerTitle = scoped ? `${LearnHubService.getDomainTitle(category)} 오답 복습` : '오답 복습';
	const accent = scoped ? LearnHubService.getDomain(category).meta.color : Colors.error;

	const { showToast } = useToast();
	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState<WrongItem[]>([]);
	const [started, setStarted] = useState(false);
	const [detail, setDetail] = useState<WrongItem | null>(null);
	// 화면 사용법 안내 — 최초 1회, 홈에서 고른 캐릭터가 설명
	const guide = useCharacterGuideOnce('wrong-review');
	const [bmUids, setBmUids] = useState<Set<string>>(new Set());

	const reloadBookmarks = () => LearnProgressService.getBookmarks().then((bm) => setBmUids(new Set(bm.map((b) => b.uid))));

	useEffect(() => {
		let alive = true;
		LearnProgressService.getWrongNotes().then((list) => {
			if (!alive) return;
			const scopedList = scoped ? list.filter((w) => w.domain === category) : list;
			// 여러 번 틀린 문항을 먼저 복습한다(같은 횟수면 최근 오답 우선)
			setItems([...scopedList].sort((a, b) => (b.missCount ?? 1) - (a.missCount ?? 1) || b.addedAt - a.addedAt));
			setLoading(false);
		});
		reloadBookmarks();
		return () => {
			alive = false;
		};
	}, [category, scoped]);

	const toggleBookmark = async (w: WrongItem) => {
		const c = LearnHubService.getStudyCardByUid(w.domain, w.uid);
		const now = await LearnProgressService.toggleBookmark({
			uid: w.uid,
			domain: w.domain,
			domainTitle: w.domainTitle,
			title: w.prompt,
			subTitle: w.subTitle,
			meaning: c?.meaning || w.explanation || w.answer || w.prompt,
		});
		reloadBookmarks();
		playPop();
		showToast(now ? '즐겨찾기에 저장했어요' : '즐겨찾기를 해제했어요', now ? 'star' : 'star-border');
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.safe} edges={[]}>
				<CommonHeader title={headerTitle} onBack={() => router.back()} />
				<ListSkeleton />
			</SafeAreaView>
		);
	}

	if (items.length === 0) {
		return (
			<SafeAreaView style={styles.safe} edges={[]}>
				<CommonHeader title={headerTitle} onBack={() => router.back()} />
				<View style={styles.center}>
					<ExpoImage source={SHARED_STATE_ILLUSTRATIONS.allComplete} style={styles.emptyIllustration} contentFit="contain" />
					<Text style={styles.emptyTitle}>복습할 오답이 없어요!</Text>
					<Text style={styles.emptySub}>퀴즈를 풀면 틀린 문제가 모여 여기에서 복습할 수 있어요.</Text>
					<TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={() => router.replace('/home' as never)}>
						<Text style={styles.ctaText}>주제 학습하러 가기</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	// 시작 전: 오답 목록 + 해설 미리보기
	if (!started) {
		return (
			<SafeAreaView style={styles.safe} edges={[]}>
				<CommonHeader title={headerTitle} onBack={() => router.back()} right={<CharacterGuideButton onPress={guide.open} />} />
				<FlatList
					data={items}
					keyExtractor={(w, i) => `${w.uid}-${i}`}
					contentContainerStyle={styles.introList}
					showsVerticalScrollIndicator={false}
					numColumns={isTablet ? 2 : 1}
					columnWrapperStyle={isTablet ? styles.gridRow : undefined}
					ListHeaderComponent={
						<View style={styles.introTop}>
							<ExpoImage source={SHARED_STATE_ILLUSTRATIONS.reviewNeeded} style={styles.reviewIllustration} contentFit="contain" />
							<Text style={styles.introTitle}>틀린 문제 {items.length}개 복습</Text>
							<Text style={styles.introDesc}>해설을 먼저 훑어보고 준비되면 시작하세요. 정답을 맞히면 오답노트에서 자동으로 지워져요.</Text>
						</View>
					}
					renderItem={({ item: w, index }) => {
						const reviewExplanation = cleanReviewExplanation(w.explanation, w.answer);
						const fields = learnListFields({ domain: w.domain, prompt: w.prompt, subPrompt: w.subTitle, answer: w.answer, explanation: reviewExplanation || undefined });
						return (
							<FadeInUp delay={Math.min(index * 45, 320)} duration={360} distance={16} style={isTablet ? styles.gridCell : undefined}>
								<LearnItemCard
									domain={w.domain}
									categoryLabel={w.categoryLabel}
									levelLabel={w.level}
									{...fields}
									answer={fields.title === w.answer ? undefined : w.answer}
									examples={w.examples}
									bookmarked={bmUids.has(w.uid)}
									onToggleBookmark={() => toggleBookmark(w)}
									onPress={() => setDetail(w)}>
									<View style={styles.reviewFooterRow}>
										<IconComponent type="materialIcons" name="schedule" size={scaledSize(12)} color={Colors.textMuted} />
										<Text style={styles.reviewDateText}>최근 오답 {DateUtils.formatTimestamp(w.addedAt, 'type3')}</Text>
										{(w.missCount ?? 1) >= 3 && (
											<View style={styles.missTag}>
												<IconComponent type="materialIcons" name="priority-high" size={scaledSize(11)} color={Colors.error} />
												<Text style={styles.missTagText}>{w.missCount}회 틀림</Text>
											</View>
										)}
									</View>
								</LearnItemCard>
							</FadeInUp>
						);
					}}
				/>
				<DetailSheet
					visible={!!detail}
					accent={accent}
					onClose={() => { setDetail(null); reloadBookmarks(); }}
					onBookmarkChange={() => reloadBookmarks()}
					item={
						detail
							? {
									uid: detail.uid,
									domain: detail.domain,
									domainTitle: detail.domainTitle,
									categoryLabel: detail.categoryLabel,
									levelLabel: detail.level,
									title: detail.prompt,
									subTitle: detail.subTitle,
									answer: detail.answer,
									explanation: detail.explanation,
									examples: detail.examples,
								}
							: null
					}
				/>
				<BottomButton label={`복습 시작하기 (${items.length}문제)`} icon="play-arrow" color={accent} onPress={() => setStarted(true)} />

			{/* 오답 복습 안내 — 최초 1회 */}
				<CharacterGuide
					visible={guide.visible}
					onClose={guide.close}
					lines={[
						'틀린 문제만 모아 다시 풀 수 있는 오답 복습이에요.',
						'해설을 먼저 훑어보고 준비되면 아래 버튼으로 시작해요.',
						'정답을 맞히면 그 문제는 오답노트에서 자동으로 지워져요!',
					]}
					title="오답 복습, 이렇게 써요"
					accent={accent}
				/>
			</SafeAreaView>
		);
	}

	return (
		<LearnQuizPlayer
			title={headerTitle}
			accent={accent}
			modeLabel={`${headerTitle} 결과`}
			mode="review"
			reviewMode
			suggestWrongReview={false}
			generate={() =>
				LearnHubService.generateReviewQuiz(
					items.map((w) => ({
						uid: w.uid,
						domain: w.domain,
						prompt: w.prompt,
						subTitle: w.subTitle,
						answer: w.answer,
						explanation: w.explanation,
						level: w.level,
						categoryLabel: w.categoryLabel,
						examples: w.examples,
						guide: w.guide,
						imageRef: w.imageRef,
					})),
					items.length,
				)
			}
		/>
	);
};

export default QuizWrongReview;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxxl },
	emptyIllustration: { width: scaleArt(156), height: scaleArt(156) },
	emptyTitle: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.lg },
	emptySub: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.sm, lineHeight: scaleHeight(20) },
	cta: { marginTop: SpacingV.xxl, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxl, paddingVertical: SpacingV.md, borderRadius: Radius.lg },
	ctaText: { flexShrink: 1, textAlign: 'center', color: Colors.textInverse, fontSize: Typography.body, fontWeight: '800' },
	introList: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	gridRow: { justifyContent: 'space-between' },
	gridCell: { width: '49%' },
	introTop: { alignItems: 'center', marginBottom: SpacingV.xl },
	reviewIllustration: { width: scaleArt(112), height: scaleArt(112) },
	introTitle: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.md },
	introDesc: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.sm, lineHeight: scaleHeight(20), paddingHorizontal: Spacing.sm },
	reviewFooterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.sm },
	reviewDateText: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.textMuted },
	// 반복 오답(3회 이상) 강조 태그
	missTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginLeft: 'auto', paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill, backgroundColor: Colors.errorSoft },
	missTagText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.error },
}));
