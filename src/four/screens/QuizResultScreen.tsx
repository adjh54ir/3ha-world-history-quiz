/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	RefreshControl,
	Alert,
	LayoutAnimation,
	NativeSyntheticEvent,
	NativeScrollEvent,
	Animated,
} from 'react-native';
import { useIsFocused } from '@/src/four/navigation/compat';
import IconComponent from './common/atomic/IconComponent';
import ScrollTopButton from '@/src/four/screens/common/atomic/ScrollTopButton';
import DonutChart from './common/atomic/DonutChart';
import AnimatedCounter from './common/atomic/AnimatedCounter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@/src/four/navigation/compat';
import { useCallback } from 'react';
import FastImage from '@/src/four/components/FastImage';
import BadgeMedal, { BadgeRarityChip } from '@/src/screens/life/common/BadgeMedal';
import { PetPerch, StudyRoomBackdrop, TitlePlaque } from '@/src/screens/life/common/LifeDecor';
import LifeBadgeDetailModal, { type BadgeDetail as LifeBadgeDetail } from '@/src/screens/life/modal/BadgeDetailModal';
import { BADGES as LIFE_BADGES } from '@/src/const/data/life/ConstLifeRewards';
import { CONTENT_MAX_WIDTH, MODAL_MAX_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';
import Colors, { withAlpha, onSurface } from '@/src/four/const/ConstColors';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import ProverbServices from '@/src/four/services/ProverbServices';
import DateUtils from '@/src/four/utils/DateUtils';
import { MainDataType } from '@/src/four/types/MainDataType';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import { useBlockBackHandler } from '@/src/four/hooks/useBlockBackHandler';
import { TOWER_LEVELS, TowerProgress } from '@/src/four/const/ConstTowerData';
import ProverbDetailModal from './modal/ProverbDetailModal';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import CharacterGuide, { useCharacterGuideOnce } from './common/CharacterGuide';
import WeeklyReportCard from '@/src/screens/life/common/WeeklyReportCard';
import LifeHeader from '@/src/screens/life/common/LifeHeader';
import PetAvatar from '@/src/screens/life/common/PetAvatar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAttendancePet, useBadgeProgress, useLife, usePet } from '@/src/hooks/useLife';
import { PET_STAGES } from '@/src/const/data/life/ConstLifeRewards';
import { Paths } from '@/src/navigation/conf/Paths';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';
import { LIFE_CATEGORIES } from '@/src/const/data/life/ConstLifeCategories';
import { BADGE_CATEGORY_META } from '@/src/four/services/interceptor/QuizBadgeInterceptor';

/**
 * 히어로 판 색 — 상점 금화처럼 테마를 타지 않는 브랜드 면이다.
 * 라이트/다크 모두 흰 글씨가 살아나는 진한 파랑 한 벌로 고정한다.
 */
const HERO_GRADIENT = ['#1A55D6', '#0B2E80'] as const;
const HERO_TEXT = '#FFFFFF';
const HERO_MUTED = 'rgba(255, 255, 255, 0.72)';
const HERO_GOLD = '#FFD277';

interface TodayQuizList {
	quizDate: string;
	isCheckedIn: boolean;
	todayQuizIdArr: number[];
	correctQuizIdArr: number[];
	worngQuizIdArr: number[];
	answerResults: { [quizId: number]: boolean };
	selectedAnswers: {
		[quizId: number]: {
			value: string; // 보기 텍스트
			index: number; // 몇 번째 보기인지 (0부터 시작)
		};
	};
	prevQuizIdArr?: number[];
}

/** 단어 데이터의 난이도 라벨(초급~특급) ↔ 화면에 쓰는 레벨 키 */
const LEVEL_KEY_BY_SUBTITLE: Record<string, string> = {
	초급: 'Level 1',
	중급: 'Level 2',
	고급: 'Level 3',
	특급: 'Level 4',
};

/**
 * 난이도 네 칸. `title` 은 뱃지 지급 기록과 맞추는 열쇠라 바꾸지 않고, 화면에는 `subtitle`(급수 이름)과
 * `desc`(한 줄 설명)만 쓴다 — 앱 어디에도 없는 'Level 1' 표기가 이 화면에만 있었다.
 */
const DIFFICULTIES = [
	{ key: 'Level 1', title: 'Level 1', subtitle: '초급', desc: '기초 한자어', icon: 'seedling' },
	{ key: 'Level 2', title: 'Level 2', subtitle: '중급', desc: '한 단계 위', icon: 'leaf' },
	{ key: 'Level 3', title: 'Level 3', subtitle: '고급', desc: '깊이 있는 말', icon: 'tree' },
	{ key: 'Level 4', title: 'Level 4', subtitle: '특급', desc: '가장 어려움', icon: 'trophy' },
];

/**
 * 분야 표시 메타(색·아이콘) — 분야 목록에서 그대로 만든다.
 *
 * 원본은 사자성어 시절 분야 18개를 손으로 적어 두었다. 이 앱의 학습 분야는 26개라 이름이 하나도
 * 겹치지 않아, 정복한 분야가 전부 회색 물음표로 그려졌다. 목록에서 파생하면 분야가 늘어도 어긋나지 않는다.
 *
 * 팔레트 값을 복사하므로 테마가 바뀌면 다시 만든다 (ThemeRegistry 참고).
 */
const makeCategoryMeta = (): Record<string, { color: string; icon: { type: string; name: string } }> =>
	Object.fromEntries(
		LIFE_CATEGORIES.map((category) => [
			category.label,
			{
				color: (Colors as unknown as Record<string, string>)[category.color] ?? Colors.primary,
				icon: { type: 'materialCommunityIcons', name: category.icon },
			},
		]),
	);
let CATEGORY_META = makeCategoryMeta();


const STYLE_MAP = {
	초급: {
		color: Colors.secondaryPale,
		icon: { type: 'fontAwesome5', name: 'seedling' },
		badgeId: 'level_easy_1',
		type: 'level',
	},
	중급: {
		color: Colors.warningLight,
		icon: { type: 'fontAwesome5', name: 'leaf' },
		badgeId: 'level_easy_2',
		type: 'level',
	},
	고급: {
		color: Colors.accentOrangeLight,
		icon: { type: 'fontAwesome5', name: 'tree' },
		badgeId: 'level_medium',
		type: 'level',
	},
	특급: {
		color: Colors.error,
		icon: { type: 'fontAwesome5', name: 'trophy' },
		badgeId: 'level_hard',
		type: 'level',
	},
};

LocaleConfig.locales.kr = {
	monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
	monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
	dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
	dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
};

LocaleConfig.defaultLocale = 'kr';

const STORAGE_KEY_QUIZ = MainStorageKeyType.USER_QUIZ_HISTORY;
const STORAGE_KEY_STUDY = MainStorageKeyType.USER_STUDY_HISTORY;
const STORAGE_KEY_TIME = MainStorageKeyType.TIME_CHALLENGE_HISTORY;
const STORAGE_KEY_TODAY = MainStorageKeyType.TODAY_QUIZ_LIST;

/**
 * 분야 마스터 뱃지 ↔ 분야 라벨.
 * 지급 로직(QuizBadgeInterceptor)이 쓰는 표를 그대로 가져온다 — 손으로 적어 두면 분야가 바뀔 때마다 어긋난다.
 */
const categoryMap2: { [key: string]: string } = Object.fromEntries(
	BADGE_CATEGORY_META.map(({ category, badgeId }) => [category, badgeId]),
);

/** 데이터 로드 전에는 분모가 0이라 그대로 나누면 화면에 NaN%가 찍힌다 */
const pctOf = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);

/**
 * 정복 진행도 막대 — "몇 개 중 몇 개"를 한 줄로 보여 준다.
 * compact 는 레벨 카드·분야 줄 안에 들어가는 작은 판이다 (바깥 여백 없음).
 */
