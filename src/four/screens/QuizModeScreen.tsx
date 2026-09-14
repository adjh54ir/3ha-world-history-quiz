/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from './common/CharacterGuide';
import { useIsFocused, useNavigation, useFocusEffect } from '@/src/four/navigation/compat';
import { Paths } from '@/src/four/navigation/conf/Paths';
import IconComponent, { IconType } from './common/atomic/IconComponent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTENT_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';

import { SafeAreaView } from 'react-native-safe-area-context';
import ProverbServices from '@/src/four/services/ProverbServices';
import type { MainDataType } from '@/src/four/types/MainDataType';
export type QuizLevelKey = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
import { RouteProp, useRoute } from '@/src/four/navigation/compat';
import { useBlockBackHandler } from '@/src/four/hooks/useBlockBackHandler';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import AdmobFrontAd from './common/ads/AdmobFrontAd';
import BottomHomeButton from './common/BottomHomeButton';
import CmmDelConfirmModal from './modal/CmmDelConfirmModal';
import { FIELD_DROPDOWN_ITEMS, QUIZ_MODE } from './common/CommonProverbModule';
import Colors, { withAlpha } from '@/src/four/const/ConstColors';
import { Typography, FontWeight, Radius, Spacing, SpacingV } from '@/src/four/const/ConstDesign';
import DateUtils from '@/src/four/utils/DateUtils';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

type QuizModeScreenRouteParams = {
	QuizModeScreen: { mode: string }; // 전달되는 mode는 string 타입 (예: 'meaning' | 'proverb' | 'blank')
};

interface QuizLevel {
	key: QuizLevelKey;
	label: string;
	icon: string;
	type: string;
	color: string;
	desc: string;
}

interface ProverbCharacter {
	/** 한자 한 글자 */
	char: string;

	/** 한자 의미 예: "돌 석" */
	meaning: string;

	/** 총 획수 */
	strokes: number;

	/** 부수 예: "石" */
	radical: string;
}

export interface ProverbType {
	/** 고유 ID */
	id: number;

	/** 한자어 한자 */
	hanja: string;

	/** 한자어 한글 발음 */
	hangul: string;

	shortMeaning: string;
	/** 한자어 뜻 */
	meaning: string;

	/** 한자어 예시 */
	example: string[];

	// 사자성의 유래
	originWord?: string;

	/** 한자어 카테고리 (예: 인간관계, 지혜, 운 등) */
	category: string;

	/** 난이도 (예: 초급, 중급, 고급) */
	level: '전체' | '초급' | '중급' | '고급' | '특급';

	/** 한자어 구성 한자 배열 */
	characters: ProverbCharacter[];

	/** 연관 키워드 (예: 성과, 효율 등) */
	relatedWords: string[];
}

/** 팔레트 값을 복사하므로 테마가 바뀌면 다시 만든다 (ThemeRegistry 참고) */
const makeLevels = (): QuizLevel[] => [
	{
		key: 'beginner',
		label: '초급 문제',
		icon: 'seedling',
		type: 'FontAwesome6',
		color: Colors.tealDark,
		desc: '일상에서 자주 쓰는 기초 한자어',
	},
	{
		key: 'intermediate',
		label: '중급 문제',
		icon: 'leaf',
		type: 'FontAwesome6',
		color: Colors.primaryDark,
		desc: '조금 더 깊이 있는 한자어에 도전',
	},
	{
		key: 'advanced',
		label: '고급 문제',
		icon: 'tree',
		type: 'FontAwesome6',
		color: Colors.warningDark,
		desc: '한 단계 높은 난이도의 한자어',
	},
	{
		key: 'expert',
		label: '특급 문제',
		icon: 'trophy',
		type: 'FontAwesome6',
		color: Colors.accentOrangeDeep,
		desc: '고수를 위한 어려운 한자어',
	},
	{
		key: 'all',
		label: '전체 문제',
		icon: 'clipboard-list',
		type: 'fontAwesome5',
		color: Colors.primaryDeep,
		desc: '난이도 구분 없이 모든 문제 풀기',
	},
	{
		//@ts-ignore
		key: 'comingsoon',
		label: '새로운 문제',
		icon: 'hourglass-half',
		type: 'fontAwesome6',
		color: Colors.textMuted,
		desc: '새로운 퀴즈가 준비 중입니다',
	},
];
let LEVELS = makeLevels();

