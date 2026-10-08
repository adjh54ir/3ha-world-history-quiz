/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from '@/src/translations';
import ConfettiCannon from 'react-native-confetti-cannon';
import CommonHeader from '@/src/screens/common/CommonHeader';
import { useTopBarAccent } from '@/src/utils/TopBarColor';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import LottieBox from '@/src/screens/common/atomic/LottieBox';
import Colors, { BRAND_GRADIENT, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout, Border } from '@/src/const/ConstDesign';
import { AnimatedProgress, FadeInUp, useReducedMotion } from '@/src/screens/common/anim/Motion';
import { scaleArt, scaledSize, scaleHeight, scaleWidth, contentWidth } from '@/src/utils';
import { playFinish, playCorrect, playWrong } from '@/src/utils/SoundUtils';
import { startBgm, stopBgm } from '@/src/utils/BgmUtils';
import LearnHubService from '@/src/services/LearnHubService';
import TestHistoryService, { LevelTestRecord } from '@/src/services/TestHistoryService';
import DateUtils from '@/src/utils/DateUtils';
import DetailSheet, { DetailItem } from '@/src/screens/modal/DetailSheet';
import LearnItemCard, { learnListFields } from '@/src/screens/common/LearnItemCard';
import { LearnType } from '@/src/types/data/LearnType';
import { Image as ExpoImage } from 'expo-image';
import { FEATURE_ILLUSTRATIONS } from '@/src/const/ConstFeatureIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';
import EntryImage from '@/src/screens/common/atomic/EntryImage';
import CountryFlags from '@/src/screens/common/atomic/CountryFlags';

const LOTTIE_STAR = require('@/src/assets/lottie/star.json');

const fmtDate = (ms: number): string => {
	return DateUtils.formatTimestamp(ms, 'type2').split(' ')[0];
};

const TEST_COUNT = 10;

interface Grade {
	min: number; // 정답률 하한(%)
	title: string;
	tier: string;
	icon: string;
	gradient: [string, string];
	/** 등급 메시지 키 (special.levelTest.gradeMsg.*) — title/tier 는 special.levelTest.grades.* (기록에 저장되는 값이라 앱 언어 문구로 남는다) */
	msg: 'master' | 'expert' | 'advanced' | 'intermediate' | 'beginner' | 'novice';
}

const GRADES: Grade[] = themed(() => ([
	{ min: 95, title: i18n.t('special.levelTest.grades.master.title'), tier: i18n.t('special.levelTest.grades.master.tier'), icon: 'workspace-premium', gradient: [Colors.primaryDark, Colors.primaryDeep], msg: 'master' },
	{ min: 85, title: i18n.t('special.levelTest.grades.expert.title'), tier: i18n.t('special.levelTest.grades.expert.tier'), icon: 'military-tech', gradient: [Colors.primary, Colors.primaryDark], msg: 'expert' },
	{ min: 70, title: i18n.t('special.levelTest.grades.advanced.title'), tier: i18n.t('special.levelTest.grades.advanced.tier'), icon: 'trending-up', gradient: [Colors.primaryTint1, Colors.primary], msg: 'advanced' },
	{ min: 55, title: i18n.t('special.levelTest.grades.intermediate.title'), tier: i18n.t('special.levelTest.grades.intermediate.tier'), icon: 'insights', gradient: [Colors.primaryTint2, Colors.primaryTint1], msg: 'intermediate' },
	{ min: 40, title: i18n.t('special.levelTest.grades.beginner.title'), tier: i18n.t('special.levelTest.grades.beginner.tier'), icon: 'auto-graph', gradient: [Colors.primaryTint3, Colors.primaryTint2], msg: 'beginner' },
	{ min: 0, title: i18n.t('special.levelTest.grades.novice.title'), tier: i18n.t('special.levelTest.grades.novice.tier'), icon: 'flag', gradient: [Colors.primaryTint4, Colors.primaryTint3], msg: 'novice' },
]));

const gradeOf = (rate: number): Grade => GRADES.find((g) => rate >= g.min) ?? GRADES[GRADES.length - 1];

