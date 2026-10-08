/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, Share, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import Colors, { withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Layout, Border } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, contentWidth, screenWidth } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService from '@/src/services/LearnProgressService';
import { LearnType } from '@/src/types/data/LearnType';
import { stringParam } from '@/src/navigation/expoRouterUtils';
import { useToast } from '@/src/context/ToastContext';
import ExitConfirmModal from '@/src/screens/modal/ExitConfirmModal';
import { categoryIcon, difficultyIcon } from '@/src/const/ConstQuizMeta';
import { playComplete, playPop } from '@/src/utils/SoundUtils';
import { startBgm, stopBgm } from '@/src/utils/BgmUtils';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from '@/src/screens/common/CharacterGuide';
import { themed } from '@/src/utils/ThemedStyles';
import EntryImage from '@/src/screens/common/atomic/EntryImage';

type ShortsTab = 'all' | 'learning' | 'done';

/** 숏폼 조작법 안내 — 캐릭터가 최초 1회만 설명 (문구는 special.shorts.guide1~3) */
const COACH_KEYS = ['special.shorts.guide1', 'special.shorts.guide2', 'special.shorts.guide3'] as const;


/**
 * 숏폼 세로 스와이프 학습 (릴스/쇼츠형)
 * - 상단 탭: 전체 / 학습중 / 학습 완료 (완료 탭에서는 '복습하기'로 다시 학습중 전환)
 * - category 파라미터가 있으면 해당 주제 카드만, 없으면 전 주제 믹스.
 */