/**
 * 카드 한 장의 풀이 진행률.
 * "12/40 완료" 같은 숫자보다 막대가 먼저 읽힌다 — 숫자는 퍼센트로만 남긴다.
 */
const ModeProgress = ({ solved, total, color }: { solved: number; total: number; color: string }) => {
	const percent = total > 0 ? Math.round((solved / total) * 100) : 0;
	return (
		<View style={styles.modeProgressRow}>
			<View style={styles.modeProgressTrack}>
				<View style={[styles.modeProgressFill, { width: `${percent}%`, backgroundColor: color }]} />
			</View>
			<Text style={styles.modeProgressPercent}>{percent}%</Text>
		</View>
	);
};

const QuizModeScreen = () => {
	const isFocused = useIsFocused();
	const navigation = useNavigation();
	const STORAGE_KEY = MainStorageKeyType.USER_QUIZ_HISTORY;
	const shouldShowAd = true; // 광고 100% 노출
	const route = useRoute<RouteProp<QuizModeScreenRouteParams, 'QuizModeScreen'>>();
	const passedMode = route.params?.mode; // 예: 'meaning'

	/** 고른 조건으로 퀴즈 화면으로 넘어간다 */
	const navigateByMode = (params: {
		questionPool: ProverbType[];
		title: string;
		selectedLevel?: string | null;
		levelKey?: string;
		selectedCategory?: string;
		isWrongReview?: boolean;
	}) => {
		//@ts-ignore
		navigation.push(Paths.QUIZ, { ...params, mode: passedMode });
	};

	const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null); // ✅ 추가

	const [proverbList, setProverbList] = useState<ProverbType[]>([]);
	const [quizHistory, setQuizHistory] = useState<MainDataType.UserQuizHistory>();

	const [showAd, setShowAd] = useState(false);
	const guide = useCharacterGuideOnce('quiz-mode');

	const [selectedLevelKey, setSelectedLevelKey] = useState<QuizLevelKey | null>(null);

	useBlockBackHandler(true); // 뒤로가기 모션 막기

	const [tab, setTab] = useState<'level' | 'category'>('level');
	const listRef = useRef<ScrollView>(null);
	// OS 기본 알림창 대신 앱 팝업으로 알린다
	const [showComingSoon, setShowComingSoon] = useState(false);

	// 진입/탭 전환 애니메이션 (페이드+슬라이드) — 언마운트 시 정리
	const enterAnim = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		enterAnim.setValue(0);
		const animation = Animated.timing(enterAnim, {
			toValue: 1,
			duration: 360,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		});
		animation.start();
		return () => {
			animation.stop();
			enterAnim.stopAnimation();
		};
	}, [enterAnim, tab]);

	const CATEGORIES = FIELD_DROPDOWN_ITEMS.filter((item) => item.label && item.value).map((item) => ({
		key: item.value,
		label: item.label,
		icon: item.iconName ?? '', // 혹은 기본값
		type: item.iconType ?? 'FontAwesome6',
		color: item.iconColor ?? Colors.borderStrong,
	}));

	// 퀴즈를 풀고 돌아오면 진행률이 바뀌므로 화면에 다시 들어올 때마다 읽는다.
	useEffect(() => {
		if (!isFocused) {
			return;
		}
		initData();
	}, [isFocused]);

	// 다시 들어오면 난이도 탭에서 맨 위부터 — 지난번 보던 위치가 남지 않게 한다
	useFocusEffect(
		useCallback(() => {
			setTab('level');
			setShowComingSoon(false);
			listRef.current?.scrollTo({ y: 0, animated: false });
		}, []),
	);

	const initData = async () => {
		const allProverbs = ProverbServices.selectProverbList();
		setProverbList(allProverbs);
		const stored = await AsyncStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed: MainDataType.UserQuizHistory = JSON.parse(stored);
			const safeParsed: MainDataType.UserQuizHistory = {
				correctProverbId: parsed.correctProverbId || [],
				wrongProverbId: parsed.wrongProverbId || [],
				lastAnsweredAt: parsed.lastAnsweredAt ? new Date(parsed.lastAnsweredAt) : DateUtils.now(),
				quizCounts: parsed.quizCounts || {},
				badges: parsed.badges || [],
				totalScore: parsed.totalScore || 0,
				bestCombo: parsed.bestCombo || 0,
			};
			setQuizHistory(safeParsed);
		}
	};

	const moveToQuiz = (level: QuizLevelKey) => {
		const titleMap = {
			all: '전체 퀴즈',
			beginner: '초급 퀴즈',
			intermediate: '중급 퀴즈',
			advanced: '고급 퀴즈',
			expert: '특급 퀴즈',
		};

		const selectedLevel = convertKeyToLevel(level);

		let filteredQuestions: ProverbType[] = [];

		if (selectedLevel === '전체') {
			// ✅ 전체 문제를 전부 포함
			filteredQuestions = proverbList;
		} else {
			// 난이도별 문제 필터링
			filteredQuestions = proverbList.filter((item) => item.level === selectedLevel);
		}

		navigateByMode({
			questionPool: filteredQuestions,
			isWrongReview: false,
			title: titleMap[level],
			selectedLevel,
			levelKey: level,
		});
	};

	const convertKeyToLevel = (key: QuizLevelKey): ProverbType['level'] | null => {
		switch (key) {
			case 'all':
				return '전체';
			case 'beginner':
				return '초급';
			case 'intermediate':
				return '중급';
			case 'advanced':
				return '고급';
			case 'expert':
				return '특급';
			default:
				return null;
		}
	};

	const selectedMode = QUIZ_MODE.find((mode) => mode.key === passedMode);

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['left', 'right', 'bottom']}>
			<View style={{ flex: 1 }}>
				<View style={styles.container}>
					<View style={styles.centerWrapper}>
						<View style={styles.tabRow}>
							{/* 알약 세그먼트 — 지금 어느 쪽을 보고 있는지 면 색으로 바로 읽힌다 */}
							<View style={styles.tabTrack}>
								<TouchableOpacity
									activeOpacity={0.85}
									onPress={() => setTab('level')}
									style={[styles.tabButton, tab === 'level' && styles.tabActive]}
								>
									<Text style={[styles.tabText, tab === 'level' && styles.tabTextActive]}>난이도</Text>
								</TouchableOpacity>
								<TouchableOpacity
									activeOpacity={0.85}
									onPress={() => setTab('category')}
									style={[styles.tabButton, tab === 'category' && styles.tabActive]}
								>
									<Text style={[styles.tabText, tab === 'category' && styles.tabTextActive]}>카테고리</Text>
								</TouchableOpacity>
							</View>
							<CharacterGuideButton onPress={guide.open} size={scaledSize(20)} />
						</View>
						<Animated.ScrollView
							ref={listRef as any}
							style={{
								flex: 1,
								width: '100%',
								opacity: enterAnim,
								transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(14), 0] }) }],
							}}
							contentContainerStyle={{
								paddingHorizontal: 0,
								rowGap: SpacingV.md,
								paddingBottom: SpacingV.xxxl,
							}}
						>
							{/* 스텝 패널 — 1단계(유형 고르기)와 같은 그라데이션 판이라 한 흐름으로 읽힌다 */}
							<View style={styles.stagePanel}>
								<LinearGradient
									pointerEvents="none"
									colors={[Colors.primary, Colors.primaryDeep]}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
									style={styles.stagePanelBg}
								/>
								<View style={styles.stageStepChip}>
									<IconComponent type="materialCommunityIcons" name="flag-checkered" size={scaledSize(12)} color={Colors.textInverse} />
									<Text style={styles.stageStepText}>STEP 2</Text>
								</View>
								<Text style={styles.stageTitle}>{tab === 'level' ? '난이도를 골라 주세요' : '카테고리를 골라 주세요'}</Text>
								<Text style={styles.stageSub}>고른 범위에서만 문제가 나와요</Text>
								{selectedMode && (
									<View style={styles.stageModeChip}>
										<IconComponent type={selectedMode.type} name={selectedMode.icon} size={scaledSize(13)} color={Colors.textInverse} />
										<Text style={styles.stageModeText} numberOfLines={1}>
											{selectedMode.label}
										</Text>
									</View>
								)}
							</View>
							<View style={styles.gridWrap}>
								{tab === 'level' &&
									LEVELS.map((item) => {
										// @ts-ignore
										const isComingSoon = item.key === 'comingsoon';
										if (isComingSoon) {
											return (
												<TouchableOpacity
													key={item.key}
													style={[styles.levelCardFull, styles.levelCardLocked]}
													activeOpacity={0.85}
													onPress={() => setShowComingSoon(true)}
												>
													<View style={styles.levelTitleRow}>
														<View style={[styles.levelIconChip, { backgroundColor: Colors.surfaceAlt }]}>
															<IconComponent type={item.type} name={item.icon} size={scaledSize(15)} color={Colors.textMuted} />
														</View>
														<Text style={styles.levelLabelFull} numberOfLines={1}>{item.label}</Text>
														<IconComponent type="materialCommunityIcons" name="lock" size={scaledSize(16)} color={Colors.textMuted} />
													</View>
													<Text style={styles.levelDescFull}>{item.desc}</Text>
												</TouchableOpacity>
											);
										}

										const levelKey = item.key;
										const selectedLevel = convertKeyToLevel(levelKey);
										const filteredProverbs =
											selectedLevel === '전체' ? proverbList : proverbList.filter((p) => p.level === selectedLevel);
										const total = filteredProverbs.length;

										const correctSet = new Set(quizHistory?.correctProverbId ?? []);
										const wrongSet = new Set(quizHistory?.wrongProverbId ?? []);
										const solvedSet = new Set([...correctSet, ...wrongSet]);

										const solved = filteredProverbs.filter((p) => solvedSet.has(p.id)).length;

										return (
											<TouchableOpacity
												key={item.key}
												style={[styles.levelCardFull, { borderColor: withAlpha(item.color, 0.22) }]}
												activeOpacity={0.85}
												onPress={() => {
													if (shouldShowAd) {
														setSelectedLevelKey(item.key as QuizLevelKey);
														setShowAd(true);
													} else {
														moveToQuiz(item.key as QuizLevelKey);
													}
												}}
											>
												<View style={styles.levelTitleRow}>
													<View style={[styles.levelIconChip, { backgroundColor: withAlpha(item.color, 0.14) }]}>
														<IconComponent type={item.type} name={item.icon} size={scaledSize(15)} color={item.color} />
													</View>
													<Text style={styles.levelLabelFull} numberOfLines={1}>{item.label}</Text>
													<View style={[styles.levelCountChip, { backgroundColor: withAlpha(item.color, 0.12) }]}>
														<Text style={[styles.levelCount, { color: item.color }]}>{`${total}문제`}</Text>
													</View>
													<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(20)} color={Colors.textMuted} />
												</View>
												<Text style={styles.levelDescFull} numberOfLines={2}>
													{item.desc}
												</Text>
												<ModeProgress solved={solved} total={total} color={item.color} />
											</TouchableOpacity>
										);
									})}

								{tab === 'category' && (
									<View style={{ flex: 1, width: '100%' }}>
										{CATEGORIES.map((item) => {
											const filteredProverbs =
												item.label === '전체' ? proverbList : proverbList.filter((p) => p.category === item.label);
											const total = filteredProverbs.length;

											const correctSet = new Set(quizHistory?.correctProverbId ?? []);
											const wrongSet = new Set(quizHistory?.wrongProverbId ?? []);
											const solvedSet = new Set([...correctSet, ...wrongSet]);
											const solved = filteredProverbs.filter((p) => solvedSet.has(p.id)).length;

											return (
												<TouchableOpacity
													key={item.key}
													style={[styles.levelCardFull, { borderColor: withAlpha(item.color, 0.3) }]}
													activeOpacity={0.85}
													onPress={() => {
														if (shouldShowAd) {
															setSelectedCategoryKey(item.key); // ✅ 선택한 카테고리 저장
															setShowAd(true); // ✅ 광고 먼저 표시
														} else {
															navigateByMode({
																questionPool: filteredProverbs,
																isWrongReview: false,
																title: item.label + ' 퀴즈',
																selectedCategory: item.label,
															});
														}
													}}
												>
													<View style={styles.levelTitleRow}>
														<View style={[styles.levelIconChip, { backgroundColor: withAlpha(item.color, 0.14) }]}>
															<IconComponent type={item.type} name={item.icon} size={scaledSize(15)} color={item.color} />
														</View>
														<Text style={styles.levelLabelFull} numberOfLines={1}>{item.label}</Text>
														<View style={[styles.levelCountChip, { backgroundColor: withAlpha(item.color, 0.12) }]}>
															<Text style={[styles.levelCount, { color: item.color }]}>{`${total}문제`}</Text>
														</View>
														<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(20)} color={Colors.textMuted} />
													</View>
													<Text style={styles.levelDescFull} numberOfLines={2}>
														{item.label === '전체' ? '모든 주제의 한자어 풀기' : `${item.label} 주제에 도전`}
													</Text>
													<ModeProgress solved={solved} total={total} color={item.color} />
												</TouchableOpacity>
											);
										})}
									</View>
								)}
							</View>
						</Animated.ScrollView>
					</View>
				</View>
			</View>
			<BottomHomeButton />

			{showAd && (
				<AdmobFrontAd
					onAdClosed={() => {
						setShowAd(false);

						// ✅ 난이도 선택 광고 후 이동
						if (selectedLevelKey) {
							moveToQuiz(selectedLevelKey);
							setSelectedLevelKey(null);
						}

						// ✅ 카테고리 선택 광고 후 이동
						if (selectedCategoryKey) {
							const selectedCategory = CATEGORIES.find((c) => c.key === selectedCategoryKey);
							if (selectedCategory) {
								const filteredProverbs =
									selectedCategory.label === '전체'
										? proverbList
										: proverbList.filter((p) => p.category === selectedCategory.label);

								navigateByMode({
									questionPool: filteredProverbs,
									isWrongReview: false,
									title: selectedCategory.label + ' 퀴즈',
									selectedCategory: selectedCategory.label,
								});
							}
							setSelectedCategoryKey(null);
						}
					}}
				/>
			)}
		
	<CharacterGuide
		visible={guide.visible}
		onClose={guide.close}
		lines={[
			'풀고 싶은 퀴즈를 난이도나 카테고리로 고릅니다.',
			'위 탭으로 난이도별·카테고리별 목록을 바꿔 볼 수 있습니다.',
			'항목을 누르면 그 범위의 문제만 출제됩니다!',
		]}
		title="퀴즈 선택, 이렇게 합니다"
	/>

	<CmmDelConfirmModal
		visible={showComingSoon}
		title="준비 중입니다"
		summary="새로운 문제를 준비하고 있습니다. 조금만 기다려 주세요!"
		hideCancel
		confirmText="확인"
		confirmVariant="default"
		onCancel={() => setShowComingSoon(false)}
		onConfirm={() => setShowComingSoon(false)}
	/>
