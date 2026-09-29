/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import withRemountOnFocus from '@/src/screens/common/withRemountOnFocus';
import useDayChange from '@/src/hooks/useDayChange';
import { useScrollToTop } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Animated, Easing, LayoutAnimation } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AppModal from '@/src/screens/common/atomic/AppModal';
import FitText from '@/src/screens/common/atomic/FitText';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Colors, { accuracyColor, BRAND_GRADIENT, readableOn, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout, Border } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, scaleArt, isTablet} from '@/src/utils';
import LearnHubService from '@/src/services/LearnHubService';
import DailyWordService from '@/src/services/DailyWordService';
import LearnProgressService from '@/src/services/LearnProgressService';
import AttendanceService from '@/src/services/AttendanceService';
import { CancelStreakReminder } from '@/src/utils/NotifactionHelper';
import AchievementService, { AchievementStatus } from '@/src/services/AchievementService';
import AchievementUnlockModal from '@/src/screens/modal/AchievementUnlockModal';
import OnboardingModal from '@/src/screens/modal/OnboardingModal';
import OnboardingService, { type Interest } from '@/src/services/OnboardingService';
import { AchievementDef, rarityRank, RARITY_ON_BRAND_COLOR } from '@/src/const/ConstAchievements';
import TestHistoryService from '@/src/services/TestHistoryService';
import { LearnType } from '@/src/types/data/LearnType';
import { AnimatedProgress, CountUp, FadeInUp, Pulse, SheetIn } from '@/src/screens/common/anim/Motion';
import AttendanceCheckInModal from '@/src/screens/modal/AttendanceCheckInModal';
import CharacterGuide, { useCharacterGuideOnce, CharacterGuideButton } from '@/src/screens/common/CharacterGuide';
import BadgeDetailModal from '@/src/screens/modal/BadgeDetailModal';
import BadgeDexModal from '@/src/screens/modal/BadgeDexModal';
import BottomSheet from '@/src/screens/common/atomic/BottomSheet';
import DailyAlarmModal from '@/src/screens/modal/DailyAlarmModal';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import SectionHead from '@/src/screens/common/atomic/SectionHead';
import { useToast } from '@/src/context/ToastContext';
import LottieBox from '@/src/screens/common/atomic/LottieBox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { categoryIcon, difficultyIcon } from '@/src/const/ConstQuizMeta';
import { Image as ExpoImage } from 'expo-image';
import { getCharacterImages, getOverallCharacterLevels, getOverallCharacterLevelsByCount, getOverallLevelIndexByPct, hasCharacter, HOME_CHARACTER_KEY } from '@/src/const/ConstCharacters';
import { getDomainLevels, DOMAIN_LEVELS } from '@/src/const/ConstDomainLevels';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
import { themed } from '@/src/utils/ThemedStyles';

/**
 * 홈 (Toss 스타일 리디자인)
 * - 플랫 카드 · 명확한 정보 위계 · 일관된 간격
 * - 모든 콘텐츠 블록은 동일한 섹션 헤더 규칙(제목 + 선택 서브 + 우측 액션)으로 통일
 * - 섹션별 순차 진입 애니메이션(FadeInUp 스태거)으로 지루하지 않은 첫인상 제공
 */
const LOTTIE_CELEBRATE = require('@/src/assets/lottie/confetti.json');
/** 하루 목표 문항 수 — 사용자가 고를 수 있고, 고르기 전에는 10문제 */
const DAILY_GOAL_OPTIONS = [5, 10, 20] as const;
const DEFAULT_DAILY_GOAL = 10;
const DAILY_GOAL_KEY = 'HOME_DAILY_GOAL';

/** 커리큘럼 접힘 상태 · 완주 축하 노출 여부 */
const CUR_OPEN_KEY = 'HOME_CURRICULUM_OPEN';
const CUR_CELEBRATED_KEY = 'HOME_CURRICULUM_CELEBRATED';
/** 오늘의 추천을 닫은 날짜(YYYY-MM-DD) — 날짜가 바뀌면 다시 노출 */
const REC_DISMISS_KEY = 'HOME_RECOMMEND_DISMISS_DATE';

// 홈 진입마다 바뀌는 헤더 문구 (첫 값이 디폴트)
/**
 * 학습 커리큘럼 — 레벨 테스트 → 학습 → 퀴즈 → 오답노트 → 타임챌린지
 * - 각 단계를 한 번이라도 완료하면 체크 표시, 5단계를 모두 끝내면 카드 자체가 사라진다.
 */
type CurriculumKey = 'level' | 'study' | 'quiz' | 'wrong' | 'time';
const CURRICULUM: { key: CurriculumKey; icon: string; label: string; desc: string; href: string; accent?: string }[] = themed(() => ([
	{ key: 'level', icon: 'military-tech', label: '레벨 테스트', desc: '10문제로 내 세계 상식 등급을 진단해요', href: '/special/level-test', accent: Colors.secondaryDark },
	{ key: 'study', icon: 'school', label: '학습', desc: '카드를 넘기며 세계 상식을 익혀요', href: '/learn/bundle' },
	{ key: 'quiz', icon: 'quiz', label: '퀴즈', desc: '익힌 내용을 문제로 확인해요', href: '/quiz/bundle' },
	// 완료 판정이 '오답 복습 플레이' 기준이므로 목록(/library)이 아니라 복습 퀴즈로 이동
	{ key: 'wrong', icon: 'history-edu', label: '오답노트', desc: '틀린 문제만 모아 다시 복습해요', href: '/quiz/wrong-review' },
	{ key: 'time', icon: 'bolt', label: '타임챌린지', desc: '180초 집중 대결로 마무리해요', href: '/quiz/speed', accent: Colors.primary },
]));

const GREET_TITLES = [
	'오늘도 세계로\n한 걸음 나아가요',
	'반가워요!\n오늘도 함께 배워요',
	'작은 습관이\n큰 실력이 돼요',
	'오늘의 세계 상식,\n지금 시작해요',
	'꾸준함이\n정답이에요',
	'한 문제씩\n차근차근 쌓아요',
];

/**
 * 출석 축하 팝업을 이미 띄운 '날짜' 저장 키.
 * 홈은 포커스마다 리마운트(withRemountOnFocus)되어 컴포넌트 상태로는 하루 1회를 보장할 수 없다.
 * 온보딩 등 다른 팝업에 밀려 못 뜬 날에는 다음 진입에서 다시 뜨도록 '닫은 시점'에만 기록한다.
 */
const ATT_POPUP_SHOWN_KEY = 'HOME_ATT_POPUP_DATE';

/** 모달을 바꿔 열 때 이전 모달이 사라질 때까지 두는 간격(ms) */
const MODAL_SWAP_MS = 260;
/** 자동 오버레이를 여는 지연(ms) — MODAL_SWAP_MS 보다 커야 교체 중 다른 팝업이 끼어들지 않는다 */
const AUTO_OVERLAY_MS = 350;
/** 자동 팝업 노출 우선순위 — 앞에 있을수록 먼저 뜬다 */
const AUTO_OVERLAY_ORDER = ['onboarding', 'checkin', 'achievement', 'curriculum', 'unlock', 'guide'] as const;

