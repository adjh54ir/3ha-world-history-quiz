import FourImages from '@/src/four/assets/FourImages';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@/src/four/navigation/compat';
import { Paths } from '@/src/four/navigation/conf/Paths';
import { useIsFocused } from '@/src/four/navigation/compat';
import IconComponent from './common/atomic/IconComponent';
import BottomHomeButton from './common/BottomHomeButton';
import ScrollTopButton from '@/src/four/screens/common/atomic/ScrollTopButton';
import ProverbDetailModal from './modal/ProverbDetailModal';
import AnimatedListItem from './common/AnimatedListItem';
import AnimatedCounter from './common/atomic/AnimatedCounter';
import FastImage from '@/src/four/components/FastImage';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import { CONTENT_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';
import type { MainDataType } from '@/src/four/types/MainDataType';
import ProverbServices from '@/src/four/services/ProverbServices';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from 'react-native-vector-icons/Icon';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import { useBlockBackHandler } from '@/src/four/hooks/useBlockBackHandler';
import { formatHangulFirst, useHangulReading } from '@/src/four/hooks/useHangulReading';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors, onSurface } from '@/src/four/const/ConstColors';

const STORAGE_KEY = MainStorageKeyType.USER_QUIZ_HISTORY;

import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from './common/CharacterGuide';
import DateUtils from '@/src/four/utils/DateUtils';
import {
	ReviewSchedule,
	backfillSchedule,
	describeDue,
	dueProverbIds,
	loadSchedule,
	saveSchedule,
	BOX_INTERVALS,
	MAX_BOX,
} from '@/src/four/utils/ReviewScheduleUtils';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';

/**
 * 복습 눈금 — 박스마다 다음 복습까지 며칠인지. 마지막 칸은 졸업이다.
 * 간격 값은 규칙 파일(BOX_INTERVALS)에서 그대로 가져온다 — 두 곳에 적으면 한쪽이 먼저 낡는다.
 */
const REVIEW_STEPS: { box: number; label: string; done: boolean }[] = [
	...BOX_INTERVALS.map((days, at) => ({ box: at + 1, label: `${days}일 뒤`, done: false })),
	{ box: MAX_BOX + 1, label: '졸업', done: true },
];

/** 규칙 세 줄 — 올라감·통과·떨어짐. 색은 뜻과 맞춘다(초록 전진, 회색 졸업, 빨강 후퇴) */
const reviewRules = (Palette: { success: string; textSecondary: string; error: string }) => [
	{ icon: 'arrow-up-bold-circle', tone: Palette.success, text: '맞히면 한 단계 올라가고, 다시 만나는 날이 그만큼 멀어져요.' },
	{ icon: 'school', tone: Palette.textSecondary, text: `${MAX_BOX}단계에서 또 맞히면 외운 것으로 보고 목록에서 빠져요.` },
	{ icon: 'arrow-down-bold-circle', tone: Palette.error, text: '틀리면 1단계로 돌아가 내일 다시 나와요.' },
];

