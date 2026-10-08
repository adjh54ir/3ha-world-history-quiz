/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import withRemountOnFocus from '@/src/screens/common/withRemountOnFocus';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScrollToTop } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import FitText from '@/src/screens/common/atomic/FitText';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import SectionHead from '@/src/screens/common/atomic/SectionHead';
import Colors, { accuracyColor, BRAND_GRADIENT, readableOn, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout, Tracking } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, isTablet, contentWidth } from '@/src/utils';
import DateUtils from '@/src/utils/DateUtils';
import LearnProgressService, { LearnStats } from '@/src/services/LearnProgressService';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
import LearnHubService from '@/src/services/LearnHubService';
import { LearnType } from '@/src/types/data/LearnType';
import AchievementService, { AchievementStatus } from '@/src/services/AchievementService';
import { ACHIEVEMENT_GROUPS, RARITY_META } from '@/src/const/ConstAchievements';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedProgress, FadeInUp, SheetIn, useReducedMotion } from '@/src/screens/common/anim/Motion';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import AppModal from '@/src/screens/common/atomic/AppModal';
import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from '@/src/screens/common/CharacterGuide';
import BadgeDetailModal from '@/src/screens/modal/BadgeDetailModal';
import EmptyState from '@/src/screens/common/atomic/EmptyState';
import LearningReportCard from '@/src/screens/common/LearningReportCard';
import LottieBox from '@/src/screens/common/atomic/LottieBox';
import { RankRowItem } from '@/src/screens/common/RankBoardView';
import RankingService, { RankRow } from '@/src/services/RankingService';
import TabHeader from '@/src/screens/common/TabHeader';
import { TAB_ILLUSTRATIONS } from '@/src/const/ConstTabIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';
import { useTranslation } from 'react-i18next';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';

/** 그라데이션 테두리로 한 번 더 강조하는 상위 희귀도 */
const HIGH_RARITY = new Set(['epic', 'legend']);


type DailyItem = { uid: string; prompt: string; answer: string; explanation?: string; correct: boolean; domain: string };
type DailySnapshot = { date: string; correct: number; total: number; items: DailyItem[] };
type RecordTab = 'time' | 'daily';
/** 내 활동 상단 탭 — 전체는 모든 섹션을 이어서 보여준다 */
type ProgressTab = 'all' | 'study' | 'quiz' | RecordTab;

/** 섹션 묶음 머리 — 학습 / 퀴즈 / 성취 세 덩어리를 눈으로 구분한다 */
const GroupHead: React.FC<{ label: string; icon: string }> = ({ label, icon }) => (
	<View style={styles.groupHead}>
		<View style={styles.groupIcon}>
			<IconComponent type="materialIcons" name={icon} size={scaledSize(15)} color={Colors.primary} />
		</View>
		<Text style={styles.groupLabel} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
	</View>
);

/**
 * 통계 (Toss 스타일)
 * - 플랫 카드 · 명확한 위계 · 일관된 간격
 */
