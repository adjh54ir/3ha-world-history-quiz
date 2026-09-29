/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, LayoutAnimation, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ConfettiCannon from 'react-native-confetti-cannon';
import CommonHeader from '@/src/screens/common/CommonHeader';
import { useTopBarAccent } from '@/src/utils/TopBarColor';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import LottieBox from '@/src/screens/common/atomic/LottieBox';
import Colors, { TYPE_RESULT_GRADIENTS, BRAND_GRADIENT, withAlpha } from '@/src/const/ConstColors';
import { AnimatedProgress, useReducedMotion } from '@/src/screens/common/anim/Motion';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout, Border } from '@/src/const/ConstDesign';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { scaleArt, scaledSize, scaleHeight, scaleWidth, contentWidth } from '@/src/utils';
import { useToast } from '@/src/context/ToastContext';
import { playFinish, playPop } from '@/src/utils/SoundUtils';
import TestHistoryService, { TypeTestRecord } from '@/src/services/TestHistoryService';
import DateUtils from '@/src/utils/DateUtils';
import { Image as ExpoImage } from 'expo-image';
import { FEATURE_ILLUSTRATIONS } from '@/src/const/ConstFeatureIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';

const LOTTIE_STAR = require('@/src/assets/lottie/star.json');

const fmtDate = (ms: number): string => {
	return DateUtils.formatTimestamp(ms, 'type2').split(' ')[0];
};

type TypeKey = 'A' | 'B' | 'C' | 'D';

interface TypeInfo {
	key: TypeKey;
	name: string; // 별명
	sub: string; // 유형명
	icon: string;
	gradient: [string, string];
	domain: string; // 추천 주제 키 (설명·추천 주제 이름은 special.typeTest.types.<key>)
}

const TYPES: Record<TypeKey, TypeInfo> = themed(() => ({
	A: { key: 'A', name: '사색하는 역사가', sub: '세계사형', icon: 'history-edu', gradient: TYPE_RESULT_GRADIENTS.A, domain: 'event' },
	B: { key: 'B', name: '발길 닿는 여행가', sub: '지리형', icon: 'travel-explore', gradient: TYPE_RESULT_GRADIENTS.B, domain: 'capital' },
	C: { key: 'C', name: '별을 보는 몽상가', sub: '우주형', icon: 'nights-stay', gradient: TYPE_RESULT_GRADIENTS.C, domain: 'constellation' },
	D: { key: 'D', name: '이야기 수집가', sub: '신화형', icon: 'auto-awesome', gradient: [Colors.gold, Colors.heat], domain: 'myth' },
}));

/** 문항 키 — 질문·선택지 문구는 special.typeTest.questions.<q>.{title,A~D}. 선택지는 항상 A→D 순서 */
const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;
const TYPE_ORDER: TypeKey[] = ['A', 'B', 'C', 'D'];

/**
 * 세계 상식 유형 테스트 (MBTI식)
 * - 8문항으로 4가지 유형을 진단하고 결과를 공유
 */
