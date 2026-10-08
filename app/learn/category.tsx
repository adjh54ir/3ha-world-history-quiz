/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import SectionHead from '@/src/screens/common/atomic/SectionHead';
import BottomSheet from '@/src/screens/common/atomic/BottomSheet';
import Colors, { withAlpha, readableOn } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout, Border } from '@/src/const/ConstDesign';
import { isTablet, scaleArt, scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import LearnProgressService from '@/src/services/LearnProgressService';
import { stringParam } from '@/src/navigation/expoRouterUtils';
import { useTopBarAccent } from '@/src/utils/TopBarColor';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import { AnimatedProgress, FadeInUp } from '@/src/screens/common/anim/Motion';
import { Image as ExpoImage } from 'expo-image';
import { getCharacter, hasCharacter, getCharacterImages } from '@/src/const/ConstCharacters';
import { getDomainLevel, getDomainLevels, DOMAIN_LEVELS } from '@/src/const/ConstDomainLevels';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
import { LEVEL_ORDER, difficultyIcon } from '@/src/const/ConstQuizMeta';
import DifficultyPickerModal, { DifficultyOption } from '@/src/screens/modal/DifficultyPickerModal';
import CharacterLevelsModal from '@/src/screens/modal/CharacterLevelsModal';
import { getDomainIllustration } from '@/src/const/ConstIllustrationAssets';
import EntryImage from '@/src/screens/common/atomic/EntryImage';
import { themed } from '@/src/utils/ThemedStyles';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';

/**
 * 카테고리 상세 (Toss 스타일)
 * - 카테고리 메인색 헤더 + 플랫 카드 + 명확한 위계
 */
const LearnCategory = () => {
	const scrollTop = useScrollTop();
	const { t } = useTranslation();
	const params = useLocalSearchParams();
	const category = stringParam(params.category, 'capital');
	const domain = LearnHubService.getDomain(category);
	const accent = domain.meta.color;
	// 광고·상태바 배경을 히어로(주제색 틴트)와 같은 색으로 이어 붙인다
	useTopBarAccent(withAlpha(accent, '12'));
	const categoryIllustration = getDomainIllustration(domain.meta.key);

	const [wrongCount, setWrongCount] = useState(0);
	const [bookmarkCount, setBookmarkCount] = useState(0);
	const [accuracy, setAccuracy] = useState<number | null>(null);
	const [solved, setSolved] = useState(0);
	const [correct, setCorrect] = useState(0);
	const [studied, setStudied] = useState(0);
	const [showModeModal, setShowModeModal] = useState(false);
	const [showLevelModal, setShowLevelModal] = useState(false);
	const [showCharModal, setShowCharModal] = useState(false);
	const hasChar = hasCharacter(category);

	// 캐릭터/레벨 — 홈 점수상세와 동일한 상수(ConstDomainLevels/점수) 기준으로 통일
	const score = correct * POINT_PER_CORRECT;
	const domainLevel = getDomainLevel(category, { solved, score });
	const fallbackChar = getCharacter(category, solved, domain.meta.total);
	const heroLevelImg = domainLevel?.img ?? fallbackChar?.img ?? null;
	const heroLevelNum = domainLevel?.level ?? fallbackChar?.level ?? null;
	const charLevelDefs = getDomainLevels(category);
	const charMetric = DOMAIN_LEVELS[category]?.metric ?? null;
	const charImgs = getCharacterImages(category);
	const charCurrentLevel = domainLevel?.level ?? 0;
	// 레벨별 캐릭터 목록은 CharacterLevelsModal 이 직접 그린다
	const sampleQuestion = useMemo(() => {
		try {
			return domain.generateQuiz({ count: 1 })[0] ?? null;
		} catch {
			return null;
		}
	}, [category]);
	const total = domain.meta.total;
	// 이 도메인에 실제 존재하는 난이도만 노출 + 난이도별 문제 수 (없으면 '전체'만 남음)
	const { selectableLevels, levelCounts, totalCount } = useMemo(() => {
		try {
			const cards = domain.getStudyCards({ count: domain.meta.total });
			const counts: Record<string, number> = {};
			cards.forEach((c) => {
				if (c.levelLabel) counts[c.levelLabel] = (counts[c.levelLabel] ?? 0) + 1;
			});
			const levels = LEVEL_ORDER.filter((key) => (counts[key] ?? 0) > 0);
			return { selectableLevels: levels, levelCounts: counts, totalCount: cards.length };
		} catch {
			return { selectableLevels: [] as string[], levelCounts: {} as Record<string, number>, totalCount: total };
		}
	}, [category]);
	// 공통 난이도 팝업(DifficultyPickerModal)용 옵션 — 전체 + 이 도메인에 존재하는 난이도(문제 수 포함)
	const difficultyOptions = useMemo<DifficultyOption[]>(
		() => [
			{ key: '', label: t('common.all'), icon: 'apps', count: totalCount },
			...selectableLevels.map((key) => ({ key, label: key, icon: difficultyIcon(key), count: levelCounts[key] ?? 0 })),
		],
		[selectableLevels, levelCounts, totalCount, t],
	);
	const quizProgress = total > 0 ? Math.min(100, Math.round((Math.min(solved, total) / total) * 100)) : 0;
	const studyProgress = total > 0 ? Math.min(100, Math.round((Math.min(studied, total) / total) * 100)) : 0;
	// 다음 레벨까지 진행도 (레벨 정의가 있는 주제)
	const showNextLevel = hasChar && charLevelDefs.length > 0;
	const levelMetricVal = charMetric === 'solved' ? solved : score;
	const nextLvDef = charLevelDefs[charCurrentLevel];
	const lvBase = charLevelDefs[charCurrentLevel - 1]?.threshold ?? 0;
	// 레벨 구간 폭이 0이면 0 나눗셈으로 NaN 이 되어 진행바 width 가 'NaN%' 로 깨진다
	const lvSpan = nextLvDef ? nextLvDef.threshold - lvBase : 0;
	const nextLevelPct = nextLvDef && lvSpan > 0 ? Math.min(100, Math.max(0, Math.round(((levelMetricVal - lvBase) / lvSpan) * 100))) : 100;
	const nextLevelRemain = nextLvDef ? Math.max(0, nextLvDef.threshold - levelMetricVal) : 0;
	// 다음 등급 캐릭터 미리보기(실루엣)
	const nextLvImg = nextLvDef ? charImgs[charCurrentLevel] ?? null : null;

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			LearnProgressService.getWrongNotes().then((list) => alive && setWrongCount(list.filter((w) => w.domain === category).length));
			LearnProgressService.getBookmarks().then((list) => alive && setBookmarkCount(list.filter((b) => b.domain === category).length));
			LearnProgressService.getStats().then((s) => {
				if (!alive) return;
				const d = s.byDomain[category];
				setSolved(d?.solved ?? 0);
				setCorrect(d?.correct ?? 0);
				setAccuracy(d && d.solved > 0 ? Math.round((d.correct / d.solved) * 100) : null);
			});
			LearnProgressService.getStudiedCounts().then((c) => alive && setStudied(c[category] ?? 0));
			return () => {
				alive = false;
			};
		}, [category]),
	);

	const go = (path: string) => router.push({ pathname: path, params: { category } } as never);

	const startCardMode = () => {
		setShowModeModal(false);
		go('/learn/study');
	};
	const startShortsMode = () => {
		setShowModeModal(false);
		go('/special/shorts');
	};
	const startQuizWithLevel = (level: string) => {
		setShowLevelModal(false);
		router.push({ pathname: '/learn/quiz', params: { category, level } } as never);
	};

	const actions = [
		{ key: 'study', title: t('learn.category.actions.studyTitle'), desc: t('learn.category.actions.studyDesc'), icon: 'school', color: accent, onPress: () => setShowModeModal(true), badge: 0, illustration: undefined },
		{ key: 'quiz', title: t('learn.category.actions.quizTitle'), desc: selectableLevels.length > 0 ? t('learn.category.actions.quizDesc') : t('learn.category.actions.quizDescNoLevel'), icon: 'quiz', color: Colors.primary, onPress: () => (selectableLevels.length > 0 ? setShowLevelModal(true) : startQuizWithLevel('전체')), badge: 0, illustration: undefined },
		{ key: 'wrong', title: t('learn.category.actions.wrongTitle'), desc: wrongCount > 0 ? t('learn.category.actions.wrongDesc') : t('learn.category.actions.wrongDescEmpty'), icon: 'history-edu', color: Colors.error, onPress: () => go('/quiz/wrong-review'), badge: wrongCount, illustration: undefined },
		{ key: 'browse', title: t('learn.category.actions.browseTitle'), desc: t('learn.category.actions.browseDesc'), icon: 'filter-list', color: Colors.textSecondary, onPress: () => router.push({ pathname: '/search', params: { scope: category } } as never), badge: 0, illustration: undefined },
		{ key: 'favorite', title: t('learn.category.actions.favoriteTitle'), desc: bookmarkCount > 0 ? t('learn.category.actions.favoriteDesc') : t('learn.category.actions.favoriteDescEmpty'), icon: 'bookmark', color: Colors.secondaryDark, onPress: () => router.push({ pathname: '/library', params: { category } } as never), badge: bookmarkCount, illustration: undefined },
	];

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<ScrollView ref={scrollTop.ref} onScroll={scrollTop.onScroll} scrollEventThrottle={16} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
				{/* 헤더 — 카테고리 메인색 틴트 */}
				<View style={[styles.hero, { backgroundColor: withAlpha(accent, '12') }]}>
					{!!categoryIllustration && (
						<ExpoImage pointerEvents="none" source={categoryIllustration} style={styles.heroIllustration} contentFit="contain" />
					)}
					<View style={styles.heroTopRow}>
						<TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => router.back()} hitSlop={Layout.hitSlop} accessibilityRole="button" accessibilityLabel={t('header.back')}>
							<IconComponent type="materialIcons" name="arrow-back-ios-new" size={scaledSize(18)} color={Colors.textStrong} />
						</TouchableOpacity>
						<TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: '/search', params: { category } } as never)} hitSlop={Layout.hitSlop} accessibilityRole="button" accessibilityLabel={t('learn.category.search')}>
							<IconComponent type="materialIcons" name="search" size={scaledSize(22)} color={Colors.textStrong} />
						</TouchableOpacity>
					</View>

					<FadeInUp>
					<View style={styles.heroCenter}>
						<TouchableOpacity
							style={[styles.heroIcon, { borderColor: withAlpha(accent, '33') }]}
							activeOpacity={hasChar ? 0.85 : 1}
							onPress={() => hasChar && setShowCharModal(true)}>
							{heroLevelImg ? (
								<>
									<ExpoImage source={heroLevelImg} style={styles.heroCharImg} contentFit="contain" />
									<View style={[styles.heroLvBadge, { backgroundColor: accent }]}>
										<Text style={[styles.heroLvText, { color: readableOn(accent) }]}>Lv.{heroLevelNum}</Text>
									</View>
								</>
							) : (
								<DomainIcon mainIcon={domain.meta.mainIcon} icon={domain.meta.icon} iconType={domain.meta.iconType} size={scaledSize(domain.meta.mainIcon ? 48 : 34)} color={accent} />
							)}
						</TouchableOpacity>
						<Text style={styles.heroTitle} numberOfLines={1} ellipsizeMode="tail">{domain.meta.title}</Text>
						<Text style={styles.heroSub} numberOfLines={2}>{domain.meta.subtitle}</Text>
						{showNextLevel && (
							<View style={styles.heroNextLevel}>
								<View style={styles.heroNextTrack}>
									<View style={[styles.heroNextFill, { width: `${nextLevelPct}%`, backgroundColor: accent }]} />
								</View>
								<Text style={styles.heroNextText}>{nextLvDef
									? t(charMetric === 'solved' ? 'learn.category.nextLevelSolved' : 'learn.category.nextLevelScore', { value: nextLevelRemain.toLocaleString() })
									: t('learn.category.maxLevel')}</Text>
								{!!nextLvDef && !!nextLvImg && (
									<View style={styles.nextGradePreview}>
										<ExpoImage source={nextLvImg} style={styles.nextGradePreviewImg} contentFit="contain" />
										<Text style={styles.nextGradePreviewText}>{t('learn.category.nextGrade', { label: nextLvDef.label })}</Text>
									</View>
								)}
							</View>
						)}
						<View style={styles.heroChips}>
							<View style={[styles.heroCountPill, { backgroundColor: withAlpha(accent, '1F') }]}>
								<Text style={[styles.heroCountText, { color: accent }]}>{t('learn.category.totalCount', { value: total.toLocaleString() })}</Text>
							</View>
							{hasChar && (
								<TouchableOpacity style={styles.charViewBtn} activeOpacity={0.85} onPress={() => setShowCharModal(true)}>
									<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(14)} color={accent} />
									<Text style={[styles.charViewText, { color: accent }]}>{t('learn.category.charLevels')}</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
					</FadeInUp>
				</View>

				<View style={styles.body}>
					<FadeInUp>
					{/* 통계 요약 카드 */}
					<View style={styles.summaryCard}>
						<View style={styles.summaryStat}>
							<Text style={[styles.summaryNum, { color: Colors.primary }]}>{accuracy !== null ? `${accuracy}%` : '–'}</Text>
							<Text style={styles.summaryLabel}>{t('quiz.common.accuracy')}</Text>
						</View>
						<View style={styles.summaryDivider} />
						<View style={styles.summaryStat}>
							<Text style={[styles.summaryNum, { color: Colors.textStrong }]}>{solved.toLocaleString()}</Text>
							<Text style={styles.summaryLabel}>{t('learn.category.solved')}</Text>
						</View>
						<View style={styles.summaryDivider} />
						<View style={styles.summaryStat}>
							<Text style={[styles.summaryNum, { color: Colors.primary }]}>{bookmarkCount}</Text>
							<Text style={styles.summaryLabel}>{t('learn.category.actions.favoriteTitle')}</Text>
						</View>
					</View>

					{/* 진도율 */}
					<View style={styles.progressCard}>
						<View>
							<View style={styles.progressTop}>
								<IconComponent type="materialIcons" name="school" size={scaledSize(15)} color={accent} />
								<Text style={styles.progressTitle}>{t('learn.category.studyProgress')}</Text>
								<Text style={[styles.progressPct, { color: accent }]}>{studyProgress}%</Text>
							</View>
							<AnimatedProgress ratio={studyProgress / 100} color={accent} trackColor={Colors.border} height={scaleHeight(8)} />
						</View>
						<View>
							<View style={styles.progressTop}>
								<IconComponent type="materialIcons" name="quiz" size={scaledSize(15)} color={Colors.primary} />
								<Text style={styles.progressTitle}>{t('learn.category.quizProgress')}</Text>
								<Text style={[styles.progressPct, { color: Colors.primary }]}>{quizProgress}%</Text>
							</View>
							<AnimatedProgress ratio={quizProgress / 100} color={Colors.primary} trackColor={Colors.border} height={scaleHeight(8)} />
						</View>
					</View>

					{sampleQuestion && (
						<TouchableOpacity style={[styles.sampleCard, { borderColor: withAlpha(accent, '33') }]} activeOpacity={0.9} onPress={() => go('/learn/quiz')}>
							<View style={styles.sampleTop}>
								<View style={[styles.sampleIcon, { backgroundColor: withAlpha(accent, '14') }]}>
									<IconComponent type="materialIcons" name="psychology" size={scaledSize(22)} color={accent} />
								</View>
								<View style={styles.sampleHeadBody}>
									<Text style={styles.sampleEyebrow}>{t('learn.category.sampleEyebrow')}</Text>
									<Text style={styles.sampleTitle}>{t('learn.category.sampleTitle')}</Text>
								</View>
								<IconComponent type="materialIcons" name="arrow-forward" size={scaledSize(20)} color={accent} />
							</View>
							<Text style={styles.sampleGuide}>{sampleQuestion.guide}</Text>
							{sampleQuestion.imageRef ? (
								<EntryImage imageRef={sampleQuestion.imageRef} width={scaleWidth(120)} fetchWidth={240} style={styles.sampleImage} />
							) : (
								<Text style={styles.samplePrompt} numberOfLines={2}>{sampleQuestion.prompt}</Text>
							)}
							<View style={styles.sampleOptionRow}>
								{sampleQuestion.options.slice(0, 2).map((opt, i) => (
									<View key={`${sampleQuestion.uid}-${opt}-${i}`} style={styles.sampleOption}>
										<Text style={styles.sampleOptionText}>{opt}</Text>
									</View>
								))}
							</View>
						</TouchableOpacity>
					)}

					{/* 세부 메뉴 */}
					<SectionHead title={t('learn.category.sectionActions')} style={styles.sectionHeadWide} />
					<View style={styles.actionCard}>
						{actions.map((a, i) => (
							<TouchableOpacity key={a.key} style={[styles.actionRow, i > 0 && styles.actionRowBorder]} activeOpacity={0.85} onPress={a.onPress}>
								<View style={[styles.actionIcon, { backgroundColor: withAlpha(a.color, '14') }]}>
									{a.illustration ? (
										<ExpoImage source={a.illustration} style={styles.actionIllustration} contentFit="contain" />
									) : (
										<IconComponent type="materialIcons" name={a.icon} size={scaledSize(24)} color={a.color} />
									)}
								</View>
								<View style={styles.actionBody}>
									<View style={styles.actionTitleRow}>
										<Text style={styles.actionTitle} numberOfLines={1} ellipsizeMode="tail">{a.title}</Text>
										{a.badge > 0 && (
											<View style={styles.countBadge}>
												<Text style={styles.countBadgeText}>{a.badge}</Text>
											</View>
										)}
									</View>
									<Text style={styles.actionDesc} numberOfLines={2} ellipsizeMode="tail">{a.desc}</Text>
								</View>
								<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
							</TouchableOpacity>
						))}
					</View>
					</FadeInUp>
				</View>
			</ScrollView>
			{/* 긴 목록 — 우하단 맨 위로 버튼 */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} />

			{/* 학습 모드 선택 모달 */}
			<BottomSheet visible={showModeModal} onClose={() => setShowModeModal(false)}>
					<View>
						<View style={styles.modalTitleRow}>
							<Text style={styles.modalTitle}>{t('learn.mode.title')}</Text>
							<TouchableOpacity onPress={() => setShowModeModal(false)} hitSlop={Layout.hitSlop} activeOpacity={0.7}>
								<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.textSecondary} />
							</TouchableOpacity>
						</View>
						<Text style={styles.modalSub}>{t('learn.category.modeSub', { title: domain.meta.title })}</Text>

						<TouchableOpacity style={styles.modeCard} activeOpacity={0.9} onPress={startShortsMode}>
							<View style={[styles.modeIcon, { backgroundColor: Colors.primaryBg }]}>
								<IconComponent type="materialIcons" name="play-circle" size={scaledSize(26)} color={Colors.primary} />
							</View>
							<View style={styles.modeBody}>
								<Text style={styles.modeTitle}>{t('learn.category.shortsTitle')}</Text>
								<Text style={styles.modeDesc}>{t('learn.category.shortsDesc')}</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>

						<TouchableOpacity style={styles.modeCard} activeOpacity={0.9} onPress={startCardMode}>
							<View style={[styles.modeIcon, { backgroundColor: withAlpha(accent, '14') }]}>
								<IconComponent type="materialIcons" name="style" size={scaledSize(26)} color={accent} />
							</View>
							<View style={styles.modeBody}>
								<Text style={styles.modeTitle}>{t('learn.category.cardsTitle')}</Text>
								<Text style={styles.modeDesc}>{t('learn.category.cardsDesc')}</Text>
							</View>
							<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>
			</BottomSheet>

			{/* 난이도 선택 — 공통 팝업(DifficultyPickerModal) */}
			<DifficultyPickerModal
				visible={showLevelModal}
				options={difficultyOptions}
				subtitle={t('learn.category.levelSubtitle', { title: domain.meta.title })}
				onClose={() => setShowLevelModal(false)}
				onSelect={(lvl) => startQuizWithLevel(lvl ?? '전체')}
			/>

			{/* 레벨별 캐릭터 모달 — 공통 팝업(열람 전용, 선택은 홈에서만) */}
			<CharacterLevelsModal visible={showCharModal} onClose={() => setShowCharModal(false)} initialTab={category} />
		</SafeAreaView>
	);
};

