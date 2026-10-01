/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import CommonHeader from '@/src/screens/common/CommonHeader';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import SectionHead from '@/src/screens/common/atomic/SectionHead';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import Colors, { withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleWidth } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnQuizPlayer from '@/src/screens/common/LearnQuizPlayer';
import DifficultyPickerModal, { DifficultyOption } from '@/src/screens/modal/DifficultyPickerModal';
import { themed } from '@/src/utils/ThemedStyles';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';

/** 시작 시 즉시 생성할 첫 묶음 문항 수 (나머지는 백그라운드로 이어붙임) */
const FIRST_CHUNK = 20;
/** 이어붙일 나머지 문항 상한 — 전 카드(수천 문항)를 한 번에 동기 생성하면 프레임이 끊긴다 */
const REST_MAX = 200;

/**
 * 묶음 퀴즈 — 여러 주제를 골라 한 번에 푸는 퀴즈
 * - 주제 선택 단계 → 선택한 주제들에서 골고루 출제 (generateFocusedQuiz)
 */
const QuizBundle = () => {
	const { t } = useTranslation();
	// 서비스가 매번 새 배열을 만들므로 한 번만 잡아둔다(아래 useMemo 들이 매 렌더 무효화되지 않게)
	const mainDomains = useMemo(() => LearnHubService.getDomainList(), []);
	const subDomains = useMemo(() => LearnHubService.getSubQuizDomainList(), []);
	const params = useLocalSearchParams<{ level?: string; cats?: string }>();
	const initialLevel = typeof params.level === 'string' && params.level ? params.level : undefined;
	// 학습 화면에서 '이어서 퀴즈'로 넘어오면 그 주제들을 미리 선택해 둔다
	const initialCats = typeof params.cats === 'string' && params.cats ? params.cats.split(',').filter(Boolean) : [];

	const [selected, setSelected] = useState<string[]>(initialCats);
	// 주제 탭 — 메인 주제 / 서브 퀴즈는 서로 섞이지 않는다(탭을 바꾸면 선택도 초기화)
	// 미리 선택된 주제가 서브 퀴즈면 서브 탭으로 시작해야 칩이 켜진 채 보인다
	const [topicTab, setTopicTab] = useState<'main' | 'sub'>(() =>
		subDomains.some((d) => initialCats.includes(d.key)) ? 'sub' : 'main',
	);
	const visibleDomains = topicTab === 'main' ? mainDomains : subDomains;
	const listRef = useRef<ScrollView>(null);
	const scrollTop = useScrollTop(listRef);
	/** 탭 전환 — 목록·선택을 갈아 끼우고 스크롤을 맨 위로 되돌린다 */
	const changeTopicTab = (next: 'main' | 'sub') => {
		if (next === topicTab) return;
		setTopicTab(next);
		setSelected([]);
		listRef.current?.scrollTo({ y: 0, animated: false });
	};
	const [started, setStarted] = useState(false);
	const [randomMode, setRandomMode] = useState(false);
	// 난이도(초급/중급/고급/특급) — 시작 전에 bottom modal에서 고른 값만 사용
	const [level, setLevel] = useState<string | undefined>(initialLevel);
	const [difficultyOpen, setDifficultyOpen] = useState(false);
	// 난이도 선택 후 시작할 모드
	const [pendingAction, setPendingAction] = useState<'random' | 'bundle'>('bundle');

	const toggle = (key: string) => {
		setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
	};
	// 전체 선택/해제는 현재 탭에 보이는 주제에만 적용한다
	const selectAll = () => setSelected((prev) => [...new Set([...prev, ...visibleDomains.map((d) => d.key)])]);
	const clearAll = () => setSelected((prev) => prev.filter((k) => !visibleDomains.some((d) => d.key === k)));
	const visibleSelected = visibleDomains.filter((d) => selected.includes(d.key)).length;
	const allSelected = visibleDomains.length > 0 && visibleSelected === visibleDomains.length;

	// 시작 버튼 → 난이도 팝업을 먼저 띄우고, 선택 후 해당 난이도로 시작
	const requestStart = (mode: 'random' | 'bundle') => {
		setPendingAction(mode);
		setDifficultyOpen(true);
	};
	const onPickDifficulty = (lvl: string | null) => {
		setDifficultyOpen(false);
		setLevel(lvl ?? undefined);
		setRandomMode(pendingAction === 'random');
		setStarted(true);
	};

	const levelSuffix = level ? ` · ${level}` : '';
	// 0개 선택 시 '현재 탭'의 주제로만 출제 — 메인 주제 탭에서 서브 퀴즈가 섞여 나오지 않게 한다
	const effectiveTopics = useMemo(
		() => (selected.length > 0 ? selected : visibleDomains.map((d) => d.key)),
		[selected, visibleDomains],
	);
	const tabLabel = topicTab === 'main' ? t('quiz.common.tabMain') : t('quiz.common.tabSub');
	// 난이도 팝업용 옵션 — 선택 주제(0개면 전체) 기준 난이도별 문제 수 집계 (카테고리 팝업과 동일 형태)
	const difficultyOptions = useMemo<DifficultyOption[]>(() => {
		// 팝업이 닫혀 있으면 전 카드 순회를 하지 않는다(화면 진입 지연 제거)
		if (!difficultyOpen) return [];
		const counts: Record<string, number> = {};
		let totalC = 0;
		effectiveTopics.forEach((k) => {
			try {
				const d = LearnHubService.getDomain(k);
				d.getStudyCards({ count: d.meta.total }).forEach((c) => {
					totalC += 1;
					if (c.levelLabel) counts[c.levelLabel] = (counts[c.levelLabel] ?? 0) + 1;
				});
			} catch {}
		});
		const ORDER: { key: string; icon: string }[] = [
			{ key: '초급', icon: 'signal-cellular-alt' },
			{ key: '중급', icon: 'bar-chart' },
			{ key: '고급', icon: 'trending-up' },
			{ key: '특급', icon: 'whatshot' },
		];
		return [
			{ key: '', label: t('common.all'), icon: 'apps', count: totalC },
			...ORDER.filter((o) => (counts[o.key] ?? 0) > 0).map((o) => ({ key: o.key, label: o.key, icon: o.icon, count: counts[o.key] })),
		];
	}, [effectiveTopics, difficultyOpen, t]);
	// 선택한 주제명으로 타이틀 구성 (예: "속담, 사자성어 퀴즈"), 3개 이상이면 개수로 축약
	const bundleTitle =
		(randomMode
			? t('quiz.modes.random')
			: t('quiz.common.titleOf', {
				title:
					selected.length === 0
						? tabLabel
						: selected.length > 2
							? t('quiz.common.topicCount', { count: selected.length })
							: selected.map((k) => LearnHubService.getDomainTitle(k)).join(', '),
			})) + levelSuffix;

	if (started) {
		return (
			<LearnQuizPlayer
				title={bundleTitle}
				accent={Colors.primary}
				modeLabel={t('quiz.common.resultOf', { title: bundleTitle })}
				mode={randomMode ? 'random' : 'bundle'}
				// 첫 묶음(20문항)만 즉시 생성해 바로 시작 → 나머지는 백그라운드로 REST_MAX 까지 이어붙임
				generate={() => (randomMode ? LearnHubService.generateMixedQuiz(FIRST_CHUNK, level) : LearnHubService.generateFocusedQuiz(effectiveTopics, FIRST_CHUNK, level))}
				generateRest={() => (randomMode ? LearnHubService.generateMixedQuiz(REST_MAX, level) : LearnHubService.generateFocusedQuiz(effectiveTopics, REST_MAX, level))}
			/>
		);
	}

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<CommonHeader title={t('quiz.bundle.title')} onBack={() => router.back()} />

			<View style={styles.tabRow}>
				{([
					{ key: 'main', label: t('quiz.common.tabMain'), icon: 'category', count: mainDomains.length },
					{ key: 'sub', label: t('quiz.common.tabSub'), icon: 'extension', count: subDomains.length },
				] as const).map((tab) => {
					const on = topicTab === tab.key;
					return (
						<TouchableOpacity
							key={tab.key}
							style={[styles.tabBtn, on && styles.tabBtnOn]}
							activeOpacity={0.85}
							accessibilityRole="tab"
							accessibilityState={{ selected: on }}
							onPress={() => changeTopicTab(tab.key)}>
							<IconComponent type="materialIcons" name={tab.icon} size={scaledSize(16)} color={on ? Colors.textInverse : Colors.textMuted} />
							<Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1} ellipsizeMode="tail">{tab.label}</Text>
							<View style={[styles.tabCount, on && styles.tabCountOn]}>
								<Text style={[styles.tabCountText, on && styles.tabCountTextOn]}>{tab.count}</Text>
							</View>
						</TouchableOpacity>
					);
				})}
			</View>

			{/* 스크롤 영역 — 맨 위로 버튼을 하단 고정 버튼과 겹치지 않게 이 영역 기준으로 띄운다 */}
			<View style={{ flex: 1 }}>
			<ScrollView onScroll={scrollTop.onScroll} scrollEventThrottle={16} ref={listRef} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
				<View style={styles.heroCard}>
					<Image
						source={topicTab === 'main'
							? require('@/src/assets/selection/quiz-main-hero.webp')
							: require('@/src/assets/selection/quiz-sub-hero.webp')}
						style={styles.selectionHero}
						contentFit="cover"
						accessible={false}
					/>
					<TouchableOpacity style={styles.randomCta} activeOpacity={0.85} accessibilityRole="button" onPress={() => requestStart('random')}>
						<View style={styles.randomIcon}>
							<IconComponent type="materialIcons" name="shuffle" size={scaledSize(20)} color={Colors.primary} />
						</View>
						<View style={styles.rowBody}>
							<Text style={styles.rowTitle}>{t('quiz.modes.random')}</Text>
							<Text style={styles.rowSub} numberOfLines={1}>{t('quiz.bundle.randomDesc')}</Text>
						</View>
						<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
					</TouchableOpacity>
				</View>

				<SectionHead
					title={t('quiz.common.selectTopics')}
					style={styles.sectionHead}
					right={
						<View style={styles.actionBtns}>
							<View style={styles.countBadge}>
								<Text style={styles.countText}>{visibleSelected}/{visibleDomains.length}</Text>
							</View>
							<TouchableOpacity onPress={allSelected ? clearAll : selectAll} activeOpacity={0.7} hitSlop={8}>
								<Text style={styles.actionText}>{allSelected ? t('quiz.common.clearAll') : t('quiz.common.selectAll')}</Text>
							</TouchableOpacity>
						</View>
					}
				/>
				{visibleDomains.map((d, i) => {
					const on = selected.includes(d.key);
					return (
						<FadeInUp key={d.key} delay={40 + i * 45} duration={340} distance={12}>
						<TouchableOpacity style={[styles.row, on && { borderColor: d.color, backgroundColor: withAlpha(d.color, '0F') }]} activeOpacity={0.85} onPress={() => toggle(d.key)}>
							<View style={[styles.rowIcon, { backgroundColor: d.mainIcon ? Colors.surfaceAlt : withAlpha(d.color, '14') }]}>
								<DomainIcon mainIcon={d.mainIcon} icon={d.icon} iconType={d.iconType} size={scaledSize(d.mainIcon ? 32 : 22)} color={d.color} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="tail">{d.title}</Text>
								<Text style={styles.rowSub} numberOfLines={2} ellipsizeMode="tail">{d.subtitle}</Text>
							</View>
							<IconComponent
								type="materialIcons"
								name={on ? 'check-circle' : 'radio-button-unchecked'}
								size={scaledSize(24)}
								color={on ? d.color : Colors.textMuted}
							/>
						</TouchableOpacity>
						</FadeInUp>
					);
				})}
			</ScrollView>
			{/* 긴 목록 — 우하단 맨 위로 버튼 */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} inset={false} />
			</View>

			<BottomButton
				label={selected.length > 0 ? t('quiz.bundle.startWith', { count: selected.length }) : t('quiz.bundle.startAll', { tab: tabLabel })}
				icon="play-arrow"
				onPress={() => requestStart('bundle')}
			/>

			<DifficultyPickerModal
				visible={difficultyOpen}
				value={level}
				options={difficultyOptions}
				subtitle={selected.length === 0 ? t('quiz.bundle.subtitleAll', { tab: tabLabel }) : t('quiz.bundle.subtitleSelected')}
				onClose={() => setDifficultyOpen(false)}
				onSelect={onPickDifficulty}
			/>
		</SafeAreaView>
	);
};