const MasteryBar = ({ done, total, color, compact = false }: { done: number; total: number; color: string; compact?: boolean }) => {
	const pct = pctOf(done, total);
	return (
		<View style={[styles.masteryBarRow, compact && styles.masteryBarRowCompact]}>
			<View style={[styles.scoreDashBarTrack, styles.masteryBarTrack, compact && styles.masteryBarTrackCompact]}>
				<View style={[styles.scoreDashBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
			</View>
			<Text style={[styles.masteryPctText, compact && styles.masteryPctTextCompact, { color }]}>{pct}%</Text>
		</View>
	);
};

const QuizResultScreen = () => {
	const isFocused = useIsFocused();
	const scrollRef = useRef<ScrollView>(null);
	const [refreshing, setRefreshing] = useState(false);
	// 등급·캐릭터는 앱 본체(판다)의 것을 그대로 쓴다 — 이식 화면이 들고 있던 별도 등급표는 쓰지 않는다
	const pet = usePet();
	const attendancePet = useAttendancePet();
	/**
	 * 뱃지는 앱 전체 뱃지(ConstLifeRewards 의 BADGES) 한 벌만 쓴다.
	 * 이 화면이 따로 들고 있던 뱃지 표는 홈·나의 활동과 개수·조건이 달라
	 * 같은 사용자에게 "딴 뱃지 수" 가 화면마다 다르게 보였다.
	 */
	const life = useLife();
	const badgeProgressMap = useBadgeProgress();
	const lifeBadgeEarned = useMemo(() => new Map(life.badges.map((item) => [item.id, item.at])), [life.badges]);
	/** 뱃지 상세 — 홈·나의 활동과 같은 팝업을 쓴다 */
	const [lifeBadgeDetail, setLifeBadgeDetail] = useState<LifeBadgeDetail | null>(null);

	// 마스코트 진입 애니메이션
	const mascotFade = useRef(new Animated.Value(0)).current;
	const mascotScale = useRef(new Animated.Value(0.8)).current;
	useAnimationCleanup(mascotFade, mascotScale);


	const [totalScore, setTotalScore] = useState<number>(0);
	const [levelMaster, setLevelMaster] = useState<string[]>([]);
	const [correctCount, setCorrectCount] = useState<number>(0);
	const [wrongCount, setWrongCount] = useState<number>(0);
	const [lastAnsweredAt, setLastAnsweredAt] = useState<string>('');
	const [bestCombo, setBestCombo] = useState<number>(0);
	const [showBadgeList, setShowBadgeList] = useState(false);
	const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all');
	const [studyCountries, setStudyCountries] = useState<string[]>([]);
	const [lastStudyAt, setLastStudyAt] = useState<string>('');
	const [totalStudyCount, setTotalStudyCount] = useState<number>(0);
	const [showScrollTop, setShowScrollTop] = useState(false);

	const [categoryMaster, setCategoryMaster] = useState<string[]>([]);
	const [totalCountryCount, setTotalCountryCount] = useState<number>(0);
	/** 레벨·분야마다 "몇 문제 중 몇 개를 맞혔나" — 정복 도장만으로는 어디까지 왔는지 알 수 없다 */
	const [levelProgress, setLevelProgress] = useState<Record<string, { done: number; total: number }>>({});
	const [categoryProgress, setCategoryProgress] = useState<Record<string, { done: number; total: number }>>({});

	const [showStudySection, setShowStudySection] = useState(false);
	const [showQuizSection, setShowQuizSection] = useState(false);
	const [showTimeSection, setShowTimeSection] = useState(false);
	const [showBadgeSection, setShowBadgeSection] = useState(false);
	const [showTowerSection, setShowTowerSection] = useState(false);
	const [unlockedRewards, setUnlockedRewards] = useState<number[]>([]);

	const [showTodayQuizSection, setShowTodayQuizSection] = useState(false);
	const [markedQuizDates, setMarkedQuizDates] = useState<{ [date: string]: any }>({});

	const [timeChallengeResults, setTimeChallengeResults] = useState<MainDataType.TimeChallengeResult[]>([]);
	const [isAllExpanded, setIsAllExpanded] = useState(false);

	// ✅ 아코디언 대신 빠른 탐색용 탭 (한 번에 하나의 활동만 표시)
	const ACTIVITY_TABS = [
		{ key: 'all', label: '전체', icon: 'apps' },
		{ key: 'study', label: '학습 활동', icon: 'school' },
		{ key: 'quiz', label: '퀴즈 활동', icon: 'play-arrow' },
		{ key: 'today', label: '오늘의 퀴즈', icon: 'calendar-today' },
		{ key: 'time', label: '타임 챌린지', icon: 'timer' },
		{ key: 'badge', label: '획득 뱃지', icon: 'emoji-events' },
		{ key: 'tower', label: '타워 챌린지', icon: 'apartment' },
	];
	const [activeTab, setActiveTab] = useState<string>('all');
	const guide = useCharacterGuideOnce('my-activity');

	const [selectedDate, setSelectedDate] = useState<string | null>(null);

	const [selectedQuizData, setSelectedQuizData] = useState<MainDataType.TodayQuizList | null>(null);
	const [detailQuiz, setDetailQuiz] = useState<MainDataType.ProverbType | null>(null);
	const [detailModalVisible, setDetailModalVisible] = useState(false);
	const [todayQuizDataList, setTodayQuizDataList] = useState<MainDataType.TodayQuizList[]>([]);

	const todayQuizListRef = useRef<MainDataType.TodayQuizList[]>([]);

	useBlockBackHandler(true); // 뒤로가기 모션 막기

	const allCategories = ProverbServices.selectCategoryList(); // 전체 카테고리 (8개)
	// TOOD: 해당 부분에서 데이터를 불러 와야 함
	// const allCategories = []; // 전체 카테고리 (8개)

	const getLevelStyle = (subtitle: string) => {
		const entry = STYLE_MAP[subtitle];
		if (!entry) {
			return { bg: Colors.surface, border: Colors.borderStrong };
		}
		return { bg: entry.color, border: entry.color };
	};

	useEffect(() => {
		if (isFocused) {
			scrollRef.current?.scrollTo({ y: 0, animated: true });
		}
	}, [isFocused]);

	useFocusEffect(
		useCallback(() => {
			loadData();
			loadCheckedInDates();
			// 마스코트 진입 애니메이션 실행
			mascotFade.setValue(0);
			mascotScale.setValue(0.8);
			const anim = Animated.parallel([
				Animated.timing(mascotFade, {
					toValue: 1,
					duration: 500,
					useNativeDriver: true,
				}),
				Animated.spring(mascotScale, {
					toValue: 1,
					friction: 6,
					tension: 80,
					useNativeDriver: true,
				}),
			]);
			anim.start();
			return () => anim.stop();
		}, []),
	);

	useFocusEffect(
		useCallback(() => {
			const todayStr = DateUtils.getLocalDateString();
			const todayData = todayQuizDataList.find((item) => DateUtils.getLocalParamDateToString(item.quizDate) === todayStr);

			if (todayData) {
				setSelectedDate(todayStr);
				setSelectedQuizData(todayData);
			}
		}, [todayQuizDataList]),
	);

	useFocusEffect(
		useCallback(() => {
			// 탭 이동 시 진입할 때마다 접힌 상태로 초기화
			setIsAllExpanded(false);
			setShowStudySection(false);
			setShowQuizSection(false);
			setShowTimeSection(false);
			setShowBadgeSection(false);
			setShowTodayQuizSection(false);
			setShowTowerSection(false);
			// 탭을 옮겼다 돌아오면 보던 탭·필터·팝업도 처음 상태로 되돌린다
			setActiveTab('all');
			setBadgeFilter('all');
			setShowBadgeList(false);
			setDetailModalVisible(false);
			setLifeBadgeDetail(null);
			setShowScrollTop(false);
			scrollRef.current?.scrollTo({ y: 0, animated: false });
		}, []),
	);

	const loadData = async () => {
		try {
			const studyData = await AsyncStorage.getItem(STORAGE_KEY_STUDY);
			const quizData = await AsyncStorage.getItem(STORAGE_KEY_QUIZ);

			const studyBadges = studyData ? (JSON.parse(studyData)?.badges ?? []) : [];
			const quizJson = quizData ? JSON.parse(quizData) : null;
			const quizBadges = quizJson?.badges ?? [];
			const studyJson = studyData ? JSON.parse(studyData) : null;
			const studiedIds: number[] = studyJson?.studyProverbs ?? [];
			const studyCounts = studyJson?.studyCounts ?? {};
			const lastDate = studyJson?.lastStudyAt ?? '';

			const allProverbs = ProverbServices.selectProverbList();
			setTotalCountryCount(allProverbs.length);
			setStudyCountries(studiedIds.map(String)); // 화면 출력용
			setLastStudyAt(lastDate);

			const totalCount = (Object.values(studyCounts) as number[]).reduce((a, b) => a + b, 0);
			setTotalStudyCount(totalCount);
			// ✅ 수정 - 올바른 키 사용
			const towerRaw = await AsyncStorage.getItem(MainStorageKeyType.TOWER_CHALLENGE_PROGRESS);
			const towerParsed: TowerProgress = towerRaw ? JSON.parse(towerRaw) : {};
			setUnlockedRewards(towerParsed.unlockedRewards ?? []);

			setTotalScore(quizJson?.totalScore ?? 0);
			setCorrectCount(quizJson?.correctProverbId?.length ?? 0);
			setWrongCount(quizJson?.wrongProverbId?.length ?? 0);
			setLastAnsweredAt(quizJson?.lastAnsweredAt ?? '');
			setBestCombo(quizJson?.bestCombo ?? 0);

			const timeData = await AsyncStorage.getItem(STORAGE_KEY_TIME);
			const timeResults: MainDataType.TimeChallengeResult[] = timeData ? JSON.parse(timeData) : [];
			setTimeChallengeResults(timeResults.slice(0, 3)); // 최근 3개만 보기

			// 이식 저장소의 뱃지 id — 난이도·분야 정복 도장을 세는 데만 쓴다.
			// 화면에 보여 주는 뱃지 목록은 앱 전체 뱃지(LIFE_BADGES)와 redux 기록을 쓴다.
			const allBadges = [...new Set([...studyBadges, ...quizBadges])];


			// 정복한 카테고리만 추출
			const conqueredCategories = Object.entries(categoryMap2)
				.filter(([_, badgeId]) => allBadges.includes(badgeId))
				.map(([label]) => label);

			setCategoryMaster(conqueredCategories);

			// 🔽 earnedBadgeIds 대신 allBadges 사용
			const conqueredLevels = Object.entries(STYLE_MAP)
				.filter(([_, v]) => allBadges.includes(v.badgeId)) // ✅ 수정됨
				.map(([k]) => {
					switch (k) {
						case '초급':
							return 'Level 1';
						case '중급':
							return 'Level 2';
						case '고급':
							return 'Level 3';
						case '특급':
							return 'Level 4';
						default:
							return '';
					}
				});

			setLevelMaster(conqueredLevels);

			// 레벨·분야별 진행률 — "푼 문제"(맞힘 + 틀림)를 전체 목록에 맞춰 센다.
			// 정복 조건이 "모두 풀었을 때" 라서 맞힌 것만 세면 오답이 있는 범위의 막대가 끝까지 차지 않는다.
			// 퀴즈 범위 고르기 화면(QuizModeScreen)도 같은 기준으로 센다.
			const solvedIds = new Set<number>([...(quizJson?.correctProverbId ?? []), ...(quizJson?.wrongProverbId ?? [])]);
			const levelTally: Record<string, { done: number; total: number }> = {};
			const categoryTally: Record<string, { done: number; total: number }> = {};
			allProverbs.forEach((proverb) => {
				const levelKey = LEVEL_KEY_BY_SUBTITLE[proverb.level] ?? '';
				if (levelKey) {
					const slot = (levelTally[levelKey] ??= { done: 0, total: 0 });
					slot.total += 1;
					if (solvedIds.has(proverb.id)) {
						slot.done += 1;
					}
				}
				const slot = (categoryTally[proverb.category] ??= { done: 0, total: 0 });
				slot.total += 1;
				if (solvedIds.has(proverb.id)) {
					slot.done += 1;
				}
			});
			setLevelProgress(levelTally);
			setCategoryProgress(categoryTally);

			// 타임 챌린지 정보
			const todayJson = await AsyncStorage.getItem(STORAGE_KEY_TODAY);
			const todayData: MainDataType.TodayQuizList[] = todayJson ? JSON.parse(todayJson) : [];

			const marked = todayData.reduce(
				(acc, item) => {
					const dateKey = DateUtils.getLocalParamDateToString(item.quizDate);
					acc[dateKey] = {
						marked: true,
						dotColor: Colors.primary,
						customStyles: {
							container: {
								backgroundColor: Colors.secondaryBg,
							},
							text: {
								color: Colors.primary,
								fontWeight: FontWeight.bold,
							},
						},
					};
					return acc;
				},
				{} as Record<string, any>,
			);

			const todayStr = DateUtils.getLocalDateString();

			marked[todayStr] = {
				...(marked[todayStr] || {}),
				customStyles: {
					container: {
						backgroundColor: Colors.secondaryDark, // 🎨 밝은 파란색
					},
					text: {
						color: Colors.textInverse,
						fontWeight: FontWeight.bold,
					},
				},
			};

			setTodayQuizDataList(todayData); // todayData를 상태로 저장

			setMarkedQuizDates(marked);
		} catch (e) {
			console.error('❌ 데이터 로딩 실패:', e);
		}
	};

	const loadCheckedInDates = async () => {
		const json = await AsyncStorage.getItem(STORAGE_KEY_TODAY);
		if (!json) {
			return;
		}

		const arr: MainDataType.TodayQuizList[] = JSON.parse(json);
		const todayStr = DateUtils.getLocalDateString();


		const marked: { [date: string]: any } = {};
		arr.forEach((item) => {
			if (item.isCheckedIn) {
				const date = DateUtils.getLocalParamDateToString(item.quizDate);
				const isToday = date === todayStr;

				marked[date] = {
					customStyles: {
						container: {
							backgroundColor: isToday ? Colors.warning : Colors.primary, // ✅ 앰버: 오늘(강조), 블루: 이전 출석
							borderRadius: Radius.sm,
						},
						text: {
							color: Colors.textInverse,
							fontWeight: FontWeight.bold,
						},
					},
				};
			}
		});
	};
	// ISO 형식 대응 버전
	const getRelativeDateLabel = (isoString: string): string => {
		try {
			const inputDate = new Date(isoString);
			const diffDays = DateUtils.getLocalDayDifference(inputDate);
			const { year, month, day, hour, minute } = DateUtils.getLocalDateParts(inputDate);
			const timeStr = `${hour}:${String(minute).padStart(2, '0')}`;

			if (diffDays === 0) {
				return `오늘, ${timeStr}`;
			}
			if (diffDays === 1) {
				return `어제, ${timeStr}`;
			}
			if (diffDays === 2) {
				return `그제, ${timeStr}`;
			}
			if (diffDays < 7) {
				return `${diffDays}일 전`;
			}
			if (diffDays < 30) {
				return `${Math.floor(diffDays / 7)}주 전`;
			}

			return `${year}. ${String(month).padStart(2, '0')}. ${String(day).padStart(2, '0')}. ${timeStr}`;
		} catch {
			return isoString;
		}
	};

	const toggleAllSections = () => {
		const nextState = !isAllExpanded;
		setIsAllExpanded(nextState);
		setShowStudySection(nextState);
		setShowQuizSection(nextState);
		setShowTimeSection(nextState);
		setShowBadgeSection(nextState);
		setShowTodayQuizSection(nextState); // ✅ 추가됨
		setShowTowerSection(nextState); // ✅ 추가
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
	};

	const onRefresh = () => {
		setRefreshing(true);
		loadData().finally(() => setRefreshing(false)); // ✅ 이 방식 권장
	};


	const toggleBadgeList = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setShowBadgeList((prev) => !prev);
	};

	const handleClearSelectedDate = () => {
		if (!selectedDate) {
			return;
		}

		setMarkedQuizDates((prev) => {
			const updated = { ...prev };

			// 선택된 날짜 마킹이 있으면 제거하거나 기존 마킹만 남김
			const originalMark = todayQuizDataList.find((item) => DateUtils.getLocalParamDateToString(item.quizDate) === selectedDate);

			if (originalMark) {
				updated[selectedDate] = {
					marked: true,
					dotColor: Colors.primary,
					customStyles: {
						container: {
							backgroundColor: Colors.secondaryBg,
						},
						text: {
							color: Colors.primary,
							fontWeight: FontWeight.bold,
						},
					},
				};
			} else {
				delete updated[selectedDate]; // 마킹도 없으면 삭제
			}

			return updated;
		});

		setSelectedDate(null);
		setSelectedQuizData(null);
	};

	const totalSolved = correctCount + wrongCount;
	const accuracy = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;


	/**
	 * 스크롤을 관리하는 Handler
	 */
	const scrollHandler = (() => {
		return {
			/**
			 * 스크롤을 일정 높이 만큼 움직였을때 아이콘 등장 처리
			 * @param event
			 */
			onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
				const offsetY = event.nativeEvent.contentOffset.y;
				setShowScrollTop(offsetY > 100);
			},
			/**
			 * 스크롤 최상단으로 이동
			 * @return {void}
			 */
			toTop: (): void => {
				scrollRef.current?.scrollTo({ y: 0, animated: true });
			},

			/**
			 * 스크롤 뷰 최하단으로 이동
			 * @return {void}
			 */
			toBottom: (): void => {
				setTimeout(() => {
					scrollRef.current?.scrollToEnd({ animated: true });
				}, 100);
			},
		};
	})();

	const updateMarkedQuizDatesOnSelect = (
		date: string,
		prevDate: string | null,
		setMarkedQuizDates: React.Dispatch<React.SetStateAction<{ [date: string]: any }>>,
		todayQuizDataList: MainDataType.TodayQuizList[],
	) => {
		setMarkedQuizDates((prev) => {
			const updated = { ...prev };

			// ✅ 이전 선택 날짜 초기화
			if (prevDate && updated[prevDate]) {
				const wasChecked = todayQuizDataList.some((item) => DateUtils.getLocalParamDateToString(item.quizDate) === prevDate);

				if (wasChecked) {
					updated[prevDate] = {
						marked: true,
						dotColor: Colors.primary,
						customStyles: {
							container: {
								backgroundColor: Colors.secondaryBg,
							},
							text: {
								color: Colors.primary,
								fontWeight: FontWeight.bold,
							},
						},
					};
				} else {
					delete updated[prevDate];
				}
			}

			// ✅ 새 선택 날짜 강조
			updated[date] = {
				...(updated[date] || {}),
				customStyles: {
					container: {
						backgroundColor: Colors.border,
					},
					text: {
						color: Colors.text,
						fontWeight: FontWeight.bold,
					},
				},
			};

			return updated;
		});
	};

	/** 마지막 등급 이름 — 안내 문구가 등급표와 어긋나지 않게 데이터에서 가져온다 */
	const topStageLabel = PET_STAGES[PET_STAGES.length - 1].label;

	return (
		<SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
			<LifeHeader title="통계" subtitle="기록으로 보는 나의 한자 실력" onPressGuide={guide.open} />
			<ScrollView
				ref={scrollRef}
				style={styles.container}
				contentContainerStyle={styles.scrollContent}
				onScroll={scrollHandler.onScroll}
				scrollEventThrottle={16}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
				{/*
				 * 히어로 판 — 캐릭터·등급·경험치를 진한 브랜드 판 한 장에 담는다.
				 * 예전에는 테두리만 있는 빈 상자 안에 칩 두 개와 안내 카드 두 장이 흩어져 있어
				 * 화면 첫 인상이 "설명문"이었다. 점수는 바로 아래 전체 스코어 판에서 다시 읽으므로
				 * 여기서는 지금 등급과 다음 단계까지 남은 경험치만 크게 보여 준다.
				 */}
				<View style={styles.heroPanel}>
					<LinearGradient colors={HERO_GRADIENT} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
					<LinearGradient
						pointerEvents="none"
						colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.02)']}
						start={{ x: 0.5, y: 0 }}
						end={{ x: 0.5, y: 1 }}
						style={styles.heroSheen}
					/>

					<Animated.View style={{ alignItems: 'center', opacity: mascotFade, transform: [{ scale: mascotScale }] }}>
						{/*
						 * 지금 내 캐릭터 — 홈 히어로와 같은 그림에 상점에서 산 꾸미기까지 그대로 얹는다.
						 * 글방은 캐릭터 뒤, 좌대는 청룡 발밑, 칭호는 등급 칩 아래에 붙는다.
						 * 아무것도 안 샀으면 각 컴포넌트가 null 을 돌려줘 예전 화면 그대로다.
						 */}
						<View style={styles.mascotWrap}>
							{/* 캐릭터 발밑 빛 — 진한 판 위에서 그림이 떠 보이게 한다 */}
							<View style={styles.heroHalo} pointerEvents="none" />
							<StudyRoomBackdrop width={scaleWidth(236)} height={scaleWidth(108)} />
							<PetAvatar size={scaleWidth(120)} plate={false} />

							{!!attendancePet.image && (
								<View style={styles.petBadge}>
									<View style={styles.petPerchSlot} pointerEvents="none">
										<PetPerch size={scaleWidth(48)} />
									</View>
									<Image source={attendancePet.image} style={{ width: '100%', height: '100%' }} contentFit="contain" accessible={false} />
								</View>
							)}
						</View>
					</Animated.View>

					<TouchableOpacity
						style={styles.heroGradeChip}
						activeOpacity={0.85}
						onPress={() => router.push(`/${Paths.GRADE}` as never)}
						accessibilityRole="button"
						accessibilityLabel="등급 안내 보기">
						<IconComponent type="materialCommunityIcons" name="shield-star" size={scaledSize(16)} color={HERO_TEXT} />
						<Text style={styles.heroGradeText}>{`Lv.${pet.level} ${pet.stage.label}`}</Text>
						<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(18)} color={HERO_MUTED} />
					</TouchableOpacity>

					{/* 칭호 — 사 둔 사람에게만 등급 칩 아래에 현판이 붙는다 (홈 히어로와 같은 자리) */}
					<TitlePlaque onBrand />

					{/* 경험치 — 다음 단계까지 얼마나 남았는지가 이 화면에서 가장 먼저 궁금한 숫자다 */}
					<View style={styles.heroExpBox}>
						<View style={styles.heroExpHead}>
							<Text style={styles.heroExpLabel}>경험치</Text>
							<Text style={styles.heroExpValue}>{`${pet.exp.toLocaleString()}EXP`}</Text>
						</View>
						<View style={styles.heroExpTrack}>
							<View style={[styles.heroExpFill, { width: `${Math.round(Math.min(Math.max(pet.ratio, 0), 1) * 100)}%` }]} />
						</View>
						<Text style={styles.heroExpHint} numberOfLines={1}>
							{pet.next
								? `다음 단계 ${pet.next.label}까지 ${(pet.next.minExp - pet.exp).toLocaleString()}EXP`
								: `마지막 등급 ${topStageLabel}에 도달했어요`}
						</Text>
					</View>

					<View style={styles.heroNotes}>
						<View style={styles.heroNoteRow}>
							<IconComponent type="materialCommunityIcons" name="trophy" size={scaledSize(14)} color={HERO_GOLD} />
							<Text style={styles.heroNoteText} numberOfLines={2}>
								경험치를 모으면 마지막 등급 <Text style={styles.heroNoteStrong}>{topStageLabel}</Text> 까지 자라요.
							</Text>
						</View>
						<View style={styles.heroNoteRow}>
							<IconComponent type="materialCommunityIcons" name="refresh" size={scaledSize(14)} color={HERO_GOLD} />
							<Text style={styles.heroNoteText} numberOfLines={2}>
								틀린 문제는 <Text style={styles.heroNoteStrong}>오답 복습</Text>에서 다시 도전할 수 있어요.
							</Text>
						</View>
					</View>
				</View>

				{/* ✅ 전체 스코어 대시보드 (항상 표시) */}
				{(() => {
					const studyPct = totalCountryCount > 0 ? Math.round((studyCountries.length / totalCountryCount) * 100) : 0;
					const solvedPct = totalCountryCount > 0 ? Math.round((totalSolved / totalCountryCount) * 100) : 0;
					const badgePct = LIFE_BADGES.length > 0 ? Math.round((lifeBadgeEarned.size / LIFE_BADGES.length) * 100) : 0;
					const metrics = [
						{ icon: 'school', color: Colors.primary, soft: Colors.primarySoft, label: '학습 진척도', value: `${studyCountries.length}/${totalCountryCount}`, pct: studyPct },
						{ icon: 'check-circle', color: Colors.secondaryDark, soft: Colors.secondarySoft, label: '퀴즈 정답률', value: `${accuracy}%`, pct: accuracy },
						{ icon: 'play-circle-filled', color: Colors.teal, soft: Colors.tealSoft, label: '퀴즈 진척도', value: `${totalSolved}/${totalCountryCount}`, pct: solvedPct },
						{ icon: 'military-tech', color: Colors.warning, soft: Colors.warningSoft, label: '획득 뱃지', value: `${lifeBadgeEarned.size}/${LIFE_BADGES.length}`, pct: badgePct },
					];
					return (
						<View style={styles.scoreDashCard}>
							{/* 위쪽 광택 — 홈 히어로·상점 선반과 같은 판 언어 (면만 얹고 내용은 그대로) */}
							<LinearGradient
								pointerEvents="none"
								colors={[Colors.primarySoft, 'rgba(255,255,255,0)']}
								start={{ x: 0.5, y: 0 }}
								end={{ x: 0.5, y: 1 }}
								style={styles.scoreDashSheen}
							/>
							<View style={styles.scoreDashHeader}>
								<View style={styles.scoreDashTitleRow}>
									<View style={styles.scoreDashIconChip}>
										<IconComponent type="materialIcons" name="insights" size={scaledSize(16)} color={Colors.textInverse} />
									</View>
									<Text style={styles.scoreDashTitle}>전체 스코어</Text>
								</View>
								<View style={styles.scoreDashScorePill}>
									<IconComponent type="materialIcons" name="stars" size={scaledSize(14)} color={Colors.warning} />
									<AnimatedCounter value={totalScore} useComma suffix="점" style={styles.scoreDashScoreText} />
								</View>
							</View>
							<View style={styles.scoreDashGrid}>
								{metrics.map((m) => (
									<View key={m.label} style={styles.scoreDashTile}>
										<View style={styles.scoreDashTileTop}>
											<View style={[styles.scoreDashTileIcon, { backgroundColor: m.soft }]}>
												<IconComponent type="materialIcons" name={m.icon} size={scaledSize(15)} color={m.color} />
											</View>
											<Text style={styles.scoreDashTileLabel}>{m.label}</Text>
										</View>
										<Text style={styles.scoreDashTileValue}>{m.value}</Text>
										<View style={styles.scoreDashBarTrack}>
											<View style={[styles.scoreDashBarFill, { width: `${Math.min(m.pct, 100)}%`, backgroundColor: m.color }]} />
										</View>
										<Text style={[styles.scoreDashTilePct, { color: m.color }]}>{m.pct}%</Text>
									</View>
								))}
							</View>
						</View>
					);
				})()}

				{/* 주간 리포트 — 탭과 상관없이 맨 위에 한 장. "이번 주에 잘하고 있나" 를 먼저 보여 준다 */}
				<WeeklyReportCard />

				{/* ✅ 빠른 탐색 탭 바 — 원하는 활동을 바로 선택 */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.activityTabBar}>
					{ACTIVITY_TABS.map((tab) => {
						const isActive = activeTab === tab.key;
						return (
							<TouchableOpacity
								key={tab.key}
								activeOpacity={0.8}
								onPress={() => setActiveTab(tab.key)}
								style={[styles.activityTabChip, isActive && styles.activityTabChipActive]}>
								<IconComponent
									type="materialIcons"
									name={tab.icon}
									size={scaledSize(15)}
									color={isActive ? Colors.textInverse : Colors.textSecondary}
								/>
								<Text style={[styles.activityTabText, isActive && styles.activityTabTextActive]}>{tab.label}</Text>
							</TouchableOpacity>
						);
					})}
				</ScrollView>

				<View style={styles.activityGroupBox}>

					{(activeTab === 'all' || activeTab === 'study') && (
						<View style={styles.sectionHeaderStatic}>
							<View style={styles.iconCircle1}>
								<IconComponent type="materialIcons" name="school" size={scaledSize(16)} color={Colors.textInverse} />
							</View>
							<Text style={styles.sectionTitle}>나의 학습 활동</Text>
						</View>
					)}
					{(activeTab === 'all' || activeTab === 'study') && (
						<View style={styles.activityCardBox}>
							<View style={styles.chartRow}>
								<DonutChart
									percent={totalCountryCount > 0 ? Math.round((studyCountries.length / totalCountryCount) * 100) : 0}
									size={scaledSize(88)}
									strokeWidth={scaledSize(10)}
									color={Colors.primary}>
									<AnimatedCounter
										value={totalCountryCount > 0 ? Math.round((studyCountries.length / totalCountryCount) * 100) : 0}
										suffix="%"
										style={styles.donutCenterValue}
									/>
									<Text style={styles.donutCenterLabel}>학습률</Text>
								</DonutChart>
								<View style={styles.chartLegend}>
									<Text style={styles.chartLegendTitle}>나의 학습 진척도</Text>
									<View style={styles.chartLegendRow}>
										<View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
										<Text style={styles.chartLegendText}>
											학습한 한자어 <Text style={styles.chartLegendStrong}>{studyCountries.length}개</Text>
										</Text>
									</View>
									<View style={styles.chartLegendRow}>
										<View style={[styles.legendDot, { backgroundColor: Colors.border }]} />
										<Text style={styles.chartLegendText}>
											남은 한자어{' '}
											<Text style={styles.chartLegendStrong}>{Math.max(totalCountryCount - studyCountries.length, 0)}개</Text>
										</Text>
									</View>
								</View>
							</View>
							<View style={styles.summaryStatGrid}>
								<View style={styles.summaryStatCard}>
									<View style={[styles.statIconChip, { backgroundColor: Colors.primarySoft }]}>
										<IconComponent type="materialIcons" name="track-changes" size={scaledSize(18)} color={Colors.primary} />
									</View>
									<Text style={styles.statValue}>
										{studyCountries.length} / {totalCountryCount}
									</Text>
									<Text style={styles.statLabel}>
										학습 완료 ({pctOf(studyCountries.length, totalCountryCount)}%)
									</Text>
								</View>
								<View style={styles.summaryStatCard}>
									<View style={[styles.statIconChip, { backgroundColor: Colors.secondarySoft }]}>
										<IconComponent type="materialIcons" name="event-note" size={scaledSize(18)} color={Colors.secondaryDark} />
									</View>
									<Text style={styles.statValue}>{lastStudyAt ? DateUtils.getLocalParamDateToString(lastStudyAt).slice(2).replace(/-/g, '.') : '없음'}</Text>
									<Text style={styles.statLabel}>마지막 학습일</Text>
								</View>
							</View>
						</View>
					)}

					{/* 나의 퀴즈 활동 요약 */}
					{(activeTab === 'all' || activeTab === 'quiz') && (
						<View style={styles.sectionHeaderStatic}>
							<View style={styles.iconCircle2}>
								<IconComponent type="materialIcons" name="play-arrow" size={scaledSize(16)} color={Colors.textInverse} />
							</View>
							<Text style={styles.sectionTitle}>나의 퀴즈 활동</Text>
						</View>
					)}
					{(activeTab === 'all' || activeTab === 'quiz') && (
						<View style={styles.activityCardBox}>
							<View style={styles.chartRow}>
								<DonutChart percent={accuracy} size={scaledSize(88)} strokeWidth={scaledSize(10)} color={Colors.secondaryDark}>
									<AnimatedCounter value={accuracy} suffix="%" style={[styles.donutCenterValue, { color: Colors.secondaryDark }]} />
									<Text style={styles.donutCenterLabel}>정답률</Text>
								</DonutChart>
								<View style={styles.chartLegend}>
									<Text style={styles.chartLegendTitle}>정답 / 오답 비율</Text>
									<View style={styles.chartLegendRow}>
										<View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
										<Text style={styles.chartLegendText}>
											정답 <Text style={styles.chartLegendStrong}>{correctCount}개</Text>
										</Text>
									</View>
									<View style={styles.chartLegendRow}>
										<View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
										<Text style={styles.chartLegendText}>
											오답 <Text style={styles.chartLegendStrong}>{wrongCount}개</Text>
										</Text>
									</View>
									<View style={styles.stackBarTrack}>
										<View style={[styles.stackBarCorrect, { flex: totalSolved > 0 ? correctCount : 1 }]} />
										<View style={[styles.stackBarWrong, { flex: totalSolved > 0 ? wrongCount : 0 }]} />
									</View>
								</View>
							</View>
							<View style={styles.summaryStatCard}>
								<View style={[styles.statIconChip, { backgroundColor: Colors.secondarySoft }]}>
									<IconComponent type="materialIcons" name="calculate" size={scaledSize(18)} color={Colors.secondaryDark} />
								</View>
								<Text style={styles.statValue}>
									{totalSolved} / {totalCountryCount}
								</Text>
								<Text style={styles.statLabel}>{`퀴즈 진척도 (${pctOf(totalSolved, totalCountryCount)}%)`}</Text>
								<View style={styles.progressBarBackground}>
									<View style={[styles.progressBarFill, { width: `${pctOf(totalSolved, totalCountryCount)}%` }]} />
								</View>
							</View>
							<View style={styles.summaryStatGrid}>
								<View style={styles.summaryStatCard}>
									<View style={[styles.statIconChip, { backgroundColor: Colors.accentOrangeSoft }]}>
										<IconComponent type="fontAwesome6" name="fire" size={scaledSize(16)} color={Colors.accentOrange} />
									</View>
									<Text style={styles.statValue}>{bestCombo} Combo</Text>
									<Text style={styles.statLabel}>최고 콤보</Text>
								</View>
								<View style={styles.summaryStatCard}>
									<View style={[styles.statIconChip, { backgroundColor: Colors.primarySoft }]}>
										<IconComponent type="materialIcons" name="check-circle" size={scaledSize(18)} color={Colors.primary} />
									</View>
									<Text style={styles.statValue}>{accuracy}%</Text>
									<Text style={styles.statLabel}>정답률</Text>
								</View>
								<View style={styles.summaryStatCard}>
									<View style={[styles.statIconChip, { backgroundColor: Colors.tealSoft }]}>
										<IconComponent type="materialIcons" name="calendar-today" size={scaledSize(16)} color={Colors.teal} />
									</View>
									<Text style={styles.statValue}>{lastAnsweredAt ? DateUtils.getLocalParamDateToString(lastAnsweredAt).slice(2).replace(/-/g, '.') : '없음'}</Text>
									<Text style={styles.statLabel}>마지막 퀴즈일</Text>
								</View>
							</View>

							<View style={styles.subSectionBox}>
								<View style={styles.subtitleRow}>
									<IconComponent type="fontAwesome6" name="medal" size={scaledSize(15)} color={Colors.warning} />
									<Text style={styles.sectionSubtitleInline}>정복한 레벨</Text>
									<View style={[styles.masteryCountPill, { backgroundColor: Colors.warningSoft }]}>
										<Text style={[styles.masteryCountText, { color: Colors.warningDark }]}>
											{levelMaster.length} / {DIFFICULTIES.length}
										</Text>
									</View>
								</View>
								<Text style={styles.levelHelperText}>레벨에 속한 한자어 퀴즈를 모두 풀면 그 레벨을 정복해요.</Text>
								<MasteryBar
									done={levelMaster.length}
									total={DIFFICULTIES.length}
									color={Colors.warning}
								/>
								{/*
								 * 급수 카드 두 칸 — 폭을 44% 로 잡고 좌우 margin 을 더하던 때는 기기마다 가운데 틈이 달라졌다.
								 * 이제 남는 폭을 flex 로 나누고 사이 간격은 gap 한 곳에서만 준다.
								 */}
								<View style={styles.levelGrid}>
									{DIFFICULTIES.map((item) => {
										const isEarned = levelMaster.includes(item.title);
										const levelStyle = getLevelStyle(item.subtitle);
										const progress = levelProgress[item.key] ?? { done: 0, total: 0 };
										const ink = isEarned ? onSurface(levelStyle.bg) : Colors.textSecondary;
										return (
											<View
												key={item.key}
												style={[styles.levelCard, isEarned && { backgroundColor: levelStyle.bg, borderColor: levelStyle.border }]}>
												<View style={[styles.levelIconChip, { backgroundColor: isEarned ? withAlpha(onSurface(levelStyle.bg), 0.16) : Colors.surfaceAlt }]}>
													<IconComponent
														name={item.icon}
														type="fontAwesome6"
														size={scaledSize(20)}
														color={isEarned ? onSurface(levelStyle.bg) : Colors.textMuted}
													/>
												</View>
												{/* 제목은 앱이 쓰는 급수 이름(초급~특급)이다 — 'Level 1' 은 다른 화면에 없는 표기라 여기만 영어였다 */}
												<Text style={[styles.levelText, { color: isEarned ? onSurface(levelStyle.bg) : Colors.text, fontWeight: FontWeight.bold }]} numberOfLines={1}>
													{item.subtitle}
												</Text>
												<Text style={[styles.levelSubText, isEarned && { color: onSurface(levelStyle.bg) }]} numberOfLines={2}>
													{item.desc}
												</Text>

												{/* 얼마나 풀었는지 — 정복 도장만으로는 남은 양을 알 수 없다 */}
												<Text style={[styles.masteryCountLine, { color: ink }]}>{`${progress.done} / ${progress.total}문제`}</Text>
												<MasteryBar done={progress.done} total={progress.total} color={isEarned ? ink : Colors.warning} compact />

												{isEarned && (
													<View style={styles.conquerChip}>
														<IconComponent type="materialCommunityIcons" name="flag-checkered" size={scaledSize(11)} color={Colors.primary} />
														<Text style={styles.conquerChipText}>정복</Text>
													</View>
												)}
											</View>
										);
									})}
								</View>
							</View>

							{/* ✅ 정복한 카테고리 출력 */}
							<View style={styles.subSectionBox}>
								<View style={styles.subtitleRow}>
									<IconComponent type="fontAwesome6" name="brain" size={scaledSize(15)} color={Colors.info} />
									<Text style={styles.sectionSubtitleInline}>정복한 카테고리</Text>
									<View style={[styles.masteryCountPill, { backgroundColor: Colors.tealSoft }]}>
										<Text style={[styles.masteryCountText, { color: Colors.tealDark }]}>
											{categoryMaster.length} / {allCategories.length}
										</Text>
									</View>
								</View>
								<Text style={styles.regionHelperText}>- 특정 분야의 한자어를 모두 풀었을때 획득할 수 있습니다.</Text>
								<MasteryBar done={categoryMaster.length} total={allCategories.length} color={Colors.teal} />
								{/*
								 * 분야 한 줄 — 정복하면 면 전체가 그 분야 색으로 찬다.
								 * 그림은 늘 같은 크기의 칸 안에 둔다 (칸이 없으면 아이콘 폭이 제각각이라 이름 시작점이 흔들렸다).
								 */}
								<View style={styles.categoryList}>
									{allCategories.map((category) => {
										const isEarned = categoryMaster.includes(category);
										const meta = CATEGORY_META[category] ?? {
											color: Colors.textMuted,
											icon: { type: 'FontAwesome6', name: 'question' },
										};
										const progress = categoryProgress[category] ?? { done: 0, total: 0 };
										const ink = isEarned ? onSurface(meta.color) : Colors.text;

										return (
											<View
												key={category}
												style={[styles.categoryRowCard, isEarned && { backgroundColor: meta.color, borderColor: meta.color }]}>
												{/* 정복 칸은 글씨 색을 그대로 흐리게 깔아 밝은 분야색·어두운 분야색 어디서나 칸이 보인다 */}
												<View style={[styles.categoryRowIcon, { backgroundColor: isEarned ? withAlpha(onSurface(meta.color), 0.16) : withAlpha(meta.color, 0.12) }]}>
													<IconComponent
														type={meta.icon.type}
														name={meta.icon.name}
														size={scaledSize(18)}
														color={isEarned ? onSurface(meta.color) : meta.color}
													/>
												</View>
												<View style={styles.categoryRowBody}>
													<View style={styles.categoryRowTitleLine}>
														<Text style={[styles.categoryRowText, { color: ink }, isEarned && { fontWeight: FontWeight.bold }]} numberOfLines={1}>
															{category}
														</Text>
														{isEarned ? (
															<View style={styles.conquerChip}>
																<IconComponent type="materialCommunityIcons" name="flag-checkered" size={scaledSize(11)} color={Colors.primary} />
																<Text style={styles.conquerChipText}>정복</Text>
															</View>
														) : (
															<Text style={[styles.masteryCountLine, { color: ink }]}>{`${progress.done} / ${progress.total}`}</Text>
														)}
													</View>
													<MasteryBar done={progress.done} total={progress.total} color={isEarned ? ink : Colors.teal} compact />
												</View>
											</View>
										);
									})}
								</View>
							</View>
						</View>
					)}

					{(activeTab === 'all' || activeTab === 'today') && (
						<View style={styles.sectionHeaderStatic}>
							<View style={styles.iconCircle4}>
								<IconComponent type="materialIcons" name="calendar-today" size={scaledSize(16)} color={Colors.textInverse} />
							</View>
							<Text style={styles.sectionTitle}>나의 오늘의 퀴즈</Text>
						</View>
					)}

					{(activeTab === 'all' || activeTab === 'today') && (
						<View style={[styles.sectionBox, {}]}>
							<Calendar
								markedDates={markedQuizDates}
								markingType="custom"
								style={[styles.calendarStyle, { width: '100%' }]}
								onDayPress={(day) => {
									const date = day.dateString;
									const matchedData = todayQuizDataList.find((item) => DateUtils.getLocalParamDateToString(item.quizDate) === date);
									setSelectedDate(date);
									setSelectedQuizData(matchedData ?? null);

									updateMarkedQuizDatesOnSelect(date, selectedDate, setMarkedQuizDates, todayQuizDataList);
								}}
								theme={{
									calendarBackground: Colors.surface,
									todayTextColor: Colors.primary,
									// 색을 안 주면 라이브러리 기본값(짙은 남색)이 그대로 나와 다크 모드에서 날짜가 보이지 않는다
									dayTextColor: Colors.text,
									monthTextColor: Colors.textStrong,
									textSectionTitleColor: Colors.textSecondary,
									textDisabledColor: Colors.textMuted,
									arrowColor: Colors.primary,
									textDayFontSize: Typography.body,
									textMonthFontSize: Typography.subtitle,
									textDayHeaderFontSize: Typography.bodySm,
								}}
							/>
							<View style={[styles.subtitleRow, { marginTop: SpacingV.sm }]}>
								<IconComponent type="materialIcons" name="fiber-manual-record" size={scaledSize(12)} color={Colors.primary} />
								<Text style={{ fontSize: Typography.footnote, color: Colors.textSecondary }}>표시는 오늘의 퀴즈를 모두 푼 날입니다.</Text>
							</View>

							{selectedDate === null && (
								<View style={[styles.subtitleRow, { marginTop: SpacingV.sm, marginBottom: 0 }]}>
									<IconComponent type="materialIcons" name="calendar-today" size={scaledSize(13)} color={Colors.textMuted} />
									<Text style={styles.emptyText}>날짜를 선택해 주세요.</Text>
								</View>
							)}

							{selectedDate && selectedQuizData === null && (
								<View
									style={{
										borderWidth: 1,
										borderColor: Colors.border,
										backgroundColor: Colors.background,
										borderRadius: Radius.md,
										padding: Spacing.lg,
										marginTop: SpacingV.md,
										alignSelf: 'stretch',
									}}>
									<Text style={{ fontSize: Typography.bodySm, color: Colors.textMuted, textAlign: 'left' }}>
										선택한 날짜에는 오늘의 퀴즈를 풀지 않았습니다
									</Text>
								</View>
							)}

							{selectedDate && selectedQuizData && (
								<View style={[styles.sectionBox, {
									marginTop: SpacingV.sm,
									paddingHorizontal: Spacing.sm,
									backgroundColor: 'transparent',
									borderWidth: 0,
								}]}>
									<Text style={styles.sectionSubtitle}>{selectedDate} 퀴즈 결과</Text>
									{selectedQuizData?.todayQuizIdArr.map((quizId, idx) => {
										const userAnswer = selectedQuizData.selectedAnswers?.[quizId];
										const isCorrect = selectedQuizData.answerResults?.[quizId];
										const quizItem = ProverbServices.selectProverbById(quizId); // 예시 함수

										return (
											<TouchableOpacity
												key={idx}
												activeOpacity={0.85}
												disabled={!quizItem}
												onPress={() => {
													if (quizItem) {
														setDetailQuiz(quizItem);
														setDetailModalVisible(true);
													}
												}}
												style={{
													width: '100%', // 👈 추가
													backgroundColor: Colors.surface,
													borderRadius: Radius.md,
													paddingVertical: SpacingV.md,
													paddingLeft: Spacing.md,
													paddingRight: Spacing.sm,
													marginBottom: SpacingV.md,
													flexDirection: 'row',
													alignItems: 'center',
													alignSelf: 'stretch', // ✅ 전체 너비 확보
												}}>
												<View style={{ flex: 1, paddingRight: Spacing.sm }}>
													<Text
														style={{
															...getHanjaTextStyle(),
															fontSize: Typography.body,
															fontWeight: FontWeight.bold,
															marginBottom: SpacingV.sm,
															color: Colors.text,
														}}>
														{idx + 1}. {quizItem?.hangul ?? '문제 정보 없음'}
														{quizItem?.hanja ? ` (${quizItem.hanja})` : ''}
													</Text>

													{/* ✅ 정답/오답 배지 */}
													{isCorrect !== undefined && (
														<View
															style={{
																alignSelf: 'flex-start',
																flexDirection: 'row',
																alignItems: 'center',
																gap: Spacing.xs,
																backgroundColor: isCorrect ? Colors.primarySoft : Colors.errorSoft,
																borderRadius: Radius.sm,
																paddingHorizontal: Spacing.sm,
																paddingVertical: SpacingV.xs,
																marginBottom: SpacingV.sm,
															}}>
															<IconComponent
																type="materialIcons"
																name={isCorrect ? 'check-circle' : 'cancel'}
																size={scaledSize(13)}
																color={isCorrect ? Colors.primaryDark : Colors.errorDark}
															/>
															<Text style={{ fontSize: Typography.footnote, fontWeight: FontWeight.heavy, color: isCorrect ? Colors.primaryDark : Colors.errorDark }}>
																{isCorrect ? '정답' : '오답'}
															</Text>
														</View>
													)}
													{!!quizItem?.meaning && (
														<Text style={{ fontSize: Typography.bodySm, color: Colors.textSecondary, lineHeight: scaledSize(18) }} numberOfLines={2}>
															{quizItem.meaning}
														</Text>
													)}
												</View>
												<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
											</TouchableOpacity>
										);
									})}
								</View>
							)}

							{/* {selectedDate && (
							<TouchableOpacity
								onPress={handleClearSelectedDate}
								style={{
									alignSelf: 'center',
									marginTop: SpacingV.sm,
									paddingHorizontal: Spacing.md,
									paddingVertical: SpacingV.xs,
									backgroundColor: Colors.border,
									borderRadius: Radius.sm,
								}}>
								<Text style={{ fontSize: Typography.footnote, color: Colors.text }}>선택 해제</Text>
							</TouchableOpacity>
						)} */}
						</View>
					)}

					{/* 기존 결과 화면 */}
					{(activeTab === 'all' || activeTab === 'time') && (
						<View style={styles.sectionHeaderStatic}>
							<View style={styles.iconCircle3}>
								<IconComponent type="materialIcons" name="timer" size={scaledSize(16)} color={Colors.textInverse} />
							</View>
							<Text style={styles.sectionTitle}>나의 타임 챌린지 결과</Text>
						</View>
					)}

					{(activeTab === 'all' || activeTab === 'time') && (
						<View style={styles.sectionBox}>
							<View style={styles.subtitleRow}>
								<IconComponent type="materialIcons" name="leaderboard" size={scaledSize(16)} color={Colors.accentOrange} />
								<Text style={styles.topRankingTitleInline}>나의 랭킹 TOP 3</Text>
							</View>

							{timeChallengeResults.length === 0 ? (
								<Text style={styles.noRecordText}>아직 기록이 없습니다. 챌린지를 시작해보세요!</Text>
							) : (
								[...timeChallengeResults]
									.sort((a, b) => b.finalScore - a.finalScore)
									.slice(0, 3)
									.map((item, index) => (
										<View key={index} style={styles.recordCard}>
											<View style={styles.rankRow}>
												{index === 0 && (
													<>
														<IconComponent
															name="trophy"
															type="FontAwesome"
															size={scaledSize(24)}
															color={Colors.warningBright}
															style={{ marginRight: Spacing.sm }}
														/>
														<Text style={styles.firstRankLabel}>1등</Text>
														<Text style={styles.firstRankScore}>
															{item.finalScore}점<Text style={styles.rankDate}> ({getRelativeDateLabel(item.quizDate)})</Text>
														</Text>
													</>
												)}
												{index === 1 && (
													<>
														<IconComponent
															name="trophy"
															type="FontAwesome"
															size={scaledSize(20)}
															color={Colors.textMuted}
															style={{ marginRight: Spacing.md }}
														/>
														<Text style={styles.secondRankLabel}>2등</Text>
														<Text style={styles.secondRankScore}>
															{item.finalScore}점<Text style={styles.rankDate}> ({getRelativeDateLabel(item.quizDate)})</Text>
														</Text>
													</>
												)}
												{index === 2 && (
													<>
														<IconComponent
															name="trophy"
															type="FontAwesome"
															size={scaledSize(18)}
															color={Colors.accentOrangeLight}
															style={{ marginRight: Spacing.lg }}
														/>
														<Text style={styles.thirdRankLabel}>3등</Text>
														<Text style={styles.thirdRankScore}>
															{item.finalScore}점<Text style={styles.rankDate}> ({getRelativeDateLabel(item.quizDate)})</Text>
														</Text>
													</>
												)}
											</View>
										</View>
									))
							)}
						</View>
					)}

					{/* 1. 나의 뱃지 (전체 / 획득 / 미획득 필터) */}
					{(activeTab === 'all' || activeTab === 'badge') && (
						<>
							<View style={styles.sectionHeaderStatic}>
								<View style={styles.iconCircle5}>
									<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(16)} color={Colors.textInverse} />
								</View>
								<Text style={styles.sectionTitle}>나의 뱃지</Text>
								<Text style={styles.badgeHeadCount}>
									<Text style={styles.badgeHeadCountNow}>{lifeBadgeEarned.size}</Text>
									{` / ${LIFE_BADGES.length}`}
								</Text>
							</View>

							{/*
							 * 딴 뱃지 진열장 — 목록을 훑기 전에 "지금 뭘 갖고 있는지" 를 한 줄로 먼저 보여 준다.
							 * 나의 활동 탭과 같은 구성이라 두 화면이 같은 언어로 읽힌다.
							 */}
							<View style={styles.badgeShelfCard}>
								<View style={styles.badgeShelfTrack}>
									<View style={[styles.badgeShelfFill, { width: `${LIFE_BADGES.length ? Math.round((lifeBadgeEarned.size / LIFE_BADGES.length) * 100) : 0}%` }]} />
								</View>
								{lifeBadgeEarned.size === 0 ? (
									<Text style={styles.badgeShelfEmpty}>아직 딴 뱃지가 없어요. 아래 목표부터 하나씩 채워 봐요!</Text>
								) : (
									<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeShelfRow}>
										{LIFE_BADGES.filter((badge) => lifeBadgeEarned.has(badge.id)).map((badge) => (
											<TouchableOpacity
												key={badge.id}
												activeOpacity={0.8}
												style={styles.badgeShelfItem}
												onPress={() => setLifeBadgeDetail({ badge, at: lifeBadgeEarned.get(badge.id) })}
												accessibilityRole="button"
												accessibilityLabel={`${badge.label} 뱃지 자세히 보기`}>
												<BadgeMedal badge={badge} size={scaleWidth(46)} showStars />
												<Text style={styles.badgeShelfLabel} numberOfLines={1}>
													{badge.label}
												</Text>
											</TouchableOpacity>
										))}
									</ScrollView>
								)}
							</View>

							<View style={styles.badgeFilterRow}>
								{([
									{ key: 'all', label: `전체 ${LIFE_BADGES.length}` },
									{ key: 'earned', label: `획득 ${lifeBadgeEarned.size}` },
									{ key: 'locked', label: `미획득 ${LIFE_BADGES.length - lifeBadgeEarned.size}` },
								] as const).map((ff) => {
									const active = badgeFilter === ff.key;
									return (
										<TouchableOpacity
											key={ff.key}
											activeOpacity={0.8}
											onPress={() => setBadgeFilter(ff.key)}
											style={[styles.badgeFilterChip, active && styles.badgeFilterChipActive]}>
											<Text style={[styles.badgeFilterText, active && styles.badgeFilterTextActive]}>{ff.label}</Text>
										</TouchableOpacity>
									);
								})}
							</View>

							<View style={[styles.sectionBox, { minHeight: scaleHeight(360) }]}>
								{(() => {
									const list = LIFE_BADGES.filter((badge) => {
										const earned = lifeBadgeEarned.has(badge.id);
										if (badgeFilter === 'earned') { return earned; }
										if (badgeFilter === 'locked') { return !earned; }
										return true;
									});
									if (list.length === 0) {
										return <Text style={styles.emptyText}> - 표시할 뱃지가 없습니다.</Text>;
									}
									return list.map((badge) => {
										const earned = lifeBadgeEarned.has(badge.id);
										const progress = badgeProgressMap.get(badge.id);
										return (
											<TouchableOpacity
												key={badge.id}
												activeOpacity={0.7}
												style={[styles.badgeCard, earned && styles.badgeCardActive]}
												onPress={() => setLifeBadgeDetail({ badge, at: lifeBadgeEarned.get(badge.id) })}>
												{/* 메달은 홈·나의 활동과 같은 그림(BadgeMedal) — 세 화면의 뱃지가 같은 모양으로 읽힌다 */}
												<BadgeMedal badge={badge} size={scaleWidth(44)} earned={earned} />
												<View style={styles.textBox}>
													<View style={styles.badgeTitleRow}>
														<Text style={[styles.badgeTitle, earned && styles.badgeTitleActive]} numberOfLines={1}>{badge.label}</Text>
														<BadgeRarityChip rarity={badge.rarity} muted={!earned} />
													</View>
													<Text style={[styles.badgeDesc, earned && styles.badgeDescActive]} numberOfLines={1}>{badge.description}</Text>
													<View style={styles.badgeCondRow}>
														<IconComponent type="materialIcons" name="flag" size={scaledSize(10)} color={Colors.textMuted} />
														<Text style={styles.badgeCondText} numberOfLines={1}>
															{/* 못 딴 뱃지는 조건 대신 "얼마나 왔는지" 를 보여 준다 */}
															{!earned && progress?.countable && progress.goal > 0 ? `${badge.requirement} · ${progress.done} / ${progress.goal}` : badge.requirement}
														</Text>
													</View>
													{/* 셀 수 있는 목표만 막대를 둔다 — '만점 한 번' 같은 조건은 0%/100% 뿐이라 막대가 뜻이 없다 */}
													{!earned && !!progress?.countable && progress.goal > 0 && (
														<View style={styles.badgeProgressTrack}>
															<View style={[styles.badgeProgressFill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
														</View>
													)}
												</View>
												<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={earned ? Colors.primary : Colors.textMuted} style={{ alignSelf: 'center' }} />
											</TouchableOpacity>
										);
									});
								})()}
							</View>
						</>
					)}

					{/* 나의 타워 챌린지 내역 */}
					{(activeTab === 'all' || activeTab === 'tower') && (
						<View style={styles.sectionHeaderStatic}>
							<View style={[styles.iconCircle3, { backgroundColor: Colors.info }]}>
								<IconComponent type="fontAwesome6" name="tower-observation" size={scaledSize(14)} color={Colors.textInverse} />
							</View>
							<Text style={styles.sectionTitle}>나의 타워 챌린지</Text>
						</View>
					)}

					{(activeTab === 'all' || activeTab === 'tower') && (
						<View style={styles.sectionBox}>
							<View style={styles.subtitleRow}>
								<IconComponent type="fontAwesome6" name="tower-observation" size={scaledSize(14)} color={Colors.info} />
								<Text style={styles.topRankingTitleInline}>
									클리어한 타워 ({unlockedRewards.length} / {TOWER_LEVELS.length})
								</Text>
							</View>
							{/*
							 * 타워 한 줄 — 예전에는 못 깬 층 전체에 opacity 0.4 를 걸어 글씨까지 흐려져 읽히지 않았다.
							 * 이제 잠긴 층은 "면을 한 톤 낮추고 그림만 흐리게" 둔다. 글씨는 또렷하게 남아 무엇을 노릴지 보인다.
							 */}
							<View style={styles.towerList}>
								{TOWER_LEVELS.map((tower) => {
									const isCleared = unlockedRewards.includes(tower.level);
									const rewardLabel = tower.reward.type === 'costume' ? '코스튬' : tower.reward.type === 'item' ? '특별 아이템' : '캐릭터';
									return (
										<View
											key={tower.level}
											style={[styles.towerRow, isCleared ? { borderColor: withAlpha(tower.color, 0.55) } : styles.towerRowLocked]}>
											{/* 왼쪽: 보스 그림 + 층 배지 */}
											<View style={[styles.towerBossPane, { backgroundColor: isCleared ? withAlpha(tower.color, 0.12) : Colors.surfaceAlt }]}>
												<FastImage
													source={tower.bossImage}
													style={[styles.towerBossImage, !isCleared && styles.towerBossImageLocked]}
													resizeMode="contain"
												/>
												<View style={[styles.towerLevelBadge, { backgroundColor: isCleared ? tower.color : Colors.borderStrong }]}>
													<Text style={styles.towerLevelText}>{`LV.${tower.level}`}</Text>
												</View>
											</View>

											{/* 오른쪽: 보스 정보 + 보상 */}
											<View style={styles.towerBody}>
												<View style={styles.towerTitleLine}>
													<View style={styles.towerNameBox}>
														<Text style={styles.towerBossTitle} numberOfLines={1}>
															{tower.bossTitle}
														</Text>
														<Text style={styles.towerBossName} numberOfLines={1}>
															{tower.bossName}
														</Text>
													</View>
													{/* 깼는지 — 이모지 대신 아이콘으로 두어 기기마다 모양이 달라지지 않는다 */}
													<View style={[styles.towerStateChip, { backgroundColor: isCleared ? tower.color : Colors.surfaceAlt }]}>
														<IconComponent
															type="materialCommunityIcons"
															name={isCleared ? 'flag-checkered' : 'lock-outline'}
															size={scaledSize(11)}
															color={isCleared ? Colors.textInverse : Colors.textMuted}
														/>
														<Text style={[styles.towerStateText, !isCleared && styles.towerStateTextLocked]}>{isCleared ? '클리어' : '잠김'}</Text>
													</View>
												</View>

												<View style={styles.towerDivider} />

												<View style={styles.towerRewardRow}>
													<FastImage source={tower.reward.image} style={[styles.towerRewardImage, !isCleared && styles.towerBossImageLocked]} resizeMode="contain" />
													<View style={styles.towerRewardBody}>
														<View style={styles.towerRewardTypeLine}>
															<IconComponent
																type="materialIcons"
																name={tower.reward.type === 'costume' ? 'checkroom' : tower.reward.type === 'item' ? 'stars' : 'auto-awesome'}
																size={scaledSize(11)}
																color={Colors.textMuted}
															/>
															<Text style={styles.towerRewardType}>{rewardLabel}</Text>
														</View>
														<Text style={styles.towerRewardName} numberOfLines={1}>
															{tower.reward.name}
														</Text>
													</View>
												</View>
											</View>
										</View>
									);
								})}
							</View>
						</View>
					)}
				</View>
			</ScrollView>

			{/* 🏅 뱃지 상세 — 홈·나의 활동과 같은 팝업을 쓴다 */}
			<LifeBadgeDetailModal detail={lifeBadgeDetail} onClose={() => setLifeBadgeDetail(null)} />
			<ProverbDetailModal
				visible={detailModalVisible}
				proverb={detailQuiz}
				onClose={() => setDetailModalVisible(false)}
			/>

			<CharacterGuide
				visible={guide.visible}
				onClose={guide.close}
				title="통계, 이렇게 봐요"
				lines={[
					'지금까지의 학습·퀴즈 기록을 한 화면에 모아 둔 곳입니다.',
					'위쪽 탭을 누르면 학습, 퀴즈, 뱃지처럼 보고 싶은 활동만 골라 볼 수 있습니다.',
					'레벨과 분야마다 막대가 얼마나 찼는지로 남은 양을 알 수 있습니다.',
					'맨 위 캐릭터를 누르면 등급 안내로 넘어갑니다.',
				]}
			/>

			{/* 최하단에 위치할것!! */}
			<ScrollTopButton visible={showScrollTop} onPress={scrollHandler.toTop} />
		</SafeAreaView >
	);
};