const TypeTest = () => {
	const { t } = useTranslation();
	const { showToast } = useToast();
	const [started, setStarted] = useState(false);
	const [index, setIndex] = useState(0);
	const [counts, setCounts] = useState<Record<TypeKey, number>>({ A: 0, B: 0, C: 0, D: 0 });
	const [resultKey, setResultKey] = useState<TypeKey | null>(null);
	const [history, setHistory] = useState<TypeTestRecord[]>([]);
	// 결과 화면만 배경색, 시작·질문 화면은 헤더(surface)와 상단 인셋 색을 잇는다
	useTopBarAccent(resultKey ? Colors.background : Colors.surface);
	// 시작 화면 히어로 — 은은한 숨쉬기 애니메이션 (시작 전에만 재생)
	const reducedMotion = useReducedMotion();
	const heroPulse = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		if (started || reducedMotion) return;
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(heroPulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
				Animated.timing(heroPulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [started, reducedMotion, heroPulse]);

	useFocusEffect(
		useCallback(() => {
			if (!started && !resultKey) TestHistoryService.getTypeHistory().then(setHistory);
		}, [started, resultKey]),
	);

	const current = QUESTIONS[index];
	const progress = ((index + 1) / QUESTIONS.length) * 100;

	const choose = (pick: TypeKey) => {
		const next = { ...counts, [pick]: counts[pick] + 1 };
		setCounts(next);
		playPop(); // 정답/오답이 없는 성향 테스트라 선택감만 준다
		if (index === QUESTIONS.length - 1) {
			// 동점이면 항상 A로 몰리므로, 최다 득표가 여럿일 때는 그중 하나를 무작위로 고른다
			const max = Math.max(...TYPE_ORDER.map((k) => next[k]));
			const tied = TYPE_ORDER.filter((k) => next[k] === max);
			const top = tied[Math.floor(Math.random() * tied.length)];
			setResultKey(top);
			playFinish(); // 🎉 결과 등장 사운드
			const r = TYPES[top];
			TestHistoryService.addTypeResult({ typeKey: top, typeName: r.name, typeSub: r.sub });
			return;
		}
		setIndex(index + 1);
	};

	const restart = () => {
		setIndex(0);
		setCounts({ A: 0, B: 0, C: 0, D: 0 });
		setResultKey(null);
		setStarted(true);
	};

	// 지난 결과 항목 개별 삭제 — 즉시 제거 후 저장소(AsyncStorage) 반영
	const removeHistory = (i: number) => {
		const next = history.filter((_, idx) => idx !== i);
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setHistory(next);
		AsyncStorage.setItem('TEST_HISTORY_TYPE', JSON.stringify(next)).catch(() => {});
		showToast(t('special.typeTest.historyDeleted'), 'delete-outline');
	};

	// ── 결과 ──
	if (resultKey) {
		const r = TYPES[resultKey];
		const onShare = () =>
			Share.share({ message: t('special.typeTest.shareMessage', { name: r.name, sub: r.sub }) }).catch(() => {});
		return (
			<SafeAreaView style={styles.safe} edges={[]}>
				<ScrollView style={styles.scroll} contentContainerStyle={[styles.resultScroll, { paddingTop: Layout.screenTop }]} showsVerticalScrollIndicator={false}>
					<View style={styles.resultHero}>
						<View style={styles.resultIconWrap}>
							<LottieBox source={LOTTIE_STAR} autoPlay loop={false} style={styles.resultStar} />
							<View style={[styles.resultIcon, { backgroundColor: withAlpha(r.gradient[1], '14'), marginBottom: 0 }]}>
								<IconComponent type="materialIcons" name={r.icon} size={scaledSize(46)} color={r.gradient[1]} />
							</View>
						</View>
						<Text style={styles.resultSub} numberOfLines={2} ellipsizeMode="tail">{r.sub}</Text>
						<Text style={styles.resultName} numberOfLines={1} ellipsizeMode="tail">{r.name}</Text>
					</View>

					<View style={styles.msgCard}>
						<Text style={styles.msgText}>{t(`special.typeTest.types.${r.key}.desc`)}</Text>
					</View>

					<TouchableOpacity style={styles.recBtn} activeOpacity={0.9} onPress={() => router.replace({ pathname: '/learn/category', params: { category: r.domain } } as never)}>
						<IconComponent type="materialIcons" name="recommend" size={scaledSize(20)} color={Colors.textInverse} />
						<Text style={styles.recBtnText}>{t('special.typeTest.recommend', { label: t(`special.typeTest.types.${r.key}.domainLabel`) })}</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.shareBtn} activeOpacity={0.9} onPress={onShare}>
						<IconComponent type="materialIcons" name="ios-share" size={scaledSize(20)} color={Colors.text} />
						<Text style={styles.shareBtnText}>{t('special.test.share')}</Text>
					</TouchableOpacity>

					</ScrollView>
				<BottomButton
					label={t('special.home')}
					icon="home"
					secondaryLabel={t('special.typeTest.again')}
					secondaryIcon="replay"
					onPress={() => router.replace('/home' as never)}
					onSecondary={restart}
				/>
				<View style={styles.confettiFront} pointerEvents="none">
					<ConfettiCannon count={110} origin={{ x: contentWidth / 2, y: -10 }} fadeOut autoStart explosionSpeed={350} />
				</View>
			</SafeAreaView>
		);
	}

	// ── 시작 ──
	if (!started) {
		return (
			<SafeAreaView style={styles.safe} edges={['bottom']}>
				<CommonHeader title={t('special.typeTest.title')} onBack={() => router.back()} />
				<ScrollView contentContainerStyle={styles.introWrap} showsVerticalScrollIndicator={false}>
					{/* 히어로 — 그라데이션 카드 + 숨쉬는 아이콘 (레벨 테스트와 동일 구조) */}
					<FadeInUp>
						<View style={styles.heroCard}>
							<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
							<Animated.View style={{ transform: [{ scale: heroPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }}>
								<ExpoImage source={FEATURE_ILLUSTRATIONS.typeTest} style={styles.heroIllustration} contentFit="contain" accessible={false} />
							</Animated.View>
							<Text style={styles.heroTitle}>{t('special.typeTest.heroTitle')}</Text>
							<Text style={styles.heroDesc}>{t('special.typeTest.heroDesc', { count: QUESTIONS.length })}</Text>
							<View style={styles.heroChips}>
								{[
									{ icon: 'quiz', label: t('special.typeTest.chipCount', { count: QUESTIONS.length }) },
									{ icon: 'timer', label: t('special.typeTest.chipTime') },
									{ icon: 'category', label: t('special.typeTest.chipTypes') },
								].map((c) => (
									<View key={c.label} style={styles.heroChip}>
										<IconComponent type="materialIcons" name={c.icon} size={scaledSize(13)} color={Colors.textInverse} />
										<Text style={styles.heroChipText} numberOfLines={1} ellipsizeMode="tail">{c.label}</Text>
									</View>
								))}
							</View>
						</View>
					</FadeInUp>

					{/* 유형 미리보기 */}
					<FadeInUp delay={90}>
						<View style={styles.gradeCard}>
							<View style={styles.gradeCardHead}>
								<IconComponent type="materialIcons" name="emoji-objects" size={scaledSize(16)} color={Colors.primary} />
								<Text style={styles.gradeCardTitle}>{t('special.typeTest.typePreview')}</Text>
							</View>
							<View style={styles.gradeRow}>
								{Object.values(TYPES).map((ty) => (
									<View key={ty.key} style={styles.gradePill}>
										<View style={[styles.gradeDot, { backgroundColor: ty.gradient[1] }]} />
										<Text style={styles.gradePillText} numberOfLines={1} ellipsizeMode="tail">{ty.name}</Text>
									</View>
								))}
							</View>
						</View>
					</FadeInUp>

					{/* 지난 결과 */}
					{history.length > 0 && (
						<FadeInUp delay={140}>
							<View style={styles.historyWrap}>
								<View style={styles.historyHead}>
									<Text style={styles.historyTitle}>{t('special.test.history')}</Text>
									<Text style={styles.historyCount}>{t('special.test.historyCount', { count: history.length })}</Text>
								</View>
								{history.slice(0, 5).map((h, i) => (
									<View key={`${h.date}-${i}`} style={styles.historyRow}>
										<View style={styles.historyIcon}>
											<IconComponent type="materialIcons" name="psychology" size={scaledSize(18)} color={Colors.primary} />
										</View>
										<View style={styles.historyLeft}>
											<Text style={styles.historyGrade}>{h.typeName}</Text>
											<Text style={styles.historyTier}>{h.typeSub}</Text>
										</View>
										<View style={styles.historyRight}>
											<Text style={styles.historyDate}>{fmtDate(h.date)}</Text>
										</View>
										<TouchableOpacity
											style={styles.historyDelete}
											activeOpacity={0.7}
											hitSlop={Layout.hitSlop}
											accessibilityRole="button"
											accessibilityLabel={t('common.delete')}
											onPress={() => removeHistory(i)}>
											<IconComponent type="materialIcons" name="close" size={scaledSize(16)} color={Colors.textMuted} />
										</TouchableOpacity>
									</View>
								))}
							</View>
						</FadeInUp>
					)}
				</ScrollView>

				{/* 시작 CTA — 하단 고정 */}
				<View style={styles.introFooter}>
					<TouchableOpacity style={styles.startBtn} activeOpacity={0.9} onPress={() => setStarted(true)}>
						<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
						<IconComponent type="materialIcons" name="play-arrow" size={scaledSize(22)} color={Colors.textInverse} />
						<Text style={styles.startBtnText}>{t('special.test.start')}</Text>
					</TouchableOpacity>
					<Text style={styles.startHint}>{t('special.typeTest.startHint')}</Text>
				</View>
			</SafeAreaView>
		);
	}

	// ── 질문 ──
	return (
		<SafeAreaView style={styles.safe} edges={['bottom']}>
			<View style={[styles.qHeader, { paddingTop: Layout.screenTop }]}>
				<View style={styles.qHeaderRow}>
					<TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()} hitSlop={8}>
						<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.text} />
					</TouchableOpacity>
					<Text style={styles.qHeaderTitle}>{t('special.typeTest.qTitle')}</Text>
					<View style={styles.qCountWrap}>
						<Text style={styles.qCount}>{index + 1}/{QUESTIONS.length}</Text>
					</View>
				</View>
				<AnimatedProgress ratio={progress / 100} color={Colors.primary} trackColor={Colors.surfaceAlt} height={scaleHeight(7)} radius={scaleWidth(4)} style={styles.progressTrack} />
			</View>

			<ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
				{/* 문항 카드 + 선택지 — 레벨 테스트와 동일 구조 */}
				<FadeInUp key={`q-${index}`}>
					<View style={styles.qCard}>
						<View style={styles.qDomainChip}>
							<Text style={styles.qDomainText}>Q{index + 1}</Text>
						</View>
						<Text style={styles.qPrompt}>{t(`special.typeTest.questions.${current}.title`)}</Text>
					</View>
					{TYPE_ORDER.map((k, i) => (
						<TouchableOpacity key={k} style={styles.option} activeOpacity={0.85} onPress={() => choose(k)}>
							<View style={styles.optionIndex}>
								<Text style={styles.optionIndexText}>{i + 1}</Text>
							</View>
							<Text style={styles.optionText}>{t(`special.typeTest.questions.${current}.${k}`)}</Text>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
					))}
				</FadeInUp>
			</ScrollView>
		</SafeAreaView>
	);
};