</SafeAreaView>
	);
};

const makeStyles = () => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},

	centerWrapper: {
		// 태블릿: 본문을 가운데 한 기둥으로 묶는다 (CharacterGuide 와 같은 폭)
		width: '100%',
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
		flex: 1,
		justifyContent: 'flex-start',
		alignItems: 'stretch',
		paddingTop: SpacingV.md,
		paddingHorizontal: Spacing.lg,
	},

	// 제목 묶음 — 제목·부제·모드 칩을 같은 간격으로 세로로 쌓는다
	titleRow: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: SpacingV.xs,
		marginBottom: SpacingV.md,
	},

	title: {
		fontSize: Typography.h3,
		lineHeight: scaledSize(30),
		color: Colors.textStrong,
		fontWeight: FontWeight.heavy,
		textAlign: 'center',
	},
	subtitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
	subtitleLine: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	/**
	 * 스텝 패널 — 화면 맨 위 한 판.
	 * 흰 바탕에 글씨만 있던 자리라 "고르는 단계"라는 느낌이 없었다. 1단계 화면과 같은
	 * 그라데이션 판을 써서 두 화면이 한 흐름으로 이어지게 한다.
	 */
	stagePanel: {
		width: '100%',
		alignItems: 'center',
		gap: SpacingV.xs,
		padding: Spacing.xl,
		borderRadius: Radius.xl,
		overflow: 'hidden',
		backgroundColor: Colors.primary,
	},
	stagePanelBg: { ...StyleSheet.absoluteFillObject },
	stageStepChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scaleWidth(4),
		paddingHorizontal: Spacing.md,
		height: scaleHeight(24),
		borderRadius: Radius.xl,
		backgroundColor: 'rgba(255,255,255,0.18)',
	},
	stageStepText: { fontSize: Typography.micro, fontWeight: FontWeight.heavy, color: Colors.textInverse, letterSpacing: scaledSize(1) },
	stageTitle: { marginTop: SpacingV.xs, fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textInverse, textAlign: 'center' },
	stageSub: { fontSize: Typography.bodySm, color: Colors.textInverse, opacity: 0.85, textAlign: 'center' },
	stageModeChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scaleWidth(5),
		marginTop: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		height: scaleHeight(28),
		borderRadius: Radius.xl,
		backgroundColor: 'rgba(0,0,0,0.18)',
	},
	stageModeText: { flexShrink: 1, fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textInverse },

	// 앞 화면에서 고른 퀴즈 방식 — 큰 박스 대신 칩 하나로 줄여 목록이 먼저 읽히게 한다
	modeChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scaleWidth(5),
		marginTop: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		height: scaleHeight(28),
		borderRadius: Radius.xl,
		borderWidth: 1,
	},
	modeChipText: { fontSize: Typography.caption, fontWeight: FontWeight.bold },

	gridWrap: {
		width: '100%',
		rowGap: SpacingV.sm,
	},
	// 왼쪽 색 띠 없이 테두리 색만 항목 색으로 물들인다 — 좌우 안쪽 여백이 같은 값이 된다
	/**
	 * 범위 카드 한 장 — 제목 줄 · 설명 · 진행 막대를 위에서 아래로 쌓는다.
	 *
	 * 예전에는 왼쪽에 48px 색 블록을 세워 두어 카드마다 원색 띠가 한 줄로 늘어섰다.
	 * 색은 작은 아이콘 칩과 문제 수 칩, 진행 막대에만 남기고 면은 모두 카드 색으로 통일한다.
	 */
	levelCardFull: {
		width: '100%',
		gap: SpacingV.xs,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		marginBottom: SpacingV.md,
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
	},
	levelCardLocked: { opacity: 0.6 },
	levelIconChip: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: Radius.pill,
		justifyContent: 'center',
		alignItems: 'center',
	},
	levelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	// 문제 수 — 항목 색 칩으로 띄워 "이 범위가 몇 문제인지"가 먼저 보이게 한다
	levelCountChip: { marginLeft: 'auto', paddingHorizontal: Spacing.sm, height: scaleHeight(20), justifyContent: 'center', borderRadius: Radius.pill },
	levelCount: { fontSize: Typography.micro, fontWeight: FontWeight.heavy },
	levelLabelFull: {
		flexShrink: 1,
		color: Colors.textStrong,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.heavy,
	},
	levelDescFull: {
		color: Colors.textSecondary,
		fontSize: Typography.bodySm,
		lineHeight: scaledSize(17),
	},
	modeProgressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginTop: SpacingV.sm,
	},
	modeProgressTrack: {
		flex: 1,
		height: scaleHeight(6),
		borderRadius: Radius.xs,
		backgroundColor: Colors.surfaceAlt,
		overflow: 'hidden',
	},
	modeProgressFill: {
		height: '100%',
		borderRadius: Radius.xs,
	},
	modeProgressPercent: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.heavy,
		color: Colors.textSecondary,
		minWidth: scaleWidth(34),
		textAlign: 'right',
	},
	gridButtonHalf: {
		width: '46%',
		height: scaleHeight(110),
		borderRadius: Radius.lg,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: SpacingV.md,
	},
	gridButtonFull: {
		width: '90%',
		height: scaleHeight(60),
		backgroundColor: Colors.secondarySurface,
		borderRadius: Radius.lg,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: SpacingV.md, // 아래쪽 간격
	},
	modeLabel: {
		color: Colors.textInverse,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.semibold,
		marginLeft: Spacing.xs,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		marginBottom: SpacingV.md,
	},
	explanationBox: {
		marginTop: SpacingV.md,
		padding: Spacing.lg,
		backgroundColor: Colors.secondaryBg,
		borderRadius: Radius.md,
		borderColor: Colors.border,
		borderWidth: 1,
	},
	explanationRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: SpacingV.md,
	},
	explanationRow2: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	levelDot: {
		width: scaleWidth(10),
		height: scaleWidth(10),
		borderRadius: Radius.xs,
		marginTop: SpacingV.sm,
		marginRight: Spacing.md,
	},
	explanationContent: {
		flex: 1,
		fontSize: Typography.body,
		color: Colors.text,
		lineHeight: scaledSize(20),
	},
	highlight: {
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	gridButton: {
		width: '45%',
		height: scaleHeight(120),
		borderRadius: Radius.lg,
		justifyContent: 'center',
		alignItems: 'center',
	},
	icon: {
		marginRight: Spacing.sm,
	},
	boldText: {
		fontWeight: FontWeight.bold,
	},
	homeButtonWrap: {
		width: '100%',
		alignItems: 'center',
		marginTop: SpacingV.xxl,
	},

	headerSection: {
		marginBottom: SpacingV.xxxxl,
		alignItems: 'center',
	},

	subtitle: {
		fontSize: Typography.callout,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: scaledSize(20),
		marginTop: SpacingV.xs,
		paddingHorizontal: Spacing.md,
	},
	bottomExitWrapper: {
		width: '100%',
		alignItems: 'center',
		paddingVertical: SpacingV.xs,
		borderColor: Colors.surfaceAlt,
	},
	homeButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.secondarySurface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxxl,
		borderRadius: scaleWidth(30),
	},
	buttonText: {
		color: Colors.textInverse,
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
	},

	disabledButton: {
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.lg,
		justifyContent: 'center',
		alignItems: 'center',
		width: '45%',
		height: scaleHeight(110),
		opacity: 0.6,
		paddingHorizontal: Spacing.sm,
		gap: SpacingV.sm, // ✅ 아이콘/텍스트 간격 추가
	},
	disabledText: {
		color: Colors.textMuted,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
		textAlign: 'center',
		lineHeight: scaledSize(20), // 줄바꿈 간격 명확하게
	},
	comingSoon: {
		fontSize: Typography.footnote,
		color: Colors.textMuted,
		fontWeight: FontWeight.medium,
		marginTop: SpacingV.xxs,
	},
	progressText: {
		color: Colors.textInverse,
		fontSize: Typography.bodySm,
		marginTop: SpacingV.xs,
	},
	iconTextRow: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: SpacingV.sm,
	},

	labelTextColumn: {
		flexDirection: 'column',
		alignItems: 'flex-start', // 왼쪽 정렬
	},
	progressInlineText: {
		color: Colors.textInverse,
		fontSize: Typography.body,
		marginLeft: Spacing.sm,
		fontWeight: FontWeight.bold,
	},
	progressContainer: {
		width: '90%',
		marginTop: SpacingV.xl,
		marginBottom: SpacingV.xl,
		alignItems: 'center',
	},

	progressStepText: {
		fontSize: Typography.body,
		color: Colors.text,
		fontWeight: FontWeight.semibold,
		marginBottom: SpacingV.sm,
	},

	progressBarBackground: {
		width: '100%',
		height: scaleHeight(10),
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.xs,
		overflow: 'hidden',
	},

	progressBarFill: {
		width: '90%', // 2단계이므로 40%로 표시
		height: '100%',
		backgroundColor: Colors.secondarySurface,
	},
	headerFixed: {
		width: '100%',
		maxWidth: '100%', // ✅ 적용 필요
		backgroundColor: Colors.surface,
		padding: Spacing.lg,
		paddingHorizontal: Spacing.xxxxl,
		marginBottom: SpacingV.xxxl,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	selectedModeBox: {
		marginBottom: SpacingV.xxxxl,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.lg,
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
	},

	selectedModeText: {
		fontSize: Typography.body,
		color: Colors.text,
		textAlign: 'center',
	},

	// 세그먼트가 폭을 채우고 도움말은 오른쪽 끝 — 둘 사이만 gap 으로 벌린다
	tabRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: SpacingV.lg },
	tabTrack: {
		flex: 1,
		flexDirection: 'row',
		padding: scaleWidth(4),
		borderRadius: Radius.xl,
		backgroundColor: Colors.surfaceAlt,
	},
	tabButton: {
		flex: 1,
		height: scaleHeight(36),
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: Radius.xl,
	},
	tabActive: {
		backgroundColor: Colors.primary,
	},
	tabText: {
		fontSize: Typography.callout,
		color: Colors.textSecondary,
		fontWeight: FontWeight.semibold,
	},
	tabTextActive: {
		color: Colors.textInverse,
		fontWeight: FontWeight.heavy,
	},
	categoryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.md,
		borderRadius: Radius.xl,
		marginRight: Spacing.md,
	},

	categoryButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.body,
		fontWeight: FontWeight.semibold,
		marginLeft: Spacing.sm,
	},

	categoryButtonProgress: {
		color: Colors.textInverse,
		fontSize: Typography.footnote,
		marginLeft: Spacing.sm,
		fontWeight: FontWeight.medium,
	},
	categoryRowButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingVertical: SpacingV.xxl,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.lg,
		width: '100%',
		marginBottom: SpacingV.md, // ✅ 간격 추가
	},

	categoryRowText: {
		color: Colors.textInverse,
		fontSize: Typography.callout,
		fontWeight: FontWeight.semibold,
		marginLeft: Spacing.md,
	},

	categoryRowProgress: {
		marginLeft: 'auto',
		color: Colors.textInverse,
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.medium,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
	LEVELS = makeLevels();
});

export default QuizModeScreen;