/**
 * 세계 상식 진단(레벨 테스트)
 * - 전 주제에서 무작위로 TEST_COUNT문항을 풀고 등급을 산정, 결과를 공유할 수 있어요.
 */
const LevelTest = () => {
	const { t } = useTranslation();
	const [started, setStarted] = useState(false);
	const [questions, setQuestions] = useState(() => LearnHubService.generateMixedQuiz(TEST_COUNT));
	const [index, setIndex] = useState(0);
	const [selected, setSelected] = useState<number | null>(null);
	const [correct, setCorrect] = useState(0);
	const [results, setResults] = useState<boolean[]>([]);
	const [finished, setFinished] = useState(false);
	const [history, setHistory] = useState<LevelTestRecord[]>([]);
	const [detailItem, setDetailItem] = useState<DetailItem | null>(null);
	// 결과 화면만 배경색, 시작·문제 화면은 헤더(surface)와 상단 인셋 색을 잇는다
	useTopBarAccent(finished ? Colors.background : Colors.surface);
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
			if (!started) TestHistoryService.getLevelHistory().then(setHistory);
		}, [started]),
	);

	// 배경음악 — 문제 풀이 중에만 재생, 시작 전/결과/이탈 시 정지 (메모리 정리)
	useEffect(() => {
		if (started && !finished) startBgm('quiz');
		else stopBgm();
	}, [started, finished]);
	// 언마운트 시 배경음 정리
	useEffect(() => () => stopBgm(), []);

	// 결과 목록용 상세 아이템 — 검색/오답노트 상세와 동일하게 원본 학습카드로 풍부하게 표시
	const toDetailItem = (q: LearnType.QuizQuestion): DetailItem => {
		const quizAnswer = q.options[q.answerIndex];
		const c = LearnHubService.getStudyCardByUid(q.domain, q.uid);
		if (c) {
			return {
				domain: c.domain,
				uid: c.uid,
				domainTitle: LearnHubService.getDomainTitle(c.domain),
				categoryLabel: q.categoryLabel ?? c.categoryLabel,
				levelLabel: q.level ?? c.levelLabel,
				title: c.title,
				subTitle: c.subTitle,
				meaning: c.meaning,
				description: c.description,
				examples: c.examples,
				tags: c.tags,
				options: c.options,
				answer: c.options && c.options.length >= 2 ? c.title : quizAnswer,
				explanation: q.explanation,
			};
		}
		return {
			domain: q.domain,
			uid: q.uid,
			domainTitle: LearnHubService.getDomainTitle(q.domain),
			categoryLabel: q.categoryLabel,
			levelLabel: q.level,
			title: q.prompt,
			subTitle: q.subPrompt,
			answer: quizAnswer,
			explanation: q.explanation,
			examples: q.examples,
		};
	};

	const current = questions[index];
	const isLast = index === questions.length - 1;
	const progress = questions.length > 0 ? ((index + 1) / questions.length) * 100 : 0;
	const rate = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
	const grade = useMemo(() => gradeOf(rate), [rate]);

	const onNext = () => {
		// '결과 보기' 연타로 기록이 두 번 저장되는 것만 막는다(일반 '다음'은 그대로 빠르게)
		if (finished) return;
		const isCorrect = selected === current.answerIndex;
		const newResults = [...results, isCorrect];
		setResults(newResults);
		// 마지막 문항은 결과 사운드(playFinish)와 겹치지 않게 정답/오답음을 내지 않는다
		if (!isLast) (isCorrect ? playCorrect : playWrong)();
		if (isCorrect) {
			setCorrect((c) => c + 1);
		}
		if (isLast) {
			setFinished(true);
			playFinish(); // 🎉 결과 등장 사운드
			const finalCorrect = correct + (isCorrect ? 1 : 0);
			const finalRate = questions.length > 0 ? Math.round((finalCorrect / questions.length) * 100) : 0;
			const finalGrade = gradeOf(finalRate);
			// 레벨 테스트는 전체 점수/통계에 반영하지 않음 (기록만 별도 저장)
			// 레벨 테스트 기록 저장
			TestHistoryService.addLevelResult({
				rate: finalRate,
				correct: finalCorrect,
				total: questions.length,
				gradeTitle: finalGrade.title,
				gradeTier: finalGrade.tier,
			});
			return;
		}
		setIndex(index + 1);
		setSelected(null);
	};

	const restart = () => {
		setQuestions(LearnHubService.generateMixedQuiz(TEST_COUNT));
		setIndex(0);
		setSelected(null);
		setCorrect(0);
		setResults([]);
		setFinished(false);
		setStarted(true);
	};

	const onShare = () => {
		Share.share({
			message: t('special.levelTest.shareMessage', { title: grade.title, tier: grade.tier, total: TEST_COUNT, correct, rate }),
		}).catch(() => {});
	};

	// ── 시작 화면 ──
	if (!started) {
		return (
			<SafeAreaView style={styles.safe} edges={['bottom']}>
				<CommonHeader title={t('special.levelTest.title')} onBack={() => router.back()} />
				<ScrollView contentContainerStyle={styles.introWrap} showsVerticalScrollIndicator={false}>
					{/* 히어로 — 그라데이션 카드 + 숨쉬는 메달 */}
					<FadeInUp>
						<View style={styles.heroCard}>
							<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
							<Animated.View style={{ transform: [{ scale: heroPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }}>
								<ExpoImage source={FEATURE_ILLUSTRATIONS.levelTest} style={styles.heroIllustration} contentFit="contain" accessible={false} />
							</Animated.View>
							<Text style={styles.heroTitle}>{t('special.levelTest.heroTitle')}</Text>
							<Text style={styles.heroDesc}>{t('special.levelTest.heroDesc', { count: TEST_COUNT })}</Text>
							<View style={styles.heroChips}>
								{[
									{ icon: 'quiz', label: t('common.questions', { count: TEST_COUNT }) },
									{ icon: 'timer', label: t('special.levelTest.chipTime') },
									{ icon: 'stairs', label: t('special.levelTest.chipSteps') },
								].map((c) => (
									<View key={c.label} style={styles.heroChip}>
										<IconComponent type="materialIcons" name={c.icon} size={scaledSize(13)} color={Colors.textInverse} />
										<Text style={styles.heroChipText} numberOfLines={1} ellipsizeMode="tail">{c.label}</Text>
									</View>
								))}
							</View>
						</View>
					</FadeInUp>

					{/* 등급 미리보기 — 입문부터 최상급까지 */}
					<FadeInUp delay={90}>
						<View style={styles.gradeCard}>
							<View style={styles.gradeCardHead}>
								<IconComponent type="materialIcons" name="leaderboard" size={scaledSize(16)} color={Colors.primary} />
								<Text style={styles.gradeCardTitle}>{t('special.levelTest.gradePreview')}</Text>
							</View>
							<View style={styles.gradeRow}>
								{[...GRADES].reverse().map((g) => (
									<View key={g.title} style={styles.gradePill}>
										<View style={[styles.gradeDot, { backgroundColor: g.gradient[1] }]} />
										<Text style={styles.gradePillText} numberOfLines={1} ellipsizeMode="tail">{g.title}</Text>
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
											<IconComponent type="materialIcons" name="military-tech" size={scaledSize(18)} color={Colors.primary} />
										</View>
										<View style={styles.historyLeft}>
											<Text style={styles.historyGrade}>{h.gradeTitle}</Text>
											<Text style={styles.historyTier}>{h.gradeTier}</Text>
										</View>
										<View style={styles.historyRight}>
											<Text style={styles.historyScore}>{t('common.points', { count: h.rate })}</Text>
											<Text style={styles.historyDate}>{fmtDate(h.date)}</Text>
										</View>
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
					<Text style={styles.startHint}>{t('special.levelTest.startHint')}</Text>
				</View>
			</SafeAreaView>
		);
	}

	// ── 결과 화면 ──
	if (finished) {
		const wrongItems = questions.filter((_, i) => results[i] === false);
		const correctItems = questions.filter((_, i) => results[i] === true);
		// 오답/정답 목록 — 보관함·퀴즈 결과와 동일한 공통 카드(LearnItemCard) 사용
		const renderReviewRow = (q: LearnType.QuizQuestion, i: number, ok: boolean) => (
			<FadeInUp key={`${q.uid}-${i}`} delay={Math.min(i, 6) * 40}>
				<LearnItemCard
					domain={q.domain}
					categoryLabel={q.categoryLabel}
					levelLabel={q.level}
					{...learnListFields({
						domain: q.domain,
						prompt: q.prompt,
						subPrompt: q.subPrompt,
						answer: q.options[q.answerIndex],
						explanation: (q.explanation ?? q.options[q.answerIndex] ?? '').split(/예\s*[)）]/)[0].trim() || undefined,
					})}
					statusMark={ok ? 'correct' : 'wrong'}
					examples={q.examples}
					onPress={() => setDetailItem(toDetailItem(q))}
				/>
			</FadeInUp>
		);
		return (
			<SafeAreaView style={styles.safe} edges={[]}>
				<ScrollView style={styles.scroll} contentContainerStyle={[styles.resultScroll, { paddingTop: Layout.screenTop }]} showsVerticalScrollIndicator={false}>
					<View style={styles.resultHero}>
						<View style={styles.gradeIconWrap}>
							<LottieBox source={LOTTIE_STAR} autoPlay loop={false} style={styles.gradeStar} />
							{/* 아이콘은 primary 고정 — 낮은 등급의 옅은 틴트(primaryTint2·3)는 라이트 배경에서 거의 안 보였다 */}
							<View style={[styles.gradeIcon, { backgroundColor: withAlpha(Colors.primary, '14') }]}>
								<IconComponent type="materialIcons" name={grade.icon} size={scaledSize(46)} color={Colors.primary} />
							</View>
						</View>
						<Text style={styles.gradeTier}>{grade.tier}</Text>
						<Text style={styles.gradeTitle} numberOfLines={1} ellipsizeMode="tail">{grade.title}</Text>
						<Text style={styles.gradeScore}>{t('common.points', { count: rate })}</Text>
						<Text style={styles.gradeDetail}>{t('special.levelTest.resultDetail', { total: TEST_COUNT, correct })}</Text>
					</View>

					<View style={styles.msgCard}>
						<Text style={styles.msgText}>{t(`special.levelTest.gradeMsg.${grade.msg}`)}</Text>
					</View>

					{wrongItems.length > 0 && (
						<FadeInUp delay={120}>
							<View style={styles.reviewSection}>
								<View style={styles.reviewHead}>
									<Text style={styles.reviewTitle}>{t('special.levelTest.wrongNote')}</Text>
									<Text style={[styles.reviewCount, { color: Colors.error }]}>{t('common.count', { count: wrongItems.length })}</Text>
								</View>
								{wrongItems.map((q, i) => renderReviewRow(q, i, false))}
							</View>
						</FadeInUp>
					)}

					{correctItems.length > 0 && (
						<FadeInUp delay={180}>
							<View style={styles.reviewSection}>
								<View style={styles.reviewHead}>
									<Text style={styles.reviewTitle}>{t('special.levelTest.correctNote')}</Text>
									<Text style={[styles.reviewCount, { color: Colors.success }]}>{t('common.count', { count: correctItems.length })}</Text>
								</View>
								{correctItems.map((q, i) => renderReviewRow(q, i, true))}
							</View>
						</FadeInUp>
					)}

					<TouchableOpacity style={styles.shareBtn} activeOpacity={0.9} onPress={onShare}>
						<IconComponent type="materialIcons" name="ios-share" size={scaledSize(20)} color={Colors.onFill} />
						<Text style={styles.shareBtnText}>{t('special.test.share')}</Text>
					</TouchableOpacity>

					</ScrollView>
				<BottomButton
					label={t('special.home')}
					icon="home"
					secondaryLabel={t('special.levelTest.retry')}
					secondaryIcon="replay"
					onPress={() => router.replace('/home' as never)}
					onSecondary={restart}
				/>
				{rate >= 70 && (
					<View style={styles.confettiFront} pointerEvents="none">
						<ConfettiCannon count={120} origin={{ x: contentWidth / 2, y: -10 }} fadeOut autoStart explosionSpeed={350} />
					</View>
				)}
				<DetailSheet visible={!!detailItem} item={detailItem} onClose={() => setDetailItem(null)} />
			</SafeAreaView>
		);
	}

	// ── 문제 화면 ──
	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<View style={[styles.qHeader, { paddingTop: Layout.screenTop }]}>
				<View style={styles.qHeaderRow}>
					<TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()} hitSlop={Layout.hitSlop}>
						<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.text} />
					</TouchableOpacity>
					<Text style={styles.qHeaderTitle}>{t('special.levelTest.qTitle')}</Text>
					<View style={styles.qCountWrap}>
						<Text style={styles.qCount}>{index + 1}/{questions.length}</Text>
					</View>
				</View>
				<AnimatedProgress ratio={progress / 100} color={Colors.primary} trackColor={Colors.border} height={scaleHeight(7)} radius={scaleWidth(4)} style={styles.progressTrack} />
			</View>

			<ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
				<View style={styles.qCard}>
					<View style={styles.qDomainChip}>
						<Text style={styles.qDomainText}>{LearnHubService.getDomainTitle(current.domain)}</Text>
					</View>
					<Text style={styles.qGuide}>{current.guide}</Text>
					{current.imageRef ? (
						<EntryImage imageRef={current.imageRef} width={scaleWidth(160)} fetchWidth={360} style={styles.qImage} />
					) : (
						<Text style={styles.qPrompt}>{current.prompt}</Text>
					)}
					{!!current.subPrompt && <Text style={styles.qSub} numberOfLines={2} ellipsizeMode="tail">{current.subPrompt}</Text>}
				</View>

				<View style={styles.answers}>
				{current.options.map((opt, i) => {
					const isSelected = i === selected;
					return (
						<TouchableOpacity
							key={i}
							style={[styles.option, isSelected && styles.optionSelected]}
							activeOpacity={0.8}
							onPress={() => setSelected(i)}>
							<View style={[styles.optionIndex, isSelected && styles.optionIndexSelected]}>
								<Text style={[styles.optionIndexText, isSelected && { color: Colors.onFill }]}>{i + 1}</Text>
							</View>
							{current.optionFlags && <CountryFlags name={opt} height={16} />}
							<Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{opt}</Text>
						</TouchableOpacity>
					);
				})}
				</View>
			</ScrollView>

			<BottomButton label={isLast ? t('special.levelTest.seeResult') : t('common.next')} icon={isLast ? 'flag' : 'arrow-forward'} disabled={selected === null} onPress={onNext} />
		</SafeAreaView>
	);
};