export default QuizResultScreen;

const makeStyles = () => StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: Colors.background },
	container: {
		// 화면 여백 + 카드 자체 padding 이 두 번 겹쳐 내용이 좁아 보였다.
		// 화면 여백은 여기서 최소로 두고, 안쪽 여백은 각 카드가 책임진다.
		paddingHorizontal: Spacing.sm,
	},
	scrollContent: {
		// 탭 바에 마지막 카드가 물리지 않게 아래를 넉넉히 비운다
		paddingBottom: SpacingV.xxxxl,
		flexGrow: 1,
		// 태블릿: 본문을 가운데 한 기둥으로 묶는다 (다른 이식 화면과 같은 폭)
		width: '100%',
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
	},
	pageTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.xl,
		color: Colors.text,
	},
	badgeFilterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: SpacingV.md },
	badgeFilterChip: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: SpacingV.sm,
		borderRadius: Radius.pill,
		backgroundColor: Colors.surfaceAlt,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	badgeFilterChipActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
	badgeFilterText: { fontSize: Typography.bodySm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
	badgeFilterTextActive: { color: Colors.primaryDark },

	badgeCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		// 메달과 글 사이 — 예전 아이콘 상자가 들고 있던 오른쪽 여백을 줄 자체로 옮겼다
		gap: Spacing.md,
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		padding: Spacing.md,
		marginBottom: SpacingV.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	badgeCardActive: {
		borderColor: Colors.primary,
		backgroundColor: Colors.primaryBg,
	},
	iconBoxActive: {
		backgroundColor: Colors.primarySoft,
	},
	badgeTitle: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.semibold,
		color: Colors.text,
		flexShrink: 1,
	},
	badgeTitleActive: {
		color: Colors.primary,
	},
	badgeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	badgeRarityTag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xxs,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.xxs,
	},
	badgeRarityTagText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy },
	badgeCondRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.xs },
	badgeCondText: { fontSize: Typography.caption, color: Colors.textMuted, flex: 1 },
	badgeDesc: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		marginTop: SpacingV.xxs,
		lineHeight: scaledSize(18),
	},
	badgeDescActive: {
		color: Colors.primary,
	},
	/**
	 * 히어로 판 — 캐릭터·등급·경험치 한 장.
	 * 좌우 여백은 판이 직접 갖고, 안쪽 요소는 가운데로 모은다.
	 */
	heroPanel: {
		alignItems: 'center',
		gap: SpacingV.md,
		paddingTop: SpacingV.lg,
		paddingBottom: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		marginBottom: SpacingV.lg,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.12)',
		overflow: 'hidden',
	},
	heroSheen: { position: 'absolute', left: 0, right: 0, top: 0, height: '45%' },
	// 캐릭터 뒤 빛무리 — 진한 판 위에서 그림 가장자리가 묻히지 않게
	heroHalo: {
		position: 'absolute',
		width: scaleWidth(132),
		height: scaleWidth(132),
		borderRadius: scaleWidth(66),
		backgroundColor: 'rgba(255, 255, 255, 0.10)',
	},
	// 발밑을 맞춘다 — 글방 배경(108)이 캐릭터(120)보다 낮아 가운데 정렬이면 바닥 띠가 발보다 위로 온다
	mascotWrap: { position: 'relative', alignItems: 'center', justifyContent: 'flex-end' },
	// 홈(petContent)과 동일한 배치 — 캐릭터 오른쪽에 살짝 걸치게
	petBadge: {
		position: 'absolute',
		right: scaleWidth(-28),
		top: scaleHeight(64),
		width: scaleWidth(60),
		height: scaleWidth(60),
		borderRadius: scaleWidth(30),
		borderWidth: 2,
		borderColor: 'rgba(255, 255, 255, 0.55)',
		backgroundColor: Colors.surfaceAlt,
		overflow: 'hidden',
	},
	/** 청룡이 올라선 좌대 — 꾸미기를 안 샀으면 PetPerch 가 아무것도 그리지 않는다 */
	petPerchSlot: { position: 'absolute', left: 0, right: 0, bottom: scaleHeight(2), alignItems: 'center', zIndex: 0 },
	heroGradeChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		paddingLeft: Spacing.lg,
		paddingRight: Spacing.sm,
		height: scaleHeight(36),
		borderRadius: Radius.pill,
		backgroundColor: 'rgba(255, 255, 255, 0.16)',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.22)',
	},
	heroGradeText: { fontSize: Typography.subtitle, fontWeight: FontWeight.heavy, color: HERO_TEXT },
	heroExpBox: {
		width: '100%',
		gap: SpacingV.xs,
		padding: Spacing.md,
		borderRadius: Radius.lg,
		backgroundColor: 'rgba(0, 0, 0, 0.18)',
	},
	heroExpHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	heroExpLabel: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: HERO_MUTED },
	heroExpValue: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: HERO_GOLD, fontVariant: ['tabular-nums'] },
	heroExpTrack: {
		height: scaleHeight(8),
		borderRadius: Radius.pill,
		backgroundColor: 'rgba(255, 255, 255, 0.18)',
		overflow: 'hidden',
	},
	heroExpFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: HERO_GOLD },
	heroExpHint: { fontSize: Typography.caption, color: HERO_MUTED },
	heroNotes: { width: '100%', gap: SpacingV.sm },
	heroNoteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	heroNoteText: { flex: 1, fontSize: Typography.caption, lineHeight: scaledSize(18), color: HERO_MUTED },
	heroNoteStrong: { fontWeight: FontWeight.heavy, color: HERO_TEXT },

	/**
	 * 묶음 상자 — 통계 화면의 모든 상자가 같은 면·같은 여백을 쓴다.
	 * 좌우 8 / 위아래 16 처럼 따로 놀던 때는 상자마다 안쪽 글이 다른 선에서 시작해 줄이 어긋나 보였다.
	 */
	sectionBox: {
		backgroundColor: Colors.surface,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.md,
		marginBottom: SpacingV.xxl,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	/** 뱃지 머리줄 오른쪽 숫자 — 몇 개 중 몇 개인지 */
	badgeHeadCount: { marginLeft: 'auto', fontSize: Typography.footnote, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
	badgeHeadCountNow: { fontSize: Typography.subtitle, fontWeight: FontWeight.heavy, color: Colors.primary },
	/** 딴 뱃지 진열장 — 진행 막대 한 줄 + 메달 가로 스크롤 */
	badgeShelfCard: {
		gap: SpacingV.md,
		padding: Spacing.lg,
		marginBottom: SpacingV.md,
		borderRadius: Radius.xl,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
	},
	badgeShelfTrack: { height: scaleHeight(8), borderRadius: Radius.pill, backgroundColor: Colors.border, overflow: 'hidden' },
	badgeShelfFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.primary },
	badgeShelfRow: { gap: Spacing.md, paddingRight: Spacing.xs },
	badgeShelfItem: { width: scaleWidth(62), alignItems: 'center', gap: scaleHeight(4) },
	badgeShelfLabel: { fontSize: Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
	badgeShelfEmpty: { fontSize: Typography.footnote, color: Colors.textMuted },
	/** 못 딴 뱃지의 진행 막대 — 얼마나 왔는지를 글자 대신 길이로도 읽힌다 */
	badgeProgressTrack: { height: scaleHeight(4), marginTop: SpacingV.xs, borderRadius: Radius.pill, backgroundColor: Colors.border, overflow: 'hidden' },
	badgeProgressFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.primary },

	scoreDashCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		padding: Spacing.lg,
		marginBottom: SpacingV.lg,
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
		overflow: 'hidden',
	},
	/** 카드 위쪽에 깔리는 옅은 광택 — 높이의 절반만 덮어 아래로 사라진다 */
	scoreDashSheen: { position: 'absolute', left: 0, right: 0, top: 0, height: scaleHeight(96) },
	scoreDashHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: SpacingV.lg,
	},
	scoreDashTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	scoreDashIconChip: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: Radius.sm,
		backgroundColor: Colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	scoreDashTitle: { fontSize: Typography.subtitle, fontWeight: FontWeight.heavy, color: Colors.textStrong },
	scoreDashScorePill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		backgroundColor: Colors.warningTint,
		borderRadius: Radius.xl,
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
	},
	scoreDashScoreText: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy, color: Colors.warningDark },
	scoreDashGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SpacingV.md },
	scoreDashTile: {
		width: '48%',
		backgroundColor: Colors.background,
		borderRadius: Radius.lg,
		padding: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.surfaceMuted,
	},
	scoreDashTileTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.sm },
	scoreDashTileIcon: {
		width: scaleWidth(26),
		height: scaleWidth(26),
		borderRadius: Radius.sm,
		alignItems: 'center',
		justifyContent: 'center',
	},
	scoreDashTileLabel: { fontSize: Typography.footnote, fontWeight: FontWeight.semibold, color: Colors.textSecondary, flexShrink: 1 },
	scoreDashTileValue: { fontSize: Typography.title, fontWeight: FontWeight.heavy, color: Colors.textStrong, marginBottom: SpacingV.sm },
	scoreDashBarTrack: {
		height: scaleHeight(6),
		borderRadius: Radius.xs,
		backgroundColor: Colors.border,
		overflow: 'hidden',
	},
	scoreDashBarFill: { height: '100%', borderRadius: Radius.xs },
	// 정복 진행도 막대
	masteryBarRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginBottom: SpacingV.lg,
	},
	masteryBarTrack: { flex: 1, height: scaleHeight(8), borderRadius: Radius.xs },
	// 카드 안에 들어가는 작은 판 — 바깥 여백을 걷고 폭을 부모에 맞춘다
	masteryBarRowCompact: { alignSelf: 'stretch', marginBottom: 0, gap: Spacing.xs },
	masteryBarTrackCompact: { height: scaleHeight(6) },
	masteryPctTextCompact: { fontSize: Typography.caption, minWidth: scaleWidth(30) },
	masteryPctText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, minWidth: scaleWidth(34), textAlign: 'right' },
	masteryCountPill: {
		marginLeft: 'auto',
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.xxs,
		borderRadius: Radius.pill,
	},
	masteryCountText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy },
	// 캐릭터 영역 오른쪽 위 도움말 버튼
	masteryCountLine: { fontSize: Typography.footnote, fontWeight: FontWeight.semibold, fontVariant: ['tabular-nums'] },
	/**
	 * 타워 내역 한 줄 — 그림 칸 + 본문 칸.
	 * 줄 사이는 gap 으로만 띄운다 (줄마다 marginBottom 을 주면 마지막 줄 밑에만 빈 칸이 남는다).
	 */
	towerList: { gap: SpacingV.md },
	towerRow: {
		flexDirection: 'row',
		borderRadius: Radius.lg,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surface,
	},
	// 잠긴 층 — 면만 한 톤 낮춘다. 글씨는 그대로 둬야 무엇을 노릴지 읽힌다
	towerRowLocked: { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border },
	towerBossPane: { width: scaleWidth(84), alignItems: 'center', justifyContent: 'center', gap: SpacingV.xs, paddingVertical: SpacingV.md },
	towerBossImage: { width: scaleWidth(54), height: scaleWidth(54), borderRadius: Radius.sm },
	// 못 깬 층은 그림만 흐리게 — "아직 못 만난 보스" 가 그림으로 읽힌다
	towerBossImageLocked: { opacity: 0.35 },
	towerLevelBadge: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	towerLevelText: { color: Colors.textInverse, fontSize: Typography.caption, fontWeight: FontWeight.bold, fontVariant: ['tabular-nums'] },
	towerBody: { flex: 1, padding: Spacing.md, gap: SpacingV.sm, justifyContent: 'center' },
	towerTitleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	towerNameBox: { flex: 1, gap: SpacingV.xxs },
	towerBossTitle: { fontSize: Typography.caption, color: Colors.textMuted },
	towerBossName: { fontSize: Typography.body, fontWeight: FontWeight.bold, color: Colors.text },
	towerDivider: { height: 1, backgroundColor: Colors.border },
	towerRewardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	towerRewardImage: {
		width: scaleWidth(36),
		height: scaleWidth(36),
		borderRadius: Radius.sm,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.surfaceAlt,
	},
	towerRewardBody: { flex: 1, gap: SpacingV.xxs },
	towerRewardTypeLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	towerRewardType: { fontSize: Typography.caption, color: Colors.textMuted },
	towerRewardName: { fontSize: Typography.footnote, fontWeight: FontWeight.bold, color: Colors.text },
	towerStateChip: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(3), paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill },
	towerStateText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textInverse },
	towerStateTextLocked: { color: Colors.textMuted },

	categoryRowBody: { flex: 1, gap: SpacingV.xxs },
	categoryRowTitleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
	conquerChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: scaleWidth(3),
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.xxs,
		borderRadius: Radius.pill,
		backgroundColor: Colors.surface,
	},
	conquerChipText: { fontSize: Typography.footnote, fontWeight: FontWeight.bold, color: Colors.primary },
	scoreDashTilePct: { fontSize: Typography.caption, fontWeight: FontWeight.bold, marginTop: SpacingV.xs, textAlign: 'right' },
	// 정복한 레벨·정복한 카테고리가 같은 상자를 쓴다 (값이 똑같은 표 두 개를 따로 두면 한쪽만 고쳐진다)
	subSectionBox: {
		backgroundColor: Colors.surface,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.md,
		marginBottom: SpacingV.xxl,
		borderWidth: 1,
		borderColor: Colors.border,
	},

	statItem: {
		fontSize: Typography.body,
		color: Colors.text,
		marginBottom: SpacingV.sm,
	},
	subTitle: {
		fontSize: Typography.callout,
		fontWeight: FontWeight.semibold,
		color: Colors.text,
		marginBottom: SpacingV.sm,
	},
	tagItem: {
		fontSize: Typography.body,
		color: Colors.primary,
		marginBottom: SpacingV.xs,
	},
	emptyText: {
		fontSize: Typography.bodySm,
		color: Colors.textMuted,
	},
	textBox: { flex: 1 },
	levelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SpacingV.sm,
	},
	levelTitle: {
		fontSize: Typography.subtitle,
		marginLeft: Spacing.sm,
		color: Colors.primary,
		fontWeight: FontWeight.bold,
	},
	quizSummaryBox: {
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		padding: Spacing.md,
		marginTop: SpacingV.sm,
		marginBottom: SpacingV.lg,
	},
	levelIconWrap: {
		width: scaleWidth(36),
		height: scaleWidth(36),
		borderRadius: Radius.xl,
		borderWidth: 2,
		borderColor: Colors.primary,
		backgroundColor: Colors.secondaryBg,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: Spacing.sm,
	},
	levelModal: {
		backgroundColor: Colors.surface,
		paddingHorizontal: Spacing.xl,
		paddingTop: SpacingV.xl,
		paddingBottom: SpacingV.md,
		borderRadius: Radius.lg,
		width: '85%',
		maxWidth: MODAL_MAX_WIDTH,
		alignItems: 'center',
	},
	levelModalTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.md,
		color: Colors.text,
	},
	levelRowItem: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		paddingVertical: SpacingV.sm,
		borderBottomWidth: 1,
		borderColor: Colors.surfaceAlt,
	},
	levelRowItemActive: {
		backgroundColor: Colors.secondaryBg,
		borderColor: Colors.primary,
	},
	levelCardBox: {
		backgroundColor: Colors.background,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		alignItems: 'center',
		marginBottom: SpacingV.lg,
		width: '100%',
		borderWidth: 1,
		borderColor: Colors.border,
	},
	levelCardBoxActive: {
		backgroundColor: Colors.secondaryBg,
		borderColor: Colors.primary,
		borderWidth: 2,
	},
	levelBadge: {
		backgroundColor: Colors.secondaryDark,
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.md,
		marginBottom: SpacingV.sm,
	},
	levelBadgeText: {
		color: Colors.textInverse,
		fontSize: Typography.footnote,
		fontWeight: FontWeight.bold,
	},
	levelMascot: {
		width: scaleWidth(80),
		height: scaleWidth(80),
		marginBottom: SpacingV.md,
	},
	levelLabel: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.xxs,
	},
	levelScore: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
	},
	levelEncourage: {
		fontSize: Typography.footnote,
		color: Colors.primary,
		marginTop: SpacingV.sm,
		textAlign: 'center',
		lineHeight: scaledSize(20),
	},
	levelIconWrapSmall: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: Radius.lg,
		backgroundColor: Colors.secondarySoft,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: Spacing.md,
	},
	levelModalText: {
		flex: 1,
		fontSize: Typography.body,
		color: Colors.text,
	},
	levelModalScore: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
	},
	levelNowText: {
		marginLeft: Spacing.sm,
		fontSize: Typography.body,
		color: Colors.primary,
		fontWeight: FontWeight.bold,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalConfirmButton: {
		marginTop: SpacingV.lg,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxl,
		backgroundColor: Colors.secondaryDark,
		borderRadius: Radius.sm,
	},
	modalConfirmText: {
		color: Colors.textInverse,
		fontWeight: FontWeight.semibold,
		fontSize: Typography.body,
	},
	levelCenteredRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: SpacingV.md,
	},
	levelDescription: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: scaledSize(18),
		marginBottom: SpacingV.xs,
	},
	levelScoreText: {
		fontSize: Typography.callout,
		color: Colors.textSecondary,
		textAlign: 'center',
		marginTop: SpacingV.xs,
	},
	levelScoreHighlight: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.primary,
		marginTop: SpacingV.xs,
	},
	/**
	 * 섹션 한 묶음.
	 * 회색 면(surfaceAlt) 위에 흰 카드를 얹던 구조라 면이 세 겹으로 쌓여 탁했다.
	 * 묶음은 흰 카드 한 장으로 두고, 안쪽 칸은 옅은 회색 면으로만 나눈다.
	 */
	activityCardBox: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.md,
		marginBottom: SpacingV.xl,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	activityRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: SpacingV.md,
	},
	activityLabel: {
		fontSize: Typography.body,
		color: Colors.text,
	},
	activityValue: {
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	summaryCard: {
		backgroundColor: Colors.warningBg,
		padding: Spacing.lg,
		borderRadius: Radius.md,
		marginBottom: SpacingV.lg,
		borderWidth: 1,
		borderColor: Colors.warningBright,
	},
	summaryTitle: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.warning,
		marginBottom: SpacingV.sm,
	},
	progressRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	progressText: {
		fontSize: Typography.body,
		color: Colors.text,
		marginRight: Spacing.md,
	},
	progressBarBackground: {
		width: '80%',
		height: scaleHeight(6),
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.xs,
		marginTop: SpacingV.sm,
		alignSelf: 'center',
	},
	progressBarFill: {
		height: scaleHeight(6),
		backgroundColor: Colors.secondaryDark,
		borderRadius: Radius.xs,
	},
	gridRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		marginTop: SpacingV.sm,
	},
	regionCard: {
		width: '28%',
		height: scaleHeight(100),
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.sm,
		backgroundColor: Colors.surface,
		marginBottom: SpacingV.md,
		marginHorizontal: Spacing.xs,
	},
	// 두 칸 격자 — 카드 폭은 flex 가 나누고 사이는 gap 이 벌린다
	levelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
	levelCard: {
		flexBasis: '47%',
		flexGrow: 1,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.lg,
		alignItems: 'center',
		justifyContent: 'flex-start',
		gap: SpacingV.xs,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.md,
		backgroundColor: Colors.surface,
	},
	levelIconChip: { width: scaleWidth(40), height: scaleWidth(40), alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
	regionText: {
		fontSize: Typography.body,
		textAlign: 'center',
		color: Colors.textSecondary,
	},
	levelText: {
		fontSize: Typography.callout,
		textAlign: 'center',
		color: Colors.textSecondary,
	},
	cardActive: {
		backgroundColor: Colors.secondaryBg,
	},
	summaryStatGrid: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	summaryStatCard: {
		flex: 1,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.sm,
		marginHorizontal: Spacing.xs,
		alignItems: 'center',
		justifyContent: 'flex-start',
		borderWidth: 1,
		borderColor: Colors.border,
		marginBottom: SpacingV.md,
	},
	statIcon: {
		fontSize: Typography.h3,
		marginBottom: SpacingV.xs,
	},
	/**
	 * 요약 카드의 숫자.
	 * 예전에는 값(body 14)과 이름(footnote 12)이 거의 같은 크기라 어느 쪽이 답인지 눈이 헤맸다.
	 * 값을 두 단계 키우고 고정폭 숫자로 두어 자리 수가 바뀌어도 줄이 흔들리지 않는다.
	 */
	statValue: {
		fontSize: Typography.title,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		marginBottom: SpacingV.xxs,
		textAlign: 'center',
		fontVariant: ['tabular-nums'],
	},
	statLabel: {
		fontSize: Typography.caption,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: scaledSize(16),
	},
	statIconChip: {
		width: scaleWidth(30),
		height: scaleWidth(30),
		borderRadius: Radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: SpacingV.sm,
	},
	chartRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.lg,
		padding: Spacing.md,
		marginBottom: SpacingV.lg,
	},
	donutCenterValue: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.heavy,
		color: Colors.primaryDark,
		fontVariant: ['tabular-nums'],
	},
	donutCenterLabel: {
		fontSize: Typography.caption,
		color: Colors.textSecondary,
		marginTop: SpacingV.xxs,
	},
	chartLegend: {
		flex: 1,
		marginLeft: Spacing.md,
	},
	chartLegendTitle: {
		fontSize: Typography.body,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		marginBottom: SpacingV.md,
	},
	chartLegendRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: SpacingV.sm,
	},
	legendDot: {
		width: scaleWidth(10),
		height: scaleWidth(10),
		borderRadius: Radius.xs,
		marginRight: Spacing.sm,
	},
	chartLegendText: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
	},
	chartLegendStrong: {
		fontWeight: FontWeight.heavy,
		color: Colors.text,
	},
	stackBarTrack: {
		flexDirection: 'row',
		height: scaleHeight(8),
		borderRadius: Radius.xs,
		overflow: 'hidden',
		marginTop: SpacingV.sm,
		backgroundColor: Colors.surfaceAlt,
	},
	stackBarCorrect: { backgroundColor: Colors.primary },
	stackBarWrong: { backgroundColor: Colors.error },
	subtitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginBottom: SpacingV.md,
		marginTop: SpacingV.sm,
	},
	// 소제목 줄(subtitleRow) 안에서 topRankingTitleInline 과 같은 역할이라 크기를 맞춘다
	sectionSubtitleInline: {
		fontSize: Typography.subtitle,
		color: Colors.text,
		fontWeight: FontWeight.bold,
	},
	topRankingTitleInline: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	regionSubText: {
		fontSize: Typography.caption,
		color: Colors.textMuted,
		textAlign: 'center',
		marginTop: SpacingV.xxs,
		lineHeight: scaledSize(13),
		fontWeight: FontWeight.regular,
	},
	levelSubText: {
		fontSize: Typography.footnote,
		color: Colors.textMuted,
		textAlign: 'center',
		// 12pt 한글에 13은 너무 빡빡해 안드로이드에서 아랫부분이 잘린다
		lineHeight: scaledSize(16),
		fontWeight: FontWeight.regular,
	},
	sectionSubtitle: {
		fontSize: Typography.callout,
		color: Colors.text,
		marginBottom: SpacingV.md,
		marginTop: SpacingV.sm,
		fontWeight: FontWeight.bold,
	},
	gridRowNoBottomGap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		marginTop: SpacingV.md,
		paddingBottom: SpacingV.sm,
	},
	regionHelperText: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		marginBottom: SpacingV.lg,
	},
	levelHelperText: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		marginTop: SpacingV.xs,
		marginBottom: SpacingV.lg,
	},
	adContainer: {
		backgroundColor: Colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: SpacingV.md,
		paddingVertical: SpacingV.sm,
	},
	regionCardActive: {
		backgroundColor: Colors.secondaryBg,
		borderColor: Colors.primary,
	},
	regionTextActive: {
		color: Colors.primary,
		fontWeight: FontWeight.bold,
	},
	iconCircle1: {
		width: scaleWidth(30),
		height: scaleWidth(30),
		marginRight: Spacing.sm,
		borderRadius: Radius.xl,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.primary, // 🎨 학습 모드(홈 버튼) 초록
	},
	iconCircle2: {
		width: scaleWidth(30),
		height: scaleWidth(30),
		borderRadius: Radius.xl,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: Spacing.sm,
		backgroundColor: Colors.secondaryDark, // 🎨 밝은 파랑 배경 추가
	},

	iconCircle3: {
		width: scaleWidth(30),
		height: scaleWidth(30),
		borderRadius: Radius.xl,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: Spacing.sm,
		backgroundColor: Colors.accentOrange, // 🎨 밝은 파랑 배경 추가
	},

	iconCircle4: {
		width: scaleWidth(30),
		height: scaleWidth(30),
		borderRadius: Radius.xl,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: Spacing.sm,
		backgroundColor: Colors.teal, // 오늘의 퀴즈 — 비중복 틸 컬러
	},
	iconCircle5: {
		width: scaleWidth(30),
		height: scaleWidth(30),
		borderRadius: Radius.xl,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: Spacing.sm,
		backgroundColor: Colors.warning,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: SpacingV.lg,
		marginBottom: SpacingV.md,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.surfaceMutedAlt,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
	},
	// 섹션 제목 줄 — 아이콘 배지와 제목. 위쪽 여백을 키워 앞 섹션의 카드와 확실히 끊는다
	sectionHeaderStatic: {
		flexDirection: 'row',
		alignItems: 'center',
		// 위 카드와 다음 섹션 제목 사이를 한 단계 더 벌린다 — 묶음이 눈으로 끊긴다
		marginTop: SpacingV.lg,
		marginBottom: SpacingV.md,
	},
	activityGroupBox: {
		// 음수 마진으로 화면 여백을 상쇄하던 방식은 ScrollView에서 잘려 실제로는 여백이 겹쳐 보였다.
		paddingVertical: SpacingV.md,
		marginTop: SpacingV.xxs,
	},
	activityTabBar: {
		paddingVertical: SpacingV.sm,
		paddingRight: Spacing.xs,
		gap: Spacing.sm,
		alignItems: 'center',
		marginBottom: SpacingV.xxs,
	},
	activityTabChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.xl,
		backgroundColor: Colors.surface,
		// 칩이 배경과 같은 면이면 어디까지가 버튼인지 안 보인다 — 테두리로 경계를 준다
		borderWidth: 1,
		borderColor: Colors.border,
		gap: Spacing.sm,
	},
	activityTabChipActive: {
		// 고른 칸만 살짝 떠 보이게 — 스무 칸이 흐르는 줄에서 지금 위치가 먼저 읽힌다
		shadowColor: Colors.primary,
		shadowOpacity: 0.35,
		shadowRadius: scaleWidth(6),
		shadowOffset: { width: 0, height: scaleHeight(2) },
		elevation: 3,
		backgroundColor: Colors.primary,
		borderColor: Colors.primary,
	},
	activityTabText: {
		flexShrink: 1,
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.semibold,
		color: Colors.textSecondary,
	},
	activityTabTextActive: {
		color: Colors.textInverse,
		fontWeight: FontWeight.bold,
	},
	sectionTitle: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
	},
	sectionTitle2: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		marginBottom: SpacingV.md,
		color: Colors.text,
	},
	// 줄 사이는 gap 한 곳에서만 — 줄마다 marginBottom 을 주면 마지막 줄 밑에만 빈 칸이 남는다
	categoryList: { gap: SpacingV.sm },
	categoryRowCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surface,
	},
	// 그림 한 칸 — 크기가 고정이라 분야 이름이 늘 같은 자리에서 시작한다
	categoryRowIcon: { width: scaleWidth(34), height: scaleWidth(34), alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md },
	categoryRowText: {
		flex: 1,
		fontSize: Typography.callout,
		color: Colors.textSecondary,
	},
	levelDetailDescription: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		textAlign: 'center',
		marginTop: SpacingV.sm,
		lineHeight: scaledSize(18),
	},
	timeResultCard: {
		marginBottom: SpacingV.md,
		padding: Spacing.md,
		backgroundColor: Colors.background,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	timeResultDate: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xs,
	},
	timeResultScore: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.sm,
	},
	timeResultRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: SpacingV.xs,
	},
	timeResultItem: {
		fontSize: Typography.bodySm,
		color: Colors.text,
	},
	timeResultTime: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		textAlign: 'right',
	},
	timeCard: {
		marginBottom: SpacingV.md,
		padding: Spacing.md,
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
	},
	timeCardDate: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xxs,
	},
	timeCardScore: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.sm,
	},
	timeCardRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: SpacingV.xs,
	},
	timeCardItem: {
		fontSize: Typography.bodySm,
		color: Colors.text,
	},
	timeCardUsed: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		textAlign: 'right',
	},
	topRankingTitle: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.md,
	},

	noRecordText: {
		fontSize: Typography.bodySm,
		color: Colors.textMuted,
		textAlign: 'center',
		marginTop: SpacingV.md,
	},

	recordCard: {
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.lg,
		backgroundColor: Colors.surface,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.border,
		marginBottom: SpacingV.md,
	},

	rankRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	firstRankLabel: {
		fontSize: Typography.callout,
		color: Colors.warningBright,
		fontWeight: FontWeight.bold,
		marginRight: Spacing.sm,
	},

	secondRankLabel: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		fontWeight: FontWeight.bold,
		marginRight: Spacing.sm,
	},

	thirdRankLabel: {
		fontSize: Typography.body,
		color: Colors.accentOrangeLight,
		fontWeight: FontWeight.bold,
		marginRight: Spacing.sm,
	},

	firstRankScore: {
		fontSize: Typography.callout,
		color: Colors.text,
	},

	secondRankScore: {
		fontSize: Typography.body,
		color: Colors.text,
	},

	thirdRankScore: {
		fontSize: Typography.body,
		color: Colors.text,
	},

	rankDate: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
	},
	calendarStyle: {
		alignSelf: 'stretch', // 또는 width: '100%'
		borderRadius: Radius.md,
		overflow: 'hidden',
		marginBottom: SpacingV.md,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
	CATEGORY_META = makeCategoryMeta();
});
