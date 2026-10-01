/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import BottomSheet from '@/src/screens/common/atomic/BottomSheet';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import Colors, { withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleWidth } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import CommonHeader from '@/src/screens/common/CommonHeader';
import SectionHead from '@/src/screens/common/atomic/SectionHead';
import { themed } from '@/src/utils/ThemedStyles';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';

/**
 * 세계 상식 학습 — 여러 주제를 골라 묶어서 학습하거나, 그냥 랜덤으로 학습
 * - 묶어서: 선택 주제들의 카드를 숏폼으로 학습 (/shorts?cats=a,b,c)
 * - 랜덤: 전 주제 믹스 숏폼 (/shorts)
 */
const StudyBundle = () => {
	const { t } = useTranslation();
	const mainDomains = LearnHubService.getDomainList();
	const subDomains = LearnHubService.getSubQuizDomainList();
	// 주제 탭 — 퀴즈 선택 화면과 같은 형태. 메인 주제 / 서브 퀴즈는 섞이지 않는다
	const [topicTab, setTopicTab] = useState<'main' | 'sub'>('main');
	const domains = topicTab === 'main' ? mainDomains : subDomains;
	const listRef = useRef<ScrollView>(null);
	const scrollTop = useScrollTop(listRef);
	const [selected, setSelected] = useState<string[]>([]);
	const [showMode, setShowMode] = useState(false);
	const [randomMode, setRandomMode] = useState(false);

	/** 탭 전환 — 목록·선택을 갈아 끼우고 스크롤을 맨 위로 되돌린다 */
	const changeTopicTab = (next: 'main' | 'sub') => {
		if (next === topicTab) return;
		setTopicTab(next);
		setSelected([]);
		listRef.current?.scrollTo({ y: 0, animated: false });
	};
	const toggle = (key: string) => setSelected((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
	const selectAll = () => setSelected(domains.map((d) => d.key));
	const clearAll = () => setSelected([]);
	const allSelected = domains.length > 0 && selected.length === domains.length;

	const startBundle = () => {
		if (selected.length === 0) return;
		setRandomMode(false);
		setShowMode(true);
	};
	const startRandom = () => {
		setRandomMode(true);
		setShowMode(true);
	};
	/** 학습 대상 주제 — 랜덤이면 현재 탭 전체, 아니면 고른 주제 (숏폼·카드 범위를 같게 맞춘다) */
	const targetCats = () => (randomMode ? domains.map((d) => d.key) : selected);
	const startShorts = () => {
		setShowMode(false);
		router.push({ pathname: '/special/shorts', params: { cats: targetCats().join(',') } } as never);
	};
	const startCards = () => {
		setShowMode(false);
		router.push({ pathname: '/learn/study', params: { cats: targetCats().join(',') } } as never);
	};

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<CommonHeader title={t('learn.bundle.title')} onBack={() => router.back()} />

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
				<FadeInUp>
					<View style={styles.heroCard}>
						<Image
							source={topicTab === 'main'
								? require('@/src/assets/selection/study-selection-hero.webp')
								: require('@/src/assets/selection/study-sub-hero.webp')}
							style={styles.selectionHero}
							contentFit="cover"
							accessible={false}
						/>
						<TouchableOpacity style={styles.randomCta} activeOpacity={0.85} accessibilityRole="button" onPress={startRandom}>
							<View style={styles.randomIcon}>
								<IconComponent type="materialIcons" name="shuffle" size={scaledSize(20)} color={Colors.primary} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowTitle}>{t('learn.bundle.randomTitle')}</Text>
								<Text style={styles.rowSub} numberOfLines={1}>{t('learn.bundle.randomDesc')}</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>
				</FadeInUp>

				<SectionHead
					title={t('quiz.common.selectTopics')}
					style={styles.sectionHead}
					right={
						<View style={styles.actionBtns}>
							<View style={styles.countBadge}>
								<Text style={styles.countText}>{selected.length}/{domains.length}</Text>
							</View>
							<TouchableOpacity onPress={allSelected ? clearAll : selectAll} activeOpacity={0.7} hitSlop={8}>
								<Text style={styles.actionText}>{allSelected ? t('quiz.common.clearAll') : t('quiz.common.selectAll')}</Text>
							</TouchableOpacity>
						</View>
					}
				/>
				{domains.map((d, i) => {
					const on = selected.includes(d.key);
					return (
						<FadeInUp key={d.key} delay={40 + i * 45} duration={340} distance={12}>
						<TouchableOpacity style={[styles.row, on && { borderColor: d.color, backgroundColor: withAlpha(d.color, '0F') }]} activeOpacity={0.85} onPress={() => toggle(d.key)}>
							<View style={[styles.rowIcon, { backgroundColor: d.mainIcon ? Colors.surfaceAlt : withAlpha(d.color, '14') }]}>
								<DomainIcon mainIcon={d.mainIcon} icon={d.icon} iconType={d.iconType} size={scaledSize(d.mainIcon ? 30 : 22)} color={d.color} />
							</View>
							<View style={styles.rowBody}>
								<Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="tail">{d.title}</Text>
								<Text style={styles.rowSub} numberOfLines={2} ellipsizeMode="tail">{d.subtitle}</Text>
							</View>
							<IconComponent type="materialIcons" name={on ? 'check-circle' : 'radio-button-unchecked'} size={scaledSize(24)} color={on ? d.color : Colors.textMuted} />
						</TouchableOpacity>
						</FadeInUp>
					);
				})}
			</ScrollView>
			{/* 긴 목록 — 우하단 맨 위로 버튼 */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} inset={false} />
			</View>

			<BottomButton
				label={selected.length > 0 ? t('learn.bundle.startWith', { count: selected.length }) : t('learn.bundle.pickTopic')}
				icon="play-arrow"
				disabled={selected.length === 0}
				onPress={startBundle}
			/>

			{/* 학습 방법 선택 (숏폼 / 카드) */}
			<BottomSheet visible={showMode} onClose={() => setShowMode(false)}>
					<View>
						<View style={styles.modalTitleRow}>
							<Text style={styles.modalTitle}>{t('learn.mode.title')}</Text>
							<TouchableOpacity onPress={() => setShowMode(false)} hitSlop={10} activeOpacity={0.7}>
								<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.textSecondary} />
							</TouchableOpacity>
						</View>
						<Text style={styles.modalSub}>{randomMode ? t('learn.bundle.modeSubRandom') : t('learn.bundle.modeSubSelected', { count: selected.length })}</Text>

						<TouchableOpacity style={styles.modeCard} activeOpacity={0.9} onPress={startShorts}>
							<View style={[styles.modeIcon, { backgroundColor: Colors.primaryBg }]}>
								<IconComponent type="materialIcons" name="play-circle" size={scaledSize(26)} color={Colors.primary} />
							</View>
							<View style={styles.modeBody}>
								<Text style={styles.modeTitle}>{t('learn.bundle.shortsTitle')}</Text>
								<Text style={styles.modeDesc}>{t('learn.bundle.shortsDesc')}</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>

						<TouchableOpacity style={styles.modeCard} activeOpacity={0.9} onPress={startCards}>
							<View style={[styles.modeIcon, { backgroundColor: Colors.primaryBg }]}>
								<IconComponent type="materialIcons" name="style" size={scaledSize(26)} color={Colors.primary} />
							</View>
							<View style={styles.modeBody}>
								<Text style={styles.modeTitle}>{t('learn.bundle.cardsTitle')}</Text>
								<Text style={styles.modeDesc}>{t('learn.bundle.cardsDesc')}</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>
			</BottomSheet>
		</SafeAreaView>
	);
};

