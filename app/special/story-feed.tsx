/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import SectionHead from '@/src/screens/common/atomic/SectionHead';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import CategoryScopeChips, { ALL_SCOPE } from '@/src/screens/common/atomic/CategoryScopeChips';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import DetailSheet, { DetailItem } from '@/src/screens/modal/DetailSheet';
import Colors, { withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout } from '@/src/const/ConstDesign';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { scaledSize, scaleHeight } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService from '@/src/services/LearnProgressService';
import { categoryIcon } from '@/src/const/ConstQuizMeta';
import { LearnType } from '@/src/types/data/LearnType';
import { useToast } from '@/src/context/ToastContext';
import AdaptiveGrid from '@/src/screens/common/layout/AdaptiveGrid';
import { themed } from '@/src/utils/ThemedStyles';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';

/**
 * 이야기 피드
 * - 전 주제의 이름·설명·더 알아보기를 읽을거리 카드로 넘겨봐요 (즐겨찾기 가능)
 */
const StoryFeed = () => {
	const scrollTop = useScrollTop();
	const { t } = useTranslation();
	const { showToast } = useToast();
	const [scope, setScope] = useState<string>(ALL_SCOPE);
	const [refreshKey, setRefreshKey] = useState(0);
	const [marked, setMarked] = useState<Set<string>>(new Set());
	const [detail, setDetail] = useState<DetailItem | null>(null);
	const [detailAccent, setDetailAccent] = useState<string>(Colors.primary);

	// 선택한 주제에 맞춰 카드를 구성 — '전체'는 전 주제 섞기, 특정 주제는 해당 주제만
	const cards = useMemo<LearnType.StudyCard[]>(() => {
		if (scope === ALL_SCOPE) return LearnHubService.getMixedStudyCards(20);
		return LearnHubService.getDomain(scope).getStudyCards({ count: 20 });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [scope, refreshKey]);

	const openDetail = (c: LearnType.StudyCard) => {
		setDetailAccent(LearnHubService.getDomain(c.domain).meta.color);
		setDetail({
			domain: c.domain,
			domainTitle: LearnHubService.getDomainTitle(c.domain),
			categoryLabel: c.categoryLabel,
			levelLabel: c.levelLabel,
			tags: c.tags,
			title: c.title,
			subTitle: c.subTitle,
			meaning: c.meaning,
			description: c.description,
			examples: c.examples,
			options: c.options,
			infoRows: c.infoRows,
		});
	};

	useEffect(() => {
		LearnProgressService.getBookmarks().then((list) => setMarked(new Set(list.map((b) => b.uid))));
	}, []);

	const refresh = () => setRefreshKey((k) => k + 1);

	const toggle = async (card: LearnType.StudyCard) => {
		const now = await LearnProgressService.toggleBookmark({
			uid: card.uid,
			domain: card.domain,
			domainTitle: LearnHubService.getDomainTitle(card.domain),
			title: card.title,
			subTitle: card.subTitle,
			meaning: card.meaning,
		});
		setMarked((prev) => {
			const next = new Set(prev);
			if (now) next.add(card.uid);
			else next.delete(card.uid);
			return next;
		});
		showToast(now ? t('common.bookmarkSaved') : t('common.bookmarkUnsaved'), now ? 'star' : 'star-border');
	};

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			{/* 스크롤 영역 — 맨 위로 버튼을 하단 고정 버튼과 겹치지 않게 이 영역 기준으로 띄운다 */}
			<View style={{ flex: 1 }}>
			<ScrollView ref={scrollTop.ref} onScroll={scrollTop.onScroll} scrollEventThrottle={16} style={styles.scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
				<FadeInUp>
				<SectionHead title={t('special.storyFeed.sectionTitle')} sub={t('special.storyFeed.sectionSub')} />
				</FadeInUp>

				{/* 주제 선택 필터 — 공용 칩(맨 앞 '전체') */}
				<CategoryScopeChips value={scope} onChange={setScope} showCount={false} style={styles.filterBar} />

				{/* 필터 전환 시 카드 그룹을 리마운트하여 부드러운 진입 애니메이션 재생 */}
				<FadeInUp key={scope}>
				{cards.length === 0 && (
					<View style={styles.empty}>
						<IconComponent type="materialIcons" name="menu-book" size={scaledSize(28)} color={Colors.textMuted} />
						<Text style={styles.emptyText}>{t('special.storyFeed.empty')}</Text>
					</View>
				)}
				<AdaptiveGrid>
					{cards.map((c) => {
						const meta = LearnHubService.getDomain(c.domain).meta;
						const color = meta.color;
						const isMarked = marked.has(c.uid);
						return (
							<TouchableOpacity key={c.uid} style={styles.card} activeOpacity={0.9} onPress={() => openDetail(c)}>
								<View style={styles.cardTop}>
									<View style={styles.cardTopLeft}>
										<View style={[styles.domainChip, { backgroundColor: withAlpha(color, '14') }]}>
											<DomainIcon mainIcon={meta.mainIcon} icon={meta.icon} iconType={meta.iconType} size={scaledSize(16)} color={color} radius={scaledSize(5)} />
											<Text style={[styles.domainText, { color }]}>{meta.title}</Text>
										</View>
										{!!c.categoryLabel && c.categoryLabel !== meta.title && (
											<View style={styles.catChip}>
												<IconComponent type="materialIcons" name={categoryIcon(c.categoryLabel)} size={scaledSize(12)} color={Colors.textSecondary} />
												<Text style={styles.catChipText} numberOfLines={1} ellipsizeMode="tail">{c.categoryLabel}</Text>
											</View>
										)}
									</View>
									<View style={styles.cardTopRight}>
										<TouchableOpacity onPress={() => toggle(c)} hitSlop={Layout.hitSlop} activeOpacity={0.7}>
											<IconComponent type="materialIcons" name={isMarked ? 'star' : 'star-border'} size={scaledSize(22)} color={isMarked ? Colors.bookmark : Colors.textMuted} />
										</TouchableOpacity>
										<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
									</View>
								</View>

								<Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{c.title}</Text>
								{!!c.subTitle && <Text style={styles.subTitle} numberOfLines={2} ellipsizeMode="tail">{c.subTitle}</Text>}

								<View style={styles.divider} />
								<Text style={styles.meaning}>{c.meaning}</Text>
								{!!c.description && c.description !== c.meaning && <Text style={styles.desc} numberOfLines={2} ellipsizeMode="tail">{c.description}</Text>}

								{!!c.examples && c.examples.length > 0 && (
									<View style={styles.exampleGroup}>
										<Text style={styles.exampleHead}>{t('special.storyFeed.examples')}</Text>
										{c.examples.slice(0, 3).map((ex, i) => (
											<View key={i} style={styles.exampleItem}>
												<Text style={styles.example}>{ex}</Text>
											</View>
										))}
									</View>
								)}

								{!!c.tags && c.tags.length > 0 && (
									<View style={styles.tagRow}>
										{c.tags.slice(0, 4).map((tag, i) => (
											<Text key={i} style={styles.tag}>
												#{tag}
											</Text>
										))}
									</View>
								)}
							</TouchableOpacity>
						);
					})}
				</AdaptiveGrid>

				<TouchableOpacity style={styles.moreBtn} activeOpacity={0.85} onPress={refresh}>
					<IconComponent type="materialIcons" name="autorenew" size={scaledSize(18)} color={Colors.primary} />
					<Text style={styles.moreText}>{t('special.storyFeed.more')}</Text>
				</TouchableOpacity>
				</FadeInUp>
			</ScrollView>
			{/* 긴 목록 — 우하단 맨 위로 버튼 */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} inset={false} />
			</View>

			{/* 하단 홈 버튼 (공용 BottomButton) */}
			<BottomButton label={t('special.home')} icon="home" onPress={() => router.replace('/(tabs)/home' as never)} />

			<DetailSheet visible={!!detail} item={detail} accent={detailAccent} onClose={() => { setDetail(null); LearnProgressService.getBookmarks().then((list) => setMarked(new Set(list.map((b) => b.uid)))); }} onBookmarkChange={() => LearnProgressService.getBookmarks().then((list) => setMarked(new Set(list.map((b) => b.uid))))} />
		</SafeAreaView>
	);
};

export default StoryFeed;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	scroll: { flex: 1 },
	list: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	// 공용 칩바의 좌우 내부 여백(Spacing.xl)을 리스트 패딩과 정렬시키기 위해 음수 마진으로 상쇄
	filterBar: { marginHorizontal: -Layout.screenH, backgroundColor: 'transparent', marginBottom: SpacingV.md },
	empty: { alignItems: 'center', justifyContent: 'center', gap: SpacingV.sm, paddingVertical: SpacingV.xxxl },
	emptyText: { fontSize: Typography.body, color: Colors.textMuted, fontWeight: '600' },
	card: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.itemGap },
	cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	cardTopLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
	cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	catChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	catChipText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	domainChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	domainText: { fontSize: Typography.footnote, fontWeight: '800' },
	title: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.md },
	subTitle: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.xs },
	divider: { height: 1, backgroundColor: Colors.border, marginVertical: SpacingV.lg },
	meaning: { fontSize: Typography.callout, color: Colors.textStrong, fontWeight: '700', lineHeight: scaleHeight(24) },
	desc: { fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(21), marginTop: SpacingV.sm },
	exampleGroup: { marginTop: SpacingV.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, padding: Spacing.md },
	exampleHead: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary, marginBottom: SpacingV.sm },
	exampleItem: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, marginBottom: SpacingV.sm },
	example: { fontSize: Typography.body, color: Colors.textSecondary, lineHeight: scaleHeight(20) },
	tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: SpacingV.md },
	tag: { fontSize: Typography.footnote, color: Colors.textMuted, fontWeight: '600' },
	moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.sm, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primarySoft },
	moreText: { fontSize: Typography.body, fontWeight: '800', color: Colors.primaryDeep },
}));
