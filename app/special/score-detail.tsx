/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import FitText from '@/src/screens/common/atomic/FitText';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import SectionHead from '@/src/screens/common/atomic/SectionHead';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import Colors, { accuracyColor, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout, Border } from '@/src/const/ConstDesign';
import { isTablet, scaledSize, scaleHeight, scaleWidth, scaleArt} from '@/src/utils';
import LearnProgressService, { LearnStats } from '@/src/services/LearnProgressService';
import LearnHubService from '@/src/services/LearnHubService';
import { AnimatedProgress, FadeInUp } from '@/src/screens/common/anim/Motion';
import { getCharacter, hasCharacter, getOverallCharacterByPct, getOverallLevelIndexByPct, OVERALL_PCT_TIERS } from '@/src/const/ConstCharacters';
import { getDomainLevel, getDomainLevels } from '@/src/const/ConstDomainLevels';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
import CharacterLevelsModal from '@/src/screens/modal/CharacterLevelsModal';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import Tag from '@/src/screens/common/atomic/Tag';
import CharacterGuide, { useCharacterGuideOnce } from '@/src/screens/common/CharacterGuide';
import { themed } from '@/src/utils/ThemedStyles';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';

// 전체(종합) 히어로·목록 아이콘용 앱 메인 아이콘 이미지
const MAIN_ICON = require('@/src/assets/mainIcon.webp');

/**
 * 퀴즈별 점수 상세
 * - 전체 점수(정답 1개당 10점) + 주제별 점수/정답수/정답률
 * - 주제 선택 시 히어로가 해당 주제 캐릭터/점수로 전환, 레벨별 캐릭터 팝업 제공
 */