export default StudyBundle;

const styles = themed(() => StyleSheet.create({
	heroCard: { ...CardSurface, borderRadius: Radius.lg, overflow: 'hidden' },
	selectionHero: { width: '100%', aspectRatio: 2 },
	sectionHead: { marginTop: SpacingV.xl },
	countBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, backgroundColor: Colors.primarySoft },
	countText: { fontSize: Typography.caption, fontWeight: '900', color: Colors.primary },
	safe: { flex: 1, backgroundColor: Colors.background },
	// 세그먼트 컨트롤 — 퀴즈 선택 화면과 같은 형태
	tabRow: { flexDirection: 'row', gap: Spacing.xxs, marginHorizontal: Layout.screenH, marginTop: SpacingV.lg, padding: Spacing.xxs, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
	tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: SpacingV.sm, borderRadius: Radius.md },
	tabBtnOn: { backgroundColor: Colors.primary },
	tabText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textSecondary },
	tabTextOn: { color: Colors.textInverse },
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
	modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	modalTitle: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong },
	modalSub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.sm, marginBottom: SpacingV.lg },
	modeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.itemGap, borderWidth: 1, borderColor: Colors.border },
	modeIcon: { width: scaleWidth(48), height: scaleWidth(48), borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	modeBody: { flex: 1 },
	modeTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	modeDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },
}));