export default TypeTest;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	scroll: { flex: 1 },
	confettiFront: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
	backBtn: { width: scaleWidth(40), height: scaleWidth(40), justifyContent: 'center', alignItems: 'center' },
	introWrap: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },

	heroCard: { alignItems: 'center', borderRadius: Radius.xxl, paddingVertical: SpacingV.xxxl, paddingHorizontal: Spacing.xl, overflow: 'hidden' },
	heroIllustration: { width: scaleArt(152), height: scaleArt(136) },
	heroTitle: { marginTop: SpacingV.md, fontSize: Typography.h2, fontWeight: '900', color: Colors.textInverse, textAlign: 'center' },
	heroDesc: { marginTop: SpacingV.sm, fontSize: Typography.body, fontWeight: '600', color: Colors.onBrandText, textAlign: 'center', lineHeight: scaleHeight(20) },
	heroChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.xl },
	heroChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.onBrandSurface, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	heroChipText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse },

	gradeCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Layout.sectionGap },
	gradeCardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.md },
	gradeCardTitle: { fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
	gradeDot: { width: scaleWidth(8), height: scaleWidth(8), borderRadius: Radius.pill },
	gradePill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	gradePillText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },

	historyWrap: { alignSelf: 'stretch', marginTop: Layout.sectionGap },
	historyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.sm, paddingHorizontal: Spacing.xs },
	historyTitle: { fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	historyCount: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	historyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md, marginBottom: Layout.itemGap, borderWidth: 1, borderColor: Colors.border },
	historyIcon: { width: scaleWidth(34), height: scaleWidth(34), borderRadius: Radius.md, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
	historyLeft: { flex: 1 },
	historyGrade: { fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	historyTier: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	historyRight: { alignItems: 'flex-end' },
	historyDate: { fontSize: Typography.footnote, color: Colors.textMuted, fontWeight: '600' },
	historyDelete: { width: scaleWidth(28), height: scaleWidth(28), borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surfaceAlt },

	introFooter: { paddingHorizontal: Layout.screenH, paddingTop: SpacingV.md, paddingBottom: SpacingV.lg, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
	startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: SpacingV.lg, overflow: 'hidden' },
	startBtnText: { flexShrink: 1, textAlign: 'center', color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '900' },
	startHint: { marginTop: SpacingV.sm, fontSize: Typography.footnote, fontWeight: '600', color: Colors.textMuted, textAlign: 'center' },
	qHeader: { paddingHorizontal: Layout.screenH, paddingBottom: SpacingV.lg, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
	qHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	qHeaderTitle: { fontSize: Typography.title, fontWeight: '800', color: Colors.textStrong },
	qCountWrap: { width: scaleWidth(46), alignItems: 'flex-end' },
	qCount: { fontSize: Typography.body, fontWeight: '800', color: Colors.textSecondary },
	progressTrack: { height: scaleHeight(7), borderRadius: scaleWidth(4), backgroundColor: Colors.surfaceAlt, overflow: 'hidden', marginTop: SpacingV.sm },
	body: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	qCard: { ...CardSurface, borderRadius: Radius.lg, paddingVertical: SpacingV.xxl, paddingHorizontal: Spacing.lg, alignItems: 'center', marginBottom: SpacingV.lg },
	qDomainChip: { backgroundColor: Colors.primaryBg, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md, marginBottom: SpacingV.md },
	qDomainText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	qPrompt: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong, textAlign: 'center', lineHeight: scaleHeight(33) },
	option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: Border.thin, borderColor: Colors.border, paddingVertical: SpacingV.lg, paddingHorizontal: Spacing.lg, marginBottom: Layout.itemGap },
	optionIndex: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
	optionIndexText: { fontSize: Typography.body, fontWeight: '800', color: Colors.textSecondary },
	optionText: { flex: 1, fontSize: Typography.callout, color: Colors.text, fontWeight: '600' },
	resultScroll: { paddingBottom: Layout.screenBottom },
	resultHero: { ...CardSurface, alignItems: 'center', borderRadius: Radius.lg, paddingVertical: SpacingV.xxxl, paddingHorizontal: Spacing.xxl, marginHorizontal: Layout.screenH },
	resultIconWrap: { justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: SpacingV.lg },
	resultStar: { position: 'absolute', width: scaleArt(150), height: scaleArt(150) },
	resultIcon: { width: scaleWidth(92), height: scaleWidth(92), borderRadius: Radius.pill, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: SpacingV.lg },
	resultSub: { color: Colors.textSecondary, fontSize: Typography.body, fontWeight: '800', letterSpacing: 1 },
	resultName: { color: Colors.textStrong, fontSize: Typography.h1, fontWeight: '900', marginTop: SpacingV.xs },
	msgCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginHorizontal: Layout.screenH, marginTop: Layout.sectionGap },
	msgText: { fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(22), textAlign: 'center', fontWeight: '600' },
	recBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Layout.screenH, marginTop: SpacingV.lg, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, backgroundColor: Colors.primary },
	recBtnText: { flexShrink: 1, textAlign: 'center', color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
	shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Layout.screenH, marginTop: SpacingV.sm, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong },
	shareBtnText: { flexShrink: 1, textAlign: 'center', color: Colors.text, fontSize: Typography.callout, fontWeight: '700' },
}));