const Stats = () => {
	const { t } = useTranslation();
	const [stats, setStats] = useState<LearnStats | null>(null);
	const [achievements, setAchievements] = useState<AchievementStatus[]>([]);
	const [selectedAchievement, setSelectedAchievement] = useState<AchievementStatus | null>(null);
	const [dailyHistory, setDailyHistory] = useState<Record<string, DailySnapshot>>({});
	// 기록 탭
	// 플레이별 점수 — false면 최근 3판, true면 전체 기록
	const [timeHistOpen, setTimeHistOpen] = useState(false);
	// 주제별 학습 진도 (학습 통계 탭)
	const [studiedCounts, setStudiedCounts] = useState<Record<string, number>>({});
	// 서브 퀴즈는 메인 통계(byDomain)에 안 쌓이므로 도메인별 최고 기록으로 진도를 보여준다
	const [subBests, setSubBests] = useState<Record<string, { correct: number; total: number }>>({});
	// 기록 보기 탭 — 전체 / 학습 / 퀴즈 / 타임 챌린지 / 오늘의 퀴즈
	const [progressTab, setProgressTab] = useState<ProgressTab>('all');
	/** 전체 탭이면 모든 섹션을 위에서 아래로 쭉 보여준다 */
	const showSection = (key: Exclude<ProgressTab, 'all'>) => progressTab === 'all' || progressTab === key;
	// 주제별 진도는 퀴즈 기준만 (학습 진도는 학습 기록 리포트와 겹쳐 제거)
	const showTopicProgress = progressTab === 'all' || progressTab === 'quiz';
	/** 주제별 퀴즈 기록 — 메인 주제는 누적 통계, 서브 퀴즈는 최고 기록 */
	const quizStatOf = (key: string): { solved: number; correct: number } | undefined => stats?.byDomain?.[key] ?? (subBests[key] ? { solved: subBests[key].total, correct: subBests[key].correct } : undefined);
	// 주제 정렬 — 기본은 등록 순, 켜면 진도(정답률)가 낮은 주제를 위로 올려 약점부터 보이게 한다
	const [weakFirst, setWeakFirst] = useState(false);
	/**
	 * 주제 목록 정렬. weakFirst 가 꺼져 있으면 원본 순서를 그대로 쓴다.
	 * 퀴즈 진도에서는 '한 번도 안 푼 주제'를 맨 아래로 내린다 — 정답률 0%로 취급하면 약점이 아니라 미응시가 위를 채운다.
	 */
	const sortDomains = useCallback(
		(list: readonly LearnType.DomainMeta[], quizMode: boolean): LearnType.DomainMeta[] => {
			if (!weakFirst) return [...list];
			const rateOf = (d: LearnType.DomainMeta) => {
				if (!quizMode) return d.total > 0 ? (studiedCounts[d.key] ?? 0) / d.total : 0;
				const q = quizStatOf(d.key);
				// 미응시는 101 로 밀어 목록 끝으로 보낸다
				return q && q.solved > 0 ? q.correct / q.solved : 101;
			};
			return [...list].sort((a, b) => rateOf(a) - rateOf(b));
		},
		[weakFirst, studiedCounts, stats, subBests],
	);
	const [studiedToday, setStudiedToday] = useState(0);
	const [selectedDaily, setSelectedDaily] = useState<DailySnapshot | null>(null);
	// 업적 필터 (전체 / 진행 중 / 달성)
	const [achFilter, setAchFilter] = useState<'all' | 'progress' | 'done'>('all');
	// 뱃지 전체 목록 팝업
	const [showAchSheet, setShowAchSheet] = useState(false);
	// 화면 사용법 안내 — 최초 1회, 홈에서 고른 캐릭터가 설명
	const guide = useCharacterGuideOnce('stats');
	// 랭킹 미리보기 — 주간이 아니라 '전체' 랭킹을 기본으로 보여준다
	const [rankRows, setRankRows] = useState<RankRow[]>([]);
	const [rankMine, setRankMine] = useState<{ rank: number; score: number } | null>(null);
	const [rankJoined, setRankJoined] = useState(false);
	// 전체 랭킹 히어로 연출 (빛 흐름 + 트로피 펄스)
	const reducedMotion = useReducedMotion();
	// 업적 시트 → 상세 교체 타이머 — 언마운트 시 정리
	const achSwapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (achSwapTimer.current) clearTimeout(achSwapTimer.current); }, []);
	const rankShine = useRef(new Animated.Value(0)).current;
	const rankPulse = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		if (reducedMotion) return;
		const shine = Animated.loop(
			Animated.sequence([
				Animated.timing(rankShine, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.delay(1400),
			]),
		);
		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(rankPulse, { toValue: 1, duration: 760, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(rankPulse, { toValue: 0, duration: 760, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		shine.start();
		pulse.start();
		return () => {
			shine.stop();
			pulse.stop();
			rankShine.setValue(0);
			rankPulse.setValue(0);
		};
	}, [reducedMotion, rankShine, rankPulse]);
	const domains = LearnHubService.getDomainList();
	const subDomains = LearnHubService.getSubQuizDomainList();
	const insets = useSafeAreaInsets();
	// 홈의 '획득한 뱃지'에서 넘어오면 해당 뱃지 상세를 바로 연다
	const params = useLocalSearchParams<{ ach?: string }>();
	const scrollRef = useRef<any>(null);
	const scrollTop = useScrollTop(scrollRef);
	useScrollToTop(scrollRef);

	useFocusEffect(
		useCallback(() => {
			// 탭에 들어올 때마다 모든 하위 상태를 초기값으로 되돌린다
			setProgressTab('all');
			setAchFilter('all');
			setSelectedDaily(null);
			setSelectedAchievement(null);
			setTimeHistOpen(false);
			scrollRef.current?.scrollTo?.({ y: 0, animated: false });
			LearnProgressService.getStats().then((s) => {
				setStats(s);
				setAchievements(AchievementService.evaluate(s));
			});
			LearnProgressService.getStudiedCounts().then(setStudiedCounts);
			LearnProgressService.getStudiedTodayCount().then(setStudiedToday);
			LearnProgressService.getSubQuizBests().then(setSubBests);
			AsyncStorage.getItem('TODAY_QUIZ_HISTORY')
				.then((raw) => setDailyHistory(raw ? JSON.parse(raw) : {}))
				.catch(() => setDailyHistory({}));
			// 전체 랭킹 — 참여(닉네임 등록)한 경우에만 최신 점수 제출 후 순위 로드
			if (!RankingService.isConfigured) return;
			let alive = true;
			(async () => {
				const nick = await RankingService.getNickname();
				if (!alive) return;
				setRankJoined(!!nick);
				if (!nick) return;
				await RankingService.submit();
				const [rows, mine] = await Promise.all([RankingService.board('total'), RankingService.myRank('total')]);
				if (!alive) return;
				setRankRows(rows);
				setRankMine(mine);
			})().catch(() => {});
			return () => {
				alive = false;
			};
		}, []),
	);

	/** 기록 탭 전환 — 이전 탭에서 열어둔 아코디언·상세를 닫는다 (스크롤 위치는 그대로 둔다) */
	const changeProgressTab = useCallback((next: ProgressTab) => {
		setProgressTab(next);
		setTimeHistOpen(false);
		setSelectedDaily(null);
	}, []);

	// 홈에서 뱃지를 눌러 들어오면 목록이 준비되는 대로 상세를 연다 (한 번 열고 파라미터는 비운다)
	useEffect(() => {
		if (!params.ach || achievements.length === 0) return;
		const hit = achievements.find((a) => a.def.id === params.ach);
		if (hit) setSelectedAchievement(hit);
		router.setParams({ ach: undefined });
	}, [params.ach, achievements]);

	const totalSolved = stats?.totalSolved ?? 0;
	const totalCorrect = stats?.totalCorrect ?? 0;
	const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
	const streak = stats?.streakCount ?? 0;
	const best = stats?.bestStreak ?? 0;
	const quizzes = stats?.totalQuizzes ?? 0;
	// 홈 '전체 점수'와 동일한 계산식 — 랭킹 카드가 이보다 낮은 점수를 보여주지 않게 하는 하한선
	const myScore = totalCorrect * POINT_PER_CORRECT;
	const unlockedCount = achievements.filter((a) => a.unlocked).length;

	// 오늘의 퀴즈 기록 (최신순)
	const dailyList = useMemo(
		() => Object.values(dailyHistory).sort((a, b) => b.date.localeCompare(a.date)),
		[dailyHistory],
	);
	// 업적 목록 — 필터 + 정렬(달성 임박 순, 달성 완료는 뒤로)
	const visibleAchievements = useMemo(() => {
		const list = achFilter === 'done' ? achievements.filter((a) => a.unlocked) : achFilter === 'progress' ? achievements.filter((a) => !a.unlocked) : achievements;
		return [...list].sort((a, b) => (a.unlocked === b.unlocked ? b.ratio - a.ratio : a.unlocked ? 1 : -1));
	}, [achievements, achFilter]);

	// 그룹(누적/플레이/연속/콤보·정답률/주제)별 섹션 — 40개가 넘어 헤더 없이는 훑기 어려움
	const achievementSections = useMemo(
		() =>
			ACHIEVEMENT_GROUPS.map((group) => ({ group, items: visibleAchievements.filter((a) => a.def.group === group.key) })).filter((s) => s.items.length > 0),
		[visibleAchievements],
	);

	// 학습 통계 탭 요약 — 학습 완료 카드 수 · 전체 진도율 · 오늘 학습
	const learnDone = useMemo(() => Object.values(studiedCounts).reduce((a, b) => a + b, 0), [studiedCounts]);
	const learnTotal = useMemo(() => domains.reduce((a, d) => a + d.total, 0), [domains]);
	const learnRate = learnTotal > 0 ? Math.round((learnDone / learnTotal) * 100) : 0;

	const timePlays = stats?.byMode?.time ?? 0;
	const bestCombo = stats?.bestComboOverall ?? 0;
	const timeHistory = stats?.timeHistory ?? [];
	const timeBestScore = timeHistory.reduce((m, h) => Math.max(m, h.correct * POINT_PER_CORRECT), 0);
	// 동점이 여러 판이면 왕관은 가장 최근 한 판에만 (목록은 최신순)
	const timeBestIndex = timeBestScore > 0 ? timeHistory.findIndex((h) => h.correct * POINT_PER_CORRECT === timeBestScore) : -1;


	/** 주제별 진도 블록 — 학습(카드 진도) / 퀴즈(풀이·정답률) 두 기준으로 같은 레이아웃을 쓴다 */
	const renderTopicProgress = (quizMode: boolean) => (
		<React.Fragment key={quizMode ? 'quiz-progress' : 'study-progress'}>
				<SectionHead
					title={quizMode ? t('stats.topic.quizTitle') : t('stats.topic.studyTitle')}
					sub={quizMode ? t('stats.topic.quizSub') : t('stats.topic.studySub')}
					style={styles.sectionHeadWide}
				/>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityState={{ selected: weakFirst }}
					style={[styles.sortChip, weakFirst && styles.sortChipOn]}
					activeOpacity={0.85}
					onPress={() => setWeakFirst((v) => !v)}
					hitSlop={Layout.hitSlop}>
					<IconComponent type="materialIcons" name="sort" size={scaledSize(14)} color={weakFirst ? Colors.primary : Colors.textMuted} />
					<Text style={[styles.sortChipText, weakFirst && styles.sortChipTextOn]} numberOfLines={1} ellipsizeMode="tail">{quizMode ? t('stats.topic.sortQuiz') : t('stats.topic.sortStudy')}</Text>
					{weakFirst && <IconComponent type="materialIcons" name="check" size={scaledSize(14)} color={Colors.primary} />}
				</TouchableOpacity>
				{/* 메인 주제 / 서브 퀴즈를 나눠 진도를 보여준다 */}
				{([
					{ key: 'main', label: t('stats.topic.main'), icon: 'category', list: sortDomains(domains, quizMode) },
					{ key: 'sub', label: t('stats.topic.sub'), icon: 'extension', list: sortDomains(subDomains, quizMode) },
				] as const).map((g) => {
					// 그룹 합계 — 목록 위에 진도 요약을 먼저 보여준다 (합계는 정렬과 무관하므로 원본 목록으로 계산)
					const gSolved = g.list.reduce((a, d) => a + (quizStatOf(d.key)?.solved ?? 0), 0);
					const gCorrect = g.list.reduce((a, d) => a + (quizStatOf(d.key)?.correct ?? 0), 0);
					const gDone = quizMode ? gCorrect : g.list.reduce((a, d) => a + (studiedCounts[d.key] ?? 0), 0);
					const gTotal = quizMode ? gSolved : g.list.reduce((a, d) => a + d.total, 0);
					const gRate = gTotal > 0 ? Math.round((gDone / gTotal) * 100) : 0;
					const gClear = quizMode
						? g.list.filter((d) => (quizStatOf(d.key)?.solved ?? 0) > 0).length
						: g.list.filter((d) => d.total > 0 && (studiedCounts[d.key] ?? 0) >= d.total).length;
					return (
						<View key={g.key} style={styles.topicGroup}>
							<View style={styles.topicGroupHead}>
								<IconComponent type="materialIcons" name={g.icon} size={scaledSize(14)} color={Colors.textSecondary} />
								<Text style={styles.topicGroupTitle} numberOfLines={1} ellipsizeMode="tail">{g.label}</Text>
								<View style={styles.topicGroupPill}>
									<Text style={styles.topicGroupPillText}>
										{t(quizMode ? 'stats.topic.pillQuiz' : 'stats.topic.pillStudy', { rate: gRate, done: gClear, total: g.list.length })}
									</Text>
								</View>
							</View>
							<View style={styles.card}>
								{/* 그룹 전체 진도 */}
								<View style={styles.topicTotalRow}>
									<Text style={styles.topicTotalLabel} numberOfLines={1} ellipsizeMode="tail">{quizMode ? t('stats.topic.totalAccuracy') : t('stats.topic.totalProgress')}</Text>
									<Text style={styles.topicTotalValue}>
										{t(quizMode ? 'stats.topic.totalQuiz' : 'stats.topic.totalStudy', { done: gDone.toLocaleString(), total: gTotal.toLocaleString() })}
									</Text>
								</View>
								<AnimatedProgress ratio={gRate / 100} color={Colors.primary} trackColor={Colors.border} height={scaleHeight(8)} />
								{g.list.map((d) => {
									const q = quizStatOf(d.key);
									const solved = q?.solved ?? 0;
									const correct = q?.correct ?? 0;
									const qRate = solved > 0 ? Math.round((correct / solved) * 100) : null;
									const done = studiedCounts[d.key] ?? 0;
									const studyRate = d.total > 0 ? Math.round((done / d.total) * 100) : 0;
									const rate = quizMode ? qRate ?? 0 : studyRate;
									const state = quizMode
										? solved > 0 ? t('stats.topic.stateAttempted') : t('stats.topic.stateNotAttempted')
										: studyRate >= 100 ? t('stats.topic.stateDone') : done > 0 ? t('stats.topic.stateInProgress') : t('stats.topic.stateNotStarted');
									const stateColor = quizMode
										? solved > 0 ? d.color : Colors.textMuted
										: studyRate >= 100 ? Colors.success : done > 0 ? d.color : Colors.textMuted;
									return (
										<View key={d.key} style={[styles.domainRow, styles.domainRowBorder]}>
											<View style={[styles.domainIcon, { backgroundColor: d.mainIcon ? Colors.surfaceAlt : withAlpha(d.color, '1A') }]}>
												<DomainIcon mainIcon={d.mainIcon} icon={d.icon} iconType={d.iconType} size={scaledSize(d.mainIcon ? 28 : 18)} color={d.color} />
											</View>
											<View style={styles.domainBody}>
												<View style={styles.domainTopRow}>
													<Text style={styles.domainName} numberOfLines={1} ellipsizeMode="tail">{d.title}</Text>
													<View style={[styles.domainStatePill, { backgroundColor: withAlpha(stateColor, '1A') }]}>
														<Text style={[styles.domainStateText, { color: stateColor }]}>{state}</Text>
													</View>
													<Text style={[styles.domainRate, { color: quizMode && qRate !== null ? accuracyColor(qRate) : d.color }]}>{rate}%</Text>
												</View>
												<AnimatedProgress ratio={rate / 100} color={quizMode && qRate !== null ? accuracyColor(qRate) : d.color} trackColor={Colors.border} height={scaleHeight(8)} />
												<View style={styles.domainMetaRow}>
													{quizMode ? (
														<>
															<View style={styles.domainMetaItem}>
																<IconComponent type="materialIcons" name="quiz" size={scaledSize(12)} color={Colors.textMuted} />
																<Text style={styles.domainMetaText}>{t('stats.topic.solved', { n: solved.toLocaleString() })}</Text>
															</View>
															<View style={styles.domainMetaItem}>
																<IconComponent type="materialIcons" name="check-circle" size={scaledSize(12)} color={Colors.textMuted} />
																<Text style={styles.domainMetaText}>{t('stats.topic.correct', { n: correct.toLocaleString() })}</Text>
															</View>
															<View style={styles.domainMetaItem}>
																<IconComponent type="materialIcons" name="cancel" size={scaledSize(12)} color={Colors.textMuted} />
																<Text style={styles.domainMetaText}>{t('stats.topic.wrong', { n: Math.max(0, solved - correct).toLocaleString() })}</Text>
															</View>
														</>
													) : (
														<>
															<View style={styles.domainMetaItem}>
																<IconComponent type="materialIcons" name="menu-book" size={scaledSize(12)} color={Colors.textMuted} />
																<Text style={styles.domainMetaText}>{t('stats.topic.cards', { done: done.toLocaleString(), total: d.total.toLocaleString() })}</Text>
															</View>
															{qRate !== null && (
																<View style={styles.domainMetaItem}>
																	<IconComponent type="materialIcons" name="check-circle" size={scaledSize(12)} color={accuracyColor(qRate)} />
																	<Text style={[styles.domainMetaText, { color: accuracyColor(qRate), fontWeight: '800' }]}>{t('stats.topic.accuracy', { rate: qRate })}</Text>
																</View>
															)}
														</>
													)}
												</View>
											</View>
										</View>
									);
								})}
							</View>
						</View>
					);
				})}
		</React.Fragment>
	);

	return (
		<View style={styles.safe}>
			<ScrollView onScroll={scrollTop.onScroll} onContentSizeChange={scrollTop.onContentSizeChange} scrollEventThrottle={16} ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
				<TabHeader
					title={t('stats.header.title')}
					sub={t('stats.header.sub')}
					illustration={TAB_ILLUSTRATIONS.stats}
					right={<CharacterGuideButton onPress={guide.open} />}
				/>

				<FadeInUp>
				{/* 요약 카드 — 연속 출석 + 3지표 */}
				<View style={styles.summaryCard}>
					<View style={styles.streakRow}>
						<View style={styles.streakIcon}>
							<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(24)} color={Colors.primary} />
						</View>
						<View style={styles.streakBody}>
							<Text style={styles.streakNum}>{t('stats.summary.streak', { days: streak })}</Text>
							<Text style={styles.streakSub}>{t('stats.summary.best', { days: best })}</Text>
						</View>
					</View>

					<View style={styles.summaryDivider} />

					{/* 퀴즈 지표 */}
					<View style={styles.summaryGroupHead}>
						<IconComponent type="materialIcons" name="quiz" size={scaledSize(13)} color={Colors.textMuted} />
						<Text style={styles.summaryGroupLabel}>{t('stats.summary.quiz')}</Text>
					</View>
					<View style={styles.summaryStats}>
						<View style={styles.summaryStat}>
							<FitText style={[styles.summaryStatNum, { color: Colors.textStrong }]}>{totalSolved.toLocaleString()}</FitText>
							<FitText style={styles.summaryStatLabel}>{t('stats.summary.solved')}</FitText>
						</View>
						<View style={styles.summaryStat}>
							<FitText style={[styles.summaryStatNum, { color: accuracyColor(accuracy) }]}>{accuracy}%</FitText>
							<FitText style={styles.summaryStatLabel}>{t('stats.summary.accuracy')}</FitText>
						</View>
						<View style={styles.summaryStat}>
							<FitText style={[styles.summaryStatNum, { color: Colors.secondaryDark }]}>{quizzes.toLocaleString()}</FitText>
							<FitText style={styles.summaryStatLabel}>{t('stats.summary.quizCount')}</FitText>
						</View>
					</View>

					{/* 학습 지표 — 카드·숏폼으로 실제 학습한 분량 */}
					<View style={[styles.summaryGroupHead, styles.summaryGroupHeadSecond]}>
						<IconComponent type="materialIcons" name="menu-book" size={scaledSize(13)} color={Colors.textMuted} />
						<Text style={styles.summaryGroupLabel}>{t('stats.summary.study')}</Text>
					</View>
					<View style={styles.summaryStats}>
						<View style={styles.summaryStat}>
							<FitText style={[styles.summaryStatNum, { color: Colors.textStrong }]}>{learnDone.toLocaleString()}</FitText>
							<FitText style={styles.summaryStatLabel}>{t('stats.summary.learnDone')}</FitText>
						</View>
						<View style={styles.summaryStat}>
							<FitText style={[styles.summaryStatNum, { color: Colors.primary }]}>{learnRate}%</FitText>
							<FitText style={styles.summaryStatLabel}>{t('stats.summary.learnRate')}</FitText>
						</View>
						<View style={styles.summaryStat}>
							<FitText style={[styles.summaryStatNum, { color: Colors.secondaryDark }]}>{studiedToday.toLocaleString()}</FitText>
							<FitText style={styles.summaryStatLabel}>{t('stats.summary.studiedToday')}</FitText>
						</View>
					</View>
				</View>

				{/* ── 랭킹 · 성취 — 겨루기와 뱃지를 한 묶음으로 ── */}
				{/* ── 전체 랭킹 — 뱃지와 함께 '겨루기·성취' 성격으로 묶는다 ── */}
				{RankingService.isConfigured && (
					<>
					<GroupHead label={t('stats.group.ranking')} icon="emoji-events" />
					<View style={styles.weeklyCard}>
						{/* 명예의 전당 히어로 — 그라데이션 + 빛 흐름 + 트로피 펄스 */}
						<View style={styles.rankHero}>
							<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
							<Animated.View
								pointerEvents="none"
								style={[styles.rankShine, { transform: [{ translateX: rankShine.interpolate({ inputRange: [0, 1], outputRange: [-scaleWidth(140), Math.max(scaleWidth(420), contentWidth)] }) }, { rotate: '18deg' }] }]}
							/>
							<View style={styles.rankHeroRow}>
								<Animated.View style={[styles.rankHeroIcon, { transform: [{ scale: rankPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
									<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(22)} color={Colors.gold} />
								</Animated.View>
								<View style={styles.rowBody}>
									<Text style={styles.rankHeroTitle} numberOfLines={1} ellipsizeMode="tail">{t('stats.rank.title')}</Text>
									<Text style={styles.rankHeroDesc} numberOfLines={2} ellipsizeMode="tail">{t('stats.rank.desc')}</Text>
								</View>
								<TouchableOpacity style={styles.rankMoreBtn} activeOpacity={0.85} onPress={() => router.push('/special/ranking' as never)} hitSlop={Layout.hitSlop}>
									<Text style={styles.rankMoreText}>{t('stats.rank.more')}</Text>
									<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(15)} color={Colors.primaryDeep} />
								</TouchableOpacity>
							</View>
							{rankJoined && (
								<View style={styles.rankHeroStats}>
									<View style={styles.rankHeroStat}>
										<Text style={styles.rankHeroStatLabel}>{t('stats.rank.myRank')}</Text>
										<FitText style={styles.rankHeroStatValue}>{rankMine ? t('stats.rank.rankValue', { rank: rankMine.rank }) : '-'}</FitText>
									</View>
									<View style={styles.rankHeroDivider} />
									<View style={styles.rankHeroStat}>
										<Text style={styles.rankHeroStatLabel}>{t('stats.rank.myScore')}</Text>
										{/* 서버 반영이 늦어도 홈의 전체 점수보다 낮게 보이지 않도록 로컬 점수와 큰 값을 쓴다 */}
										<FitText style={styles.rankHeroStatValue}>{t('stats.rank.scoreValue', { score: Math.max(rankMine?.score ?? 0, myScore).toLocaleString() })}</FitText>
									</View>
								</View>
							)}
						</View>

						{!rankJoined ? (
							<TouchableOpacity style={styles.weeklyJoinBtn} activeOpacity={0.9} onPress={() => router.push('/special/ranking' as never)}>
								<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(17)} color={Colors.onFill} />
								<Text style={styles.weeklyJoinText}>{t('stats.rank.join')}</Text>
							</TouchableOpacity>
						) : rankRows.length === 0 ? (
							<Text style={styles.weeklyEmpty}>{t('stats.rank.empty')}</Text>
						) : (
							<View style={styles.rankRowsWrap}>
								{rankRows.slice(0, 5).map((r, i) => (
									<FadeInUp key={`${r.rank}-${r.nickname}-${i}`} delay={Math.min(i * 70, 350)} duration={340} distance={12}>
										<RankRowItem item={r} index={i} unit={t('stats.rank.unit')} />
									</FadeInUp>
								))}
							</View>
						)}
					</View>
					</>
				)}

				{/* 학습 / 퀴즈 — 기록·진도를 탭으로 완전히 분리해 본다 */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={styles.recordTabScroll}
					contentContainerStyle={styles.recordTabBar}>
					{([
						{ key: 'all', label: t('common.all'), icon: 'dashboard' },
						{ key: 'study', label: t('stats.tabs.study'), icon: 'menu-book' },
						{ key: 'quiz', label: t('stats.tabs.quiz'), icon: 'quiz' },
						{ key: 'time', label: t('stats.tabs.time'), icon: 'bolt' },
						{ key: 'daily', label: t('stats.tabs.daily'), icon: 'event-available' },
					] as const).map((t) => {
						const on = progressTab === t.key;
						return (
							<TouchableOpacity key={t.key} style={[styles.recordTab, on && styles.recordTabOn]} activeOpacity={0.85} onPress={() => changeProgressTab(t.key)} hitSlop={Layout.hitSlop}>
								{on && <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
								<IconComponent type="materialIcons" name={t.icon} size={scaledSize(15)} color={on ? Colors.textInverse : Colors.textMuted} />
								<Text numberOfLines={1} style={[styles.recordTabText, on && styles.recordTabTextOn]}>{t.label}</Text>
							</TouchableOpacity>
						);
					})}
				</ScrollView>

				{/* 학습 탭 — 학습 기록(리포트) + 하단 학습 진도 */}
				{showSection('study') && (
					<>
						<GroupHead label={t('stats.group.studyRecord')} icon="menu-book" />
						<LearningReportCard variant="study" style={styles.reportCard} />
					</>
				)}


				{/* 퀴즈 탭 — 퀴즈 기록(리포트) + 하단 퀴즈 진도 */}
				{showSection('quiz') && (
					<>
						<GroupHead label={t('stats.group.quizRecord')} icon="quiz" />
						<LearningReportCard variant="quiz" style={styles.reportCard} />
					</>
				)}

				{showSection('time') && (
					<>
					<GroupHead label={t('stats.group.timeRecord')} icon="bolt" />
					<View style={styles.card}>
						{timePlays === 0 ? (
							<View style={styles.recordEmpty}>
								<EmptyState icon="bolt" text={t('stats.time.emptyTitle')} subText={t('stats.time.emptySub')} />
								<TouchableOpacity style={styles.recordCta} activeOpacity={0.9} onPress={() => router.push('/quiz/speed' as never)}>
									<Text style={styles.recordCtaText}>{t('stats.time.start')}</Text>
								</TouchableOpacity>
							</View>
						) : (
							<View style={styles.timeStatsRow}>
								<View style={styles.timeStat}>
									<View style={[styles.timeStatIcon, { backgroundColor: withAlpha(Colors.primary, '14') }]}>
										<IconComponent type="materialIcons" name="bolt" size={scaledSize(22)} color={Colors.primary} />
									</View>
									<Text style={styles.timeStatNum}>{timePlays.toLocaleString()}</Text>
									<Text style={styles.timeStatLabel}>{t('stats.time.plays')}</Text>
								</View>
								<View style={styles.timeStatDivider} />
								<View style={styles.timeStat}>
									<View style={[styles.timeStatIcon, { backgroundColor: withAlpha(Colors.error, '14') }]}>
										<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(22)} color={Colors.error} />
									</View>
									<Text style={styles.timeStatNum}>{bestCombo.toLocaleString()}</Text>
									<Text style={styles.timeStatLabel}>{t('stats.time.bestCombo')}</Text>
								</View>
							</View>
						)}

						{/* 플레이별 점수 — 기본 3판 노출, 누르면 전체 기록 (챌린지 탭과 동일 규칙) */}
						{timeHistory.length > 0 && (
							<View style={styles.timeHistWrap}>
								<TouchableOpacity
									style={styles.timeHistHead}
									activeOpacity={0.8}
									accessibilityRole="button"
									accessibilityState={{ expanded: timeHistOpen }}
									disabled={timeHistory.length <= 3}
									onPress={() => {
										LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
										setTimeHistOpen((v) => !v);
									}}>
									<Text style={styles.timeHistTitle}>{t('stats.time.historyTitle')}</Text>
									<View style={styles.timeHistCountPill}>
										<Text style={styles.timeHistCountText}>{t('stats.time.playCount', { n: timeHistory.length })}</Text>
									</View>
									{timeHistory.length > 3 && (
										<IconComponent type="materialIcons" name={timeHistOpen ? 'expand-less' : 'expand-more'} size={scaledSize(22)} color={Colors.textMuted} />
									)}
								</TouchableOpacity>
								{(timeHistOpen ? timeHistory : timeHistory.slice(0, 3)).map((h, i) => {
									// 역대 최고 점수 행은 왕관 + 배경으로 바로 눈에 띄게 (동점이면 가장 최근 한 판만)
									const score = h.correct * POINT_PER_CORRECT;
									const isBest = i === timeBestIndex;
									return (
									<View key={`${h.at}-${i}`} style={[styles.timeHistRow, i > 0 && styles.timeHistRowBorder, isBest && styles.timeHistRowBest]}>
										<View style={[styles.timeHistIndex, isBest && styles.timeHistIndexBest]}>
											{isBest ? (
												<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(14)} color={Colors.gold} />
											) : (
												<Text style={styles.timeHistIndexText}>{timeHistory.length - i}</Text>
											)}
										</View>
										<View style={styles.timeHistBody}>
											<Text style={styles.timeHistMeta}>{DateUtils.formatTimestamp(h.at, 'type2')}</Text>
											<View style={styles.timeHistTagRow}>
												<View style={styles.timeHistTag}>
													<IconComponent type="materialIcons" name="check-circle" size={scaledSize(12)} color={Colors.success} />
													<Text style={styles.timeHistTagText}>{h.correct}/{h.solved}</Text>
												</View>
												<View style={styles.timeHistCombo}>
													<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(12)} color={Colors.error} />
													<Text style={styles.timeHistComboText}>{h.bestCombo}</Text>
												</View>
											</View>
										</View>
										<View style={styles.timeHistScoreWrap}>
											<Text style={styles.timeHistScore}>{score.toLocaleString()}</Text>
											<Text style={styles.timeHistScoreUnit}>{t('stats.time.scoreUnit')}</Text>
										</View>
									</View>
									);
								})}
								{timeHistory.length > 3 && (
									<TouchableOpacity
										activeOpacity={0.7}
										onPress={() => {
											LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
											setTimeHistOpen((v) => !v);
										}}>
										<Text style={styles.timeHistMore}>{timeHistOpen ? t('stats.time.collapse') : t('stats.time.showAll', { n: timeHistory.length })}</Text>
									</TouchableOpacity>
								)}
							</View>
						)}
					</View>
					</>
				)}

				{showSection('daily') && (
					<>
					<GroupHead label={t('stats.group.dailyRecord')} icon="event-available" />
					<View style={styles.card}>
						{dailyList.length === 0 ? (
							<View style={styles.recordEmpty}>
								<EmptyState icon="event-available" text={t('stats.daily.emptyTitle')} subText={t('stats.daily.emptySub')} />
								<TouchableOpacity style={styles.recordCta} activeOpacity={0.9} onPress={() => router.push('/quiz/today' as never)}>
									<Text style={styles.recordCtaText}>{t('stats.daily.start')}</Text>
								</TouchableOpacity>
							</View>
						) : (
							dailyList.map((it, i) => {
								const rate = it.total > 0 ? Math.round((it.correct / it.total) * 100) : 0;
								return (
									<TouchableOpacity key={it.date} activeOpacity={0.85} onPress={() => setSelectedDaily(it)} style={[styles.dailyRow, i > 0 && styles.dailyRowBorder]}>
										<View style={styles.dailyDateBox}>
											<Text style={styles.dailyDateMonth}>{t('stats.daily.month', { month: Number(it.date.slice(5, 7)) })}</Text>
											<Text style={styles.dailyDateDay}>{Number(it.date.slice(8, 10))}</Text>
										</View>
										<View style={styles.dailyRowBody}>
											<Text style={styles.dailyRowTitle} numberOfLines={1} ellipsizeMode="tail">{t('stats.daily.rowTitle', { correct: it.correct, total: it.total })}</Text>
											<Text style={styles.dailyRowSub}>{t('stats.daily.rateLabel')}<Text style={{ color: accuracyColor(rate), fontWeight: '800' }}>{rate}%</Text></Text>
										</View>
										<View style={[styles.dailyRatePill, { backgroundColor: withAlpha(accuracyColor(rate), '14') }]}>
											<Text style={[styles.dailyRateText, { color: accuracyColor(rate) }]}>{rate}%</Text>
										</View>
										<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(20)} color={Colors.textMuted} />
									</TouchableOpacity>
								);
							})
						)}
					</View>
					</>
				)}
				{showTopicProgress && renderTopicProgress(true)}


				<GroupHead label={t('stats.group.achievement')} icon="military-tech" />
				<TouchableOpacity style={styles.achSummary} activeOpacity={0.9} onPress={() => setShowAchSheet(true)}>
					<View style={styles.achSummaryIcon}>
						<IconComponent type="materialIcons" name="military-tech" size={scaledSize(22)} color={Colors.primary} />
					</View>
					<View style={styles.achSummaryBody}>
						<Text style={styles.achSummaryTitle}>{t('stats.ach.title')}</Text>
						<Text style={styles.achSummaryDesc}>{t('stats.ach.obtained', { unlocked: unlockedCount, total: achievements.length })}</Text>
						<View style={styles.achSummaryTrack}>
							<View style={[styles.achSummaryFill, { width: `${achievements.length ? Math.round((unlockedCount / achievements.length) * 100) : 0}%` }]} />
						</View>
					</View>
					<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
				</TouchableOpacity>

			</FadeInUp>
			</ScrollView>
			{/* 긴 목록 — 우하단 맨 위로 버튼 */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} />
			<AppModal visible={showAchSheet} transparent animationType="fade" onRequestClose={() => setShowAchSheet(false)}>
				<View style={styles.achSheetOverlay}>
					<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowAchSheet(false)} />
					<SheetIn visible={showAchSheet} style={styles.achSheetWrap}>
						<View style={[styles.achSheet, { paddingBottom: SpacingV.lg + insets.bottom }]}>
							<View style={styles.achSheetHandle} />
							<View style={styles.achSheetHead}>
								<Text style={styles.achSheetTitle}>{t('stats.ach.title')}</Text>
								<Text style={styles.achCount}>{unlockedCount} / {achievements.length}</Text>
								<TouchableOpacity onPress={() => setShowAchSheet(false)} hitSlop={Layout.hitSlop} activeOpacity={0.7}>
									<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.textMuted} />
								</TouchableOpacity>
							</View>
							<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.achSheetBody}>
				{/* 40개가 넘어 한 화면에 안 들어오므로 상태 필터 제공 */}
				<View style={styles.achFilterRow}>
					{([
						{ key: 'all', label: t('common.all'), count: achievements.length },
						{ key: 'progress', label: t('stats.ach.filterProgress'), count: achievements.length - unlockedCount },
						{ key: 'done', label: t('stats.ach.filterDone'), count: unlockedCount },
					] as const).map((f) => {
						const on = achFilter === f.key;
						return (
							<TouchableOpacity key={f.key} style={[styles.achFilterChip, on && styles.achFilterChipOn]} activeOpacity={0.85} onPress={() => setAchFilter(f.key)} hitSlop={Layout.hitSlop}>
								<Text style={[styles.achFilterText, on && styles.achFilterTextOn]}>{f.label} {f.count}</Text>
							</TouchableOpacity>
						);
					})}
				</View>
				{visibleAchievements.length === 0 ? (
					<View style={styles.achList}>
						<Text style={styles.achEmpty}>{achFilter === 'done' ? t('stats.ach.emptyDone') : achFilter === 'progress' ? t('stats.ach.emptyProgress') : t('stats.ach.emptyLoading')}</Text>
					</View>
				) : (
					achievementSections.map((sec) => (
						<View key={sec.group.key} style={styles.achSection}>
							<View style={styles.achGroupHead}>
								<IconComponent type="materialIcons" name={sec.group.icon} size={scaledSize(15)} color={sec.group.color} />
								<Text style={styles.achGroupLabel} numberOfLines={1} ellipsizeMode="tail">{sec.group.label}</Text>
								<Text style={styles.achGroupCount}>{sec.items.filter((a) => a.unlocked).length}/{sec.items.length}</Text>
							</View>
							<View style={styles.achList}>
								{sec.items.map((a, i) => (
									<TouchableOpacity
										key={a.def.id}
										style={[styles.achRow, i > 0 && styles.achRowBorder]}
										activeOpacity={0.86}
										// 시트(모달)가 닫히기 전에 상세(모달)를 열면 두 모달이 겹쳐 터치가 먹통이 된다 — 한 박자 뒤에 연다
										onPress={() => {
											setShowAchSheet(false);
											achSwapTimer.current = setTimeout(() => setSelectedAchievement(a), 260);
										}}>
										<View
											style={[
												styles.achIcon,
												{ backgroundColor: a.unlocked ? withAlpha(a.def.color, '1A') : Colors.surfaceAlt },
												a.unlocked && { borderWidth: HIGH_RARITY.has(a.def.rarity) ? 2 : 1, borderColor: RARITY_META[a.def.rarity].color },
											]}>
											{a.unlocked && HIGH_RARITY.has(a.def.rarity) && (
												<LinearGradient
													colors={[withAlpha(RARITY_META[a.def.rarity].color, '00'), withAlpha(RARITY_META[a.def.rarity].color, '55')]}
													start={{ x: 0, y: 0 }}
													end={{ x: 1, y: 1 }}
													style={StyleSheet.absoluteFill}
												/>
											)}
											<IconComponent type="materialIcons" name={a.unlocked ? a.def.icon : 'lock'} size={scaledSize(20)} color={a.unlocked ? a.def.color : Colors.textMuted} />
										</View>
										<View style={styles.achRowBody}>
											<View style={styles.achRowTop}>
												<Text style={[styles.achTitle, !a.unlocked && { color: Colors.textSecondary }]} numberOfLines={1}>{a.def.title}</Text>
												{a.unlocked ? (
													<View style={[styles.achBadge, { backgroundColor: a.def.color }]}>
														<Text style={[styles.achBadgeText, { color: readableOn(a.def.color) }]}>{t('stats.ach.unlocked')}</Text>
													</View>
												) : (
													<Text style={styles.achProgress}>{a.current}/{a.def.target}{a.def.unit ?? ''}</Text>
												)}
											</View>
											<View style={[styles.achRarity, { backgroundColor: withAlpha(RARITY_META[a.def.rarity].color, '14') }]}>
												<Text style={[styles.achRarityText, { color: RARITY_META[a.def.rarity].color }]}>{RARITY_META[a.def.rarity].label}</Text>
											</View>
											<Text style={styles.achDesc} numberOfLines={2}>{a.def.desc}</Text>
											<View style={styles.achCondRow}>
												<IconComponent type="materialIcons" name="flag" size={scaledSize(11)} color={Colors.textMuted} />
												<Text style={styles.achCondText} numberOfLines={1}>{a.def.cond}</Text>
											</View>
											{!a.unlocked && (
												<View style={styles.achBarTrack}>
													<View style={[styles.achBarFill, { width: `${Math.round(a.ratio * 100)}%`, backgroundColor: a.def.color }]} />
												</View>
											)}
										</View>
										<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(20)} color={Colors.textMuted} />
									</TouchableOpacity>
								))}
							</View>
						</View>
					))
				)}
							</ScrollView>
						</View>
					</SheetIn>
				</View>
			</AppModal>
			<CharacterGuide
				visible={guide.visible}
				onClose={guide.close}
				lines={[t('stats.guide.line1'), t('stats.guide.line2'), t('stats.guide.line3')]}
				title={t('stats.guide.title')}
			/>

			<BadgeDetailModal badge={selectedAchievement} onClose={() => setSelectedAchievement(null)} unlockedCount={unlockedCount} totalCount={achievements.length} />

			{/* 오늘의 퀴즈 과거 결과 상세 */}
			<AppModal visible={!!selectedDaily} transparent animationType="fade" onRequestClose={() => setSelectedDaily(null)}>
				<View style={styles.modalBackdrop}>
					{/* 배경 탭으로 닫기 — 카드 위에 겹치지 않아 내부 스크롤 제스처를 가로채지 않는다 */}
					<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedDaily(null)} />
					<SheetIn visible={!!selectedDaily} distance={scaleHeight(40)} style={styles.dailyModal}>
						{/* 헤더 — 브랜드 그라데이션 위에 날짜·점수 요약 */}
						<View style={styles.dailyModalHero}>
							<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
							<View style={styles.dailyModalHead}>
								<View style={styles.dailyModalHeadBody}>
									<Text style={styles.dailyModalTitle}>{t('stats.daily.modalTitle')}</Text>
									{!!selectedDaily && <Text style={styles.dailyModalDate}>{selectedDaily.date}</Text>}
								</View>
								<TouchableOpacity style={styles.dailyModalClose} onPress={() => setSelectedDaily(null)} hitSlop={Layout.hitSlop} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.close')}>
									<IconComponent type="materialIcons" name="close" size={scaledSize(20)} color={Colors.textInverse} />
								</TouchableOpacity>
							</View>
							{!!selectedDaily && (
								<View style={styles.dailyModalScore}>
									<Text style={styles.dailyModalScoreNum}>{selectedDaily.correct}</Text>
									<Text style={styles.dailyModalScoreUnit}>{t('stats.daily.scoreUnit', { total: selectedDaily.total })}</Text>
									<View style={styles.dailyModalRatePill}>
										<Text style={styles.dailyModalRateText}>
											{selectedDaily.total > 0 ? Math.round((selectedDaily.correct / selectedDaily.total) * 100) : 0}%
										</Text>
									</View>
								</View>
							)}
						</View>
						<ScrollView
							style={styles.dailyModalList}
							contentContainerStyle={styles.dailyModalListContent}
							showsVerticalScrollIndicator
							nestedScrollEnabled>
							{selectedDaily?.items.map((it, i) => {
								const meta = LearnHubService.getDomain(it.domain).meta;
								return (
									<View key={`${it.uid}-${i}`} style={styles.pastItem}>
										<View style={styles.pastItemTop}>
											<View style={[styles.pastMark, { backgroundColor: it.correct ? Colors.successDeep : Colors.errorDark }]}>
												<IconComponent type="materialIcons" name={it.correct ? 'check' : 'close'} size={scaledSize(11)} color={Colors.textInverse} />
											</View>
											<Text style={[styles.pastDomain, { color: meta.color }]} numberOfLines={1}>{meta.title}</Text>
											<View style={[styles.pastResultChip, { backgroundColor: it.correct ? withAlpha(Colors.success, '14') : withAlpha(Colors.error, '14') }]}>
												<Text style={[styles.pastResult, { color: it.correct ? Colors.success : Colors.error }]}>{it.correct ? t('stats.daily.correct') : t('stats.daily.wrong')}</Text>
											</View>
										</View>
										<Text lineBreakStrategyIOS="hangul-word" style={styles.pastPrompt}>{it.prompt}</Text>
										<View style={styles.pastAnswerBox}>
											<IconComponent type="materialIcons" name="format-quote" size={scaledSize(13)} color={Colors.success} />
											<Text style={styles.pastAnswer}>{it.answer}</Text>
										</View>
										{!!it.explanation && <Text lineBreakStrategyIOS="hangul-word" style={styles.pastExplain}>{it.explanation}</Text>}
									</View>
								);
							})}
						</ScrollView>
					</SheetIn>
				</View>
			</AppModal>

		</View>
	);
};