const QuizWrongScreen = () => {
	const navigation = useNavigation();
	const isFocused = useIsFocused();
	const { showHangul } = useHangulReading();
	const [loading, setLoading] = useState(true);
	const scrollViewRef = useRef<ScrollView>(null);
	const [wrongProverbIds, setWrongProverbIds] = useState<MainDataType.ProverbType[]>([]);
	const [showScrollTop, setShowScrollTop] = useState(false);
	const guide = useCharacterGuideOnce('quiz-wrong');
	/** 안내 세 줄 — 색이 테마를 타므로 렌더 시점에 만든다 */
	const REVIEW_RULES = reviewRules(Colors);
	const [showGuideModal, setShowGuideModal] = useState(false);
	const [totalSolvedCount, setTotalSolvedCount] = useState(0);
	const [correctCount, setCorrectCount] = useState(0);
	const [showWrongList, setShowWrongList] = useState(false);
	const [detailProverb, setDetailProverb] = useState<MainDataType.ProverbType | null>(null);
	const [detailVisible, setDetailVisible] = useState(false);
	const [schedule, setSchedule] = useState<ReviewSchedule>({});
	const [today, setToday] = useState(DateUtils.getLocalDateString());

	useBlockBackHandler(true); // 뒤로가기 모션 막기

	useEffect(() => {
		if (!isFocused) {
			return;
		}
		fetchWrongData();
	}, [isFocused]);

	// 화면에 다시 들어오면 펼친 목록을 접고, 팝업을 닫고, 맨 위에서 시작한다
	useFocusEffect(
		useCallback(() => {
			setShowWrongList(false);
			setDetailVisible(false);
			setShowScrollTop(false);
			scrollViewRef.current?.scrollTo({ y: 0, animated: false });
		}, []),
	);

	const fetchWrongData = async () => {
		setLoading(true);
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (!stored) {
				setWrongProverbIds([]);
				return;
			}
			const parsed: MainDataType.UserQuizHistory = JSON.parse(stored);
			const wrongCca3List: number[] = parsed.wrongProverbId ?? [];
			const correctCca3List: number[] = parsed.correctProverbId ?? [];
			setTotalSolvedCount(wrongCca3List.length + correctCca3List.length);
			setCorrectCount(correctCca3List.length);

			const fullList = ProverbServices.selectProverbList();
			const result = fullList.filter((c) => wrongCca3List.includes(c.id));

			// 간격 반복 일정 동기화 — 기능 도입 전에 쌓인 오답은 오늘 복습으로 채운다
			const todayStr = DateUtils.getLocalDateString();
			const storedSchedule = await loadSchedule();
			const synced = backfillSchedule(storedSchedule, wrongCca3List, todayStr);
			if (synced !== storedSchedule) {
				await saveSchedule(synced);
			}
			setSchedule(synced);
			setToday(todayStr);

			// 오늘 복습할 문제를 앞으로 당겨 보여준다
			const dueSet = new Set(dueProverbIds(synced, todayStr));
			setWrongProverbIds([...result].sort((a, b) => Number(dueSet.has(b.id)) - Number(dueSet.has(a.id))));
		} catch (e) {
			console.error('오답 로딩 실패:', e);
		} finally {
			setLoading(false);
		}
	};

	/**
	 * 스크롤을 움직일때 동작을 합니다. 하단으로 스크롤을 내릴때 아이콘 생성
	 * @param event
	 */
	const handleScroll = (event: any) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		setShowScrollTop(offsetY > 100);
	};

	const startWrongReview = () => {
		const titleMap = {
			all: '전체 퀴즈',
			beginner: '초급 퀴즈',
			intermediate: '중급 퀴즈',
			advanced: '고급 퀴즈',
			expert: '특급 퀴즈',
		};

		if (wrongProverbIds.length === 0) {
			return;
		}

		// 오늘 복습 예정인 문제만 먼저 낸다. 전부 미래 일정이면 남은 오답 전체로 되돌린다.
		const dueSet = new Set(dueProverbIds(schedule, today));
		const dueList = wrongProverbIds.filter((item) => dueSet.has(item.id));
		const pool = dueList.length > 0 ? dueList : wrongProverbIds;

		// @ts-ignore
		navigation.push(Paths.QUIZ, {
			questionPool: pool,
			isWrongReview: true,
			title: titleMap.all,
			mode: 'meaning',
			selectedLevel: '전체',
			levelKey: 'all',
		});
	};

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color={Colors.primary} />
			</View>
		);
	}

	if (wrongProverbIds.length === 0) {
		return (
			<View style={styles.emptyWrap}>
				<View style={styles.emptyCard}>
					<MascotImage source={FourImages.screen_fox_wrong_clear} size={scaleWidth(96)} motion="cheer" popIn style={styles.emptyMascot} />
					<Text style={styles.emptyTitle}>틀린 문제가 없습니다! 🎉</Text>
					<Text style={styles.emptyDesc}>
						아직 오답으로 기록된 한자어가 없습니다.{'\n'}
						퀴즈를 풀다가 틀린 문제가 생기면{'\n'}
						이곳에서 모아 다시 복습할 수 있습니다.
					</Text>
				</View>
			</View>
		);
	}

	const accuracy = totalSolvedCount > 0 ? Math.round((correctCount / totalSolvedCount) * 100) : 0;
	const dueCount = dueProverbIds(schedule, today).length;

	return (
		<SafeAreaView style={styles.screenWrap} edges={['left', 'right', 'bottom']}>
			<ScrollView contentContainerStyle={styles.scrollContainer} ref={scrollViewRef} onScroll={handleScroll} scrollEventThrottle={16}>
				<View style={styles.activityCardBox}>
					<View style={styles.reviewHero}>
						<FastImage
							source={FourImages.screen_fox_wrong_review}
							style={styles.reviewHeroImage}
							resizeMode="cover"
							accessible
							accessibilityLabel="흩어진 오답 카드를 붓으로 바로잡으며 전진하는 팬더 캐릭터"
						/>
						<View style={styles.reviewHeroHelp}>
							<CharacterGuideButton onPress={guide.open} size={scaledSize(20)} color={Colors.textInverse} />
						</View>
						<View style={styles.reviewHeroOverlay}>
							<Text style={styles.reviewHeroTitle}>틀린 문제는 다시 내 것으로</Text>
							<Text style={styles.reviewHeroSubtitle}>잊을 때쯤 다시 만나 오래 기억해요</Text>
						</View>
					</View>
					{/* ✅ 컴팩트 통계 카드 */}
					{/* 숫자는 카운트업으로 등장시켜 화면이 툭 나타나지 않게 한다 */}
					<View style={styles.statsCard}>
						<View style={styles.statsItem}>
							<AnimatedCounter value={totalSolvedCount} style={styles.statsValue} />
							<Text style={styles.statsLabel}>푼 문제</Text>
						</View>
						<View style={styles.statsDivider} />
						<View style={styles.statsItem}>
							<AnimatedCounter value={wrongProverbIds.length} style={[styles.statsValue, { color: Colors.error }]} />
							<Text style={styles.statsLabel}>오답</Text>
						</View>
						<View style={styles.statsDivider} />
						<View style={styles.statsItem}>
							<AnimatedCounter value={dueCount} style={[styles.statsValue, { color: Colors.secondaryDark }]} />
							<Text style={styles.statsLabel}>오늘 복습</Text>
						</View>
						<View style={styles.statsDivider} />
						<View style={styles.statsItem}>
							<AnimatedCounter value={accuracy} suffix="%" style={[styles.statsValue, { color: Colors.primaryDark }]} />
							<Text style={styles.statsLabel}>정답률</Text>
						</View>
					</View>

					{/* ✅ 격려 메시지 */}
					<Text style={styles.encourageText}>
						지금까지 <Text style={styles.encourageHighlight}>{totalSolvedCount}</Text>문제를 풀었고,{' '}
						<Text style={styles.encourageHighlight}>{wrongProverbIds.length}</Text>문제가 남았습니다.{'\n'}한 번 더 도전해볼까요? 💪
					</Text>

					{/* 주요 액션은 안내문 아래로 밀리면 첫 화면에서 안 보인다 — 통계 바로 밑에 둔다 */}
					<TouchableOpacity style={styles.startButton} onPress={startWrongReview} activeOpacity={0.85}>
						<IconComponent type="MaterialIcons" name="refresh" size={scaledSize(18)} color={onSurface(Colors.warning)} style={{ marginRight: Spacing.sm }} />
						{/* 앰버 면 위 흰 글씨는 두 테마 모두 2:1 대 로 뭉개진다 — 면 밝기에 맞춰 고른다 */}
					<Text style={[styles.buttonText, { color: onSurface(Colors.warning) }]}>
						{dueCount > 0 ? `오늘 복습 ${dueCount}문제 풀기` : '오답 다시 풀기'}
					</Text>
					</TouchableOpacity>

					{/*
					 * 복습 규칙 안내.
					 * 예전에는 이모지 섞인 네 줄 글머리표 한 덩어리라 한 번에 다 읽어야 뜻이 통했다.
					 * 규칙이 세 가지(올라감·통과·떨어짐)뿐이므로 세 줄로 쪼개고, 단계 간격은 눈금으로 보여 준다.
					 */}
					<View style={styles.guideCard}>
						<View style={styles.guideCardHead}>
							<IconComponent type="materialCommunityIcons" name="chart-timeline-variant" size={scaledSize(16)} color={Colors.primaryDark} />
							<Text style={styles.guideCardTitle}>복습은 잊을 때쯤 다시 나와요</Text>
						</View>

						{/* 단계 눈금 — 1단계에서 졸업까지 며칠 간격으로 벌어지는지 한눈에 */}
						<View style={styles.boxRail}>
							{REVIEW_STEPS.map((step, at) => (
								<React.Fragment key={step.box}>
									{at > 0 && <View style={styles.boxRailLink} />}
									<View style={styles.boxRailCell}>
										<View style={[styles.boxRailDot, step.done && styles.boxRailDotDone]}>
											{step.done ? (
												<IconComponent type="materialCommunityIcons" name="school" size={scaledSize(13)} color={onSurface(Colors.success)} />
											) : (
												<Text style={styles.boxRailNo}>{step.box}</Text>
											)}
										</View>
										<Text style={styles.boxRailGap} numberOfLines={1}>
											{step.label}
										</Text>
									</View>
								</React.Fragment>
							))}
						</View>

						{REVIEW_RULES.map((rule) => (
							<View key={rule.text} style={styles.guideRuleRow}>
								<IconComponent type="materialCommunityIcons" name={rule.icon} size={scaledSize(15)} color={rule.tone} />
								<Text style={styles.guideRuleText}>{rule.text}</Text>
							</View>
						))}
					</View>
				</View>

				{/* ✅ 펼치기/접기 */}
				<TouchableOpacity style={styles.toggleButton} onPress={() => setShowWrongList((prev) => !prev)} activeOpacity={0.8}>
					<View style={styles.toggleLeft}>
						<IconComponent type="MaterialIcons" name="format-list-bulleted" size={scaledSize(18)} color={Colors.text} />
						<Text style={styles.toggleButtonText}>오답 목록</Text>
						<View style={styles.toggleCountBadge}>
							<Text style={styles.toggleCountText}>{wrongProverbIds.length}</Text>
						</View>
					</View>
					<IconComponent
						type="MaterialIcons"
						name={showWrongList ? 'expand-less' : 'expand-more'}
						size={scaledSize(22)}
						color={Colors.textSecondary}
					/>
				</TouchableOpacity>

				{showWrongList && (
					<View style={styles.reviewCardList}>
						{wrongProverbIds.map((proverb, idx) => (
							<AnimatedListItem key={proverb.id} index={idx}>
								<TouchableOpacity
									style={[styles.reviewCard, { flexDirection: 'row', alignItems: 'center' }]}
									activeOpacity={0.8}
									onPress={() => {
										setDetailProverb(proverb);
										setDetailVisible(true);
									}}>
									<View style={{ flex: 1 }}>
										<View style={styles.reviewCardHeader}>
											<View style={styles.reviewIndexBadge}>
												<Text style={styles.reviewIndexText}>{idx + 1}</Text>
											</View>
											<Text style={styles.reviewProverbText} numberOfLines={1}>
												{formatHangulFirst(proverb.hangul, proverb.hanja, showHangul)}
											</Text>
										</View>
										{schedule[String(proverb.id)] && (
											<View
												style={[styles.boxBadge, schedule[String(proverb.id)].due <= today && styles.boxBadgeDue]}>
												<Text
													style={[
														styles.boxBadgeText,
														schedule[String(proverb.id)].due <= today && styles.boxBadgeTextDue,
													]}>
													{`${schedule[String(proverb.id)].box}단계 · ${describeDue(schedule[String(proverb.id)].due, today)}`}
												</Text>
											</View>
										)}
										<Text style={styles.reviewMeaningText}>{proverb.originWord || proverb.meaning}</Text>
									</View>
									<IconComponent type="MaterialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
								</TouchableOpacity>
							</AnimatedListItem>
						))}
					</View>
				)}

				{/* {showWrongList && (
					<View style={{ paddingHorizontal: Spacing.md, width: '100%' }}>
						<View style={styles.reviewTable}>
							<View style={[styles.reviewRow, styles.reviewHeader]}>
								<Text style={[styles.reviewCell, styles.headerCell]}>오답 한자어</Text>
								<Text style={[styles.reviewCell, styles.headerCell]}>정답</Text>
							</View>
							{wrongProverbIds.map((item) => (
								<View key={item.id} style={styles.reviewRow}>
									<Text style={styles.reviewCell}>
										{item.hangul}({item.hanja})
									</Text>
									<Text style={styles.reviewCell}>{item.meaning}</Text>
								</View>
							))}
						</View>
					</View>
				)} */}
			</ScrollView>
			<BottomHomeButton paddingBottom={4} confirmTitle="오답 복습을 닫을까요?" confirmMessage="틀린 문제는 그대로 남아 있습니다." />

			{/* 최하단에 위치할것!! */}
			<ScrollTopButton visible={showScrollTop} onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })} />

			<ProverbDetailModal visible={detailVisible} proverb={detailProverb} onClose={() => setDetailVisible(false)} />

			<CharacterGuide
				visible={guide.visible}
				onClose={guide.close}
				lines={[
					'여기는 내가 틀린 문제만 모아 다시 보는 곳입니다.',
					'문제를 눌러 뜻과 해설을 다시 확인할 수 있습니다.',
					'맞힐수록 복습 간격이 1일 → 3일 → 7일로 멀어집니다.',
					'3단계까지 통과하면 오답에서 완전히 빠집니다!',
				]}
				title="오답 노트, 이렇게 씁니다"
			/>
		</SafeAreaView>
	);
};