const Hub = () => {
	const domains = LearnHubService.getDomainList();
	// 서브 퀴즈 주제(월드컵·올림픽) — 메인 점수와 분리된 보너스 콘텐츠
	const subDomains = LearnHubService.getSubQuizDomainList();
	const scrollRef = useRef<any>(null);
	useScrollToTop(scrollRef);

	const [daily, setDaily] = useState<LearnType.StudyCard | null>(null);
	const [dailyBookmarked, setDailyBookmarked] = useState(false);
	const [reminderOn, setReminderOn] = useState(false);
	const [score, setScore] = useState(0);
	const [accuracy, setAccuracy] = useState(0);
	const [solvedCount, setSolvedCount] = useState(0);
	const [todaySolved, setTodaySolved] = useState(0);
	const [unlockedInfo, setUnlockedInfo] = useState<{ title: string; img: ReturnType<typeof require> } | null>(null);
	const [attStreak, setAttStreak] = useState(0);
	const [checkedToday, setCheckedToday] = useState(false);
	const [showCheckIn, setShowCheckIn] = useState(false);
	// 사용자가 '출석체크' 버튼으로 직접 연 경우 — 자동 팝업(하루 1회)과 별개로 취급한다
	const [checkInManual, setCheckInManual] = useState(false);
	// 이번 자동 출석이 보호권으로 살아났는지 (팝업 문구 분기)
	const [checkInShielded, setCheckInShielded] = useState(false);
	// 방금 자동 출석돼 열린 팝업인지 — 직접 연 경우(출석 현황 보기)에는 축하 연출을 재생하지 않는다
	const [checkInCelebrate, setCheckInCelebrate] = useState(false);
	const [showAlarm, setShowAlarm] = useState(false);
	const [showDailyDetail, setShowDailyDetail] = useState(false);
	const [showCharacterPicker, setShowCharacterPicker] = useState(false);
	const [selectedCharacterKey, setSelectedCharacterKey] = useState('overall');
	const [pickerTab, setPickerTab] = useState('overall');
	const [pendingCharKey, setPendingCharKey] = useState('overall');
	const { showToast } = useToast();
	const [topicsExpanded, setTopicsExpanded] = useState(false);
	const [subExpanded, setSubExpanded] = useState(false);
	const [subBests, setSubBests] = useState<Record<string, { correct: number; total: number }>>({});
	const [greetTitle, setGreetTitle] = useState(GREET_TITLES[0]);
	const [todayQuizDone, setTodayQuizDone] = useState(true);
	const [libraryCount, setLibraryCount] = useState(0);
	const [wrongCount, setWrongCount] = useState(0);
	const [domainStats, setDomainStats] = useState<Record<string, { solved: number; correct: number }>>({});
	// 커리큘럼 단계별 '한 번이라도 완료' 여부
	const [curriculumDone, setCurriculumDone] = useState<Record<CurriculumKey, boolean>>({ level: false, study: false, quiz: false, wrong: false, time: false });
	// 커리큘럼 접기/펼치기 — 기본은 접힘, 마지막 상태를 기기에 저장해 재진입해도 유지
	const [curOpen, setCurOpen] = useState(false);
	// 퀴즈 밖에서 달성한 신규 업적 (홈 복귀 시 축하)
	const [newAch, setNewAch] = useState<AchievementDef[]>([]);
	// 획득(해금)한 뱃지 — 홈 가로 스크롤 목록
	const [unlockedBadges, setUnlockedBadges] = useState<AchievementStatus[]>([]);
	// 전체 뱃지(획득 + 미획득) — 전체 보기 팝업용
	const [allBadges, setAllBadges] = useState<AchievementStatus[]>([]);
	// 뱃지 전체 보기 팝업
	const [showBadgeSheet, setShowBadgeSheet] = useState(false);
	// 뱃지 상세 팝업 (홈 목록·도감 공용)
	const [badgeDetail, setBadgeDetail] = useState<AchievementStatus | null>(null);
	// 도감에서 상세로 들어온 경우, 상세 닫으면 도감으로 복귀
	const badgeFromDexRef = useRef(false);
	// 뱃지 도감 ↔ 상세 교체 타이머 — 언마운트 시 정리
	const badgeSwapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (badgeSwapTimer.current) clearTimeout(badgeSwapTimer.current); }, []);
	// 하루 목표 문항 수 (사용자 설정)
	const [dailyGoal, setDailyGoal] = useState<number>(DEFAULT_DAILY_GOAL);
	/** 온보딩에서 고른 관심 주제 — 홈 섹션 순서를 정한다 */
	const [interest, setInterest] = useState<Interest>('both');
	const [showOnboarding, setShowOnboarding] = useState(false);
	// 출석 판단이 끝났는지 — 끝나기 전에는 캐릭터 안내를 띄우지 않는다(출석 팝업과 겹침 방지)
	const [attSettled, setAttSettled] = useState(false);
	// 홈 사용법 안내 — 최초 1회, 홈에서 고른 캐릭터가 설명.
	// 온보딩·출석 팝업이 모두 정리된 뒤에만 판단한다 (셋이 동시에 뜨면 화면이 먹통이 된다)
	const homeGuide = useCharacterGuideOnce('home', attSettled && !showCheckIn && !showOnboarding);
	/** 시작 3일 이내 신규 사용자는 홈 하위 섹션을 접어 첫인상을 단순하게 유지한다 */
	const [newcomer, setNewcomer] = useState<boolean | null>(null);
	const [showAllSections, setShowAllSections] = useState(false);
	const [showGoalPicker, setShowGoalPicker] = useState(false);
	// 커리큘럼 완주 축하 팝업 + 카드 스르륵 사라지기
	const [curCelebrate, setCurCelebrate] = useState(false);
	const [curHidden, setCurHidden] = useState(false);
	// 오늘의 추천 — X로 닫으면 그날 하루 동안 숨김
	const [recHidden, setRecHidden] = useState(false);
	const curFade = useRef(new Animated.Value(1)).current;
	const recFade = useRef(new Animated.Value(1)).current;
	const charPreviewAnim = useRef(new Animated.Value(1)).current;


	useEffect(() => {
		DailyWordService.getToday().then(setDaily);
		DailyWordService.isReminderOn().then(setReminderOn);
		AsyncStorage.getItem(HOME_CHARACTER_KEY).then((v) => {
			if (v) setSelectedCharacterKey(v);
		});
		OnboardingService.isDone().then((done) => {
			if (!done) setShowOnboarding(true);
		});
		OnboardingService.isNewcomer().then(setNewcomer);
		OnboardingService.getInterest().then((v) => {
			setInterest(v);
			if (v === 'knowledge') setSubExpanded(true);
		});
		AsyncStorage.getItem(DAILY_GOAL_KEY).then((v) => {
			const n = v ? parseInt(v, 10) : 0;
			if (DAILY_GOAL_OPTIONS.includes(n as (typeof DAILY_GOAL_OPTIONS)[number])) setDailyGoal(n);
		});
	}, []);

	// 오늘의 상식 즐겨찾기 여부 동기화
	useEffect(() => {
		if (!daily?.uid) {
			setDailyBookmarked(false);
			return;
		}
		LearnProgressService.isBookmarked(daily.uid).then(setDailyBookmarked);
	}, [daily?.uid]);

	const toggleDailyBookmark = useCallback(async () => {
		if (!daily) return;
		const now = await LearnProgressService.toggleBookmark({
			uid: daily.uid,
			domain: daily.domain,
			domainTitle: LearnHubService.getDomainTitle(daily.domain),
			title: daily.title,
			subTitle: daily.subTitle,
			meaning: daily.description || daily.meaning,
		});
		setDailyBookmarked(now);
		showToast(now ? '즐겨찾기에 저장했어요' : '즐겨찾기를 해제했어요', now ? 'star' : 'star-border');
	}, [daily, showToast]);

	/**
	 * 자동 출석 — 홈에 들어오면 버튼 없이 하루 1회 바로 출석 처리한다.
	 * 날짜 기준으로 판단하므로 앱을 켜둔 채 자정을 넘겨도 홈에 돌아오면 새 날짜로 출석된다.
	 * 새로 출석된 경우에만 축하 팝업을 띄운다(온보딩과는 autoOverlay 우선순위로 갈린다).
	 */
	const promptCheckInIfNewDay = useCallback(async () => {
		const today = DateUtils.getLocalDateString();
		try {
			const res = await AttendanceService.checkIn();
			setAttStreak(res.state.streak);
			setCheckedToday(true);
			if (res.checked) {
				// 오늘 출석했으므로 저녁 리마인더는 더 필요 없다
				CancelStreakReminder().catch(() => {});
				setCheckInShielded(res.shielded);
			}
			// 오늘 팝업을 이미 닫았으면 다시 띄우지 않는다 (리마운트로 상태가 날아가도 유지)
			const shownDate = await AsyncStorage.getItem(ATT_POPUP_SHOWN_KEY).catch(() => null);
			if (shownDate === today) return;
			// 축하 연출(사운드·컨페티)은 '이번에 새로 출석된' 경우만 — 다른 팝업에 밀려 뒤늦게 뜬 경우엔 결과만 보여준다
			setCheckInCelebrate(res.checked);
			setShowCheckIn(true);
		} finally {
			// 성공·실패와 무관하게 판단은 끝났다 — 캐릭터 안내가 영원히 막히지 않도록 항상 표시
			setAttSettled(true);
		}
	}, []);

	/** 출석 팝업 닫기 — 자동으로 뜬 경우에만 '오늘 봤음' 날짜를 남긴다 */
	const closeCheckIn = useCallback(() => {
		setCheckInManual(false);
		// 직접 열어 닫았어도 오늘 출석 내용을 이미 봤으므로 자동 팝업이 뒤따라 뜨지 않게 한다
		setShowCheckIn(false);
		AsyncStorage.setItem(ATT_POPUP_SHOWN_KEY, DateUtils.getLocalDateString()).catch(() => {});
	}, []);
	const loadStatus = useCallback(() => {
		LearnProgressService.getStats().then((s) => {
			setScore(s.totalCorrect * POINT_PER_CORRECT);
			setAccuracy(s.totalSolved > 0 ? Math.round((s.totalCorrect / s.totalSolved) * 100) : 0);
			setSolvedCount(s.totalSolved);
			setDomainStats(s.byDomain);
			setTodaySolved(s.dailyLog?.[DateUtils.getLocalDateString()]?.solved ?? 0);
			// 새 레벨 캐릭터 최초 해제 감지 → 축하 연출
			// 전체 캐릭터 등급은 점수 상세·레벨 팝업과 동일하게 '푼 문제 / 전체 문제' 달성률 기준
			const ovLevels = getOverallCharacterLevels();
			const totalCount = domains.reduce((a, d) => a + d.total, 0);
			const solvedTotal = domains.reduce((a, d) => a + (s.byDomain?.[d.key]?.solved ?? 0), 0);
			const curLv = getOverallLevelIndexByPct(totalCount > 0 ? Math.round((solvedTotal / totalCount) * 100) : 0);
			AsyncStorage.getItem('HOME_SEEN_CHAR_LEVEL').then((raw) => {
				const seen = raw ? parseInt(raw, 10) : 0;
				if (seen > 0 && curLv > seen) {
					const ch = ovLevels[curLv - 1];
					if (ch) setUnlockedInfo({ title: ch.title, img: ch.img });
				}
				if (curLv !== seen) AsyncStorage.setItem('HOME_SEEN_CHAR_LEVEL', String(curLv)).catch(() => {});
			});
			// 획득한 뱃지 — 홈 가로 목록용 (획득 최신순) + 전체 뱃지 도감(해금일 병합)
			AchievementService.recentUnlocked(s).then((list) => {
				setUnlockedBadges([...list].sort((a, b) => rarityRank(b.def.rarity) - rarityRank(a.def.rarity)));
				const atMap = new Map(list.map((a) => [a.def.id, a.unlockedAt]));
				setAllBadges(
					AchievementService.evaluate(s)
						.map((a) => ({ ...a, unlockedAt: atMap.get(a.def.id) }))
						.sort((a, b) => {
							if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
							return rarityRank(b.def.rarity) - rarityRank(a.def.rarity);
						}),
				);
			});
			// 퀴즈 밖(학습·출석·오늘의 퀴즈 등)에서 달성한 업적도 홈 복귀 시 축하
			AchievementService.pickNewlyUnlocked(s).then((fresh) => {
				if (fresh.length > 0) setNewAch(fresh);
			});
		});
		AttendanceService.getState().then((a) => setAttStreak(a.streak));
		AttendanceService.isCheckedToday().then(setCheckedToday);
		// 오늘의 퀴즈 완료 여부 (오늘 날짜로 완료 마킹됐는지 — 미완료면 버튼에 뱃지)
		AsyncStorage.getItem('TODAY_QUIZ_DONE_DATE').then((d) => {
			setTodayQuizDone(d === DateUtils.getLocalDateString());
		});
		// 오늘의 추천 숨김 여부 (오늘 닫았으면 계속 숨김, 날짜 바뀌면 복귀)
		AsyncStorage.getItem(REC_DISMISS_KEY).then((d) => {
			const hidden = d === DateUtils.getLocalDateString();
			setRecHidden(hidden);
			recFade.setValue(hidden ? 0 : 1);
		});
		// 보관함 저장 개수(즐겨찾기 + 오답노트) · 오답노트 개수
		Promise.all([LearnProgressService.getBookmarks(), LearnProgressService.getWrongNotes()]).then(([bm, wn]) => {
			setLibraryCount(bm.length + wn.length);
			setWrongCount(wn.length);
		});
		// 서브 퀴즈 최고 기록 · 오늘 학습 완료 수
		LearnProgressService.getSubQuizBests().then(setSubBests);
		// 커리큘럼 진행 — 누적 기록 기준(한 번이라도 했으면 완료)
		Promise.all([
			LearnProgressService.getStats(),
			LearnProgressService.getStudiedCounts(),
			LearnProgressService.getWrongNotes(),
			TestHistoryService.getLevelHistory(),
		]).then(([s, studied, wrongNotes, levelHistory]) => {
			const done: Record<CurriculumKey, boolean> = {
				level: levelHistory.length > 0,
				study: Object.values(studied).some((n) => n > 0),
				quiz: s.totalQuizzes > 0,
				// 오답 복습 1회 이상, 또는 퀴즈를 풀었는데 오답이 하나도 없는 경우(복습할 게 없어 단계가 막히지 않도록)
				wrong: (s.byMode?.review ?? 0) > 0 || (s.totalQuizzes > 0 && wrongNotes.length === 0),
				time: (s.byMode?.time ?? 0) > 0,
			};
			setCurriculumDone(done);
			// 전 단계 완주 — 최초 1회만 축하 팝업, 이후엔 카드 자체를 숨김
			if (!CURRICULUM.every((c) => done[c.key])) {
				// 데이터 초기화 등으로 다시 미완주 상태가 되면 숨겨둔 카드를 되살린다
				setCurHidden(false);
				curFade.setValue(1);
				return;
			}
			AsyncStorage.getItem(CUR_CELEBRATED_KEY).then((seen) => {
				if (seen) {
					setCurHidden(true);
					return;
				}
				AsyncStorage.setItem(CUR_CELEBRATED_KEY, '1').catch(() => {});
				setCurCelebrate(true);
			});
		});
	}, [curFade, recFade]);

	// 자정을 넘기면 '오늘' 기준으로 그린 것들(출석·오늘의 퀴즈·오늘의 상식·추천 숨김)을 한 번에 되돌린다
	useDayChange(() => {
		DailyWordService.getToday().then(setDaily);
		loadStatus();
		promptCheckInIfNewDay();
	});

	// 저장된 커리큘럼 접힘 상태 복원 (저장값이 없으면 접힌 상태 유지)
	useEffect(() => {
		AsyncStorage.getItem(CUR_OPEN_KEY).then((v) => setCurOpen(v === '1')).catch(() => {});
	}, []);

	/** 커리큘럼 접기/펼치기 (상태 저장) */
	const toggleCurriculum = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setCurOpen((v) => {
			AsyncStorage.setItem(CUR_OPEN_KEY, v ? '0' : '1').catch(() => {});
			return !v;
		});
	};

	// 핸들러에서 시작되는 애니메이션(닫기 페이드·캐릭터 미리보기)도 언마운트 시 정리
	useEffect(() => () => {
		recFade.stopAnimation();
		curFade.stopAnimation();
		charPreviewAnim.stopAnimation();
	}, [recFade, curFade, charPreviewAnim]);

	/** 오늘의 추천 닫기 → 스르륵 사라지고 날짜가 바뀔 때까지 다시 뜨지 않음 */
	const dismissRecommend = () => {
		AsyncStorage.setItem(REC_DISMISS_KEY, DateUtils.getLocalDateString()).catch(() => {});
		Animated.timing(recFade, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setRecHidden(true));
	};

	/** 완주 축하 닫기 → 커리큘럼 카드가 스르륵 사라짐 */
	const closeCurriculumCelebrate = () => {
		setCurCelebrate(false);
		Animated.timing(curFade, { toValue: 0, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => setCurHidden(true));
	};

	useFocusEffect(useCallback(() => {
		// 탭에 들어올 때마다 화면 상태(열린 팝업·펼침·스크롤)를 최초 상태로 되돌린다
		setShowAlarm(false);
		setShowDailyDetail(false);
		setShowCharacterPicker(false);
		setCheckInManual(false);
		setTopicsExpanded(false);
		setSubExpanded(false);
		scrollRef.current?.scrollTo?.({ y: 0, animated: false });
		loadStatus();
		promptCheckInIfNewDay();
		setGreetTitle(GREET_TITLES[Math.floor(Math.random() * GREET_TITLES.length)]);
	}, [loadStatus, promptCheckInIfNewDay]));

	const openCheckIn = () => {
		setCheckInCelebrate(false);
		setCheckInManual(true);
	};

	// 커리큘럼 진행률 — 완주 축하 후 카드가 사라짐(curHidden)
	const curriculumCleared = CURRICULUM.filter((s) => curriculumDone[s.key]).length;
	// 접었을 때 헤더에 보여줄 다음 단계
	const curNextStep = CURRICULUM.find((s) => !curriculumDone[s.key]);

	// 오늘의 추천 — 아직 안 푼 주제 우선, 없으면 정답률이 가장 낮은 주제
	const recommend = useMemo(() => {
		const unseen = domains.find((d) => !(domainStats[d.key]?.solved ?? 0));
		if (unseen) return { domain: unseen, rate: null as number | null };
		const rated = domains
			.map((d) => {
				const s = domainStats[d.key];
				return s && s.solved > 0 ? { domain: d, rate: Math.round((s.correct / s.solved) * 100) } : null;
			})
			.filter(Boolean) as { domain: (typeof domains)[number]; rate: number }[];
		return rated.sort((a, b) => a.rate - b.rate)[0] ?? null;
	}, [domains, domainStats]);

	const dailyAccent = daily ? LearnHubService.getDomain(daily.domain).meta.color : Colors.primary;

	const moveToCategory = (key: string) => {
		router.push({ pathname: '/learn/category', params: { category: key } } as never);
	};

	// 빠른 시작 (원형 숏컷) — 출석체크가 학습 왼쪽
	// emphasis: 매일 하는 핵심 습관 액션(출석/오늘의 퀴즈)만 솔리드 필로 강조 → 단일 포인트 컬러 내에서 리듬·위계 부여
	const quickActions = [
		{ key: 'attend', title: '출석체크', icon: 'event-available', color: Colors.primary, emphasis: true, onPress: openCheckIn },
		{ key: 'today-quiz', title: '오늘의 퀴즈', icon: 'today', color: Colors.primary, emphasis: true, onPress: () => router.push('/quiz/today' as never) },
		{ key: 'random-study', title: '학습', icon: 'auto-stories', color: Colors.primary, emphasis: false, onPress: () => router.push('/learn/bundle' as never) },
		{ key: 'random-quiz', title: '퀴즈', icon: 'shuffle', color: Colors.primary, emphasis: false, onPress: () => router.push('/quiz/bundle' as never) },
		{ key: 'wrong-note', title: '오답노트', icon: 'history-edu', color: Colors.primary, emphasis: false, onPress: () => router.push({ pathname: '/library', params: { tab: 'wrong' } } as never) },
		{ key: 'challenge', title: '타임챌린지', icon: 'bolt', color: Colors.primary, emphasis: false, onPress: () => router.push('/quiz/speed' as never) },
		{ key: 'library', title: '보관함', icon: 'bookmark', color: Colors.primary, emphasis: false, onPress: () => router.push('/library' as never) },
	];

	const features = [
		{ href: '/special/exam', title: '테마 코스', desc: '지리·세계사·교양 맞춤 코스', icon: 'workspace-premium', color: Colors.primary },
		{ href: '/special/level-test', title: '레벨 테스트', desc: '내 세계 상식 등급 진단', icon: 'military-tech', color: Colors.secondaryDark },
		{ href: '/special/type-test', title: '유형 테스트', desc: '나의 상식 탐험 성향은?', icon: 'psychology', color: Colors.primary },
		{ href: '/special/story-feed', title: '이야기 피드', desc: '읽으며 가볍게 익히기', icon: 'auto-stories', color: Colors.primaryDeep },
		{ href: '/quiz/sub-quiz', title: '서브 퀴즈', desc: '월드컵·올림픽 보너스 문제', icon: 'extension', color: Colors.secondaryDark },
	];
	const topicPreview: Partial<Record<LearnType.Domain, { tag: string; example: string }>> = {
		capital: { tag: '세계 지리', example: '나라를 보고 수도·국기·대륙 맞히기' },
		landmark: { tag: '여행 상식', example: '사진 속 랜드마크가 있는 곳 찾기' },
		nature: { tag: '지도 감각', example: '강·산맥·사막이 있는 대륙과 나라 고르기' },
		figure: { tag: '인물 탐구', example: '초상과 업적으로 세계 위인 알아보기' },
		event: { tag: '세계사 흐름', example: '사건이 일어난 시기와 나라 연결하기' },
		myth: { tag: '신화 이야기', example: '그리스 로마 신의 이름과 역할 맞히기' },
		space: { tag: '우주 상식', example: '행성과 위성의 순서와 특징 알아보기' },
		constellation: { tag: '밤하늘', example: '별자리 그림과 대표 별 연결하기' },
	};
	// 주제별 캐릭터 선택 — 탭(전체/주제)마다 해당 주제의 단계별 캐릭터를 모두 노출(잠금 표시)
	const pickerItemsFor = useCallback(
		(scope: string) => {
			if (scope === 'overall') {
				// 점수 상세·레벨 팝업과 동일 기준(달성률 → 필요 문제 수)
				const totalCount = domains.reduce((a, d) => a + d.total, 0);
				const solvedTotal = domains.reduce((a, d) => a + (domainStats[d.key]?.solved ?? 0), 0);
				return getOverallCharacterLevelsByCount(totalCount).map((c) => ({
					key: `overall:${c.level}`,
					level: c.level,
					img: c.img,
					title: c.title,
					desc: getDomainLevels('overall')[c.level - 1]?.encouragement,
					unlocked: solvedTotal >= c.requiredCount,
					req: c.requiredCount === 0 ? '시작' : `${c.requiredCount.toLocaleString()}문제`,
				}));
			}
			const s = domainStats[scope] ?? { solved: 0, correct: 0 };
			const defs = getDomainLevels(scope);
			const imgs = getCharacterImages(scope);
			const metric = DOMAIN_LEVELS[scope]?.metric ?? 'score';
			const value = metric === 'solved' ? s.solved : s.correct * POINT_PER_CORRECT;
			return defs.map((def, i) => ({
				key: `${scope}:${def.level}`,
				level: def.level,
				img: imgs[i] ?? imgs[imgs.length - 1] ?? null,
				title: def.label,
				desc: def.encouragement,
				unlocked: value >= def.threshold,
				req: def.threshold === 0 ? '시작' : metric === 'solved' ? `${def.threshold.toLocaleString()}문제` : `${def.threshold.toLocaleString()}점`,
			}));
		},
		[score, domainStats, domains],
	);
	const pickerTabs = useMemo(
		() => [{ key: 'overall', title: '전체' }, ...domains.filter((d) => hasCharacter(d.key) && getDomainLevels(d.key).length > 0).map((d) => ({ key: d.key, title: d.title }))],
		[domains],
	);
	const pickerItems = useMemo(() => pickerItemsFor(pickerTab), [pickerItemsFor, pickerTab]);
	const resolveChar = useCallback(
		(key: string) => {
			const k = key || 'overall';
			const scope = k.includes(':') ? k.split(':')[0] : k;
			const items = pickerItemsFor(scope);
			const exact = items.find((it) => it.key === k);
			if (exact) return exact;
			const unlocked = items.filter((it) => it.unlocked);
			if (unlocked.length) return unlocked[unlocked.length - 1];
			const ov = getOverallCharacterLevels();
			return { key: 'overall:1', level: 1, img: ov[0].img, title: ov[0].title, desc: getDomainLevels('overall')[0]?.encouragement, unlocked: true, req: '시작' };
		},
		[pickerItemsFor],
	);
	// 초기화 등으로 잠긴 캐릭터가 저장돼 있으면 홈에는 해금된 최고 단계를 보여준다
	const selectedCharacter = useMemo(() => {
		const c = resolveChar(selectedCharacterKey);
		return c.unlocked ? c : resolveChar('overall');
	}, [resolveChar, selectedCharacterKey]);
	const previewChar = useMemo(() => resolveChar(pendingCharKey), [resolveChar, pendingCharKey]);
	const openCharacterPicker = () => {
		const key = selectedCharacterKey || 'overall';
		setPickerTab(key.includes(':') ? key.split(':')[0] : key);
		setPendingCharKey(key);
		setShowCharacterPicker(true);
	};
	// 탭 전환 시 해당 주제의 최고 해금 캐릭터로 미리보기 갱신(선택 대상 = 현재 보는 탭)
	const onSelectTab = (key: string) => {
		setPickerTab(key);
		const items = pickerItemsFor(key);
		const unlocked = items.filter((i) => i.unlocked);
		const k = (unlocked[unlocked.length - 1] ?? items[0])?.key;
		if (k) pickCharacter(k);
	};
	// 그리드에서 탭 → 미리보기만 갱신(적용은 '선택' 버튼)
	const pickCharacter = (key: string) => {
		setPendingCharKey(key);
		charPreviewAnim.setValue(0);
		Animated.spring(charPreviewAnim, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
	};
	// 미리보기 전용: 캐릭터를 실제로 선택/저장하지 않고 팝업만 닫는다.
	const applyCharacter = () => {
		if (!previewChar.unlocked) return;
		setSelectedCharacterKey(pendingCharKey);
		AsyncStorage.setItem(HOME_CHARACTER_KEY, pendingCharKey).catch(() => {});
		setShowCharacterPicker(false);
		showToast('캐릭터가 변경되었습니다', 'check-circle');
	};
	/** 관심 주제(온보딩)에 따라 '주제 골라보기'와 '서브 퀴즈' 중 관심 쪽을 위로 올린다 */
	const topicSection = (
		<React.Fragment key="topic">
				{/* 주제 골라보기 — 캐러셀 */}
				<FadeInUp delay={240}>
					<SectionHead
						title="주제 골라보기"
						sub={topicsExpanded ? '주제를 눌러 시작해요' : '좌우로 넘겨 고르고 학습·퀴즈를 시작해요'}
						right={
							<TouchableOpacity style={styles.expandBtn} activeOpacity={0.8} onPress={() => setTopicsExpanded((v) => !v)} hitSlop={Layout.hitSlop}>
								<Text style={styles.expandText}>{topicsExpanded ? '접기' : '펼치기'}</Text>
								<IconComponent type="materialIcons" name={topicsExpanded ? 'expand-less' : 'expand-more'} size={scaledSize(16)} color={Colors.primary} />
							</TouchableOpacity>
						}
					/>

					{topicsExpanded && (
						<View style={styles.topicList}>
							{domains.map((d) => (
								<TouchableOpacity key={d.key} style={styles.topicRow} activeOpacity={0.85} onPress={() => moveToCategory(d.key)}>
									<View style={[styles.topicRowIcon, { backgroundColor: d.mainIcon ? Colors.surfaceAlt : withAlpha(d.color, '14') }]}>
										<DomainIcon mainIcon={d.mainIcon} icon={d.icon} iconType={d.iconType} size={scaledSize(d.mainIcon ? 28 : 22)} color={d.color} />
									</View>
									<View style={styles.topicRowBody}>
										<Text style={styles.topicRowTitle} numberOfLines={1} ellipsizeMode="tail">{d.title}</Text>
										<Text style={styles.topicRowSub} numberOfLines={2} ellipsizeMode="tail">{d.subtitle}</Text>
										{!!topicPreview[d.key] && <Text style={styles.topicRowExample} numberOfLines={2} ellipsizeMode="tail">{topicPreview[d.key]?.example}</Text>}
									</View>
									<View style={[styles.countPill, { backgroundColor: withAlpha(d.color, '14') }]}>
										<Text style={[styles.countPillText, { color: d.color }]}>{d.total.toLocaleString()}개</Text>
									</View>
									<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(20)} color={Colors.textMuted} />
								</TouchableOpacity>
							))}
						</View>
					)}

					{!topicsExpanded && (
						<FlatList
							data={domains}
							keyExtractor={(d) => d.key}
							horizontal
							showsHorizontalScrollIndicator={false}
							snapToInterval={scaleWidth(248) + Spacing.md}
							decelerationRate="fast"
							contentContainerStyle={styles.carouselList}
							style={styles.carousel}
							renderItem={({ item: d }) => (
								<TouchableOpacity style={styles.topicCard} activeOpacity={0.9} onPress={() => moveToCategory(d.key)}>
									<View style={styles.topicTop}>
										<View style={[styles.topicIcon, { backgroundColor: d.mainIcon ? Colors.surfaceAlt : withAlpha(d.color, '14') }]}>
											<DomainIcon mainIcon={d.mainIcon} icon={d.icon} iconType={d.iconType} size={scaledSize(d.mainIcon ? 32 : 24)} color={d.color} />
										</View>
										<View style={[styles.countPill, { backgroundColor: withAlpha(d.color, '14') }]}>
											<Text style={[styles.countPillText, { color: d.color }]}>{d.total.toLocaleString()}개</Text>
										</View>
									</View>
									<Text style={styles.topicTitle} numberOfLines={1} ellipsizeMode="tail">{d.title}</Text>
									<Text style={styles.topicDesc} numberOfLines={2}>{d.subtitle}</Text>
									{!!topicPreview[d.key] && (
										<View style={styles.topicExampleBox}>
											<Text style={[styles.topicExampleTag, { color: d.color }]}>{topicPreview[d.key]?.tag}</Text>
											<Text style={styles.topicExampleText} numberOfLines={2}>{topicPreview[d.key]?.example}</Text>
										</View>
									)}
									<View style={[styles.topicBtn, { backgroundColor: d.color }]}>
										<Text style={[styles.topicBtnText, { color: readableOn(d.color) }]}>시작하기</Text>
										<IconComponent type="materialIcons" name="arrow-forward" size={scaledSize(15)} color={readableOn(d.color)} />
									</View>
								</TouchableOpacity>
							)}
						/>
					)}
				</FadeInUp>
		</React.Fragment>
	);
	const subSection = (
		<React.Fragment key="sub">
				{/* 서브 퀴즈 — 주제 골라보기와 동일한 가로 스크롤 카드형 (펼치면 세로 목록) */}
				<FadeInUp delay={270}>
					<SectionHead
						title="서브 퀴즈"
						sub={subExpanded ? '주제를 눌러 시작해요 (메인 점수 미반영)' : '좌우로 넘겨 고르기 · 월드컵·올림픽 (메인 점수 미반영)'}
						right={
							<TouchableOpacity style={styles.expandBtn} activeOpacity={0.8} onPress={() => setSubExpanded((v) => !v)} hitSlop={Layout.hitSlop}>
								<Text style={styles.expandText}>{subExpanded ? '접기' : '펼치기'}</Text>
								<IconComponent type="materialIcons" name={subExpanded ? 'expand-less' : 'expand-more'} size={scaledSize(16)} color={Colors.primary} />
							</TouchableOpacity>
						}
					/>

					{subExpanded && (
						<View style={styles.topicList}>
							{subDomains.map((d) => {
								const best = subBests[d.key];
								return (
									<TouchableOpacity
										key={d.key}
										style={styles.topicRow}
										activeOpacity={0.85}
										onPress={() => router.push({ pathname: '/quiz/sub-quiz/[domain]', params: { domain: d.key } } as never)}>
										<View style={[styles.topicRowIcon, { backgroundColor: Colors.primaryBg }]}>
											<IconComponent type={d.iconType} name={d.icon} size={scaledSize(22)} color={Colors.primary} />
										</View>
										<View style={styles.topicRowBody}>
											<Text style={styles.topicRowTitle} numberOfLines={1} ellipsizeMode="tail">{d.title}</Text>
											<Text style={styles.topicRowSub} numberOfLines={2}>{d.subtitle}</Text>
										</View>
										<View style={[styles.subPlayPill, best ? { backgroundColor: withAlpha(Colors.primary, '1A') } : { backgroundColor: Colors.primaryBg }]}>
											<Text style={[styles.subPlayText, { color: Colors.primary }]}>{best ? `최고 ${best.correct}/${best.total}` : 'NEW'}</Text>
										</View>
										<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(20)} color={Colors.textMuted} />
									</TouchableOpacity>
								);
							})}
						</View>
					)}

					{!subExpanded && (
						<FlatList
							data={subDomains}
							keyExtractor={(d) => d.key}
							horizontal
							showsHorizontalScrollIndicator={false}
							snapToInterval={scaleWidth(248) + Spacing.md}
							decelerationRate="fast"
							contentContainerStyle={styles.carouselList}
							style={styles.carousel}
							renderItem={({ item: d }) => {
								const best = subBests[d.key];
								return (
									<TouchableOpacity
										style={styles.topicCard}
										activeOpacity={0.9}
										onPress={() => router.push({ pathname: '/quiz/sub-quiz/[domain]', params: { domain: d.key } } as never)}>
										<View style={styles.topicTop}>
											<View style={[styles.topicIcon, { backgroundColor: Colors.primaryBg }]}>
												<IconComponent type={d.iconType} name={d.icon} size={scaledSize(24)} color={Colors.primary} />
											</View>
											<View style={[styles.subPlayPill, best ? { backgroundColor: withAlpha(Colors.primary, '1A') } : { backgroundColor: Colors.primaryBg }]}>
												<Text style={[styles.subPlayText, { color: Colors.primary }]}>{best ? `최고 ${best.correct}/${best.total}` : 'NEW'}</Text>
											</View>
										</View>
										<Text style={styles.topicTitle} numberOfLines={1} ellipsizeMode="tail">{d.title}</Text>
										<Text style={styles.topicDesc} numberOfLines={2}>{d.subtitle}</Text>
										<View style={styles.topicExampleBox}>
											<Text style={[styles.topicExampleTag, { color: Colors.primary }]}>{best ? `최고 ${best.correct}/${best.total}정답` : `${d.total.toLocaleString()}문제 · 보너스`}</Text>
											<Text style={styles.topicExampleText} numberOfLines={2}>메인 점수엔 반영되지 않는 가벼운 문제예요</Text>
										</View>
										<View style={[styles.topicBtn, { backgroundColor: Colors.primary }]}>
											<Text style={styles.topicBtnText}>시작하기</Text>
											<IconComponent type="materialIcons" name="arrow-forward" size={scaledSize(15)} color={Colors.textInverse} />
										</View>
									</TouchableOpacity>
								);
							}}
						/>
					)}
				</FadeInUp>
		</React.Fragment>
	);
	const orderedSections = interest === 'knowledge' ? [subSection, topicSection] : [topicSection, subSection];
	// 판정 전(null)에는 축소본으로 그린다 — 전체를 그렸다 접으면 화면이 튄다
	const compact = newcomer !== false && !showAllSections;
	// 축약 모드에서도 '주제 골라보기'와 '서브 퀴즈'는 둘 다 보여준다 — 서브 퀴즈가 '모든 기능 보기' 뒤에 숨어 있어 발견이 늦었다
	const sectionOrder = orderedSections;

	// ── 오버레이 정리 ───────────────────────────────
	// RN Modal 이 두 개 이상 동시에 뜨면 아래쪽 창이 터치를 먹어 화면 전체가 먹통이 된다.
	// (첫 실행에서 온보딩 + 출석 + 캐릭터 안내가 한꺼번에 뜨는 경우가 실제로 있었다)
	// 자동으로 뜨는 오버레이는 우선순위대로 '한 번에 하나만' 노출한다.
	const userSheetOpen = checkInManual || showAlarm || showCharacterPicker || showBadgeSheet || !!badgeDetail || showGoalPicker || (showDailyDetail && !!daily);
	// 각 오버레이가 '떠야 하는 상태인지'. 우선순위는 아래 배열 순서.
	const overlayWanted: Record<string, boolean> = {
		onboarding: showOnboarding,
		checkin: showCheckIn,
		achievement: newAch.length > 0,
		curriculum: curCelebrate,
		unlock: !!unlockedInfo,
		guide: homeGuide.visible,
	};
	// 실제로 화면에 띄운 오버레이. 다음 것으로 바뀔 때는 이전 모달이 완전히 닫힌 뒤에 연다
	// (RN Modal 이 겹치면 아래쪽 창이 터치를 먹어 화면이 먹통이 된다)
	const [autoOverlay, setAutoOverlay] = useState<string | null>(null);
	// 이미 띄운 오버레이는 '자기 조건이 풀릴 때까지' 유지한다.
	// 우선순위가 더 높은 게 뒤늦게 도착했다고 열려 있는 걸 뺏으면, 닫힘 처리(본 적 있음 기록 등)가
	// 안 된 채 사라져 다음 진입에서 또 뜬다 — 출석 팝업과 캐릭터 안내가 서로를 밀어내던 원인.
	const autoStillWanted = autoOverlay ? !!overlayWanted[autoOverlay] : false;
	const queuedOverlay = userSheetOpen ? null : AUTO_OVERLAY_ORDER.find((k) => overlayWanted[k]) ?? null;
	useEffect(() => {
		if (autoOverlay) {
			if (!autoStillWanted) setAutoOverlay(null);
			return;
		}
		if (queuedOverlay === null) return;
		const t = setTimeout(() => setAutoOverlay(queuedOverlay), AUTO_OVERLAY_MS);
		return () => clearTimeout(t);
	}, [queuedOverlay, autoOverlay, autoStillWanted]);
	const showAuto = (key: string) => autoOverlay === key;

	return (
		<View style={styles.safe}>
			<ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
				{/* 앱 서브타이틀 — 화면 최상단 고정 */}
				<FadeInUp delay={0}>
					<View style={styles.appTitleRow}>
						<Text style={styles.appTitle}>세계 상식 퀴즈</Text>
						<CharacterGuideButton onPress={homeGuide.open} />
					</View>
				</FadeInUp>

				{/* 히어로 — 인사 · 연속 학습 · 오늘의 목표 · 다음 행동(CTA)을 한 장에 모은다 */}
				<FadeInUp delay={40}>
					<View style={styles.hero}>
						<View style={styles.heroTop}>
							{/* 캐릭터 아바타 — 우하단 편집 뱃지로 변경 가능함을 알림 */}
							<TouchableOpacity style={styles.greetCharacterWrap} activeOpacity={0.85} onPress={openCharacterPicker} accessibilityRole="button" accessibilityLabel="홈 캐릭터 변경">
								<ExpoImage source={selectedCharacter.img} style={styles.greetCharacterImg} contentFit="contain" />
								<View style={styles.characterEditBadge}>
									<IconComponent type="materialIcons" name="edit" size={scaledSize(11)} color={Colors.textInverse} />
								</View>
							</TouchableOpacity>
							<View style={styles.greeting}>
								{attStreak > 0 && (
									<View style={styles.streakChip}>
										<IconComponent type="materialIcons" name="whatshot" size={scaledSize(13)} color={Colors.primary} />
										<Text style={styles.streakChipText} numberOfLines={1} ellipsizeMode="tail">{attStreak}일 연속</Text>
									</View>
								)}
								<Text style={styles.greetTitle} numberOfLines={2} ellipsizeMode="tail">{greetTitle}</Text>
							</View>
							{/* 알림 — 캐릭터가 포함된 영역의 오른쪽 끝 */}
							<TouchableOpacity style={styles.headBellBtn} onPress={() => setShowAlarm(true)} hitSlop={10} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="학습 알림 설정">
								<IconComponent type="materialIcons" name={reminderOn ? 'notifications-active' : 'notifications-none'} size={scaledSize(20)} color={reminderOn ? Colors.primary : Colors.textMuted} />
							</TouchableOpacity>
						</View>

						{/* 오늘의 목표 — 하루 10문제 진행 */}
						<View style={styles.goalTop}>
							<TouchableOpacity style={styles.goalTitleRow} activeOpacity={0.7} onPress={() => setShowGoalPicker(true)} accessibilityRole="button" accessibilityLabel="하루 목표 문항 수 변경">
								<IconComponent type="materialIcons" name="flag" size={scaledSize(15)} color={Colors.primary} />
								<Text style={styles.goalTitle}>오늘의 목표</Text>
								<IconComponent type="materialIcons" name="edit" size={scaledSize(13)} color={Colors.textMuted} />
							</TouchableOpacity>
							{todaySolved >= dailyGoal ? (
								<View style={styles.goalDoneRow}>
									<IconComponent type="materialIcons" name="celebration" size={scaledSize(14)} color={Colors.success} />
									<Text style={[styles.goalCount, { color: Colors.success }]}>목표 달성!</Text>
								</View>
							) : (
								<FitText style={styles.goalCount}>{Math.min(todaySolved, dailyGoal)}/{dailyGoal} 문제</FitText>
							)}
						</View>
						<AnimatedProgress
							ratio={todaySolved / dailyGoal}
							color={todaySolved >= dailyGoal ? Colors.success : Colors.primary}
							trackColor={Colors.surfaceAlt}
							height={scaleHeight(8)}
							radius={scaleWidth(4)}
							style={styles.heroProgress}
						/>
					</View>
				</FadeInUp>

				{/* 내 학습 현황 — 메인 요약 카드 (히어로) */}
				<FadeInUp delay={60}>
					<View style={styles.summaryCard}>
						<LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
						{/* 워터마크 — 우하단 트로피 */}
						<View pointerEvents="none" style={styles.summaryWatermark}>
							<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(120)} color={Colors.onBrandWatermark} />
						</View>
						<TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/special/score-detail' as never)}>
						<View style={styles.summaryTop}>
							<View>
								<Text style={styles.summaryLabel}>전체 점수</Text>
								<View style={styles.summaryScoreRow}>
									<CountUp value={score} pop style={styles.summaryScore} />
									<Text style={styles.summaryUnit}>점</Text>
								</View>
							</View>
							<View style={styles.summaryMore}>
								<IconComponent type="materialIcons" name="workspace-premium" size={scaledSize(28)} color={Colors.goldSoft} />
								<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textInverse} />
							</View>
						</View>

						<View style={styles.summaryDivider} />

						<View style={styles.summaryStats}>
							<View style={styles.summaryStat}>
								<FitText style={[styles.summaryStatNum, { color: accuracyColor(accuracy, true) }]}>{accuracy}%</FitText>
								<FitText style={styles.summaryStatLabel}>정답률</FitText>
							</View>
							<View style={styles.summaryStat}>
								<FitText style={styles.summaryStatNum}>{solvedCount.toLocaleString()}</FitText>
								<FitText style={styles.summaryStatLabel}>푼 문제</FitText>
							</View>
							<View style={styles.summaryStat}>
								<FitText style={styles.summaryStatNum}>{attStreak}일</FitText>
								<FitText style={styles.summaryStatLabel}>연속 출석</FitText>
							</View>
						</View>
						</TouchableOpacity>

						{/* 뱃지 — 획득한 것만 가로 목록으로. 전체는 '도감'에서 */}
						{unlockedBadges.length > 0 && (
							<>
								<View style={styles.summaryDivider} />
								<View style={styles.badgeHeadRow}>
									{/* 뱃지 라벨 + 개수 태그 */}
									<View style={styles.badgeLabelChip}>
										<IconComponent type="materialIcons" name="military-tech" size={scaledSize(14)} color={Colors.textInverse} />
										<Text style={styles.badgeLabelText}>뱃지</Text>
									</View>
									<View style={styles.badgeCountTag}>
										<Text style={styles.badgeCountTagText}>{unlockedBadges.length}</Text>
									</View>
									<View style={styles.badgeHeadSpacer} />
									<TouchableOpacity
										style={styles.badgeAllChip}
										activeOpacity={0.85}
										accessibilityRole="button"
										accessibilityLabel="뱃지 전체 보기"
										onPress={() => setShowBadgeSheet(true)}>
										<Text style={styles.badgeAllText}>도감</Text>
										<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(14)} color={Colors.textInverse} />
									</TouchableOpacity>
								</View>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll} contentContainerStyle={styles.badgeRow}>
									{unlockedBadges.map((b) => {
										return (
											<TouchableOpacity
												key={b.def.id}
												// 파란 카드 위 타일 — 면·테두리는 카드와 같은 계열로 두고 등급은 아이콘 색으로만 드러낸다
												style={styles.badgeItem}
												hitSlop={Layout.hitSlop}
												activeOpacity={0.8}
												accessibilityRole="button"
												accessibilityLabel={`${b.def.title} 뱃지 상세`}
												onPress={() => setBadgeDetail(b)}>
											<IconComponent type="materialIcons" name={b.def.icon} size={scaledSize(21)} color={RARITY_ON_BRAND_COLOR[b.def.rarity]} />
											</TouchableOpacity>
										);
									})}
								</ScrollView>
							</>
						)}
					</View>
				</FadeInUp>

				{/* 학습 커리큘럼 — 레벨 테스트 → 학습 → 퀴즈 → 오답노트 → 타임챌린지 (전 단계 완료 시 숨김) */}
				{!curHidden && (
					<FadeInUp delay={100}>
						<Animated.View style={[styles.curCard, { opacity: curFade, transform: [{ scale: curFade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
							<TouchableOpacity style={styles.curHead} activeOpacity={0.8} onPress={toggleCurriculum}>
								<View style={styles.curHeadLeft}>
									<Text style={styles.curTitle}>세계 상식 퀴즈 커리큘럼</Text>
									<Text style={styles.curSub} numberOfLines={1}>
										{curOpen ? '순서대로 따라가면 실력이 쌓여요' : curNextStep ? `다음 단계 · ${curNextStep.label}` : '모든 단계를 마쳤어요'}
									</Text>
								</View>
								<View style={styles.curCountPill}>
									<Text style={styles.curCountText}>{curriculumCleared}/{CURRICULUM.length}</Text>
								</View>
								<IconComponent type="materialIcons" name={curOpen ? 'expand-less' : 'expand-more'} size={scaledSize(22)} color={Colors.textMuted} />
							</TouchableOpacity>
							<AnimatedProgress
								ratio={curriculumCleared / CURRICULUM.length}
								color={Colors.primary}
								trackColor={Colors.surfaceAlt}
								height={scaleHeight(6)}
								radius={scaleWidth(3)}
							/>

							{curOpen && (
							<View style={styles.curList}>
								{CURRICULUM.map((s, i, arr) => {
									const tint = s.accent ?? Colors.primary;
									const done = curriculumDone[s.key];
									const wrongBadge = s.key === 'wrong' && wrongCount > 0;
									return (
										<FadeInUp key={s.key} delay={140 + i * 60}>
											<TouchableOpacity style={styles.curRow} activeOpacity={0.85} onPress={() => router.push(s.href as never)}>
												{/* 좌측 레일 — 단계 번호/체크 + 연결선 */}
												<View style={styles.curRail}>
													{i < arr.length - 1 && <View style={[styles.curLine, done && { backgroundColor: withAlpha(Colors.success, '55') }]} />}
													<View style={[styles.curDot, { backgroundColor: withAlpha(tint, '14'), borderColor: withAlpha(tint, '33') }, done && styles.curDotDone]}>
														{done ? (
															<IconComponent type="materialIcons" name="check" size={scaledSize(16)} color={Colors.textInverse} />
														) : (
															<Text style={[styles.curDotText, { color: tint }]}>{i + 1}</Text>
														)}
													</View>
												</View>

												<View style={[styles.curIcon, { backgroundColor: withAlpha(tint, '14') }]}>
													<IconComponent type="materialIcons" name={s.icon} size={scaledSize(19)} color={tint} />
													{wrongBadge && (
														<View style={styles.curCountBadge}>
															<Text style={styles.curCountBadgeText}>{wrongCount > 99 ? '99+' : wrongCount}</Text>
														</View>
													)}
												</View>

												<View style={styles.curBody}>
													<Text style={[styles.curLabel, done && styles.curLabelDone]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{s.label}</Text>
													<Text style={styles.curDesc} numberOfLines={1}>{s.desc}</Text>
												</View>

												{done ? (
													<View style={styles.curDonePill}>
														<Text style={styles.curDonePillText}>완료</Text>
													</View>
												) : (
													<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(20)} color={Colors.textMuted} />
												)}
											</TouchableOpacity>
										</FadeInUp>
									);
								})}
							</View>
							)}
						</Animated.View>
					</FadeInUp>
				)}

				{/* 오늘의 추천 주제 — 커리큘럼 진행 여부와 무관하게 상시 노출 (X로 닫으면 오늘 하루 숨김) */}
				{!!recommend && !recHidden && (
					<FadeInUp delay={100}>
						<Animated.View style={[styles.recCard, { opacity: recFade, transform: [{ scale: recFade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
							<TouchableOpacity
								style={styles.recClose}
								activeOpacity={0.7}
								hitSlop={10}
								accessibilityRole="button"
								accessibilityLabel="오늘의 추천 닫기 (오늘 하루 숨김)"
								onPress={dismissRecommend}>
								<IconComponent type="materialIcons" name="close" size={scaledSize(18)} color={Colors.textMuted} />
							</TouchableOpacity>
							<View style={styles.recTop}>
								<View style={[styles.recIcon, { backgroundColor: withAlpha(recommend.domain.color, '14') }]}>
									<DomainIcon mainIcon={recommend.domain.mainIcon} icon={recommend.domain.icon} iconType={recommend.domain.iconType} size={scaledSize(recommend.domain.mainIcon ? 30 : 22)} color={recommend.domain.color} />
								</View>
								<View style={styles.recBody}>
									<Text style={styles.recEyebrow}>오늘의 추천</Text>
									<Text style={styles.recTitle} numberOfLines={1}>{recommend.domain.title}</Text>
									{recommend.rate == null ? (
										<Text style={styles.recDesc} numberOfLines={1}>아직 안 풀어본 주제예요</Text>
									) : (
										<Text style={styles.recDesc} numberOfLines={1}>
											정답률 <Text style={{ color: accuracyColor(recommend.rate), fontWeight: '800' }}>{recommend.rate}%</Text> · 조금만 더 다듬어요
										</Text>
									)}
								</View>
							</View>
							<View style={styles.recBtns}>
								<TouchableOpacity style={styles.recGhostBtn} activeOpacity={0.85} onPress={() => moveToCategory(recommend.domain.key)}>
									<IconComponent type="materialIcons" name="auto-stories" size={scaledSize(16)} color={Colors.primary} />
									<Text style={styles.recGhostText}>학습하기</Text>
								</TouchableOpacity>
								<TouchableOpacity style={styles.recSolidBtn} activeOpacity={0.9} onPress={() => router.push({ pathname: '/learn/quiz', params: { category: recommend.domain.key } } as never)}>
									<IconComponent type="materialIcons" name="quiz" size={scaledSize(16)} color={Colors.textInverse} />
									<Text style={styles.recSolidText}>퀴즈 풀기</Text>
								</TouchableOpacity>
							</View>
						</Animated.View>
					</FadeInUp>
				)}

				{/* 바로 시작하기 */}
				<FadeInUp delay={120}>
					<SectionHead title="바로 시작하기" sub="자주 쓰는 기능을 한 번에" />
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.quickScroll}
						contentContainerStyle={styles.quickRow}>
						{quickActions.map((q) => (
							<TouchableOpacity key={q.key} style={styles.quickItem} activeOpacity={0.8} onPress={q.onPress}>
								<View style={[styles.quickCircle, q.emphasis ? { backgroundColor: q.color } : { backgroundColor: withAlpha(q.color, '14') }]}>
									<IconComponent type="materialIcons" name={q.icon} size={scaledSize(24)} color={q.emphasis ? Colors.textInverse : q.color} />
										{q.key === 'today-quiz' && !todayQuizDone && (
											<Pulse style={styles.quickBadge}>
												<Text style={styles.quickBadgeText}>!</Text>
											</Pulse>
										)}
										{q.key === 'today-quiz' && todayQuizDone && (
											<View style={styles.quickDone}>
												<IconComponent type="materialIcons" name="check" size={scaledSize(10)} color={Colors.textInverse} />
											</View>
										)}
										{q.key === 'attend' && checkedToday && (
											<View style={styles.quickDone}>
												<IconComponent type="materialIcons" name="check" size={scaledSize(10)} color={Colors.textInverse} />
											</View>
										)}
										{q.key === 'library' && libraryCount > 0 && (
											<View style={styles.quickCountBadge}>
												<Text style={styles.quickCountText}>{libraryCount > 99 ? '99+' : libraryCount}</Text>
											</View>
										)}
										{q.key === 'wrong-note' && wrongCount > 0 && (
											<View style={[styles.quickCountBadge, { backgroundColor: Colors.error }]}>
												<Text style={styles.quickCountText}>{wrongCount > 99 ? '99+' : wrongCount}</Text>
											</View>
										)}
								</View>
								<Text style={styles.quickLabel} numberOfLines={1} ellipsizeMode="tail">{q.title}</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				</FadeInUp>

				{/* 오늘의 상식 */}
				{daily && (
					<FadeInUp delay={180}>
						<SectionHead title="오늘의 상식" sub="하루 한 개, 오늘의 세계 상식" />
						<TouchableOpacity style={styles.dailyCard} activeOpacity={0.9} onPress={() => setShowDailyDetail(true)}>
							<View style={styles.dailyHead}>
								<View style={[styles.chip, { backgroundColor: withAlpha(dailyAccent, '14') }]}>
									<DomainIcon
										mainIcon={LearnHubService.getDomain(daily.domain).meta.mainIcon}
										icon={LearnHubService.getDomain(daily.domain).meta.icon}
										iconType={LearnHubService.getDomain(daily.domain).meta.iconType}
										size={scaledSize(14)}
										color={dailyAccent}
									/>
									<Text style={[styles.chipText, { color: dailyAccent }]} numberOfLines={1} ellipsizeMode="tail">{LearnHubService.getDomainTitle(daily.domain)}</Text>
								</View>
								<View style={styles.dailyHeadRight}>
									<TouchableOpacity onPress={toggleDailyBookmark} hitSlop={10} activeOpacity={0.7}>
										<IconComponent type="materialIcons" name={dailyBookmarked ? 'star' : 'star-border'} size={scaledSize(22)} color={dailyBookmarked ? Colors.bookmark : Colors.textMuted} />
									</TouchableOpacity>
									<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
								</View>
							</View>
							<Text style={styles.dailyTitle} numberOfLines={2} ellipsizeMode="tail">{daily.title}</Text>
							<Text style={styles.dailyMeaning} numberOfLines={2}>{daily.description || daily.meaning}</Text>
						</TouchableOpacity>
					</FadeInUp>
				)}

				{sectionOrder}

				{compact && newcomer !== null && (
					<TouchableOpacity style={styles.showAllBtn} activeOpacity={0.85} onPress={() => setShowAllSections(true)}>
						<IconComponent type="materialIcons" name="expand-more" size={scaledSize(18)} color={Colors.primary} />
						<Text style={styles.showAllText}>모든 기능 보기</Text>
					</TouchableOpacity>
				)}

				{/* 특별 콘텐츠 */}
				{!compact && (
				<FadeInUp delay={360}>
					<SectionHead title="특별 콘텐츠" sub="더 깊이 파고드는 학습 도구" />
					<View style={styles.featureList}>
						{features.map((f) => (
							<TouchableOpacity key={f.href} style={styles.featureRow} activeOpacity={0.85} onPress={() => router.push(f.href as never)}>
								<View style={[styles.featureIcon, { backgroundColor: withAlpha(f.color, '14') }]}>
									<IconComponent type="materialIcons" name={f.icon} size={scaledSize(24)} color={f.color} />
								</View>
								<View style={styles.featureBody}>
									<Text style={styles.featureTitle} numberOfLines={1} ellipsizeMode="tail">{f.title}</Text>
									<Text style={styles.featureDesc} numberOfLines={1} ellipsizeMode="tail">{f.desc}</Text>
								</View>
								<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
							</TouchableOpacity>
						))}
					</View>
				</FadeInUp>
				)}
			</ScrollView>

			{/* 첫 실행 온보딩 — 관심 주제·하루 목표를 정하고 홈에 바로 반영 */}
			<OnboardingModal
				visible={showAuto('onboarding')}
				onDone={(picked, goal) => {
					setInterest(picked);
					setDailyGoal(goal);
					setShowOnboarding(false);
				}}
			/>

			<AttendanceCheckInModal
				visible={checkInManual || showAuto('checkin')}
				celebrateOnOpen={checkInCelebrate}
				shielded={checkInShielded}
				onClose={closeCheckIn}
			/>

			<DailyAlarmModal
				visible={showAlarm}
				onClose={() => setShowAlarm(false)}
				onChange={setReminderOn}
			/>

			<BottomSheet
				visible={showCharacterPicker}
				onClose={() => setShowCharacterPicker(false)}
				heightRatio={0.88}
				footer={
					<TouchableOpacity style={[styles.charApplyBtn, !previewChar.unlocked && { opacity: 0.45 }]} activeOpacity={0.9} disabled={!previewChar.unlocked} onPress={applyCharacter}>
						<IconComponent type="materialIcons" name={previewChar.unlocked ? 'check' : 'lock'} size={scaledSize(18)} color={Colors.textInverse} />
						<Text style={styles.charApplyText}>{previewChar.unlocked ? '이 캐릭터로 설정' : '잠긴 캐릭터예요'}</Text>
					</TouchableOpacity>
				}>
					<View style={styles.charSheetBody}>
						<View style={styles.modalTitleRow}>
							<Text style={styles.modalTitle}>홈 캐릭터 선택</Text>
							<TouchableOpacity onPress={() => setShowCharacterPicker(false)} hitSlop={10} activeOpacity={0.7}>
								<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.textMuted} />
							</TouchableOpacity>
						</View>
						<Text style={styles.modalSub}>주제별로 획득한 캐릭터를 골라 홈에 표시해요</Text>
						{/* 카테고리 탭 */}
						<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.charTabBar} contentContainerStyle={styles.charTabRow}>
							{pickerTabs.map((t) => {
								const on = pickerTab === t.key;
								return (
									<TouchableOpacity key={t.key} style={[styles.charTab, on && styles.charTabOn]} activeOpacity={0.85} onPress={() => onSelectTab(t.key)} hitSlop={Layout.hitSlop}>
										{t.key === 'overall' ? (
											<ExpoImage source={require('@/src/assets/mainIcon.webp')} style={styles.charTabAppIcon} contentFit="contain" />
										) : (
											<DomainIcon mainIcon={LearnHubService.getDomain(t.key).meta.mainIcon} icon={LearnHubService.getDomain(t.key).meta.icon} iconType={LearnHubService.getDomain(t.key).meta.iconType} size={scaledSize(15)} color={on ? Colors.primary : LearnHubService.getDomain(t.key).meta.color} />
										)}
										<Text style={[styles.charTabText, on && styles.charTabTextOn]} numberOfLines={1} ellipsizeMode="tail">{t.title}</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
						{/* 선택된 캐릭터 미리보기 + 호칭 */}
						<View style={styles.charPreview}>
							{!!previewChar.img && (
								<Animated.View style={{ opacity: charPreviewAnim, transform: [{ translateY: charPreviewAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(12), 0] }) }] }}>
									<ExpoImage source={previewChar.img} style={styles.charPreviewImg} contentFit="contain" />
								</Animated.View>
							)}
							<Text style={styles.charPreviewTitle} numberOfLines={1} ellipsizeMode="tail">{previewChar.title}</Text>
							<Text style={styles.charPreviewReq}>{previewChar.unlocked ? `획득 · ${previewChar.req}` : `잠김 · ${previewChar.req}`}</Text>
							{!!previewChar.desc && <Text style={styles.charPreviewDesc} numberOfLines={2} ellipsizeMode="tail">{previewChar.desc}</Text>}
						</View>
						<ScrollView style={styles.characterScroll} showsVerticalScrollIndicator={false}>
							<View style={styles.characterGrid}>
								{pickerItems.map((c) => {
									const selected = pendingCharKey === c.key;
									return (
										<TouchableOpacity
											key={c.key}
											style={[styles.characterCell, selected && styles.characterCellSelected, !c.unlocked && styles.characterCellLocked]}
											activeOpacity={0.85}
											onPress={() => pickCharacter(c.key)}>
											<View style={styles.characterImgWrap}>
												{c.img && <ExpoImage source={c.img} style={[styles.characterImg, !c.unlocked && { opacity: 0.24 }]} contentFit="contain" />}
												{!c.unlocked && (
													<View style={styles.characterLock}>
														<IconComponent type="materialIcons" name="lock" size={scaledSize(18)} color={Colors.textMuted} />
													</View>
												)}
											</View>
											<Text style={styles.characterTitle} numberOfLines={2}>{c.title}</Text>
											<Text style={styles.characterSub} numberOfLines={2} ellipsizeMode="tail">{c.req}</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</ScrollView>
					</View>
			</BottomSheet>

			{/* 뱃지 도감 — 미획득 포함 전체 뱃지, 희귀도 그룹 + 필터 */}
			<BadgeDexModal
				visible={showBadgeSheet}
				badges={allBadges}
				unlockedCount={unlockedBadges.length}
				onClose={() => setShowBadgeSheet(false)}
				// 도감(모달)이 닫히기 전에 상세(모달)를 띄우면 두 모달이 겹쳐 터치가 먹통이 된다 — 한 박자 뒤에 연다
				onSelect={(b) => {
					badgeFromDexRef.current = true;
					setShowBadgeSheet(false);
					badgeSwapTimer.current = setTimeout(() => setBadgeDetail(b), MODAL_SWAP_MS);
				}}
			/>

			{/* 뱃지 상세 — 홈 목록·도감 공용 */}
			<CharacterGuide
				visible={showAuto('guide')}
				onClose={homeGuide.close}
				lines={[
					'안녕! 여기가 홈이에요. 내 캐릭터를 누르면 다른 캐릭터로 바꿀 수 있어요.',
					'아래 주제를 골라 학습하고 퀴즈까지 이어서 풀면 점수가 쌓여요.',
					'매일 출석과 오늘의 퀴즈를 챙기면 뱃지를 모을 수 있어요!',
				]}
				title="홈, 이렇게 써요"
			/>

			<BadgeDetailModal
				badge={badgeDetail}
				onClose={() => {
					setBadgeDetail(null);
					if (badgeFromDexRef.current) {
						badgeFromDexRef.current = false;
						badgeSwapTimer.current = setTimeout(() => setShowBadgeSheet(true), MODAL_SWAP_MS);
					}
				}}
				unlockedCount={unlockedBadges.length}
				totalCount={allBadges.length}
			/>

			{/* 하루 목표 문항 수 선택 */}
			<BottomSheet visible={showGoalPicker} onClose={() => setShowGoalPicker(false)}>
				<View>
					<View style={styles.modalTitleRow}>
						<Text style={styles.modalTitle}>하루 목표</Text>
						<TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setShowGoalPicker(false)} hitSlop={10} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="하루 목표 설정 닫기">
							<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>
					<Text style={styles.modalSub}>매일 몇 문제를 목표로 할까요?</Text>
					<View style={styles.goalOptions}>
						{DAILY_GOAL_OPTIONS.map((n) => {
							const on = dailyGoal === n;
							return (
								<TouchableOpacity
									key={n}
									style={[styles.goalOption, on && styles.goalOptionOn]}
									activeOpacity={0.85}
									accessibilityRole="radio"
									accessibilityState={{ selected: on }}
									onPress={() => {
										setDailyGoal(n);
										AsyncStorage.setItem(DAILY_GOAL_KEY, String(n)).catch(() => {});
										setShowGoalPicker(false);
										showToast(`하루 목표를 ${n}문제로 바꿨어요`, 'flag');
									}}>
									<Text style={[styles.goalOptionNum, on && styles.goalOptionNumOn]}>{n}</Text>
									<Text style={[styles.goalOptionLabel, on && styles.goalOptionLabelOn]}>문제</Text>
									<Text style={styles.goalOptionDesc}>{n === 5 ? '가볍게' : n === 10 ? '적당히' : '집중해서'}</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>
			</BottomSheet>

			{/* 신규 업적 축하 (퀴즈 화면 밖에서 달성한 경우) */}
			<AchievementUnlockModal visible={showAuto('achievement')} achievements={newAch} onClose={() => setNewAch([])} />

			{/* 학습 커리큘럼 완주 축하 — 닫으면 커리큘럼 카드가 스르륵 사라짐 */}
			<AppModal visible={showAuto('curriculum')} transparent animationType="fade" onRequestClose={closeCurriculumCelebrate}>
				<View style={styles.unlockOverlay}>
					<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeCurriculumCelebrate} />
					<View style={styles.unlockSheet}>
						<LottieBox source={LOTTIE_CELEBRATE} autoPlay loop={false} style={styles.unlockLottie} />
						<View style={styles.curDoneIcon}>
							<IconComponent type="materialIcons" name="emoji-events" size={scaledSize(40)} color={Colors.primary} />
						</View>
						<Text style={styles.unlockEyebrow}>커리큘럼 완주!</Text>
						<Text style={styles.unlockTitle}>5단계를 모두 마쳤어요</Text>
						<Text style={styles.curDoneDesc}>이제 홈이 더 깔끔해져요.{'\n'}원하는 학습을 자유롭게 이어가 보세요!</Text>
						<TouchableOpacity style={styles.unlockBtn} activeOpacity={0.9} onPress={closeCurriculumCelebrate}>
							<Text style={styles.unlockBtnText}>좋아요</Text>
						</TouchableOpacity>
					</View>
				</View>
			</AppModal>

			{/* 새 캐릭터 해제 축하 */}
			<AppModal visible={showAuto('unlock')} transparent animationType="fade" onRequestClose={() => setUnlockedInfo(null)}>
				<View style={styles.unlockOverlay}>
					<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setUnlockedInfo(null)} />
					{!!unlockedInfo && (
						<View style={styles.unlockSheet}>
							<LottieBox source={LOTTIE_CELEBRATE} autoPlay loop={false} style={styles.unlockLottie} />
							<ExpoImage source={unlockedInfo.img} style={styles.unlockImg} contentFit="contain" />
							<Text style={styles.unlockEyebrow}>새 캐릭터 해제!</Text>
							<Text style={styles.unlockTitle} numberOfLines={1} ellipsizeMode="tail">{unlockedInfo.title}</Text>
							<TouchableOpacity style={styles.unlockBtn} activeOpacity={0.9} onPress={() => setUnlockedInfo(null)}>
								<Text style={styles.unlockBtnText}>확인</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			</AppModal>

			{/* 오늘의 상식 상세 팝업 */}
			<BottomSheet visible={showDailyDetail && !!daily} onClose={() => setShowDailyDetail(false)}>
						{!!daily && (
						<View>
							<View style={styles.modalTagRow}>
								<View style={[styles.chip, { backgroundColor: withAlpha(dailyAccent, '14') }]}>
									<DomainIcon
										mainIcon={LearnHubService.getDomain(daily.domain).meta.mainIcon}
										icon={LearnHubService.getDomain(daily.domain).meta.icon}
										iconType={LearnHubService.getDomain(daily.domain).meta.iconType}
										size={scaledSize(14)}
										color={dailyAccent}
									/>
									<Text style={[styles.chipText, { color: dailyAccent }]} numberOfLines={1} ellipsizeMode="tail">{LearnHubService.getDomainTitle(daily.domain)}</Text>
								</View>
								{!!daily.categoryLabel && (
									<View style={[styles.chip, { backgroundColor: Colors.surfaceAlt }]}>
										<IconComponent type="materialIcons" name={categoryIcon(daily.categoryLabel)} size={scaledSize(12)} color={Colors.textSecondary} />
										<Text style={[styles.chipText, { color: Colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{daily.categoryLabel}</Text>
									</View>
								)}
								{!!daily.levelLabel && daily.levelLabel !== daily.categoryLabel && (
									<View style={[styles.chip, { backgroundColor: Colors.surfaceAlt }]}>
										<IconComponent type="materialIcons" name={difficultyIcon(daily.levelLabel)} size={scaledSize(12)} color={Colors.textSecondary} />
										<Text style={[styles.chipText, { color: Colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{daily.levelLabel}</Text>
									</View>
								)}
							</View>
							<View style={styles.modalTitleRow}>
								<Text style={styles.modalTitle} numberOfLines={2} ellipsizeMode="tail">{daily.title}</Text>
								<TouchableOpacity onPress={toggleDailyBookmark} hitSlop={10} activeOpacity={0.7}>
									<IconComponent type="materialIcons" name={dailyBookmarked ? 'star' : 'star-border'} size={scaledSize(24)} color={dailyBookmarked ? Colors.bookmark : Colors.textMuted} />
								</TouchableOpacity>
								<TouchableOpacity onPress={() => setShowDailyDetail(false)} hitSlop={10} activeOpacity={0.7}>
									<IconComponent type="materialIcons" name="close" size={scaledSize(24)} color={Colors.textMuted} />
								</TouchableOpacity>
							</View>
							{!!daily.subTitle && <Text style={styles.modalSub} numberOfLines={2} ellipsizeMode="tail">{daily.subTitle}</Text>}
							<ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
								<View style={styles.modalGroup}>
									<Text style={[styles.modalLabel, { color: dailyAccent }]}>뜻</Text>
									<Text style={styles.modalText}>{daily.description || daily.meaning}</Text>
									{!!daily.description && daily.description !== daily.meaning && (
										<>
											<Text style={[styles.modalLabel, { color: dailyAccent, marginTop: SpacingV.lg }]}>요약</Text>
											<Text style={styles.modalDesc} numberOfLines={2} ellipsizeMode="tail">{daily.meaning}</Text>
										</>
									)}
									{!!daily.examples && daily.examples.length > 0 && (
										<>
											<View style={styles.modalGroupDivider} />
											<Text style={[styles.modalLabel, { color: dailyAccent }]}>더 알아보기</Text>
											{daily.examples.map((ex, i) => (
												<Text key={i} style={styles.modalExample}>· {ex}</Text>
											))}
										</>
									)}
								</View>
							</ScrollView>
							<TouchableOpacity
								style={styles.modalCta}
								activeOpacity={0.9}
								onPress={() => {
									setShowDailyDetail(false);
									router.push({ pathname: '/learn/category', params: { category: daily.domain } } as never);
								}}>
								<Text style={styles.modalCtaText}>이 주제 학습하기</Text>
								<IconComponent type="materialIcons" name="arrow-forward" size={scaledSize(17)} color={Colors.textInverse} />
							</TouchableOpacity>
						</View>
						)}
			</BottomSheet>
		</View>
	);
};

export default withRemountOnFocus(Hub);


/** 학습 커리큘럼 카드 (레벨 테스트 → … → 타임챌린지) */
const flowStyles = themed(() => ({
	curCard: { ...CardSurface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.lg, paddingBottom: SpacingV.sm, marginBottom: Layout.sectionGap },
	curHead: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: Spacing.sm, marginBottom: SpacingV.md },
	curHeadLeft: { flex: 1, paddingRight: Spacing.md },
	curTitle: { fontSize: Typography.callout, fontWeight: '900' as const, color: Colors.textStrong },
	curSub: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xxs },
	curCountPill: { backgroundColor: Colors.primaryBg, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs },
	curCountText: { fontSize: Typography.footnote, fontWeight: '900' as const, color: Colors.primary },
	curList: { marginTop: SpacingV.md },
	curRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.md, paddingVertical: SpacingV.sm },
	curRail: { width: scaleWidth(26), alignSelf: 'stretch' as const, alignItems: 'center' as const, justifyContent: 'center' as const },
	curLine: { position: 'absolute' as const, top: '50%' as const, bottom: -scaleHeight(2), width: scaleWidth(2), backgroundColor: Colors.border },
	curDot: { width: scaleWidth(24), height: scaleWidth(24), borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
	curDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
	curDotText: { fontSize: Typography.footnote, fontWeight: '900' as const },
	curIcon: { width: scaleWidth(38), height: scaleWidth(38), borderRadius: Radius.md, justifyContent: 'center' as const, alignItems: 'center' as const },
	curBody: { flex: 1 },
	curLabel: { fontSize: Typography.body, fontWeight: '800' as const, color: Colors.textStrong },
	curLabelDone: { color: Colors.textSecondary },
	curDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xxs },
	curDonePill: { backgroundColor: Colors.successSoft, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs },
	curDonePillText: { fontSize: Typography.micro, fontWeight: '900' as const, color: Colors.success },
	curCountBadge: { position: 'absolute' as const, top: -scaleHeight(4), right: -scaleWidth(6), minWidth: scaleWidth(16), height: scaleWidth(16), paddingHorizontal: Spacing.xxs, borderRadius: Radius.pill, backgroundColor: Colors.error, justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: Border.thin, borderColor: Colors.surface },
	curCountBadgeText: { fontSize: Typography.micro, fontWeight: '900' as const, color: Colors.textInverse },
	subPlayPill: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.pill },
	subPlayText: { fontSize: Typography.footnote, fontWeight: '800' as const },
}));

const styles = themed(() => StyleSheet.create({
	showAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, paddingVertical: SpacingV.lg, marginTop: SpacingV.md },
	showAllText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.primary },
	...flowStyles,
	safe: { flex: 1, backgroundColor: Colors.background },
	container: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },

	// 히어로 (인사 + 오늘의 목표 + 주 CTA)
	hero: { ...CardSurface, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, marginBottom: Layout.sectionGap },
	appTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
	appTitle: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong, marginBottom: SpacingV.md },
	heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: SpacingV.lg },
	heroProgress: { marginBottom: 0 },

	// 인사
	greetCharacterWrap: { width: scaleArt(72), height: scaleArt(72), borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
	characterEditBadge: { position: 'absolute', right: -scaleWidth(3), bottom: -scaleWidth(3), width: scaleWidth(22), height: scaleWidth(22), borderRadius: Radius.pill, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: Border.thick, borderColor: Colors.surface },
	greetCharacterImg: { width: scaleArt(64), height: scaleArt(64), borderRadius: Radius.lg },
	greeting: { flex: 1 },
	greetTitle: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong, lineHeight: scaleHeight(27) },

	// 요약 카드 (히어로)
	summaryCard: { paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg, marginBottom: Layout.sectionGap, borderRadius: Radius.xl, overflow: 'hidden' },
	summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
	summaryLabel: { fontSize: Typography.body, fontWeight: '800', color: Colors.onBrandTextSoft },
	summaryScoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: SpacingV.sm },
	summaryScore: { fontSize: Typography.displayLg, fontWeight: '900', color: Colors.successBright, letterSpacing: 0 },
	summaryUnit: { fontSize: Typography.title, fontWeight: '900', color: Colors.onBrandText, marginLeft: Spacing.xs },
	summaryMore: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginTop: SpacingV.xxs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.sm, borderRadius: Radius.lg, backgroundColor: Colors.onBrandSurface },
	summaryDivider: { height: 1, backgroundColor: Colors.onBrandDivider, marginVertical: SpacingV.lg },
	summaryStats: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm },
	summaryStat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.md, paddingHorizontal: Spacing.xs, borderRadius: Radius.lg, backgroundColor: Colors.onBrandSurface, borderWidth: 1, borderColor: Colors.onBrandBorderSoft },
	summaryStatNum: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textInverse },
	summaryStatLabel: { fontSize: Typography.footnote, color: Colors.onBrandTextSoft, fontWeight: '700', marginTop: SpacingV.xs },

	// 빠른 시작
	quickScroll: { marginHorizontal: -Layout.screenH, marginBottom: Layout.sectionGap },
	quickRow: { paddingHorizontal: Layout.screenH, paddingTop: SpacingV.sm, gap: Spacing.lg },
	quickItem: { alignItems: 'center', minWidth: scaleWidth(56), paddingHorizontal: Spacing.xxs },
	quickCircle: { width: scaleWidth(52), height: scaleWidth(52), borderRadius: Radius.pill, justifyContent: 'center', alignItems: 'center', marginBottom: SpacingV.sm },
	quickLabel: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.text, textAlign: 'center' },
	quickBadge: { position: 'absolute', top: scaleWidth(-4), right: scaleWidth(-4), width: scaleWidth(18), height: scaleWidth(18), borderRadius: Radius.pill, backgroundColor: Colors.error, borderWidth: Border.thin, borderColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
	quickBadgeText: { color: Colors.textInverse, fontSize: Typography.micro, fontWeight: '900', lineHeight: scaledSize(12) },
	quickDone: { position: 'absolute', top: scaleWidth(-2), right: scaleWidth(-2), width: scaleWidth(16), height: scaleWidth(16), borderRadius: Radius.pill, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center', borderWidth: Border.thin, borderColor: Colors.background },
	quickCountBadge: { position: 'absolute', top: scaleWidth(-5), right: scaleWidth(-6), minWidth: scaleWidth(18), height: scaleWidth(18), paddingHorizontal: Spacing.xs, borderRadius: Radius.pill, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: Border.thin, borderColor: Colors.background },
	quickCountText: { color: Colors.textInverse, fontSize: Typography.micro, fontWeight: '900', lineHeight: scaledSize(12) },
	streakChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: Spacing.xxs, backgroundColor: Colors.primarySoft, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, marginBottom: SpacingV.xs },
	goalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.sm },
	goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	goalTitle: { fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	goalCount: { fontSize: Typography.body, fontWeight: '800', color: Colors.primary },
	goalDoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	summaryWatermark: { position: 'absolute', right: -scaleWidth(14), bottom: -scaleHeight(18), transform: [{ rotate: '-12deg' }] },
	unlockOverlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Layout.screenH },
	unlockSheet: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingVertical: SpacingV.xxl, paddingHorizontal: Spacing.xl, alignItems: 'center' },
	unlockLottie: { position: 'absolute', top: 0, left: 0, right: 0, height: scaleHeight(180) },
	unlockImg: { width: scaleArt(96), height: scaleArt(96), borderRadius: Radius.xxl },
	// 완주 후 추천 카드
	recCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.sectionGap },
	recClose: { position: 'absolute' as const, top: SpacingV.sm, right: Spacing.sm, padding: Spacing.xs, zIndex: 1 },
	recTop: { flexDirection: 'row' as const, alignItems: 'center' as const },
	recIcon: { width: scaleWidth(48), height: scaleWidth(48), borderRadius: Radius.lg, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: Spacing.md },
	recBody: { flex: 1, paddingRight: Spacing.xl },
	recEyebrow: { fontSize: Typography.footnote, fontWeight: '800' as const, color: Colors.primary },
	recTitle: { fontSize: Typography.callout, fontWeight: '900' as const, color: Colors.textStrong, marginTop: SpacingV.xxs },
	recDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xxs },
	recBtns: { flexDirection: 'row' as const, gap: Spacing.sm, marginTop: SpacingV.lg },
	recGhostBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: Spacing.xs, paddingVertical: SpacingV.md, borderRadius: Radius.md, backgroundColor: Colors.primaryBg },
	recGhostText: { fontSize: Typography.footnote, fontWeight: '800' as const, color: Colors.primary },
	recSolidBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: Spacing.xs, paddingVertical: SpacingV.md, borderRadius: Radius.md, backgroundColor: Colors.primary },
	recSolidText: { fontSize: Typography.footnote, fontWeight: '800' as const, color: Colors.textInverse },

	// 커리큘럼 완주 축하
	curDoneIcon: { width: scaleWidth(84), height: scaleWidth(84), borderRadius: Radius.pill, backgroundColor: Colors.primarySoft, alignItems: 'center' as const, justifyContent: 'center' as const },
	curDoneDesc: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center' as const, lineHeight: scaleHeight(20), marginTop: SpacingV.sm },
	unlockEyebrow: { fontSize: Typography.body, fontWeight: '800', color: Colors.primary, marginTop: SpacingV.md },
	unlockTitle: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.xs, textAlign: 'center' },
	unlockBtn: { alignSelf: 'stretch', marginTop: SpacingV.lg, paddingVertical: SpacingV.md, borderRadius: Radius.lg, backgroundColor: Colors.primary, alignItems: 'center' },
	unlockBtnText: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
	streakChipText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },

	// 오늘의 상식
	dailyCard: { ...CardSurface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Layout.sectionGap },
	dailyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	dailyHeadRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	dailyTitle: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.lg },
	dailyMeaning: { fontSize: Typography.body, color: Colors.text, marginTop: SpacingV.sm, lineHeight: scaleHeight(20) },

	// 공통 칩
	chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.sm },
	chipText: { fontSize: Typography.footnote, fontWeight: '800' },

	// 알림 버튼 — 캐릭터 영역의 오른쪽 끝(상단)에 고정
	headBellBtn: { alignSelf: 'flex-start', width: Layout.touch, height: Layout.touch, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
	expandBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primaryBg, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	expandText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },

	// 주제 목록 (펼치기)
	topicList: { marginBottom: Layout.sectionGap, gap: Layout.itemGap },
	topicRow: { ...CardSurface, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
	topicRowIcon: { width: scaleWidth(44), height: scaleWidth(44), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
	topicRowBody: { flex: 1 },
	topicRowTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	topicRowSub: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },
	topicRowExample: { fontSize: Typography.footnote, color: Colors.textMuted, marginTop: SpacingV.xs, lineHeight: scaleHeight(16) },

	// 캐러셀
	carousel: { marginBottom: Layout.sectionGap, marginHorizontal: -Layout.screenH },
	carouselList: { paddingHorizontal: Layout.screenH, gap: Spacing.md },
	topicCard: { ...CardSurface, borderRadius: Radius.lg, width: scaleWidth(248), padding: Spacing.lg },
	topicTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	topicIcon: { width: scaleWidth(48), height: scaleWidth(48), borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center' },
	topicTitle: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.lg },
	topicDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs, lineHeight: scaleHeight(18), minHeight: scaleHeight(36) },
	topicExampleBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.sm, marginTop: SpacingV.md, minHeight: scaleHeight(58) },
	topicExampleTag: { fontSize: Typography.footnote, fontWeight: '900', marginBottom: SpacingV.xs },
	topicExampleText: { fontSize: Typography.footnote, color: Colors.text, lineHeight: scaleHeight(17), fontWeight: '600' },
	topicBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radius.md, paddingVertical: SpacingV.md, marginTop: SpacingV.lg },
	topicBtnText: { color: Colors.textInverse, fontSize: Typography.body, fontWeight: '800' },

	// 공통 카운트 필
	countPill: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	countPillText: { fontSize: Typography.footnote, fontWeight: '800' },

	// 스코어 카드 안쪽 — 카드 좌우 패딩만큼 빼서 끝까지 흐르게
	badgeScroll: { marginHorizontal: -Spacing.lg },
	// 뱃지가 적을 때도 가운데 정렬(많으면 그대로 스크롤)
	badgeRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
	// 브랜드 카드 위라 반투명 흰 타일로 통일 — 희귀도 색은 파랑 계열이 많아 묻힌다(전설만 골드 테두리)
	// 파란 카드 위 타일 — 면도 같은 파랑 계열(진한 톤)로 두고 등급은 아이콘 색으로만 드러낸다
	// 파란 카드가 그대로 비치는 반투명 면 — 색은 아이콘(등급)만 가진다
	badgeItem: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.md, backgroundColor: Colors.onBrandSurface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.onBrandBorderSoft },
	badgeHeadRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.md },
	// 뱃지 라벨·개수 태그 — 브랜드 카드 위 반투명 면
	badgeLabelChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.onBrandSurface, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs },
	badgeLabelText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse },
	badgeCountTag: { minWidth: scaleWidth(22), alignItems: 'center', backgroundColor: Colors.onBrandSurfaceStrong, borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, paddingVertical: SpacingV.xxs },
	badgeCountTagText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.textInverse },
	badgeHeadSpacer: { flex: 1 },
	badgeAllChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, backgroundColor: Colors.onBrandSurfaceStrong, borderRadius: Radius.pill, paddingLeft: Spacing.md, paddingRight: Spacing.sm, paddingVertical: SpacingV.xxs },
	badgeAllText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse },
	charSheetBody: { flex: 1 },
	sheetCloseBtn: { width: Layout.touch, height: Layout.touch, alignItems: 'center', justifyContent: 'center' },

	// 하루 목표 선택
	goalOptions: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.lg },
	goalOption: { flex: 1, alignItems: 'center', paddingVertical: SpacingV.lg, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
	goalOptionOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
	goalOptionNum: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong },
	goalOptionNumOn: { color: Colors.primary },
	goalOptionLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	goalOptionLabelOn: { color: Colors.primary },
	goalOptionDesc: { marginTop: SpacingV.xs, fontSize: Typography.micro, fontWeight: '700', color: Colors.textMuted },

	// 특별 콘텐츠 — 액션 버튼 리스트 (좌 아이콘 / 우 제목+서브설명)
	featureList: { marginBottom: Layout.sectionGap, gap: Layout.itemGap },
	featureRow: { ...CardSurface, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md },
	featureIcon: { width: scaleWidth(46), height: scaleWidth(46), borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	featureBody: { flex: 1 },
	featureTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	featureDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },

	// 오늘의 상식 모달
	modalTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: SpacingV.md },
	modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
	modalTitle: { flex: 1, fontSize: Typography.h2, fontWeight: '900', color: Colors.textStrong },
	modalSub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.sm },
	modalScroll: { marginTop: SpacingV.lg, flexGrow: 0, flexShrink: 1 },
	modalGroup: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.lg },
	modalGroupDivider: { height: 1, backgroundColor: Colors.border, marginVertical: SpacingV.lg },
	modalLabel: { fontSize: Typography.footnote, fontWeight: '900', marginBottom: SpacingV.sm },
	modalText: { fontSize: Typography.callout, color: Colors.textStrong, fontWeight: '700', lineHeight: scaleHeight(25) },
	modalDesc: { fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(22) },
	modalExample: { fontSize: Typography.body, color: Colors.textSecondary, lineHeight: scaleHeight(22), marginTop: SpacingV.xs },
	modalCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.md, paddingVertical: SpacingV.lg, marginTop: SpacingV.lg, backgroundColor: Colors.primary },
	modalCtaText: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
	charTabBar: { marginTop: SpacingV.md, height: scaleHeight(44), flexGrow: 0, flexShrink: 0 },
	charTabRow: { gap: Spacing.sm, alignItems: 'center' },
	charTab: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.sm, borderRadius: Radius.xl, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
	charApplyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.md, paddingVertical: SpacingV.md, borderRadius: Radius.lg, backgroundColor: Colors.primary },
	charApplyText: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
	charTabOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primarySoft },
	charTabAppIcon: { width: scaleWidth(16), height: scaleWidth(16), borderRadius: scaleWidth(4) },
	charTabText: { flexShrink: 1, fontSize: Typography.footnote, lineHeight: scaleHeight(18), fontWeight: '800', color: Colors.textMuted, textAlign: 'center' },
	charTabTextOn: { color: Colors.primary },
	charPreview: { flexShrink: 0, alignItems: 'center', marginTop: SpacingV.sm, paddingVertical: SpacingV.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
	charPreviewImg: { width: scaleArt(104), height: scaleArt(104), borderRadius: Radius.xxl },
	charPreviewTitle: { flexShrink: 1, fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.sm, textAlign: 'center' },
	charPreviewReq: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xxs },
	charPreviewDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, textAlign: 'center', lineHeight: scaleHeight(19), marginTop: SpacingV.xs, paddingHorizontal: Spacing.lg },
	characterScroll: { marginTop: SpacingV.sm, flex: 1 },
	characterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingBottom: SpacingV.sm },
	characterCell: { width: isTablet ? '23%' : '30%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, paddingVertical: SpacingV.md, paddingHorizontal: Spacing.xs },
	characterCellSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
	characterCellLocked: { opacity: 0.75 },
	characterImgWrap: { width: scaleArt(78), height: scaleArt(78), alignItems: 'center', justifyContent: 'center' },
	characterImg: { width: scaleArt(74), height: scaleArt(74), borderRadius: Radius.lg },
	characterLock: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
	characterTitle: { fontSize: Typography.footnote, lineHeight: scaleHeight(16), fontWeight: '900', color: Colors.textStrong, marginTop: SpacingV.sm, textAlign: 'center' },
	characterSub: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xs, textAlign: 'center' },
}));