export default LearnCategory;

const styles = themed(() => StyleSheet.create({
	sectionHeadWide: { marginBottom: SpacingV.md },
	safe: { flex: 1, backgroundColor: Colors.background },
	container: { paddingBottom: Layout.screenBottom },

	// 헤더 (틴트)
	hero: { overflow: 'hidden', paddingTop: SpacingV.sm, paddingBottom: SpacingV.xxl, paddingHorizontal: Layout.screenH, borderBottomLeftRadius: scaleWidth(28), borderBottomRightRadius: scaleWidth(28) },
	heroIllustration: { position: 'absolute', top: scaleHeight(54), right: scaleWidth(-18), width: scaleArt(154), height: scaleArt(154), opacity: 0.18 },
	heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -Spacing.sm },
	iconBtn: { width: scaleWidth(40), height: scaleWidth(40), justifyContent: 'center', alignItems: 'center' },
	heroCenter: { alignItems: 'center', marginTop: SpacingV.sm },
	heroIcon: { width: scaleArt(76), height: scaleArt(76), borderRadius: Radius.xl, borderWidth: 1, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
	heroCharImg: { width: scaleArt(62), height: scaleArt(62), borderRadius: Radius.lg },
	heroLvBadge: { position: 'absolute', bottom: scaleWidth(-6), right: scaleWidth(-6), paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: scaleWidth(9), borderWidth: Border.thin, borderColor: Colors.surface },
	heroLvText: { color: Colors.textInverse, fontSize: Typography.micro, fontWeight: '900' },
	heroTitle: { color: Colors.textStrong, fontSize: Typography.h2, fontWeight: '900', marginTop: SpacingV.md, textAlign: 'center' },
	heroSub: { color: Colors.textSecondary, fontSize: Typography.body, marginTop: SpacingV.xs, lineHeight: scaleHeight(19), textAlign: 'center', paddingHorizontal: Spacing.md },
	heroNextLevel: { alignItems: 'center', marginTop: SpacingV.md, width: isTablet ? '60%' : scaleWidth(200), alignSelf: 'center' },
	heroNextTrack: { width: '100%', height: scaleHeight(8), borderRadius: scaleWidth(4), backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
	heroNextFill: { height: '100%', borderRadius: scaleWidth(4) },
	heroNextText: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '700', marginTop: SpacingV.sm },
	nextGradePreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.sm, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	nextGradePreviewImg: { width: scaleWidth(22), height: scaleWidth(22), borderRadius: scaleWidth(7), opacity: 0.55 },
	nextGradePreviewText: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary, textAlign: 'center' },
	heroChips: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.lg, flexWrap: 'wrap' },
	heroCountPill: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	heroCountText: { fontSize: Typography.footnote, fontWeight: '800' },
	charViewBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	charViewText: { fontSize: Typography.footnote, fontWeight: '800' },

	// 본문
	body: { paddingHorizontal: Layout.screenH, marginTop: Layout.screenTop },

	// 통계 요약
	summaryCard: { ...CardSurface, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.lg, marginBottom: Layout.sectionGap },
	summaryStat: { flex: 1, alignItems: 'center' },
	summaryNum: { fontSize: Typography.h3, fontWeight: '900' },
	summaryLabel: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '600', marginTop: SpacingV.xs },
	summaryDivider: { width: 1, height: scaleHeight(30), backgroundColor: Colors.border },

	// 진도율
	progressCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, gap: SpacingV.lg, marginBottom: Layout.sectionGap },
	progressTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.sm },
	progressTitle: { flex: 1, fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	progressPct: { fontSize: Typography.body, fontWeight: '900' },
	progressTrack: { height: scaleHeight(8), borderRadius: scaleWidth(4), backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
	progressFill: { height: '100%', borderRadius: scaleWidth(4) },

	// 샘플 문제
	sampleCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.sectionGap },
	sampleTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: SpacingV.md },
	sampleIcon: { width: scaleWidth(44), height: scaleWidth(44), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
	sampleHeadBody: { flex: 1 },
	sampleEyebrow: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary, marginBottom: SpacingV.xxs },
	sampleTitle: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	sampleGuide: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary, marginBottom: SpacingV.sm },
	samplePrompt: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, lineHeight: scaleHeight(26) },
	sampleImage: { alignSelf: 'flex-start', borderRadius: Radius.md },
	sampleOptionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.md },
	sampleOption: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.sm },
	sampleOptionText: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: '800', color: Colors.text, textAlign: 'center' },

	// 세부 메뉴
	actionCard: { ...CardSurface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg },
	actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.lg },
	actionRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
	actionIcon: { width: scaleWidth(48), height: scaleWidth(48), borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	actionIllustration: { width: scaleWidth(44), height: scaleWidth(44) },
	actionBody: { flex: 1 },
	actionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	actionTitle: { flexShrink: 1, fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	countBadge: { backgroundColor: Colors.errorDark, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs },
	countBadgeText: { color: Colors.textInverse, fontSize: Typography.footnote, fontWeight: '800' },
	actionDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },

	// 모달 공통
	modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	modalTitle: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong },
	modalSub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.xs, marginBottom: SpacingV.lg },
	modeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.itemGap },
	modeIcon: { width: scaleWidth(50), height: scaleWidth(50), borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	modeBody: { flex: 1 },
	modeTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	modeDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs, lineHeight: scaleHeight(18) },
}));