export default QuizWrongScreen;

const makeStyles = () => StyleSheet.create({
	// 스크롤 내용과 같은 배경이어야 하단 인셋 영역에 흰 띠가 생기지 않는다
	screenWrap: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	card: {
		backgroundColor: Colors.surface,
		paddingVertical: SpacingV.xxxl,
		paddingHorizontal: Spacing.xxl,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		marginBottom: SpacingV.lg,
		width: '100%',
		alignItems: 'center',
	},
	title: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		textAlign: 'center',
		marginBottom: SpacingV.md,
	},
	highlight: {
		color: Colors.error,
		fontWeight: FontWeight.bold,
	},
	highlight2: {
		fontWeight: FontWeight.bold,
	},
	subText: {
		fontSize: Typography.callout,
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	startButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.warning,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.xxxxl,
		marginBottom: SpacingV.sm,
		borderRadius: Radius.lg,
		marginTop: SpacingV.md,
		width: '100%',
	},
	buttonText: {
		color: Colors.textInverse,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		textAlign: 'center',
	},
	reviewHero: {
		width: '100%',
		height: scaleHeight(220),
		borderRadius: Radius.lg,
		overflow: 'hidden',
		backgroundColor: Colors.darkPanel,
		marginBottom: SpacingV.xl,
	},
	reviewHeroImage: { width: '100%', height: '100%' },
	reviewHeroHelp: {
		position: 'absolute',
		top: Spacing.md,
		right: Spacing.md,
		width: scaleWidth(36),
		height: scaleWidth(36),
		borderRadius: Radius.pill,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(16, 24, 40, 0.72)',
	},
	reviewHeroOverlay: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.xl,
		backgroundColor: 'rgba(10, 24, 54, 0.82)',
	},
	reviewHeroTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.heavy,
		color: Colors.textInverse,
		marginBottom: SpacingV.xxs,
	},
	reviewHeroSubtitle: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.semibold,
		color: Colors.textInverse,
		opacity: 0.9,
	},
	statsCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.sm,
		width: '100%',
		marginBottom: SpacingV.md,
	},
	encourageText: {
		fontSize: Typography.body,
		color: Colors.textDeep,
		textAlign: 'center',
		lineHeight: scaledSize(21),
		fontWeight: FontWeight.semibold,
		marginBottom: SpacingV.md,
	},
	encourageHighlight: {
		color: Colors.error,
		fontWeight: FontWeight.heavy,
	},
	statsItem: {
		flex: 1,
		alignItems: 'center',
	},
	statsValue: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.heavy,
		color: Colors.text,
		marginBottom: SpacingV.xxs,
	},
	statsLabel: {
		fontSize: Typography.footnote,
		color: Colors.textMuted,
		fontWeight: FontWeight.semibold,
	},
	statsDivider: {
		width: 1,
		height: scaleHeight(28),
		backgroundColor: Colors.border,
	},
	toggleButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surface,
		width: '100%',
	},
	toggleLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	toggleButtonText: {
		flexShrink: 1,
		color: Colors.text,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
	},
	toggleCountBadge: {
		minWidth: scaleWidth(22),
		height: scaleWidth(22),
		borderRadius: Radius.md,
		backgroundColor: Colors.errorSoft,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: Spacing.sm,
	},
	toggleCountText: {
		fontSize: Typography.footnote,
		fontWeight: FontWeight.heavy,
		color: Colors.error,
	},
	reviewCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginBottom: SpacingV.sm,
	},
	reviewIndexBadge: {
		width: scaleWidth(24),
		height: scaleWidth(24),
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceAlt,
		alignItems: 'center',
		justifyContent: 'center',
	},
	reviewIndexText: {
		fontSize: Typography.footnote,
		fontWeight: FontWeight.heavy,
		color: Colors.textSecondary,
	},
	reviewTable: {
		marginTop: SpacingV.xxl,
		width: '100%',
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.md,
		backgroundColor: Colors.background,
	},
	reviewRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: Colors.surfaceAlt,
	},
	reviewHeader: {
		backgroundColor: Colors.surfaceAlt,
	},
	reviewCell: {
		flex: 1,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.md,
		fontSize: Typography.callout,
		color: Colors.text,
	},
	headerCell: {
		fontWeight: FontWeight.bold,
		color: Colors.primary,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.surface,
	},
	emptyText: {
		fontSize: Typography.subtitle,
		color: Colors.textSecondary,
	},
	emptyWrap: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.background,
		paddingHorizontal: Spacing.xxxl,
	},
	emptyCard: {
		width: '100%',
		alignItems: 'center',
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		paddingVertical: SpacingV.xxxl,
		paddingHorizontal: Spacing.xl,
	},
	emptyMascot: {
		width: scaleWidth(96),
		height: scaleWidth(96),
		marginBottom: SpacingV.lg,
	},
	emptyTitle: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		marginBottom: SpacingV.md,
		textAlign: 'center',
	},
	emptyDesc: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: scaledSize(20),
	},
	scrollContainer: {
		// 태블릿: 본문을 가운데 한 기둥으로 묶는다 (CharacterGuide 와 같은 폭)
		width: '100%',
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
		paddingVertical: SpacingV.xxxxl,
		paddingHorizontal: Spacing.lg,
		paddingBottom: SpacingV.md,
		alignItems: 'center',
		backgroundColor: Colors.background,
	},
	activityCardBox: {
		backgroundColor: 'transparent',
		borderRadius: Radius.lg,
		padding: Spacing.xs,
		marginBottom: SpacingV.md,
		width: '100%',
		alignItems: 'center', // 내부 요소 정렬용
	},
	modalOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.scrim,
		padding: Spacing.xl,
	},
	modalContent: {
		backgroundColor: Colors.surface,
		padding: Spacing.xxl,
		borderRadius: Radius.lg,
		width: '100%',
		maxWidth: scaleWidth(320),
		alignItems: 'center',
	},
	modalTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.md,
	},
	modalText: {
		fontSize: Typography.callout,
		color: Colors.textSecondary,
		textAlign: 'left',
	},
	modalButton: {
		marginTop: SpacingV.xl,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxl,
		backgroundColor: Colors.secondarySurface,
		borderRadius: Radius.sm,
	},
	modalButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontWeight: FontWeight.bold,
		fontSize: Typography.callout,
	},
	headerRow: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: SpacingV.md,
	},
	headerTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginRight: Spacing.xs,
	},
	guideModal: {
		backgroundColor: Colors.surface,
		padding: Spacing.xxl,
		borderRadius: Radius.xl,
		width: '90%',
		maxWidth: scaleWidth(340),
		alignItems: 'center',
	},
	guideHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SpacingV.lg,
	},
	guideTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginLeft: Spacing.sm,
	},
	guideDescription: {
		fontSize: Typography.callout,
		color: Colors.text,
		textAlign: 'left',
		lineHeight: scaledSize(22),
		marginBottom: SpacingV.xl,
	},
	guideHighlight: {
		fontWeight: FontWeight.bold,
		color: Colors.accentOrange,
	},
	guideConfirmButton: {
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxxxl,
		borderRadius: scaleWidth(30),
		width: '100%',
		alignItems: 'center',
	},
	guideConfirmText: {
		color: Colors.textInverse,
		fontWeight: FontWeight.semibold,
		fontSize: Typography.subtitle,
	},
	guideDescriptionBox: {
		backgroundColor: Colors.background,
		borderWidth: 1,
		borderColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		padding: Spacing.lg,
		width: '100%',
		marginBottom: SpacingV.xl,
	},
	mascotImage: {
		width: scaleWidth(120),
		height: scaleWidth(120),
		marginBottom: SpacingV.md,
	},
	guideCard: {
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		marginBottom: SpacingV.xl,
		width: '100%',
	},
	guideCardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.md },
	guideCardTitle: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},

	/** 단계 눈금 — 1 → 2 → 3 → 졸업. 칸 사이는 얇은 선으로 잇는다 */
	boxRail: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SpacingV.md },
	boxRailCell: { alignItems: 'center', gap: SpacingV.xxs },
	boxRailLink: { flex: 1, height: 2, marginTop: scaleHeight(13), backgroundColor: Colors.border },
	boxRailDot: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: Radius.pill,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1.5,
		borderColor: Colors.primaryTint,
		backgroundColor: Colors.primaryBg,
	},
	boxRailDotDone: { borderColor: Colors.success, backgroundColor: Colors.success },
	boxRailNo: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.primaryDark },
	boxRailGap: { fontSize: Typography.micro, color: Colors.textMuted },

	/** 규칙 한 줄 — 아이콘 색으로 전진·졸업·후퇴를 구분한다 */
	guideRuleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: SpacingV.xs },
	guideRuleText: { flex: 1, fontSize: Typography.bodySm, color: Colors.text, lineHeight: scaledSize(19) },
	reviewCardList: {
		width: '100%',
		marginTop: SpacingV.lg,
	},
	reviewCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		marginBottom: SpacingV.md,
		borderWidth: 1,
		borderColor: Colors.surfaceAlt,
	},
	// 간격 반복 단계 / 다음 복습일 뱃지
	boxBadge: {
		alignSelf: 'flex-start',
		marginTop: SpacingV.xs,
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.xxs,
		borderRadius: Radius.pill,
		backgroundColor: Colors.surfaceMuted,
	},
	boxBadgeDue: {
		backgroundColor: Colors.secondarySoft,
	},
	boxBadgeText: {
		fontSize: Typography.micro,
		fontWeight: FontWeight.bold,
		color: Colors.textSecondary,
	},
	boxBadgeTextDue: {
		color: Colors.secondaryDark,
	},
	reviewProverbText: {
		...getHanjaTextStyle(),
		flex: 1,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	reviewMeaningText: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		lineHeight: scaledSize(20),
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