const Shorts = () => {
	const { t } = useTranslation();
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const compactHeight = windowHeight < 720;
	const contentLift = compactHeight ? scaleHeight(28) : windowHeight < 820 ? scaleHeight(56) : scaleHeight(88);
	const { showToast } = useToast();
	const params = useLocalSearchParams();
	const category = stringParam(params.category, '');
	const cats = stringParam(params.cats, '');
	const catList = cats ? cats.split(',').filter((c) => LearnHubService.isValidCategory(c)) : [];
	const isCategoryMode = !!category && LearnHubService.isValidCategory(category);
	const isBundleMode = catList.length > 0;
	// 진행 표시 강조색 — 카드 모드와 동일하게(주제 색, 믹스면 브랜드 색)
	const accent = isCategoryMode ? LearnHubService.getDomain(category).meta.color : Colors.primary;

	// 학습 완료 집계 대상 도메인
	const activeDomains = useMemo(() => {
		if (isBundleMode) return catList;
		if (isCategoryMode) return [category];
		return LearnHubService.getDomainList().map((d) => d.key);
	}, [category, cats]);

	// 기본 카드 목록 (한 번만 로드)
	const baseCards = useMemo<LearnType.StudyCard[]>(() => {
		if (isBundleMode) {
			const merged = catList.flatMap((c) => LearnHubService.getDomain(c).getStudyCards());
			for (let i = merged.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[merged[i], merged[j]] = [merged[j], merged[i]];
			}
			return merged;
		}
		if (isCategoryMode) return LearnHubService.getDomain(category).getStudyCards();
		return LearnHubService.getAllStudyCards();
	}, [category, cats]);

	const [studiedSet, setStudiedSet] = useState<Set<string>>(new Set());
	const [tab, setTab] = useState<ShortsTab>('learning');
	const [marked, setMarked] = useState<Set<string>>(new Set());
	const [h, setH] = useState(0);
	const [showExit, setShowExit] = useState(false);
	// 조작법 안내 — 처음 들어온 사용자에게만 1회
	const coach = useCharacterGuideOnce('learn-shorts');
	// 현재 보이는 페이지 — 스와이프해서 도착한 카드에만 진입 애니메이션을 준다
	const [activeIndex, setActiveIndex] = useState(0);
	const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
	const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
		const i = viewableItems[0]?.index;
		if (typeof i === 'number') setActiveIndex(i);
	}).current;
	const listRef = useRef<FlatList>(null);
	// 본문이 화면을 넘칠 때만 내부 스크롤을 켠다(항상 켜면 세로 페이징 제스처를 뺏김)
	const [overflow, setOverflow] = useState(false);
	const viewportRef = useRef(0);

	// 이미 즐겨찾기한 카드는 별이 채워진 상태로 시작해야 한다(안 불러오면 첫 탭이 저장이 아니라 해제로 동작)
	useFocusEffect(
		useCallback(() => {
			let alive = true;
			LearnProgressService.getBookmarks().then((bm) => {
				if (alive) setMarked(new Set(bm.map((b) => b.uid)));
			});
			return () => {
				alive = false;
			};
		}, []),
	);

	const loadStudied = useCallback(() => {
		Promise.all(activeDomains.map((d) => LearnProgressService.getStudiedSet(d))).then((sets) => {
			const merged = new Set<string>();
			sets.forEach((s) => s.forEach((u) => merged.add(u)));
			setStudiedSet(merged);
			setListStudied(merged);
		});
	}, [activeDomains]);

	useFocusEffect(useCallback(() => loadStudied(), [loadStudied]));
	// 배경음악 — 화면에 있는 동안 잔잔한 학습 트랙, 다른 화면으로 가면 정지
	useFocusEffect(useCallback(() => {
		startBgm('study');
		return () => stopBgm();
	}, []));

	// 목록 필터는 '탭 진입 시점의 학습 상태' 스냅샷으로 고정한다.
	// (완료를 누른 즉시 목록에서 카드가 빠지면 스크롤 보정과 겹쳐 카드가 깜빡였다)
	const [listStudied, setListStudied] = useState<Set<string>>(new Set());
	const doneCount = useMemo(() => baseCards.filter((c) => studiedSet.has(c.uid)).length, [baseCards, studiedSet]);
	const learningCount = baseCards.length - doneCount;
	const donePct = baseCards.length > 0 ? Math.round((doneCount / baseCards.length) * 100) : 0;

	const cards = useMemo(() => {
		if (tab === 'done') return baseCards.filter((c) => listStudied.has(c.uid));
		if (tab === 'learning') return baseCards.filter((c) => !listStudied.has(c.uid));
		return baseCards;
	}, [baseCards, listStudied, tab]);

	const onLayout = (e: LayoutChangeEvent) => setH(e.nativeEvent.layout.height);

	const changeTab = (next: ShortsTab) => {
		setListStudied(new Set(studiedSet));
		setTab(next);
		listRef.current?.scrollToOffset({ offset: 0, animated: false });
	};

	// 학습 완료 → 목록은 그대로 두고 다음 카드로만 부드럽게 이동한다
	const completeAndNext = (card: LearnType.StudyCard, currentIndex: number) => {
		playComplete();
		LearnProgressService.addStudied(card.domain, card.uid);
		const nextStudied = new Set(studiedSet).add(card.uid);
		setStudiedSet(nextStudied);
		const hasNextBelow = currentIndex + 1 < cards.length;
		if (hasNextBelow && h > 0) {
			listRef.current?.scrollToOffset({ offset: (currentIndex + 1) * h, animated: true });
			showToast(t('special.shorts.toastNext'));
			return;
		}
		const remaining = baseCards.filter((c) => !nextStudied.has(c.uid));
		showToast(remaining.length === 0 ? t('special.shorts.toastAllDone') : t('special.shorts.toastDone'), remaining.length === 0 ? 'celebration' : 'check-circle');
	};

	// 복습하기 — 다시 학습중으로
	const review = (card: LearnType.StudyCard) => {
		playComplete();
		LearnProgressService.removeStudied(card.domain, card.uid);
		setStudiedSet((prev) => {
			const next = new Set(prev);
			next.delete(card.uid);
			return next;
		});
		showToast(t('special.shorts.toastReview'), 'refresh');
	};

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
		playPop();
		showToast(now ? t('common.bookmarkSaved') : t('common.bookmarkUnsaved'), 'bookmark');
	};

	const share = (card: LearnType.StudyCard) =>
		Share.share({ message: t('special.shorts.shareMessage', { domain: LearnHubService.getDomainTitle(card.domain), title: card.title, meaning: card.meaning }) }).catch(() => {});

	const renderItem = ({ item, index }: { item: LearnType.StudyCard; index: number }) => {
		const color = LearnHubService.getDomain(item.domain).meta.color;
		const domainMeta = LearnHubService.getDomain(item.domain).meta;
		const isMarked = marked.has(item.uid);
		const isDone = studiedSet.has(item.uid);
		return (
			<View style={[styles.page, { height: h || undefined }]}>
				<LinearGradient colors={[Colors.darkSurface, Colors.darkBackground]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
				<View style={[styles.pageContent, { paddingTop: insets.top + scaleHeight(136), paddingBottom: insets.bottom + scaleHeight(30) }]}>
					<View style={styles.topRow}>
						<View style={[styles.domainChip, { backgroundColor: color }]}>
							<DomainIcon mainIcon={domainMeta.mainIcon} icon={domainMeta.icon} iconType={domainMeta.iconType} size={scaledSize(15)} color={Colors.darkText} />
							<Text style={styles.domainText}>{LearnHubService.getDomainTitle(item.domain)}</Text>
						</View>
						<View style={styles.swipeHintTop}>
							<IconComponent type="materialIcons" name="swipe-vertical" size={scaledSize(15)} color={Colors.darkTextSecondary} />
							<Text style={styles.swipeHintTopText}>{t('special.shorts.swipeHint')}</Text>
						</View>
					</View>

					{/* 주제와 함께 상단 고정: 카테고리·난이도 (본문과 겹치지 않도록 center 밖으로 분리) */}
					{(!!item.categoryLabel || !!item.levelLabel) && (
						<View style={styles.metaRow}>
							{!!item.categoryLabel && (
								<View style={styles.metaChip}>
									<IconComponent type="materialIcons" name={categoryIcon(item.categoryLabel)} size={scaledSize(12)} color={Colors.darkText} />
									<Text style={styles.metaChipText} numberOfLines={1} ellipsizeMode="tail">{item.categoryLabel}</Text>
								</View>
							)}
							{!!item.levelLabel && (
								<View style={styles.metaChip}>
									<IconComponent type="materialIcons" name={difficultyIcon(item.levelLabel)} size={scaledSize(12)} color={Colors.darkText} />
									<Text style={styles.metaChipText} numberOfLines={1} ellipsizeMode="tail">{item.levelLabel}</Text>
								</View>
							)}
						</View>
					)}

					<FadeInUp key={index === activeIndex ? 'on' : 'off'} duration={420} distance={18} style={styles.fadeFill}>
					{/* 설명이 긴 카드는 화면 밖으로 잘리므로 본문만 따로 스크롤시킨다 */}
					<ScrollView
						style={styles.fadeFill}
						contentContainerStyle={[styles.center, styles.centerRailGap, { paddingBottom: contentLift }]}
						showsVerticalScrollIndicator={false}
						nestedScrollEnabled
						bounces={false}
						// 넘칠 때만 내부 스크롤을 켠다 — 항상 켜두면 세로 페이징 제스처를 뺏는다
						scrollEnabled={overflow}
						onLayout={(e) => (viewportRef.current = e.nativeEvent.layout.height)}
						onContentSizeChange={(_w, h) => setOverflow(h > viewportRef.current + 1)}>
						{!!item.imageRef && <EntryImage imageRef={item.imageRef} width={compactHeight ? scaleWidth(120) : scaleWidth(170)} fetchWidth={360} style={styles.image} />}
						<Text style={[styles.title, compactHeight && styles.titleCompact]} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
						{!!item.subTitle && <Text style={styles.subTitle} numberOfLines={2} ellipsizeMode="tail">{item.subTitle}</Text>}
						<View style={[styles.divider, { backgroundColor: color }]} />
						<Text lineBreakStrategyIOS="hangul-word" style={[styles.meaning, compactHeight && styles.meaningCompact]}>{item.meaning}</Text>
						{!!item.examples && item.examples.length > 0 && <Text lineBreakStrategyIOS="hangul-word" style={[styles.example, compactHeight && styles.exampleCompact]}>"{item.examples[0]}"</Text>}
					</ScrollView>
					</FadeInUp>

					<View style={styles.bottomRow}>
						{isDone ? (
							<TouchableOpacity style={styles.reviewBtn} activeOpacity={0.85} onPress={() => review(item)}>
								<IconComponent type="materialIcons" name="refresh" size={scaledSize(22)} color={Colors.darkText} />
								<Text style={styles.reviewBtnText}>{t('special.shorts.review')}</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity style={styles.completeBtn} activeOpacity={0.85} onPress={() => completeAndNext(item, index)}>
								<IconComponent type="materialIcons" name="check-circle" size={scaledSize(22)} color={Colors.ink} />
								<Text style={styles.completeBtnText}>{t('special.shorts.complete')}</Text>
							</TouchableOpacity>
						)}
						<Text style={styles.pageIdx}>{index + 1} / {cards.length}</Text>
					</View>
				</View>

				{/* 우측 액션 레일 */}
				{/* 하단 '학습 완료' 버튼 위로 SpacingV.lg 만큼 띄운다 */}
				<View style={[styles.rail, { bottom: insets.bottom + scaleHeight(96) }]}>
					<TouchableOpacity style={styles.railBtn} activeOpacity={0.8} onPress={() => toggle(item)}>
						<IconComponent type="materialIcons" name={isMarked ? 'star' : 'star-border'} size={scaledSize(30)} color={isMarked ? Colors.bookmark : Colors.darkText} />
						<Text style={styles.railLabel}>{t('special.shorts.bookmark')}</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.railBtn} activeOpacity={0.8} onPress={() => share(item)}>
						<IconComponent type="materialIcons" name="ios-share" size={scaledSize(28)} color={Colors.darkText} />
						<Text style={styles.railLabel}>{t('special.shorts.share')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	const TABS: { key: ShortsTab; label: string; count: number }[] = [
		{ key: 'all', label: t('common.all'), count: baseCards.length },
		{ key: 'learning', label: t('special.shorts.tabLearning'), count: learningCount },
		{ key: 'done', label: t('common.done'), count: doneCount },
	];

	return (
		<View style={styles.safe} onLayout={onLayout}>
			{h > 0 && cards.length > 0 ? (
				<FlatList
					key={tab}
					ref={listRef}
					data={cards}
					// 목록(cards)은 그대로 두고 학습 상태만 바뀌므로 갱신 신호를 따로 준다
					extraData={studiedSet}
					keyExtractor={(item, i) => `${item.uid}-${i}`}
					renderItem={renderItem}
					pagingEnabled
					showsVerticalScrollIndicator={false}
					decelerationRate="fast"
					getItemLayout={(_, index) => ({ length: h, offset: h * index, index })}
					viewabilityConfig={viewabilityConfig}
					onViewableItemsChanged={onViewableItemsChanged}
				/>
			) : (
				h > 0 && (
					<View style={styles.emptyWrap}>
						<IconComponent type="materialIcons" name={tab === 'done' ? 'inventory-2' : 'menu-book'} size={scaledSize(48)} color={Colors.darkTextSecondary} />
						<Text style={styles.emptyText}>
							{tab === 'done' ? t('special.shorts.emptyDone') : tab === 'learning' ? t('special.shorts.emptyLearning') : t('special.shorts.emptyAll')}
						</Text>
					</View>
				)
			)}

			{/* 상단 탭 (전체/학습중/완료) */}
			<View style={[styles.tabBar, { top: insets.top + scaleHeight(8) }]}>
				{TABS.map((item) => {
					const on = tab === item.key;
					return (
						<TouchableOpacity
							key={item.key}
							accessibilityRole="tab"
							accessibilityState={{ selected: on }}
							style={[styles.tabBtn, on && styles.tabBtnOn]}
							activeOpacity={0.85}
							onPress={() => changeTab(item.key)}>
							<Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1} ellipsizeMode="tail">
								{t('special.shorts.tabLabel', { label: item.label, count: item.count })}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			{/* 나의 학습 스코어 — 카드 모드와 동일한 진행 표시로 통일 */}
			{baseCards.length > 0 && (
				<View style={[styles.learnStatus, { top: insets.top + scaleHeight(52) }]} pointerEvents="none">
					<View style={styles.learnStatusLeft}>
						<View style={[styles.learnStatusIcon, { backgroundColor: withAlpha(accent, '33') }]}>
							<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(15)} color={accent} />
						</View>
						<Text style={styles.learnStatusText}>
							{t('special.shorts.complete')} <Text style={[styles.learnStatusStrong, { color: accent }]}>{doneCount}</Text>
							<Text style={styles.learnStatusMuted}> / {baseCards.length}</Text>
						</Text>
					</View>
					<View style={[styles.learnStatusPctChip, { backgroundColor: withAlpha(accent, '33') }]}>
						<Text style={[styles.learnStatusPct, { color: accent }]}>{t('special.shorts.pct', { value: donePct })}</Text>
					</View>
				</View>
			)}

			<ExitConfirmModal visible={showExit} onCancel={() => setShowExit(false)} onConfirm={() => { setShowExit(false); router.replace('/(tabs)/home' as never); }} />

			{/* 조작법 안내 — 최초 1회, 카드 모드와 동일하게 캐릭터가 설명 */}
			<CharacterGuide
				visible={coach.visible && cards.length > 0}
				onClose={coach.close}
				lines={COACH_KEYS.map((k) => t(k))}
				title={t('special.shorts.guideTitle')}
				accent={accent}
			/>

			{/* 조작법 다시 보기 */}
			<View style={[styles.helpBtn, { top: insets.top + scaleHeight(8) }]}>
				<CharacterGuideButton onPress={coach.open} color={Colors.darkText} size={scaledSize(22)} />
			</View>

			<TouchableOpacity accessibilityRole="button" accessibilityLabel={t('special.shorts.exitA11y')} style={[styles.close, { top: insets.top + scaleHeight(8) }]} activeOpacity={0.8} onPress={() => setShowExit(true)} hitSlop={Layout.hitSlop}>
				<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.darkText} />
			</TouchableOpacity>
		</View>
	);
};

export default Shorts;


// 숏폼은 전체화면이라 AppLayout 의 본문 폭 래퍼를 타지 않는다.
// 태블릿에서 한 줄이 1000px 가까이 늘어나지 않도록 본문 폭만큼만 쓰고 남는 좌우를 인셋으로 흡수한다.
const SHORTS_SIDE = (screenWidth - contentWidth) / 2;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.darkBackground },
	page: { width: '100%', justifyContent: 'center' },
	pageContent: { flex: 1, width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingHorizontal: Layout.screenH },
	topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	domainChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.xl },
	domainText: { color: Colors.darkText, fontSize: Typography.footnote, fontWeight: '800' },
	swipeHintTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.darkSurface, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.lg },
	swipeHintTopText: { color: Colors.darkTextSecondary, fontSize: Typography.footnote, fontWeight: '700' },
	metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: SpacingV.md, marginBottom: SpacingV.lg },
	metaChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.darkSurface, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	metaChipText: { color: Colors.darkText, fontSize: Typography.footnote, fontWeight: '800' },
	// 화면 높이에 따라 메타 태그부터 본문까지의 이동량을 동적으로 적용한다.
	fadeFill: { flex: 1 },
	center: { flexGrow: 1, justifyContent: 'center' },
	// 우측 액션 레일(즐겨찾기·공유) 아래로 긴 설명이 지나가지 않게 오른쪽을 비운다
	centerRailGap: { paddingRight: scaleWidth(56) },
	image: { marginBottom: SpacingV.lg, borderRadius: Radius.md },
	title: { color: Colors.darkText, fontSize: Typography.h1, fontWeight: '900', lineHeight: scaleHeight(40) },
	titleCompact: { fontSize: Typography.h1, lineHeight: scaleHeight(35) },
	subTitle: { color: Colors.darkTextSecondary, fontSize: Typography.title, marginTop: SpacingV.sm },
	divider: { height: scaleHeight(2), width: scaleWidth(48), backgroundColor: Colors.darkBorder, borderRadius: scaleWidth(2), marginVertical: SpacingV.xl },
	meaning: { color: Colors.darkText, fontSize: Typography.h3, fontWeight: '600', lineHeight: scaleHeight(28) },
	meaningCompact: { fontSize: Typography.title, lineHeight: scaleHeight(25) },
	example: { color: Colors.darkTextSecondary, fontSize: Typography.callout, fontStyle: 'italic', lineHeight: scaleHeight(23), marginTop: SpacingV.lg },
	exampleCompact: { fontSize: Typography.body, lineHeight: scaleHeight(20), marginTop: SpacingV.sm },
	bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.textInverse, paddingVertical: SpacingV.md, borderRadius: Radius.xxl },
	completeBtnText: { color: Colors.ink, fontSize: Typography.callout, fontWeight: '900' },
	reviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.darkSurface, borderWidth: Border.thin, borderColor: Colors.darkBorder, paddingVertical: SpacingV.lg, borderRadius: Radius.xxl },
	reviewBtnText: { color: Colors.darkText, fontSize: Typography.title, fontWeight: '900' },
	pageIdx: { color: Colors.darkTextSecondary, fontSize: Typography.body, fontWeight: '800' },
	rail: { position: 'absolute', right: Layout.screenH + SHORTS_SIDE, alignItems: 'center', gap: SpacingV.lg },
	railBtn: { alignItems: 'center', gap: SpacingV.xs },
	railLabel: { color: Colors.darkText, fontSize: Typography.footnote, fontWeight: '700' },
	// 우측 상단 도움말·닫기 버튼과 겹치지 않도록 오른쪽 경계를 둔다
	tabBar: { position: 'absolute', left: Layout.screenH + SHORTS_SIDE, right: Layout.screenH + scaleWidth(80) + Spacing.lg + SHORTS_SIDE, flexDirection: 'row', gap: Spacing.sm, backgroundColor: withAlpha(Colors.darkSurface, 'E6'), padding: Spacing.xs, borderRadius: Radius.xl },
	tabBtn: { flexShrink: 1, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.lg },
	// 이 화면은 테마와 무관하게 항상 어둡다 — surface 를 쓰면 다크 모드에서 버튼까지 어두워져 글자가 묻는다
	tabBtnOn: { backgroundColor: Colors.textInverse },
	tabText: { color: Colors.darkTextSecondary, fontSize: Typography.footnote, fontWeight: '800' },
	tabTextOn: { color: Colors.ink },
	// 진행 표시 — 카드 모드(learn/study)의 '나의 학습 스코어'와 동일한 구조, 다크 배경에 맞춰 색만 조정
	learnStatus: { position: 'absolute', left: Layout.screenH + SHORTS_SIDE, right: Layout.screenH + SHORTS_SIDE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: withAlpha(Colors.darkSurface, 'E6'), paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm, borderRadius: Radius.lg },
	learnStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	learnStatusIcon: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center' },
	learnStatusText: { fontSize: Typography.body, fontWeight: '700', color: Colors.darkTextSecondary },
	learnStatusStrong: { fontSize: Typography.body, fontWeight: '900' },
	learnStatusMuted: { fontSize: Typography.body, color: Colors.darkTextSecondary, fontWeight: '700' },
	learnStatusPctChip: { paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	learnStatusPct: { fontSize: Typography.footnote, fontWeight: '900' },
	emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxxl },
	emptyText: { color: Colors.darkTextSecondary, fontSize: Typography.body, fontWeight: '700', marginTop: SpacingV.lg, textAlign: 'center' },
	helpBtn: { position: 'absolute', right: Layout.screenH + scaleWidth(40) + Spacing.sm + SHORTS_SIDE, width: scaleWidth(40), height: scaleWidth(40), borderRadius: Radius.xl, backgroundColor: withAlpha(Colors.darkSurface, 'E6'), justifyContent: 'center', alignItems: 'center' },
	close: { position: 'absolute', right: Layout.screenH + SHORTS_SIDE, width: scaleWidth(40), height: scaleWidth(40), borderRadius: Radius.xl, backgroundColor: withAlpha(Colors.darkSurface, 'E6'), justifyContent: 'center', alignItems: 'center' },
}));