export default withRemountOnFocus(Stats);


const styles = themed(() => StyleSheet.create({
	sectionHeadWide: { marginBottom: SpacingV.md },
	// 섹션 묶음 머리 — 아이콘 칩 + 라벨 (왼쪽 강조선은 쓰지 않는다). 위 간격은 앞 카드의 sectionGap이 맡는다
	groupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.lg },
	groupIcon: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: Radius.sm, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
	groupLabel: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	safe: { flex: 1, backgroundColor: Colors.background },
	container: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },

	// 요약 카드
	summaryCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.sectionGap },
	streakRow: { flexDirection: 'row', alignItems: 'center' },
	streakIcon: { width: scaleWidth(46), height: scaleWidth(46), borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	streakBody: { flex: 1 },
	streakNum: { color: Colors.textStrong, fontSize: Typography.title, fontWeight: '900' },
	streakSub: { color: Colors.textSecondary, fontSize: Typography.footnote, marginTop: SpacingV.xs, fontWeight: '600' },
	summaryDivider: { height: 1, backgroundColor: Colors.border, marginVertical: SpacingV.lg },
	summaryStats: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm },
	summaryGroupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.sm },
	summaryGroupHeadSecond: { marginTop: SpacingV.lg },
	summaryGroupLabel: { fontSize: Typography.micro, fontWeight: '900', color: Colors.textMuted, letterSpacing: Tracking.tight },
	summaryStat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.md, paddingHorizontal: Spacing.xs, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
	summaryStatNum: { fontSize: Typography.h3, fontWeight: '900' },
	summaryStatLabel: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '600', marginTop: SpacingV.xs },

	// 주간 학습 리포트 (연속 학습 요약 아래)
	reportCard: { marginBottom: Layout.sectionGap },

	// 주간 랭킹 (연속 학습 요약 아래)
	achSummary: { ...CardSurface, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.sectionGap },
	achSummaryIcon: { width: scaleWidth(44), height: scaleWidth(44), borderRadius: Radius.lg, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
	achSummaryBody: { flex: 1 },
	achSummaryTitle: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	achSummaryDesc: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	achSummaryTrack: { height: scaleHeight(6), borderRadius: scaleHeight(3), backgroundColor: Colors.surfaceAlt, overflow: 'hidden', marginTop: SpacingV.sm },
	achSummaryFill: { height: '100%', borderRadius: scaleHeight(3), backgroundColor: Colors.primary },
	achSheetOverlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'flex-end', alignItems: 'center' },
	achSheetWrap: { height: isTablet ? '70%' : '88%', width: '100%', maxWidth: Layout.sheetMaxWidth },
	achSheet: { flex: 1, backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingTop: SpacingV.md },
	achSheetHandle: { alignSelf: 'center', width: scaleWidth(44), height: scaleHeight(5), borderRadius: scaleWidth(3), backgroundColor: Colors.borderStrong, marginBottom: SpacingV.md },
	achSheetHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingBottom: SpacingV.md },
	achSheetTitle: { flex: 1, fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong },
	achSheetBody: { paddingBottom: SpacingV.xxl },
	weeklyCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.sectionGap },
	rankHero: { overflow: 'hidden', borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, marginBottom: SpacingV.md },
	rankShine: { position: 'absolute', top: scaleHeight(-50), left: 0, width: scaleWidth(52), height: scaleHeight(240), backgroundColor: Colors.onBrandDivider },
	rankHeroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	rankHeroIcon: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.pill, backgroundColor: Colors.onBrandDivider, alignItems: 'center', justifyContent: 'center' },
	rankHeroTitle: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textInverse },
	rankHeroDesc: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.onBrandTextSoft, marginTop: SpacingV.xxs },
	rankMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.surface, borderRadius: Radius.pill, paddingLeft: Spacing.md, paddingRight: Spacing.sm, paddingVertical: SpacingV.xs },
	rankMoreText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primaryDeep },
	rankHeroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.onBrandSurface, borderRadius: Radius.lg, paddingVertical: SpacingV.md, marginTop: SpacingV.lg },
	rankHeroStat: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.sm },
	rankHeroDivider: { width: 1, height: scaleHeight(26), backgroundColor: Colors.onBrandSurfaceStrong },
	rankHeroStatLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textInverse, opacity: 0.9 },
	rankHeroStatValue: { fontSize: Typography.title, fontWeight: '900', color: Colors.textInverse, marginTop: SpacingV.xxs },
	rankRowsWrap: { gap: SpacingV.xs },
	weeklyEmpty: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', paddingVertical: SpacingV.lg },
	weeklyJoinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: SpacingV.md },
	weeklyJoinText: { flexShrink: 1, color: Colors.onFill, fontSize: Typography.body, fontWeight: '900' },

	// 가로 행 카드
	rowBody: { flex: 1 },

	// 카드 공통
	card: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.sectionGap },

	// 플레이별 점수 아코디언
	timeHistWrap: { marginTop: SpacingV.lg, paddingTop: SpacingV.lg, borderTopWidth: 1, borderTopColor: Colors.border },
	timeHistHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingBottom: SpacingV.sm },
	timeHistTitle: { flex: 1, fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	timeHistCountPill: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs },
	timeHistCountText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	timeHistMore: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.textMuted, textAlign: 'center', marginTop: SpacingV.sm },
	timeHistRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: SpacingV.md },
	timeHistRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
	timeHistRowBest: { backgroundColor: Colors.goldBg, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, marginHorizontal: -Spacing.sm },
	timeHistIndexBest: { backgroundColor: Colors.surface },
	timeHistIndex: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
	timeHistIndexText: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary },
	timeHistBody: { flex: 1 },
	// 점수를 행의 주인공으로 — 오른쪽에 크게, 부가 정보는 태그로
	timeHistScoreWrap: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xxs },
	timeHistScore: { fontSize: Typography.title, fontWeight: '900', color: Colors.primary },
	timeHistScoreUnit: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	timeHistMeta: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	timeHistTagRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.xxs },
	timeHistTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.successSoft, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	timeHistTagText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.success },
	timeHistCombo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.errorSoft, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	timeHistComboText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.error },

	// 학습 기록 탭
	recordTabScroll: { flexGrow: 0, marginBottom: SpacingV.lg },
	recordTabBar: { flexDirection: 'row', gap: Spacing.xxs, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.pill, padding: Spacing.xs },
	sortChip: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
	sortChipOn: { borderColor: Colors.primarySoft, backgroundColor: Colors.primaryBg },
	sortChipText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
	sortChipTextOn: { color: Colors.primary },
	recordTab: { overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, paddingVertical: SpacingV.sm, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill, backgroundColor: 'transparent' },
	recordTabOn: { backgroundColor: Colors.primary },
	recordTabText: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted, textAlign: 'center' },
	recordTabTextOn: { color: Colors.textInverse },
	recordEmpty: { alignItems: 'center' },
	recordCta: { marginTop: SpacingV.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxl, paddingVertical: SpacingV.md, borderRadius: Radius.md },
	recordCtaText: { color: Colors.onFill, fontSize: Typography.body, fontWeight: '800' },

	// 타임 챌린지 통계
	timeStatsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.sm },
	timeStat: { flex: 1, alignItems: 'center' },
	timeStatIcon: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginBottom: SpacingV.sm },
	timeStatNum: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong },
	timeStatLabel: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '600', marginTop: SpacingV.xs },
	timeStatDivider: { width: 1, height: scaleHeight(56), backgroundColor: Colors.border },

	// 오늘의 퀴즈 기록 행
	dailyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.md },
	dailyRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
	dailyDateBox: { width: scaleWidth(46), alignItems: 'center', marginRight: Spacing.md },
	dailyDateMonth: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '700' },
	dailyDateDay: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong },
	dailyRowBody: { flex: 1 },
	dailyRowTitle: { fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	dailyRowSub: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },
	dailyRatePill: { paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.md, marginRight: Spacing.sm },
	dailyRateText: { fontSize: Typography.footnote, fontWeight: '900' },

	// 오늘의 퀴즈 상세 모달
	dailyModal: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, paddingBottom: SpacingV.md, maxHeight: '86%', overflow: 'hidden' },
	dailyModalHero: { paddingTop: SpacingV.lg, paddingBottom: SpacingV.lg, overflow: 'hidden' },
	dailyModalHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingHorizontal: Spacing.xl },
	dailyModalHeadBody: { flex: 1 },
	dailyModalClose: { width: scaleWidth(32), height: scaleWidth(32), borderRadius: Radius.pill, backgroundColor: Colors.onBrandSurface, justifyContent: 'center', alignItems: 'center' },
	dailyModalTitle: { fontSize: Typography.title, fontWeight: '900', color: Colors.textInverse },
	dailyModalDate: { fontSize: Typography.footnote, color: Colors.onBrandText, fontWeight: '600', marginTop: SpacingV.xs },
	dailyModalScore: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginTop: SpacingV.md, paddingHorizontal: Spacing.xl },
	dailyModalScoreNum: { fontSize: Typography.h1, fontWeight: '900', color: Colors.textInverse },
	dailyModalScoreUnit: { flex: 1, flexShrink: 1, fontSize: Typography.body, fontWeight: '700', color: Colors.onBrandText },
	dailyModalRatePill: { backgroundColor: Colors.onBrandSurface, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xxs },
	dailyModalRateText: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textInverse },
	// 목록 높이를 명시해 항목이 많아도 확실히 스크롤된다
	dailyModalList: { flexGrow: 0, flexShrink: 1 },
	dailyModalListContent: { paddingHorizontal: Spacing.xl, paddingTop: SpacingV.md, paddingBottom: SpacingV.xl, gap: SpacingV.sm },
	pastItem: { ...CardSurface, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md },
	pastItemTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	pastMark: { width: scaleWidth(20), height: scaleWidth(20), borderRadius: Radius.pill, justifyContent: 'center', alignItems: 'center' },
	pastDomain: { flex: 1, fontSize: Typography.footnote, fontWeight: '800' },
	pastResultChip: { flexShrink: 0, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs },
	pastResult: { fontSize: Typography.footnote, fontWeight: '900' },
	pastPrompt: { flexShrink: 1, fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong, marginTop: SpacingV.sm, lineHeight: scaleHeight(21) },
	pastAnswerBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginTop: SpacingV.sm },
	pastAnswer: { flex: 1, fontSize: Typography.body, fontWeight: '700', color: Colors.success, lineHeight: scaleHeight(19) },
	pastExplain: { flexShrink: 1, fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs, lineHeight: scaleHeight(18) },

	// 섹션 헤더
	achCount: { fontSize: Typography.body, fontWeight: '800', color: Colors.primary },

	// 주제별 정답률 (카드 내부 행)
	// 그룹 사이 간격은 안쪽 card 의 marginBottom(sectionGap) 하나로 — 다른 섹션과 같은 리듬
	topicGroup: {},
	topicGroupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.sm },
	topicGroupTitle: { flex: 1, fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary },
	topicGroupPill: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill, backgroundColor: Colors.primaryBg },
	topicGroupPillText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.primary },
	topicTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.sm },
	topicTotalLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	topicTotalValue: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textStrong },
	domainStatePill: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	domainStateText: { fontSize: Typography.micro, fontWeight: '900' },
	domainRate: { fontSize: Typography.footnote, fontWeight: '900' },
	domainMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md, marginTop: SpacingV.sm },
	domainMetaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
	domainMetaText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary },
	domainRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.md },
	domainRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
	domainIcon: { width: scaleWidth(38), height: scaleWidth(38), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	domainBody: { flex: 1 },
	domainTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SpacingV.sm, gap: Spacing.sm },
	domainName: { flex: 1, fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	barTrack: { height: scaleHeight(8), borderRadius: scaleWidth(4), backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
	barFill: { height: '100%', borderRadius: scaleWidth(4) },

	// 업적 리스트
	achFilterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: SpacingV.md },
	achFilterChip: { minHeight: scaleHeight(36), justifyContent: 'center', flex: 1, alignItems: 'center', paddingVertical: SpacingV.sm, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: 'transparent' },
	achFilterChipOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primarySoft },
	achFilterText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
	achFilterTextOn: { color: Colors.primary },
	achEmpty: { fontSize: Typography.body, color: Colors.textSecondary, fontWeight: '700', textAlign: 'center', paddingVertical: SpacingV.xl },
	achSection: { marginBottom: Layout.sectionGap },
	achGroupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.sm },
	achGroupLabel: { flex: 1, fontSize: Typography.footnote, fontWeight: '900', color: Colors.textSecondary },
	achGroupCount: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
	achList: { ...CardSurface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, overflow: 'hidden' },
	achRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.lg },
	achRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
	achRowBody: { flex: 1, marginRight: Spacing.sm },
	achRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
	achIcon: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md, overflow: 'hidden' },
	achTitle: { flex: 1, fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	achDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs, lineHeight: scaleHeight(16) },
	achRarity: { alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, marginTop: SpacingV.xs },
	achRarityText: { fontSize: Typography.micro, fontWeight: '900' },
	achCondRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.xs },
	achCondText: { flex: 1, fontSize: Typography.micro, fontWeight: '700', color: Colors.textMuted },
	achBadge: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: scaleWidth(9) },
	achBadgeText: { color: Colors.textInverse, fontSize: Typography.micro, fontWeight: '800' },
	achBarTrack: { height: Layout.barH, borderRadius: scaleWidth(3), backgroundColor: Colors.border, overflow: 'hidden', marginTop: SpacingV.sm },
	achBarFill: { height: '100%', borderRadius: scaleWidth(3) },
	achProgress: { fontSize: Typography.micro, color: Colors.textMuted, fontWeight: '700' },
	modalBackdrop: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Layout.screenH, paddingVertical: SpacingV.xxl },
}));