export default LevelTest;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	scroll: { flex: 1 },
	confettiFront: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
	backBtn: { width: scaleWidth(40), height: scaleWidth(40), justifyContent: 'center', alignItems: 'center' },
	introWrap: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	// 히어로 카드
	heroCard: { alignItems: 'center', borderRadius: Radius.xxl, paddingVertical: SpacingV.xxxl, paddingHorizontal: Spacing.xl, overflow: 'hidden' },
	heroIllustration: { width: scaleArt(152), height: scaleArt(136) },
	heroTitle: { marginTop: SpacingV.md, fontSize: Typography.h2, fontWeight: '900', color: Colors.textInverse, textAlign: 'center' },
	heroDesc: { marginTop: SpacingV.sm, fontSize: Typography.body, fontWeight: '600', color: Colors.onBrandText, textAlign: 'center', lineHeight: scaleHeight(20) },
	heroChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.xl },
	heroChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.onBrandSurface, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	heroChipText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse },
	// 등급 미리보기
	gradeCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Layout.sectionGap },
	gradeCardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.md },
	gradeCardTitle: { fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
	gradePill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	gradeDot: { width: scaleWidth(8), height: scaleWidth(8), borderRadius: Radius.pill, borderWidth: Border.hairline, borderColor: Colors.borderStrong },
	gradePillText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	// 시작 CTA
	introFooter: { paddingHorizontal: Layout.screenH, paddingTop: SpacingV.sm, paddingBottom: SpacingV.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
	startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: SpacingV.lg, overflow: 'hidden' },
	startBtnText: { flexShrink: 1, textAlign: 'center', color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '900' },
	startHint: { marginTop: SpacingV.sm, fontSize: Typography.footnote, fontWeight: '600', color: Colors.textMuted, textAlign: 'center' },

	qHeader: { paddingHorizontal: Layout.screenH, paddingBottom: SpacingV.lg, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
	qHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	qHeaderTitle: { fontSize: Typography.title, fontWeight: '800', color: Colors.textStrong },
	qCountWrap: { width: scaleWidth(46), alignItems: 'flex-end' },
	qCount: { fontSize: Typography.body, fontWeight: '800', color: Colors.textSecondary },
	progressTrack: { height: scaleHeight(7), borderRadius: scaleWidth(4), backgroundColor: Colors.surfaceAlt, overflow: 'hidden', marginTop: SpacingV.sm },
	body: { flexGrow: 1, paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	qCard: { ...CardSurface, borderRadius: Radius.lg, paddingVertical: SpacingV.xxl, paddingHorizontal: Spacing.lg, alignItems: 'center', marginBottom: SpacingV.lg },
	qDomainChip: { backgroundColor: Colors.primaryBg, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md, marginBottom: SpacingV.md },
	qDomainText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	qGuide: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '600', marginBottom: SpacingV.sm, textAlign: 'center' },
	qImage: { marginVertical: SpacingV.sm },
	qPrompt: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong, textAlign: 'center', lineHeight: scaleHeight(33) },
	qSub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.sm, textAlign: 'center' },
	option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: Border.thin, borderColor: Colors.border, paddingVertical: SpacingV.lg, paddingHorizontal: Spacing.lg, flexGrow: 1, minHeight: Layout.optionMinH, maxHeight: Layout.optionMaxH },
	// 보기 묶음 — 남는 높이를 받아 키 큰 화면에서 가운데가 비지 않게 한다
	answers: { flexGrow: 1, gap: Layout.itemGap },
	optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
	optionIndex: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
	optionIndexSelected: { backgroundColor: Colors.primary },
	optionIndexText: { fontSize: Typography.body, fontWeight: '800', color: Colors.textSecondary },
	optionText: { flex: 1, fontSize: Typography.callout, color: Colors.text, lineHeight: scaleHeight(22) },
	optionTextSelected: { fontWeight: '700', color: Colors.textStrong },

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
	historyScore: { fontSize: Typography.body, fontWeight: '900', color: Colors.primary },
	historyDate: { fontSize: Typography.footnote, color: Colors.textMuted, fontWeight: '600', marginTop: SpacingV.xs },
	resultScroll: { paddingBottom: Layout.screenBottom },
	resultHero: { ...CardSurface, alignItems: 'center', borderRadius: Radius.lg, paddingVertical: SpacingV.xxl, paddingHorizontal: Spacing.xxl, marginHorizontal: Layout.screenH },
	gradeIconWrap: { justifyContent: 'center', alignItems: 'center', marginBottom: SpacingV.lg },
	gradeStar: { position: 'absolute', width: scaleArt(150), height: scaleArt(150) },
	gradeIcon: { width: scaleWidth(92), height: scaleWidth(92), borderRadius: Radius.pill, justifyContent: 'center', alignItems: 'center' },
	gradeTier: { color: Colors.textSecondary, fontSize: Typography.body, fontWeight: '800', letterSpacing: 1 },
	gradeTitle: { color: Colors.textStrong, fontSize: Typography.display, fontWeight: '900', marginTop: SpacingV.xs },
	gradeScore: { color: Colors.primary, fontSize: Typography.displayLg, fontWeight: '900', marginTop: SpacingV.md },
	gradeDetail: { color: Colors.textSecondary, fontSize: Typography.body, marginTop: SpacingV.xs },
	msgCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginHorizontal: Layout.screenH, marginTop: Layout.sectionGap },
	msgText: { fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(22), textAlign: 'center', fontWeight: '600' },
	shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Layout.screenH, marginTop: SpacingV.lg, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, backgroundColor: Colors.primary },
	shareBtnText: { flexShrink: 1, textAlign: 'center', color: Colors.onFill, fontSize: Typography.callout, fontWeight: '800' },
	reviewSection: { marginHorizontal: Layout.screenH, marginTop: Layout.sectionGap },
	reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.sm },
	reviewTitle: { fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	reviewCount: { fontSize: Typography.body, fontWeight: '800' },
}));