export default QuizBundle;

const styles = themed(() => StyleSheet.create({
	heroCard: { ...CardSurface, borderRadius: Radius.lg, overflow: 'hidden' },
	selectionHero: { width: '100%', aspectRatio: 2 },
	sectionHead: { marginTop: SpacingV.xl },
	countBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, backgroundColor: Colors.primarySoft },
	countText: { fontSize: Typography.caption, fontWeight: '900', color: Colors.primary },
	safe: { flex: 1, backgroundColor: Colors.background },
	// 세그먼트 컨트롤 — 회색 트랙 위에서 선택된 칸만 브랜드색으로 채운다
	tabRow: { flexDirection: 'row', gap: Spacing.xxs, marginHorizontal: Layout.screenH, marginTop: SpacingV.lg, padding: Spacing.xxs, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
	tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: SpacingV.sm, borderRadius: Radius.md },
	tabBtnOn: { backgroundColor: Colors.primary },
	tabText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textSecondary },
	tabTextOn: { color: Colors.textInverse },
	// 개수 — 라벨 옆 알약 태그로 감싸 허전하지 않게
	tabCount: { minWidth: scaleWidth(22), alignItems: 'center', borderRadius: Radius.pill, paddingHorizontal: Spacing.xs, paddingVertical: SpacingV.xxs, backgroundColor: Colors.surface },
	tabCountOn: { backgroundColor: Colors.onBrandSurfaceStrong },
	tabCountText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.textMuted },
	tabCountTextOn: { color: Colors.textInverse },
	randomCta: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
	randomIcon: { width: scaleWidth(46), height: scaleWidth(46), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md, backgroundColor: Colors.primarySoft },
	actionBtns: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	actionText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.primary },
	list: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	row: { ...CardSurface, flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.itemGap },
	rowIcon: { width: scaleWidth(46), height: scaleWidth(46), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	rowBody: { flex: 1 },
	rowTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	rowSub: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },
}));