const ScoreDetail = () => {
	const { t } = useTranslation();
	const domains = LearnHubService.getDomainList();
	const [stats, setStats] = useState<LearnStats | null>(null);
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const [showCharModal, setShowCharModal] = useState(false);
	// 화면 사용법 안내 — 최초 1회, 홈에서 고른 캐릭터가 설명
	const guide = useCharacterGuideOnce('score-detail');
	// 주제별 점수 정렬 (이름순 기본 / 점수순)
	const [sortBy, setSortBy] = useState<'name' | 'score' | 'rate'>('name');
	// 상단 이동 FAB — 일정 높이 이상 내려가면 서서히 등장
	const scrollRef = useRef<ScrollView>(null);
	const scrollTop = useScrollTop(scrollRef);
	useFocusEffect(
		useCallback(() => {
			LearnProgressService.getStats().then(setStats);
		}, []),
	);

	const totalScore = (stats?.totalCorrect ?? 0) * POINT_PER_CORRECT;
	const totalSolved = stats?.totalSolved ?? 0;
	const totalCorrect = stats?.totalCorrect ?? 0;
	const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

	const rows = domains
		.map((d) => {
			const s = stats?.byDomain[d.key];
			const correct = s?.correct ?? 0;
			const solved = s?.solved ?? 0;
			const score = correct * POINT_PER_CORRECT;
			// 레벨/캐릭터는 히어로·모달과 동일한 상수(ConstDomainLevels) 기준으로 통일.
			// 레벨 정의가 없는 주제만 ConstCharacters로 폴백.
			const domainLevel = getDomainLevel(d.key, { solved, score });
			const char = getCharacter(d.key, solved, d.total);
			return {
				key: d.key,
				title: d.title,
				icon: d.icon,
				iconType: d.iconType,
				mainIcon: d.mainIcon,
				color: d.color,
				score,
				correct,
				solved,
				rate: solved > 0 ? Math.round((correct / solved) * 100) : 0,
				total: d.total,
				// 레벨 정의가 있는 주제만 캐릭터·Lv 표기 (주제 캐릭터가 없으면 주제 아이콘만 노출)
				levelImg: domainLevel?.img ?? null,
				levelNum: domainLevel?.level ?? null,
				levelMax: domainLevel?.maxLevel ?? null,
				// 다음 등급 미니 게이지용 (레벨 정의가 있는 주제만)
				levelInfo: domainLevel,
				char,
			};
		})
		// 기본은 이름 가나다순(목록 위치가 항상 같아 찾기 쉬움), 토글로 점수순
		// 정답률순은 '푼 적 있는 주제'가 먼저 — 0문제 주제가 100%처럼 위로 올라오지 않게 한다
		.sort((a, b) => {
			if (sortBy === 'score') return b.score - a.score;
			if (sortBy === 'rate') return (b.solved > 0 ? b.rate : -1) - (a.solved > 0 ? a.rate : -1);
			return a.title.localeCompare(b.title, 'ko');
		});

	const selectedRow = selectedKey ? rows.find((r) => r.key === selectedKey) ?? null : null;

	// 선택 주제의 도메인별 레벨/타이틀 (상수 ConstDomainLevels 기반: 누적 점수)
	const heroLevel = selectedRow ? getDomainLevel(selectedRow.key, { solved: selectedRow.solved, score: selectedRow.score }) : null;

	// 히어로 값 (전체 or 선택 주제)
	const heroChar = selectedRow ? selectedRow.char : null; // 전체일 땐 캐릭터 대신 아이콘
	const heroScore = selectedRow ? selectedRow.score : totalScore;
	const heroSolved = selectedRow ? selectedRow.solved : totalSolved;
	const heroRate = selectedRow ? selectedRow.rate : accuracy;
	const heroTitle = selectedRow ? selectedRow.title : t('special.scoreDetail.overallTitle');
	const totalQuestionCount = domains.reduce((a, d) => a + d.total, 0);
	const heroTotal = selectedRow ? selectedRow.total : totalQuestionCount;
	// 전체 달성률 — '푼 문제 / 전체 문제' 퍼센트. 등급은 이 %로 산정하고 표기는 실제 문제 개수로 노출.
	const overallSolved = rows.reduce((a, r) => a + (r.solved ?? 0), 0);
	const overallPct = totalQuestionCount > 0 ? Math.round((overallSolved / totalQuestionCount) * 100) : 0;
	// 캐릭터 팝업 대상 (선택 주제 or 최고 점수 주제 — 목록은 가나다순이라 점수순으로 따로 계산)
	const topScoredKey = [...rows].sort((a, b) => b.score - a.score).find((r) => r.char)?.key;
	const charKey = selectedKey ?? topScoredKey ?? domains[0]?.key ?? 'capital';
	// "전체" 전용 마스코트 — 달성률(%) 기준 등급 (20% → 2단계)
	const overallChar = getOverallCharacterByPct(overallPct);
	const overallIndexByPct = getOverallLevelIndexByPct(overallPct);
	const overallDefsAll = getDomainLevels('overall');
	const overallCurCount = Math.round((OVERALL_PCT_TIERS[overallIndexByPct - 1] / 100) * totalQuestionCount);
	const overallNextCount = overallIndexByPct < OVERALL_PCT_TIERS.length ? Math.round((OVERALL_PCT_TIERS[overallIndexByPct] / 100) * totalQuestionCount) : null;
	const overallLevel = overallDefsAll[overallIndexByPct - 1]
		? { def: overallDefsAll[overallIndexByPct - 1], value: overallSolved, curCount: overallCurCount, nextCount: overallNextCount }
		: null;
	const isOverall = !selectedKey;

	// 레벨별 캐릭터 목록은 CharacterLevelsModal 이 직접 그린다
	const openCharModal = () => {
		setShowCharModal(true);
	};

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			{/* 스크롤 영역 — 맨 위로 버튼을 하단 고정 버튼과 겹치지 않게 이 영역 기준으로 띄운다 */}
			<View style={{ flex: 1 }}>
			<ScrollView
				ref={scrollRef}
				contentContainerStyle={styles.container}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={scrollTop.onScroll}>
				{/* 헤더를 뺀 대신 화면 제목은 스크롤 첫 줄에 크게 */}
				<Text style={styles.screenTitle}>{t('special.scoreDetail.title')}</Text>
				<FadeInUp>
				{/* 점수 히어로 */}
				<View style={styles.banner}>
					<LinearGradient colors={[Colors.primaryBg, Colors.primarySoft, Colors.primaryBg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
					<View style={styles.charSlot}>
						{selectedRow && (heroLevel?.img ?? heroChar?.img) ? (
							<ExpoImage source={(heroLevel?.img ?? heroChar?.img)!} style={styles.charImg} contentFit="contain" />
						) : (
							<ExpoImage source={overallChar.img} style={styles.charImg} contentFit="contain" />
						)}
					</View>

					{/* 캐릭터 아래 등급 타이틀 뱃지 — 주제 선택 시 도메인별 레벨, 전체 보기 시 누적 등급 */}
					{heroLevel ? (
						<FadeInUp delay={80} style={styles.titleBadgeCol}>
							<View style={styles.titleBadgeRow}>
								<IconComponent type="fontAwesome6" name={heroLevel.def.icon} size={scaledSize(12)} color={Colors.primary} />
								<Text style={styles.titleBadgeText} numberOfLines={1} ellipsizeMode="tail">{heroLevel.def.label}</Text>
							</View>
							{!!heroLevel.def.encouragement && (
								<Text style={styles.titleBadgeSub} numberOfLines={2}>{heroLevel.def.encouragement.replace(/\n/g, ' ')}</Text>
							)}
							{heroLevel.nextThreshold != null ? (
								<View style={styles.nextGradeWrap}>
									<View style={styles.nextGradeTrack}>
										<View
											style={[
												styles.nextGradeFill,
												{ width: `${Math.min(100, Math.max(0, Math.round(((heroLevel.value - heroLevel.def.threshold) / (heroLevel.nextThreshold - heroLevel.def.threshold)) * 100)))}%` },
											]}
										/>
									</View>
									<View style={styles.nextGradeTag}>
										<IconComponent type="materialIcons" name="arrow-upward" size={scaledSize(11)} color={Colors.primary} />
										<Text style={styles.nextGradeTagText}>{t(heroLevel.metric === 'solved' ? 'special.scoreDetail.nextGradeSolved' : 'special.scoreDetail.nextGradeScore', { value: Math.max(0, heroLevel.nextThreshold - heroLevel.value).toLocaleString() })}</Text>
									</View>
								</View>
							) : (
								<View style={styles.nextGradeWrap}>
									<View style={styles.nextGradeTag}>
										<IconComponent type="materialIcons" name="workspace-premium" size={scaledSize(11)} color={Colors.primary} />
										<Text style={styles.nextGradeTagText}>{t('special.scoreDetail.maxGrade')}</Text>
									</View>
								</View>
							)}
						</FadeInUp>
					) : !selectedRow && overallLevel ? (
						<FadeInUp delay={80} style={styles.titleBadgeCol}>
							<View style={styles.titleBadgeRow}>
								<IconComponent type="fontAwesome6" name={overallLevel.def.icon} size={scaledSize(12)} color={Colors.primary} />
								<Text style={styles.titleBadgeText} numberOfLines={1} ellipsizeMode="tail">{overallLevel.def.label}</Text>
							</View>
							{overallLevel.nextCount != null ? (
								<View style={styles.nextGradeWrap}>
									<View style={styles.nextGradeTrack}>
										<View style={[styles.nextGradeFill, { width: `${Math.min(100, Math.max(0, Math.round(((overallLevel.value - overallLevel.curCount) / Math.max(1, overallLevel.nextCount - overallLevel.curCount)) * 100)))}%` }]} />
									</View>
									<View style={styles.nextGradeTag}>
										<IconComponent type="materialIcons" name="arrow-upward" size={scaledSize(11)} color={Colors.primary} />
										<Text style={styles.nextGradeTagText}>{t('special.scoreDetail.nextGradeSolved', { value: Math.max(0, overallLevel.nextCount - overallLevel.value).toLocaleString() })}</Text>
									</View>
								</View>
							) : (
								<View style={styles.nextGradeWrap}>
									<View style={styles.nextGradeTag}>
										<IconComponent type="materialIcons" name="workspace-premium" size={scaledSize(11)} color={Colors.primary} />
										<Text style={styles.nextGradeTagText}>{t('special.scoreDetail.maxGrade')}</Text>
									</View>
								</View>
							)}
						</FadeInUp>
					) : null}

					{/* 점수: 주제는 누적 점수, 전체는 총 문제 대비 달성률(%) */}
					<View style={styles.scoreRow}>
						<Text style={styles.scoreNum}>{isOverall ? overallPct : heroScore.toLocaleString()}</Text>
						<Text style={styles.scoreUnit}>{isOverall ? '%' : t('special.scoreDetail.unitPoint')}</Text>
					</View>

					<View style={styles.labelRow}>
						{selectedRow && (heroLevel || heroChar) && (
							<View style={styles.lvPill}>
								<Text style={styles.lvPillText}>Lv.{heroLevel?.level ?? heroChar?.level}{heroLevel ? ` / ${heroLevel.maxLevel}` : ''}</Text>
							</View>
						)}
						{selectedRow && <DomainIcon mainIcon={selectedRow.mainIcon} icon={selectedRow.icon} iconType={selectedRow.iconType} size={scaledSize(16)} color={Colors.primary} />}
						<Text style={styles.heroTitle} numberOfLines={1} ellipsizeMode="tail">{heroTitle}</Text>
					</View>

					{/* 스코어박스: 총 X/Y문제 · 정답률 */}
					<View style={styles.scoreBox}>
						<View style={styles.scoreBoxItem}>
							<FitText style={styles.scoreBoxNum}>{heroSolved.toLocaleString()}/{heroTotal.toLocaleString()}</FitText>
							<FitText style={styles.scoreBoxLabel}>{t('special.scoreDetail.totalQuestions')}</FitText>
						</View>
						<View style={styles.scoreBoxDivider} />
						<View style={styles.scoreBoxItem}>
							<FitText style={[styles.scoreBoxNum, { color: accuracyColor(heroRate) }]}>{heroRate}%</FitText>
							<FitText style={styles.scoreBoxLabel}>{t('special.scoreDetail.accuracy')}</FitText>
						</View>
					</View>

					{/* 버튼: 레벨별 캐릭터 보기 / (선택 시) 전체 보기 */}
					<View style={styles.heroBtns}>
						{(isOverall || hasCharacter(charKey)) && (
							<TouchableOpacity style={styles.charViewBtn} activeOpacity={0.85} onPress={openCharModal}>
								<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(13)} color={Colors.primary} />
								<Text style={styles.charViewText}>{t('special.scoreDetail.charView')}</Text>
							</TouchableOpacity>
						)}
						{selectedRow && (
							<TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={() => setSelectedKey(null)}>
								<IconComponent type="materialIcons" name="close" size={scaledSize(12)} color={Colors.textSecondary} />
								<Text style={styles.resetText}>{t('special.scoreDetail.showAll')}</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>

					<View style={styles.sectionHeadRow}>
						<SectionHead title={t('special.scoreDetail.sectionTitle')} sub={t('special.scoreDetail.sectionSub')} style={styles.sectionHeadInline} />
						<View style={styles.sortRow}>
							{([
								{ key: 'name', labelKey: 'special.scoreDetail.sortName' },
								{ key: 'score', labelKey: 'special.scoreDetail.sortScore' },
								{ key: 'rate', labelKey: 'special.scoreDetail.sortRate' },
							] as const).map((o) => {
								const on = sortBy === o.key;
								return (
									<TouchableOpacity key={o.key} style={[styles.sortChip, on && styles.sortChipOn]} activeOpacity={0.85} onPress={() => setSortBy(o.key)}>
										<Text style={[styles.sortText, on && styles.sortTextOn]}>{t(o.labelKey)}</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					</View>
					<TouchableOpacity
						style={[styles.row, selectedKey === null && { borderColor: Colors.primary, backgroundColor: Colors.primaryBg }]}
						activeOpacity={0.85}
						onPress={() => setSelectedKey(null)}>
						<View style={[styles.rowIcon, { backgroundColor: Colors.primarySoft }]}>
							<ExpoImage source={MAIN_ICON} style={{ width: scaleWidth(30), height: scaleWidth(30), borderRadius: scaleWidth(9) }} contentFit="contain" />
						</View>
						<View style={styles.rowBody}>
							<View style={styles.rowTop}>
								<Text style={styles.rowTitle}>{t('common.all')}</Text>
								<Text style={styles.rowScore}>{t('special.scoreDetail.scoreValue', { value: totalScore.toLocaleString() })}</Text>
							</View>
							<AnimatedProgress ratio={overallPct / 100} color={Colors.primary} trackColor={Colors.border} height={scaleHeight(8)} />
							<View style={styles.rowMetaRow}>
								<Tag label={t('special.scoreDetail.tagCorrect', { value: totalCorrect.toLocaleString() })} variant="plain" />
								<Tag label={t('special.scoreDetail.tagRate', { value: accuracy })} color={accuracyColor(accuracy)} />
								<Tag label={t('special.scoreDetail.tagSolved', { value: totalSolved.toLocaleString() })} variant="plain" />
								<Tag label={t('special.scoreDetail.tagTotal', { value: totalQuestionCount.toLocaleString() })} variant="plain" />
							</View>
						</View>
					</TouchableOpacity>
					{rows.map((r) => {
					const active = selectedKey === r.key;
					return (
						<TouchableOpacity
							key={r.key}
							style={[styles.row, active && { borderColor: Colors.primary, backgroundColor: Colors.primaryBg }]}
							activeOpacity={0.85}
							onPress={() => setSelectedKey(active ? null : r.key)}>
							{r.levelImg ? (
								<View style={styles.rowCharWrap}>
									<ExpoImage source={r.levelImg} style={styles.rowCharImg} contentFit="contain" />
									<View style={styles.rowLvBadge}>
										<Text style={styles.rowLvText}>Lv.{r.levelNum}</Text>
									</View>
								</View>
							) : (
								<View style={styles.rowIcon}>
									<DomainIcon mainIcon={r.mainIcon} icon={r.icon} iconType={r.iconType} size={scaledSize(r.mainIcon ? 30 : 20)} color={Colors.primary} />
								</View>
							)}
							<View style={styles.rowBody}>
								<View style={styles.rowTop}>
									<Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="tail">{r.title}</Text>
									<Text style={styles.rowScore}>{t('special.scoreDetail.scoreValue', { value: r.score.toLocaleString() })}</Text>
								</View>
								<View style={styles.barTrack}>
									{/* 총 문제 대비 내가 푼 문제 진행률 */}
									<View style={[styles.barFill, { width: `${r.total > 0 ? Math.min(100, Math.round((r.solved / r.total) * 100)) : 0}%` }]} />
								</View>
								<View style={styles.rowMetaRow}>
										<Tag label={t('special.scoreDetail.tagProgress', { solved: r.solved.toLocaleString(), total: r.total.toLocaleString() })} variant="plain" />
										{r.solved > 0 && <Tag label={t('special.scoreDetail.tagRate', { value: r.rate })} color={accuracyColor(r.rate)} />}
									</View>
									{/* 등급 정의가 없는 주제는 남은 학습량을 대신 보여준다 */}
									{!r.levelInfo && (
										<View style={styles.rowNextRow}>
											<Tag label={t('special.scoreDetail.studyProgress')} variant="outline" />
											<View style={styles.rowNextTrack}>
												<View style={[styles.rowNextFill, { width: `${r.total > 0 ? Math.min(100, Math.round((r.solved / r.total) * 100)) : 0}%` }]} />
											</View>
											<Text style={styles.rowNextRemain}>{t('special.scoreDetail.remain', { value: Math.max(0, r.total - r.solved).toLocaleString() })}</Text>
										</View>
									)}
									{/* 다음 등급 미니 게이지 (레벨 정의가 있는 주제) */}
									{r.levelInfo && r.levelInfo.nextThreshold != null && (
										<View style={styles.rowNextRow}>
											<Tag label={t('special.scoreDetail.next')} icon="arrow-upward" variant="outline" />
												{/* 호칭은 태그로 감싸지 않는다 — 태그가 겹쳐 읽기 어려워짐 */}
												<Text style={styles.rowNextLabel} numberOfLines={1} ellipsizeMode="tail">{r.levelInfo.nextDef?.label ?? t('special.scoreDetail.gradeFallback')}</Text>
											<View style={styles.rowNextTrack}>
												<View
													style={[
														styles.rowNextFill,
														{ width: `${Math.min(100, Math.max(0, Math.round(((r.levelInfo.value - r.levelInfo.def.threshold) / (r.levelInfo.nextThreshold - r.levelInfo.def.threshold)) * 100)))}%` },
													]}
												/>
											</View>
											<Text style={styles.rowNextRemain}>{t(r.levelInfo.metric === 'solved' ? 'special.scoreDetail.questionsValue' : 'special.scoreDetail.scoreValue', { value: Math.max(0, r.levelInfo.nextThreshold - r.levelInfo.value).toLocaleString() })}</Text>
										</View>
									)}
							</View>
						</TouchableOpacity>
					);
				})}
				</FadeInUp>
			</ScrollView>

			{/* 상단 이동 — 공통 맨 위로 버튼 (하단 홈 버튼 위) */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} inset={false} />
			</View>

			{/* 레벨별 캐릭터 모달 — 공통 팝업(열람 전용, 선택은 홈에서만) */}
			<CharacterLevelsModal visible={showCharModal} onClose={() => setShowCharModal(false)} initialTab={selectedKey ?? 'overall'} />

			<BottomButton
				label={t('special.home')}
				icon="home"
				onPress={() => router.replace('/(tabs)/home' as never)}
			/>

			{/* 점수 상세 안내 — 최초 1회 */}
			<CharacterGuide
				visible={guide.visible}
				onClose={guide.close}
				lines={[t('special.scoreDetail.guide1'), t('special.scoreDetail.guide2'), t('special.scoreDetail.guide3')]}
				title={t('special.scoreDetail.guideTitle')}
			/>
		</SafeAreaView>
	);
};

export default ScoreDetail;

const styles = themed(() => StyleSheet.create({
	sectionHeadInline: { flex: 1, marginBottom: 0 },
	safe: { flex: 1, backgroundColor: Colors.background },
	screenTitle: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong, marginBottom: SpacingV.md },
	// 하단 '홈으로' 바는 스크롤 아래에 흐름대로 붙으므로(겹치지 않음) 기본 하단 여백만 둔다
	container: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },

	// 상단 이동 FAB
	// bottom 은 렌더 시 insets.bottom + 하단 바 높이(≈62) + 여백(16)으로 준다
	// 히어로
	banner: { ...CardSurface, alignItems: 'center', borderRadius: Radius.lg, paddingVertical: SpacingV.xxl, paddingHorizontal: Spacing.xl, marginBottom: Layout.sectionGap, overflow: 'hidden' },
	charSlot: { width: scaleArt(104), height: scaleArt(104), borderRadius: Radius.xl, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
	charImg: { width: scaleArt(94), height: scaleArt(94), borderRadius: Radius.xl },
	titleBadgeCol: { alignItems: 'center', marginTop: SpacingV.sm },
	titleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.sm, backgroundColor: Colors.primaryBg, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs },
	titleBadgeText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	nextGradeWrap: { alignItems: 'center', marginTop: SpacingV.sm, width: isTablet ? '60%' : scaleWidth(200) },
	nextGradeTrack: { width: '100%', height: scaleHeight(8), borderRadius: scaleWidth(4), backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
	nextGradeFill: { height: '100%', borderRadius: scaleWidth(3), backgroundColor: Colors.primary },
	// 등급 진행 라벨 — 태그(칩) 형태로 통일
	nextGradeTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginTop: SpacingV.sm, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill, backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primarySoft },
	nextGradeTagText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	titleBadgeSub: { marginTop: SpacingV.sm, fontSize: Typography.footnote, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', lineHeight: scaledSize(16), paddingHorizontal: Spacing.md },
	scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: SpacingV.sm },
	scoreNum: { color: Colors.success, fontSize: Typography.displayLg, fontWeight: '900' },
	scoreUnit: { color: Colors.textStrong, fontSize: Typography.h3, fontWeight: '900', marginLeft: Spacing.xs },
	labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.xs },
	lvPill: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.sm },
	lvPillText: { color: Colors.onFill, fontSize: Typography.micro, fontWeight: '900' },
	heroTitle: { color: Colors.textSecondary, fontSize: Typography.body, fontWeight: '700' },
	scoreBox: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, paddingVertical: SpacingV.md, marginTop: SpacingV.lg },
	scoreBoxItem: { flex: 1, alignItems: 'center' },
	scoreBoxNum: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong },
	scoreBoxLabel: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '600', marginTop: SpacingV.xs },
	scoreBoxDivider: { width: 1, height: scaleHeight(28), backgroundColor: Colors.border },
	heroBtns: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.lg },
	// 태그(칩) 형태 — 버튼 덩어리 대신 가벼운 라벨로 보이게
	charViewBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: withAlpha(Colors.primary, '33'), borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	charViewText: { color: Colors.primary, fontSize: Typography.footnote, fontWeight: '800' },
	resetBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	resetText: { color: Colors.textSecondary, fontSize: Typography.footnote, fontWeight: '700' },

	// 섹션 / 주제행
	sectionHeadRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md, marginBottom: SpacingV.md },
	sortRow: { flexDirection: 'row', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.xxs },
	sortChip: { minHeight: scaleHeight(36), justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.sm },
	sortChipOn: { backgroundColor: Colors.surface },
	sortText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
	sortTextOn: { color: Colors.primary },
	row: { ...CardSurface, flexDirection: 'row', borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: SpacingV.sm },
	rowCharWrap: { width: scaleWidth(46), height: scaleWidth(46), borderRadius: Radius.md, backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	rowCharImg: { width: scaleWidth(38), height: scaleWidth(38), borderRadius: scaleWidth(11) },
	rowLvBadge: { position: 'absolute', bottom: scaleWidth(-4), right: scaleWidth(-4), backgroundColor: Colors.primary, paddingHorizontal: Spacing.xs, paddingVertical: SpacingV.xs, borderRadius: Radius.sm, borderWidth: Border.thin, borderColor: Colors.surface },
	rowLvText: { color: Colors.onFill, fontSize: Typography.micro, fontWeight: '900' },
	rowIcon: { width: scaleWidth(44), height: scaleWidth(44), borderRadius: Radius.md, backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	rowBody: { flex: 1, justifyContent: 'center' },
	rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.sm },
	rowTitle: { flexShrink: 1, fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	rowScore: { fontSize: Typography.callout, fontWeight: '900', color: Colors.primary },
	barTrack: { height: scaleHeight(8), borderRadius: scaleWidth(4), backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
	barFill: { height: '100%', borderRadius: scaleWidth(4), backgroundColor: Colors.primary },
	// 목록 메타 수치는 태그(칩) 형태로 — 호칭은 태그로 감싸지 않는다
	rowMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm, marginTop: SpacingV.sm },
	rowNextRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.sm },
	// 진행 라벨 — 태그(칩) 형태
	rowNextTrack: { flex: 1, height: scaleHeight(5), borderRadius: scaleWidth(3), backgroundColor: Colors.primarySoft, overflow: 'hidden' },
	rowNextFill: { height: '100%', borderRadius: scaleWidth(3), backgroundColor: Colors.primary },
	rowNextLabel: { flexShrink: 1, fontSize: Typography.micro, fontWeight: '800', color: Colors.textStrong },
	rowNextRemain: { fontSize: Typography.micro, fontWeight: '800', color: Colors.primary },
}));
