/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Image, InteractionManager, Easing as RNEasing } from 'react-native';
import { Image as ExpoImage, type ImageSource } from 'expo-image';
import Reanimated, {
	cancelAnimation,
	Easing,
	interpolate,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/utils/DateUtils';
import AppModal from '@/src/screens/common/atomic/AppModal';
import { useTopBarAccent } from '@/src/utils/TopBarColor';
import { ScheduleWrongReviewReminder } from '@/src/utils/NotifactionHelper';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import LottieBox from '@/src/screens/common/atomic/LottieBox';
import Colors, { withAlpha, EMBER_GRADIENT, HEAT_GRADIENT, NIGHT_GRADIENT } from '@/src/const/ConstColors';
import { Border, Layout, Radius, Shadow, Spacing, SpacingV, Tracking, Typography } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth, screenHeight, contentWidth, scaleArt, isTablet } from '@/src/utils';
import { LearnType } from '@/src/types/data/LearnType';
import { setQuizInProgress } from '@/src/utils/ThemeReload';
import LearnProgressService from '@/src/services/LearnProgressService';
import RankingService from '@/src/services/RankingService';
import LearnItemCard, { learnListFields } from '@/src/screens/common/LearnItemCard';
import LearnHubService from '@/src/services/LearnHubService';
import AchievementService from '@/src/services/AchievementService';
import { AchievementDef } from '@/src/const/ConstAchievements';
import AchievementUnlockModal from '@/src/screens/modal/AchievementUnlockModal';
import DetailSheet from '@/src/screens/modal/DetailSheet';

// Lottie 애니메이션 애셋
const IMG_CORRECT = require('@/src/assets/illustrations/lion/lion-quiz-correct.webp');
const IMG_WRONG = require('@/src/assets/illustrations/lion/lion-quiz-wrong.webp');
const IMG_TIMEOUT = require('@/src/assets/illustrations/lion/lion-quiz-timeout.webp');
const LOTTIE_CONFETTI = require('@/src/assets/lottie/confetti.json');
const LOTTIE_LOADING = require('@/src/assets/lottie/loading.json');
import ExitConfirmModal from '@/src/screens/modal/ExitConfirmModal';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { POINT_PER_CORRECT } from '@/src/const/ConstScoring';
import { hapticSuccess, hapticError, hapticLight } from '@/src/utils/HapticUtils';
import BottomButton from '@/src/screens/common/atomic/BottomButton';
import { playCorrect, playWrong, playFinish, playTimeout, playCombo, playTick, playWhoosh, playPop, isSoundEnabled, setSoundEnabled } from '@/src/utils/SoundUtils';
import { useToast } from '@/src/context/ToastContext';
import { startBgm, stopBgm } from '@/src/utils/BgmUtils';
import { categoryIcon, compareDifficultyLabels, difficultyIcon, sortByLevelAsc } from '@/src/const/ConstQuizMeta';
import DomainIcon from '@/src/screens/common/atomic/DomainIcon';
import DonutChart from '@/src/screens/common/atomic/DonutChart';
import { QuizCardSkeleton } from '@/src/screens/common/atomic/Skeleton';
import { SHARED_STATE_ILLUSTRATIONS } from '@/src/const/ConstIllustrationAssets';
import AdaptiveGrid from '@/src/screens/common/layout/AdaptiveGrid';
import EntryImage from '@/src/screens/common/atomic/EntryImage';
import CountryFlags from '@/src/screens/common/atomic/CountryFlags';
import { isWideImageRef } from '@/src/const/data/world/ConstWorldImages';
import { themed } from '@/src/utils/ThemedStyles';

// 보기 선택 피드백 애니메이션용 (정답 팝 / 오답 셰이크)
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
/** 답 선택 후 보기 색 피드백을 보여주는 딜레이(ms) — 필요 시 조정 */
const EXPLAIN_DELAY = 1500;
/** 빠른 기기에서도 로딩 상태를 사용자가 인지할 수 있는 최소 시간 */
const MIN_RESTART_LOADING_MS = 600;
/** 연속 정답이 이만큼 쌓이면 다음 차례를 한 단계 위 난이도로 당긴다 */
const ADAPTIVE_COMBO = 3;
/** 진행바 세그먼트가 너무 잘게 쪼개지지 않는 최대 문항 수 (타임 챌린지 같은 대량 출제는 표시하지 않음) */
const LEVEL_STRIP_MAX = 20;
/** 난이도별 진행바 농도 — 헤더(accent 배경) 위 흰색 알파로 표현해 새 색을 만들지 않는다 */
const LEVEL_ALPHA: Record<string, string> = { 초급: '59', 중급: '8C', 고급: 'BF', 특급: 'FF' };

/**
 * 문제 카드 표현 — 한국어 퀴즈는 도메인마다(맞춤법=문장, 관용구=대화…) 틀을 바꿨다.
 * 세계 상식 문항은 모두 '표제 한 줄' 이라 기본 틀 하나로 그리고, 그림 문항만 그림 틀을 쓴다.
 */
const getQuestionPresentation = (_q: LearnType.QuizQuestion) => ({ variant: 'classic' as 'classic' | 'sentence' | 'chat' | 'word' | 'relation' | 'play' | 'story' });

/** 오답노트 표시용 — 원본 문항 + 그때 내가 고른 답의 인덱스(시간초과 시 -1) */
type WrongEntry = LearnType.QuizQuestion & { userAnswerIndex: number };

const getResultProfile = (rate: number, wrongCount: number) => {
	if (rate >= 90) return { title: '정확한 판단형', desc: '핵심 단서를 빠르게 잡고 안정적으로 정답을 고르는 편이에요.' };
	if (rate >= 70) return { title: '감각 성장형', desc: wrongCount > 0 ? '기본 상식은 탄탄해요. 헷갈린 문제만 다시 보면 더 단단해져요.' : '상식의 폭이 넓어요. 조금 더 어려운 문제도 도전해볼 만해요.' };
	if (rate >= 40) return { title: '복습 효율형', desc: '틀린 문제가 학습 포인트예요. 오답노트로 같은 패턴을 짧게 반복하면 좋아요.' };
	return { title: '기초 다지기형', desc: '지금은 정답보다 해설을 읽는 시간이 더 중요해요. 쉬운 문제부터 다시 쌓아보세요.' };
};

export interface LearnQuizPlayerProps {
	/** 헤더 제목 */
	title: string;
	/** 강조 색상 */
	accent: string;
	/** 문항 생성 함수 (다시 풀기 시 재생성) */
	generate: () => LearnType.QuizQuestion[];
	/**
	 * 나머지 문항 생성 (선택) — 대량 출제 시 체감 로딩 제거용
	 * `generate()` 로 첫 묶음만 즉시 만들어 퀴즈를 시작하고,
	 * 이 함수는 상호작용이 끝난 뒤 백그라운드로 실행해 뒤 문항을 이어붙입니다(uid 기준 중복 제거).
	 */
	generateRest?: () => LearnType.QuizQuestion[];
	/** 난이도 오름차순 출제 (기본 true) — 타임 챌린지처럼 섞인 순서가 나은 모드는 false */
	orderByLevel?: boolean;
	/** 연속 정답 시 남은 문항 중 한 단계 위 난이도를 앞으로 당김 (기본 true, 난이도 정렬 모드에서만 동작) */
	adaptive?: boolean;
	/** 제한 시간 모드 */
	timed?: boolean;
	/** 제한 시간(초) — timed일 때 */
	timeSec?: number;
	/** 종료 후 이동 경로 (기본 허브) */
	homeHref?: string;
	/** 결과 부제 라벨 */
	modeLabel?: string;
	/** 오답 복습 모드 — 정답 맞힌 항목은 오답노트에서 자동 제거 */
	reviewMode?: boolean;
	/** 결과에 '오답 복습' 다음 단계 제안 (기본 true) */
	suggestWrongReview?: boolean;
	/** 결과에 '타임 챌린지' 다음 단계 제안 (기본 true) */
	suggestTimeChallenge?: boolean;
	/** 통계 모드 키 (mix/ox/blank/time/review/domain) — 업적/모드 통계용 */
	mode?: string;
	/** 해설 팝업 없이 바로 다음 문제로 (오늘의 퀴즈 등) */
	noExplain?: boolean;
	/** 문제별 남은 시간 타이머/자동 오답 처리 숨김 (오늘의 퀴즈 등) */
	hideTimer?: boolean;
	/** 메인 점수·통계·오답노트 반영 여부 (서브 퀴즈는 false) */
	trackProgress?: boolean;
	/** 시작 안내 화면의 기능별 대표 이미지 */
	startIllustration?: ImageSource;
	/** 문항 채점 직후 호출 (중도 종료해도 문항 단위로 반영된다) */
	onAnswered?: (info: { uid: string; correct: boolean }) => void;
	/**
	 * 결과 화면을 플레이어가 그리지 않고 호출한 화면이 직접 마무리 UI를 그릴 때 사용.
	 * 기록 저장이 끝난 뒤 호출된다(오늘의 퀴즈 → '다음 퀴즈까지' 완료 화면).
	 */
	onFinish?: () => void;
}

/**
 * 통합 퀴즈 플레이어 (공용)
 * - 4지선다 / OX / 빈칸 등 QuizQuestion 기반 모든 모드를 렌더링
 * - 콤보, (선택) 타이머, 해설, 결과(점수/오답노트/컨페티)
 * - 종료 시 통계·오답노트를 AsyncStorage에 자동 저장
 */
const LearnQuizPlayer: React.FC<LearnQuizPlayerProps> = ({
	title,
	accent,
	generate,
	generateRest,
	orderByLevel = true,
	adaptive = true,
	timed = false,
	timeSec = 60,
	homeHref = '/home',
	modeLabel,
	reviewMode = false,
	suggestWrongReview = true,
	suggestTimeChallenge = true,
	mode,
	noExplain = false,
	hideTimer = false,
	onAnswered,
	onFinish,
	trackProgress = true,
	startIllustration,
}) => {
	// 퀴즈를 푸는 동안에는 테마 변경 리로드를 미룬다 (진행 중이던 문제가 날아가지 않게)
	useEffect(() => {
		setQuizInProgress(true);
		return () => setQuizInProgress(false);
	}, []);

	const [questions, setQuestions] = useState<LearnType.QuizQuestion[]>([]);
	const [index, setIndex] = useState(0);
	// 뒤 문항을 이어붙일 때 '아직 안 푼 구간'만 다시 정렬하려고 현재 위치를 참조로 둔다
	const indexRef = useRef(0);
	useEffect(() => {
		indexRef.current = index;
	}, [index]);
	const [selected, setSelected] = useState<number | null>(null);
	const [checked, setChecked] = useState(false);
	const [correctCount, setCorrectCount] = useState(0);
	const [combo, setCombo] = useState(0);
	const [bestCombo, setBestCombo] = useState(0);
	const [wrongList, setWrongList] = useState<WrongEntry[]>([]);
	const [answeredList, setAnsweredList] = useState<WrongEntry[]>([]);
	const [answeredCount, setAnsweredCount] = useState(0);
	const [finished, setFinished] = useState(false);
	// 상단 인셋(상태바)도 헤더와 같은 accent 로 이어 붙인다 — 시작 안내·풀이·결과 모두 헤더가 accent 색이다
	// 타임 챌린지 결과는 히어로가 heat 그라디언트라 상태바도 heat 로 맞춘다
	useTopBarAccent(finished && timed ? Colors.heat : accent);
	const [timeLeft, setTimeLeft] = useState(timeSec);
			const [displayResultScore, setDisplayResultScore] = useState(0);
	const resultScoreAnim = useRef(new Animated.Value(0)).current;
	// 타임 챌린지 직전 최고 점수 (신기록 판정용, 이번 판 기록 전 값)
	const [prevTimeBest, setPrevTimeBest] = useState<number | null>(null);
	const questionScrollRef = useRef<ScrollView>(null);
	const [qTimeLeft, setQTimeLeft] = useState(30);
	const qLimit = 30;
	const [unlockedAch, setUnlockedAch] = useState<AchievementDef[]>([]);
	const [showAchModal, setShowAchModal] = useState(false);
	// 퀴즈 도중 달성한 업적 — 결과 화면에서 한 번에 보여주려고 모아둔다
	const pendingAchRef = useRef<AchievementDef[]>([]);
	const [showExplain, setShowExplain] = useState(false);
	const [endedEarly, setEndedEarly] = useState(false);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [restarting, setRestarting] = useState(false);
	const explainAnim = useRef(new Animated.Value(0)).current;

	const comboScale = useRef(new Animated.Value(0)).current;
	const scorePop = useRef(new Animated.Value(1)).current;
	const scoreFloat = useRef(new Animated.Value(0)).current;
	const timerPulse = useRef(new Animated.Value(1)).current;
	// 보기 피드백: 정답 팝(scale) / 오답 셰이크(translateX)
	const optionPop = useRef(new Animated.Value(1)).current;
	const optionShake = useRef(new Animated.Value(0)).current;
	const reduceMotion = useReducedMotion();
	const { showToast } = useToast();
	const challengePulse = useSharedValue(1);
	const challengeBolt = useSharedValue(0);
	const challengeSweep = useSharedValue(0);
	const loadingProgress = useRef(new Animated.Value(0)).current;
	const recordedRef = useRef(false);
	const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const comboAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
	// 세션 시작 시점의 해금 업적 스냅샷 (세션 중 새로 달성한 업적 축하용)
	const startUnlockedRef = useRef<Set<string> | null>(null);
	// 이미 축하 모달을 띄운 업적 (중복 방지)
	const shownAchRef = useRef<Set<string>>(new Set());
	// 퀴즈 시작 전 안내 모달
	const [showStartModal, setShowStartModal] = useState(true);
	// 타임 챌린지 시작 카운트다운 (3 → 2 → 1 → 시작). 0이면 카운트다운 없음
	const [countdown, setCountdown] = useState(0);
	const countScale = useRef(new Animated.Value(1)).current;
	// 프레임마다 퍼져나가는 파동 · 회전 링 (0 → 1)
	const countRipple = useRef(new Animated.Value(0)).current;
	// 숫자가 내리꽂힐 때 화면이 번쩍이는 플래시 (1 → 0)
	const countFlash = useRef(new Animated.Value(0)).current;
	// 언마운트 시 남은 애니메이션 일괄 정리 — 이벤트 핸들러에서 시작된 것까지 한 곳에서 막는다
	const allAnims = useRef([
		resultScoreAnim, explainAnim, comboScale, scorePop, scoreFloat, timerPulse,
		optionPop, optionShake, loadingProgress, countScale, countRipple, countFlash,
	]).current;
	useEffect(() => () => allAnims.forEach((v) => v.stopAnimation()), [allAnims]);
	const [preparing, setPreparing] = useState(false);
	const [detailQ, setDetailQ] = useState<LearnType.QuizQuestion | null>(null);
	// 결과 스코어 탭: 오답노트(기본) / 정답
	const [resultTab, setResultTab] = useState<'wrong' | 'correct'>('wrong');
	const correctList = useMemo(() => answeredList.filter((q) => q.userAnswerIndex === q.answerIndex), [answeredList]);
	// 타임챌린지 결과 탭 필터용 — 푼 문제 중 오답만
	const timedWrongList = useMemo(() => answeredList.filter((q) => q.userAnswerIndex !== q.answerIndex), [answeredList]);
	// 결과 목록 표기 — 공통 규칙(learnListFields)
	const listFieldsOf = (q: LearnType.QuizQuestion) =>
		learnListFields({
			domain: q.domain,
			prompt: q.prompt,
			subPrompt: q.subPrompt,
			answer: q.options[q.answerIndex],
			explanation: (q.explanation ?? q.options[q.answerIndex] ?? '').split(/예\s*[)）]/)[0].trim() || undefined,
		});
	// 결과 목록 즐겨찾기 별 상태
	const [bmUids, setBmUids] = useState<Set<string>>(new Set());
	useEffect(() => {
		if (!finished || !trackProgress) return;
		LearnProgressService.getBookmarks().then((bm) => setBmUids(new Set(bm.map((b) => b.uid))));
	}, [finished, trackProgress]);
	const toggleResultBookmark = async (q: WrongEntry) => {
		const c = LearnHubService.getStudyCardByUid(q.domain, q.uid);
		const now = await LearnProgressService.toggleBookmark({
			uid: q.uid,
			domain: q.domain,
			domainTitle: LearnHubService.getDomainTitle(q.domain),
			title: listFieldsOf(q).title,
			subTitle: q.subPrompt,
			meaning: c?.meaning || q.explanation || q.options[q.answerIndex] || q.prompt,
		});
		playPop();
		showToast(now ? '즐겨찾기에 저장했어요' : '즐겨찾기를 해제했어요', now ? 'star' : 'star-border');
		const bm = await LearnProgressService.getBookmarks();
		setBmUids(new Set(bm.map((b) => b.uid)));
	};
	// 타임챌린지 결과 '해설 모아보기'는 항상 펼친 상태로 노출 (접기 기능 제거)
	// 결과 목록 팝업 — 원본 카드(캐시 조회)로 검색 상세와 동일하게 풍부히 표시 + 퀴즈 정답/해설 병합
	const detailQItem = useMemo(() => {
		if (!detailQ) return null;
		const quizAnswer = detailQ.options[detailQ.answerIndex];
		const c = LearnHubService.getStudyCardByUid(detailQ.domain, detailQ.uid);
		if (c) {
			return {
				domain: c.domain,
				uid: c.uid,
				domainTitle: LearnHubService.getDomainTitle(c.domain),
				categoryLabel: detailQ.categoryLabel ?? c.categoryLabel,
				levelLabel: detailQ.level ?? c.levelLabel,
				title: c.title,
				subTitle: c.subTitle,
				meaning: c.meaning,
				description: c.description,
				examples: c.examples,
				tags: c.tags,
				options: c.options,
				answer: c.options && c.options.length >= 2 ? c.title : quizAnswer,
				explanation: detailQ.explanation,
			};
		}
		return {
			domain: detailQ.domain,
			uid: detailQ.uid,
			domainTitle: LearnHubService.getDomainTitle(detailQ.domain),
			categoryLabel: detailQ.categoryLabel,
			levelLabel: detailQ.level,
			title: detailQ.prompt,
			subTitle: detailQ.subPrompt,
			answer: quizAnswer,
			explanation: detailQ.explanation,
			examples: detailQ.examples,
		};
	}, [detailQ]);
	// 효과음 on/off (시작 화면에서 선택, 전역 설정에 반영)
	const [soundOn, setSoundOn] = useState(isSoundEnabled());
	const toggleSound = () => {
		const next = !soundOn;
		setSoundOn(next);
		setSoundEnabled(next);
	};
	const insets = useSafeAreaInsets();
	// Worklet에서는 일반 JS 함수인 scaleWidth를 호출할 수 없으므로 UI 스레드 밖에서 미리 계산한다.
	const challengeSweepStartX = -scaleWidth(64);
	const challengeSweepEndX = isTablet ? contentWidth : scaleWidth(330);
	const challengeTimerMotionStyle = useAnimatedStyle(() => ({
		transform: [{ scale: reduceMotion ? 1 : challengePulse.value }],
	}));
	const challengeBoltMotionStyle = useAnimatedStyle(() => ({
		transform: reduceMotion ? [{ rotate: '0deg' }, { scale: 1 }] : [{ rotate: `${challengeBolt.value}deg` }, { scale: 1 + Math.abs(challengeBolt.value) / 80 }],
	}));
	const challengeSweepStyle = useAnimatedStyle(() => ({
		opacity: interpolate(challengeSweep.value, [0, 0.12, 0.88, 1], [0, 0.85, 0.85, 0]),
		transform: [{ translateX: interpolate(challengeSweep.value, [0, 1], [challengeSweepStartX, challengeSweepEndX]) }],
	}));

	// 뒤 문항 백그라운드 생성 타이머 (언마운트/재시작 시 정리)
	const restTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (restTimerRef.current) clearTimeout(restTimerRef.current); }, []);

	// 시작하기 → 다음 틱에 문항 생성(무거운 생성이 첫 페인트를 막지 않도록)
	// generateRest 가 있으면 첫 묶음만 즉시 만들어 바로 시작하고, 나머지는 백그라운드로 이어붙인다.
	const beginQuiz = () => {
		playWhoosh(); // 🎬 퀴즈 시작 사운드
		setPreparing(true);
		setTimeout(() => {
			try {
				setQuestions(orderByLevel ? sortByLevelAsc(generate()) : generate()); // 기본은 쉬운 문제부터 출제
			} catch (e) {
				console.warn('퀴즈 문항 생성 실패:', e);
				setQuestions([]);
			} finally {
				setShowStartModal(false);
				setPreparing(false);
					if (timed) setCountdown(4); // 타임 챌린지: 3 · 2 · 1 · 시작! (4프레임) 후 시작
			}

			if (!generateRest) return;
			// 첫 화면 전환 애니메이션이 끝난 뒤 나머지 문항 생성 → 체감 로딩 0
			if (restTimerRef.current) clearTimeout(restTimerRef.current);
			restTimerRef.current = setTimeout(() => {
				InteractionManager.runAfterInteractions(() => {
					try {
						const rest = generateRest();
						setQuestions((prev) => {
							if (prev.length === 0) return prev; // 이미 종료/초기화된 경우
							const seen = new Set(prev.map((q) => q.uid));
							const added = rest.filter((q) => !seen.has(q.uid));
							if (added.length === 0) return prev;
							// 이미 지나온 문항 순서는 건드리지 않고, 남은 구간만 난이도 오름차순으로 다시 정렬
							if (!orderByLevel) return [...prev, ...added];
							const cut = indexRef.current + 1;
							return [...prev.slice(0, cut), ...sortByLevelAsc([...prev.slice(cut), ...added])];
						});
					} catch (e) {
						console.warn('추가 문항 생성 실패:', e);
					}
				});
			}, 400);
		}, 30);
	};

	useEffect(() => {
		if (!trackProgress) return;
		LearnProgressService.getStats().then((s) => {
			startUnlockedRef.current = new Set(AchievementService.evaluate(s).filter((a) => a.unlocked).map((a) => a.def.id));
		});
	}, [trackProgress]);

	const current = questions[index];
	const total = questions.length;
	const isLast = index === total - 1;
	// 단일 도메인 퀴즈면 "○○ 퀴즈"로, 여러 도메인이 섞였으면 전달받은 title 유지.
	// 단, 오답 복습/타임 챌린지처럼 전용 제목이 있는 모드는 원래 title을 그대로 둔다.
	const displayTitle = useMemo(() => {
		if (questions.length === 0) return title;
		if (reviewMode || timed) return title;
		const domains = Array.from(new Set(questions.map((q) => q.domain)));
		return domains.length === 1 ? `${LearnHubService.getDomainTitle(domains[0])} 퀴즈` : title;
	}, [questions, title, reviewMode, timed]);

	const timerPaused = (!timed && checked) || showExplain || showExitConfirm || showAchModal || !!detailQ || restarting || countdown > 0;

	// 3 · 2 · 1 · 시작! 카운트다운 — 숫자가 위에서 '쿵' 내리꽂히고 화면이 번쩍인 뒤 파동이 퍼진다.
	// 사운드는 재생 타이밍이 화면과 어긋나 넣지 않는다(햅틱만 사용).
	useEffect(() => {
		if (countdown <= 0) return;
		if (countdown > 1) hapticLight();
		else hapticSuccess();

		const duration = countdown > 1 ? 760 : 640;
		countScale.setValue(2.6);
		countRipple.setValue(0);
		countFlash.setValue(1);
		const slam = Animated.spring(countScale, { toValue: 1, friction: 5, tension: 220, useNativeDriver: true });
		const flash = Animated.timing(countFlash, { toValue: 0, duration: 260, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true });
		const ripple = Animated.timing(countRipple, { toValue: 1, duration, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true });
		Animated.parallel([slam, flash, ripple]).start();
		const t = setTimeout(() => setCountdown((n) => n - 1), duration);
		return () => {
			clearTimeout(t);
			slam.stop();
			flash.stop();
			ripple.stop();
		};
	}, [countdown, countScale, countRipple, countFlash]);

	// 전체 제한 타이머 — 팝업/해설이 열린 동안에는 실제 카운트도 함께 멈춘다.
	useEffect(() => {
		if (!timed || finished || timerPaused) return;
		if (timeLeft <= 0) {
			setFinished(true);
			return;
		}
		// 마지막 5초 카운트다운 사운드
		if (timeLeft <= 5) playTick();
		const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
		return () => clearTimeout(t);
	}, [timed, finished, timeLeft, timerPaused]);

	// 배경음악(BGM) — 퀴즈 진행 중에만 반복 재생, 타임챌린지는 긴박한 트랙. 시작 전/종료/이탈 시 정지.
	useEffect(() => {
		if (showStartModal || finished || questions.length === 0) {
			stopBgm();
			return;
		}
		startBgm(timed ? 'time' : 'quiz');
	}, [showStartModal, finished, questions.length, timed]);

	// 언마운트 시 BGM 정리(메모리 누수 방지)
	useEffect(() => () => stopBgm(), []);

	// 타임챌린지: 번개 흔들림과 진행 바 광택을 계속 움직여 도전 시간을 역동적으로 표현한다.
	useEffect(() => {
		if (!timed || showStartModal || finished || timerPaused || reduceMotion) {
			cancelAnimation(challengeBolt);
			cancelAnimation(challengeSweep);
			cancelAnimation(challengePulse);
			challengeBolt.value = 0;
			challengeSweep.value = 0;
			challengePulse.value = 1;
			return;
		}
		challengeBolt.value = withRepeat(
			withSequence(
				withTiming(-9, { duration: 140 }),
				withTiming(10, { duration: 180 }),
				withTiming(0, { duration: 140 }),
			),
			-1,
			false,
		);
		challengeSweep.value = 0;
		challengeSweep.value = withRepeat(withTiming(1, { duration: 1050, easing: Easing.linear }), -1, false);
		return () => {
			cancelAnimation(challengeBolt);
			cancelAnimation(challengeSweep);
		};
	}, [timed, showStartModal, finished, timerPaused, reduceMotion]);

	// 매초 숫자와 타이머 카드가 튀어 오르고, 10초 이하는 강도를 높인다.
	useEffect(() => {
		if (!timed || showStartModal || finished || timerPaused || reduceMotion) return;
		challengePulse.value = withSequence(
			withTiming(timeLeft <= 10 ? 1.11 : 1.045, { duration: 95 }),
			withTiming(1, { duration: 210 }),
		);
		return () => {
			cancelAnimation(challengePulse);
			challengePulse.value = 1;
		};
	}, [timed, showStartModal, finished, timerPaused, timeLeft, reduceMotion, challengePulse]);

	useEffect(
		() => () => {
			if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
			if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
			comboAnimationRef.current?.stop();
		},
		[],
	);

	useEffect(() => {
		if (!restarting) return;
		loadingProgress.setValue(0);
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(loadingProgress, { toValue: 1, duration: 720, useNativeDriver: false }),
				Animated.timing(loadingProgress, { toValue: 0, duration: 0, useNativeDriver: false }),
			]),
		);
		animation.start();
		return () => animation.stop();
	}, [restarting, loadingProgress]);

	// 세션 종료 시: 세션/모드/콤보만 기록 + 새로 달성한 업적 축하 (문항 점수는 recordAnswer로 이미 반영됨)
	useEffect(() => {
		if (!finished || recordedRef.current) return;
		recordedRef.current = true;
		playFinish();
		// 결과 목록 기본 탭 — 오답이 없으면 정답 탭을 바로 보여준다(빈 화면 방지)
		setResultTab(wrongList.length > 0 ? 'wrong' : 'correct');
		if (!trackProgress) {
			// 서브 퀴즈는 메인 통계에 안 섞지만 도메인별 최고 기록만은 남긴다(홈 'NEW'/최고 표시용)
			if (mode?.startsWith('sub-') && answeredCount > 0) {
				LearnProgressService.recordSubQuizBest(mode.slice(4), correctCount, answeredCount).catch(() => {});
				LearnProgressService.recordSubQuizPlay(mode).catch(() => {});
			}
			return;
		}
		// 랭킹: 타임챌린지 최고점 기록 후 서버 제출(닉네임 미설정 시 자동 스킵)
		if (timed) {
			// 이번 판을 저장하기 '전' 최고점을 읽어둬야 신기록 여부를 판단할 수 있다
			RankingService.getTimeBest()
				.then((prev) => {
					setPrevTimeBest(prev);
					return RankingService.recordTimeChallenge(correctCount * POINT_PER_CORRECT);
				})
				.then(() => RankingService.submit());
		} else RankingService.submit();
		// 오늘의 퀴즈(daily)를 끝까지 완료하면 오늘 날짜로 완료 마킹 + 결과 스냅샷 저장 (홈 뱃지 해제 · 시작화면 결과 표시용)
		// 호출 화면이 결과를 직접 그리는 경우, 저장이 끝난 뒤 넘겨준다
		let saved: Promise<unknown> = Promise.resolve();
		if (mode === 'daily' && !endedEarly) {
			const today = DateUtils.getLocalDateString();
			const donePromise = AsyncStorage.setItem('TODAY_QUIZ_DONE_DATE', today).catch(() => {});
			const items = answeredList.map((q) => ({
				uid: q.uid,
				prompt: q.prompt,
				answer: q.options[q.answerIndex],
				explanation: q.explanation,
				correct: q.userAnswerIndex === q.answerIndex,
				domain: q.domain,
			}));
			const snapshot = { date: today, correct: correctCount, total: answeredList.length, items };
			const resultPromise = AsyncStorage.setItem('TODAY_QUIZ_RESULT', JSON.stringify(snapshot)).catch(() => {});
			saved = Promise.all([donePromise, resultPromise]);
			// 날짜별 결과 이력 누적(활동 화면에서 과거 오늘의 퀴즈 열람용, 최근 180일 유지)
			AsyncStorage.getItem('TODAY_QUIZ_HISTORY')
				.then((raw) => {
					const map: Record<string, typeof snapshot> = raw ? JSON.parse(raw) : {};
					map[today] = snapshot;
					const keys = Object.keys(map).sort();
					while (keys.length > 180) delete map[keys.shift()!];
					return AsyncStorage.setItem('TODAY_QUIZ_HISTORY', JSON.stringify(map));
				})
				.catch(() => {});
		}
		// 중도 종료(퀴즈 종료 버튼)는 플레이어 결과 화면을 그대로 보여준다
		if (onFinish && !endedEarly) saved.then(() => onFinish());
		// 오답이 있으면 다음 날 오전 복습 리마인더 예약 (알림 권한 없으면 조용히 무시)
		if (wrongList.length > 0) {
			ScheduleWrongReviewReminder(wrongList.length).catch(() => {});
		}
		(async () => {
			try {
				// 오늘의 퀴즈도 플레이 횟수(byMode.daily)는 남긴다 — 안 남기면 '오늘의 퀴즈 단골/개근' 뱃지가 영영 안 열린다
				const newStats = await LearnProgressService.recordQuizSession({ mode, bestCombo, correct: correctCount, solved: answeredCount });
				// 오늘의 퀴즈는 완료 즉시 화면이 닫히므로 축하는 홈 복귀 시(pickNewlyUnlocked)에 맡긴다
				if (mode === 'daily') return;
				// 시작 시점 스냅샷이 아직 안 잡혔으면 판정하지 않는다.
				// 빈 Set 으로 대신하면 '이미 갖고 있던 뱃지'가 전부 신규로 잡혀 축하 폭탄이 된다.
				const startUnlocked = startUnlockedRef.current;
				const newly = startUnlocked
					? AchievementService.evaluate(newStats).filter(
						(a) => a.unlocked && !startUnlocked.has(a.def.id) && !shownAchRef.current.has(a.def.id),
					)
					: [];
				newly.forEach((a) => shownAchRef.current.add(a.def.id));
				// 퀴즈 도중 달성한 것까지 모아 결과 화면에서 한 번에 축하한다
				const all = [...pendingAchRef.current, ...newly.map((a) => a.def)];
				pendingAchRef.current = [];
				if (all.length > 0) {
					// 홈에서 중복 축하하지 않도록 공용 기록을 먼저 남기고(await) 모달을 연다
					await AchievementService.markSeen(all.map((d) => d.id));
					setUnlockedAch(all);
					setShowAchModal(true);
				}
			} catch (e) {
				console.warn('퀴즈 세션 저장 실패:', e);
			}
		})();
	}, [finished]);

	const onSelect = (i: number) => {
		if (checked) return;
		setSelected(i);
		setChecked(true);
		setAnsweredCount((c) => c + 1);
		const isCorrect = i === current.answerIndex;
		// 정답/오답 무관하게 푼 문제 전체 기록(타임챌린지 결과 해설 모아보기용)
		setAnsweredList((l) => [...l, { ...current, userAnswerIndex: i }]);
		if (isCorrect) {
			hapticSuccess();
			playCorrect();
			// 정답 보기 살짝 팝
			optionPop.setValue(0.92);
			Animated.spring(optionPop, { toValue: 1, useNativeDriver: true, friction: 4, tension: 140 }).start();
		} else {
			hapticError();
			// 시간 초과(-1)는 오답음 대신 타임아웃 사운드
			if (i === -1) playTimeout();
			else playWrong();
			// 오답 보기 좌우 셰이크
			optionShake.setValue(0);
			Animated.sequence([
				Animated.timing(optionShake, { toValue: 1, duration: 55, useNativeDriver: true }),
				Animated.timing(optionShake, { toValue: -1, duration: 55, useNativeDriver: true }),
				Animated.timing(optionShake, { toValue: 0.6, duration: 55, useNativeDriver: true }),
				Animated.timing(optionShake, { toValue: 0, duration: 55, useNativeDriver: true }),
			]).start();
		}
		if (isCorrect) {
			setCorrectCount((c) => c + 1);
			// 게임 느낌: 점수 팝 + '+10점' 플로팅
			scorePop.setValue(1.4);
			Animated.spring(scorePop, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
			scoreFloat.setValue(0);
			Animated.timing(scoreFloat, { toValue: 1, duration: 850, useNativeDriver: true }).start();
			// 사운드·애니메이션은 상태 업데이터 밖에서 — 업데이터는 React 가 다시 호출할 수 있어 중복 재생된다
			const nextCombo = combo + 1;
			setCombo(nextCombo);
			setBestCombo((b) => Math.max(b, nextCombo));
			// 타임챌린지 콤보 사운드 — 2콤보부터 시작해 2·5·8·11…로 보상(정답음과 겹치지 않게 절제, 더 자주 체감)
			if (timed && nextCombo >= 2 && (nextCombo - 2) % 3 === 0) playCombo();
			if (nextCombo >= 2) {
				comboAnimationRef.current?.stop();
				comboScale.setValue(0);
				const comboAnimation = Animated.sequence([
					Animated.spring(comboScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 105 }),
					Animated.delay(900),
					Animated.timing(comboScale, { toValue: 0, duration: 220, useNativeDriver: true }),
				]);
				comboAnimationRef.current = comboAnimation;
				comboAnimation.start();
			}
		} else {
			comboAnimationRef.current?.stop();
			comboScale.setValue(0);
			setCombo(0);
			setWrongList((w) => [...w, { ...current, userAnswerIndex: i }]);
		}

		onAnswered?.({ uid: current.uid, correct: isCorrect });

		// ⭐ 즉시 점수 반영 (문항마다 저장 — 끝까지 안 풀어도 점수/뱃지 즉시 반영)
		const domainTitle = LearnHubService.getDomainTitle(current.domain);
		if (trackProgress && mode !== 'daily') {
			LearnProgressService.recordAnswer({ domain: current.domain, domainTitle, correct: isCorrect }).then((newStats) => {
				// 🏅 인터셉터: 이 문항으로 새로 달성한 업적이 있으면 결과 화면에서 축하
				// 시작 스냅샷이 없으면 판정하지 않는다 (기존 뱃지가 전부 신규로 잡힌다)
				const startUnlocked = startUnlockedRef.current;
				if (!startUnlocked) return;
				const newly = AchievementService.evaluate(newStats).filter(
					(a) => a.unlocked && !startUnlocked.has(a.def.id) && !shownAchRef.current.has(a.def.id),
				);
				// 문제 푸는 중에는 모달로 끊지 않고 모아뒀다가 결과 화면에서 한 번에 축하한다
				newly.forEach((a) => {
					shownAchRef.current.add(a.def.id);
					pendingAchRef.current.push(a.def);
				});
			});
		}
		if (trackProgress && !isCorrect) {
			LearnProgressService.addWrongNotes([
				{
					uid: current.uid,
					domain: current.domain,
					domainTitle,
					prompt: current.prompt,
					subTitle: current.subPrompt,
					answer: current.options[current.answerIndex],
					explanation: current.explanation,
					level: current.level,
					categoryLabel: current.categoryLabel,
					examples: current.examples,
					guide: current.guide,
					imageRef: current.imageRef,
				},
			]);
		} else if (trackProgress && reviewMode) {
			LearnProgressService.removeWrongNote(current.uid);
		}

		// 보기 색 표시 후 — 타임챌린지/오늘의퀴즈는 해설 없이 바로 다음 문제로
		if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
		if (timed || noExplain) {
			feedbackTimeoutRef.current = setTimeout(() => onNext(), 650);
		} else {
			feedbackTimeoutRef.current = setTimeout(() => {
				setShowExplain(true);
				explainAnim.setValue(0);
				Animated.spring(explainAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
			}, EXPLAIN_DELAY);
		}
	};



	// 결과 점수 카운트업 (0 → 최종 점수, 정리 포함)
	useEffect(() => {
		if (!finished) return;
		const target = correctCount * POINT_PER_CORRECT;
		resultScoreAnim.setValue(0);
		const id = resultScoreAnim.addListener(({ value }) => setDisplayResultScore(Math.round(value)));
		const anim = Animated.timing(resultScoreAnim, { toValue: target, duration: 800, useNativeDriver: false });
		anim.start();
		return () => {
			resultScoreAnim.removeListener(id);
			anim.stop();
		};
	}, [finished]);
	// 답 선택 후 다음 문제로 넘어가면 스크롤 최상단으로
	useEffect(() => {
		questionScrollRef.current?.scrollTo({ y: 0, animated: false });
	}, [index]);
	// 일반 퀴즈는 문제마다 30초로 고정 + 타이머 펄스 스케일 초기화(커진 채 유지되는 버그 방지)
	useEffect(() => {
		setQTimeLeft(qLimit);
		timerPulse.stopAnimation();
		timerPulse.setValue(1);
	}, [index]);

	// 카운트다운 + 타임아웃 시 오답 처리(자동 공개). setTimeout 정리 포함
	useEffect(() => {
		if (timed || hideTimer || showStartModal || finished || timerPaused || !current) return;
		if (qTimeLeft <= 0) {
			onSelect(-1);
			return;
		}
		const t = setTimeout(() => setQTimeLeft((s) => s - 1), 1000);
		return () => clearTimeout(t);
	}, [timed, showStartModal, finished, timerPaused, qTimeLeft, current]);

	// 5초 이하 남으면 타이머 펄스(초당 1회 팝). 언마운트/조건 이탈 시 정리
	useEffect(() => {
		if (timed || checked || showExplain || finished || qTimeLeft > 5) return;
		timerPulse.setValue(1.25);
		const a = Animated.spring(timerPulse, { toValue: 1, useNativeDriver: true, friction: 4, tension: 120 });
		a.start();
		return () => {
			a.stop();
			// 스프링이 중간값에서 멈춰 커진 채 남지 않도록 원위치
			timerPulse.setValue(1);
		};
	}, [qTimeLeft, timed, checked, showExplain, finished]);

	const onNext = () => {
		setShowExplain(false);
		if (isLast) {
			setFinished(true);
			return;
		}
		// 연속 정답이 쌓이면 남은 문항 중 한 단계 위 난이도를 바로 다음 차례로 당긴다
		if (adaptive && orderByLevel && combo >= ADAPTIVE_COMBO) {
			const curLevel = questions[index]?.level ?? '';
			const jump = questions.findIndex((q, i) => i > index + 1 && compareDifficultyLabels(q.level ?? '', curLevel) > 0);
			if (jump > -1) {
				setQuestions((prev) => {
					const next = [...prev];
					const [q] = next.splice(jump, 1);
					next.splice(index + 1, 0, q);
					return next;
				});
			}
		}
		setIndex(index + 1);
		setSelected(null);
		setChecked(false);
	};

	// 종료 버튼 → 지금까지 푼 만큼으로 결과 보기
	const onEnd = () => {
		if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
		setShowExitConfirm(false);
		setShowExplain(false);
		setEndedEarly(true);
		setFinished(true);
	};

	// 다시 풀기: 프로그래스바를 잠깐 보여준 뒤 → 기존 '시작 팝업'으로 되돌아간다.
	// (문항 생성은 시작 팝업의 '시작하기'에서 beginQuiz로 다시 수행)
	const restart = () => {
		setRestarting(true);
		if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
		if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
		comboAnimationRef.current?.stop();
		comboScale.setValue(0);
		restartTimeoutRef.current = setTimeout(() => {
			recordedRef.current = false;
			setQuestions([]);
			setIndex(0);
			setSelected(null);
			setChecked(false);
			setCorrectCount(0);
			setCombo(0);
			setBestCombo(0);
			setWrongList([]);
			setAnsweredList([]);
			setAnsweredCount(0);
			setTimeLeft(timeSec);
			setQTimeLeft(qLimit);
			setEndedEarly(false);
			setFinished(false);
			setShowStartModal(true);
			setCountdown(0);
			setRestarting(false);
		}, MIN_RESTART_LOADING_MS);
	};

	/**
	 * 화면 분기(시작 안내 / 카운트다운 / 풀이 / 결과)와 무관하게 항상 같은 자리에 두는 공용 모달.
	 * 분기마다 따로 렌더하면 분기가 바뀌는 순간 모달이 언마운트→재마운트되어
	 * "떠 있던 모달이 사라졌다 다시 나타나는" 깜빡임이 생긴다. 위치를 고정해 한 번만 마운트한다.
	 */
	const sharedModals = (
		<>
			<AchievementUnlockModal visible={showAchModal && !showExplain} achievements={unlockedAch} onClose={() => setShowAchModal(false)} />
			<DetailSheet
				visible={!!detailQ}
				accent={accent}
				onClose={() => setDetailQ(null)}
				onBookmarkChange={(uid, on) =>
					setBmUids((prev) => {
						const next = new Set(prev);
						if (on) next.add(uid);
						else next.delete(uid);
						return next;
					})
				}
				item={detailQItem}
			/>
		</>
	);
	/** 어느 분기를 그리든 공용 모달을 같은 위치에 붙인다 */
	const withSharedModals = (body: React.ReactNode) => (
		<>
			{body}
			{sharedModals}
		</>
	);
	// ── 결과 ──────────────────────────────
	if (finished) {
		const solved = timed || endedEarly ? answeredCount : total;
		const rate = solved > 0 ? Math.round((correctCount / solved) * 100) : 0;
		const pass = rate >= 60;
		const great = rate >= 90;
		const head = great ? '완벽해요!' : pass ? '잘했어요!' : '조금 더 힘내요!';
		const profile = getResultProfile(rate, wrongList.length);
		const resultIllustration = rate === 100
				? SHARED_STATE_ILLUSTRATIONS.perfectScore
				: rate < 60
					? SHARED_STATE_ILLUSTRATIONS.retry
					: null;
		// 타임 챌린지 개인 최고 기록 경신 여부 (첫 플레이는 비교 대상이 없어 제외)
		const timeScore = correctCount * POINT_PER_CORRECT;
		const isNewTimeRecord = timed && trackProgress && prevTimeBest !== null && prevTimeBest > 0 && timeScore > prevTimeBest;

		return withSharedModals(
			<SafeAreaView style={styles.safe} edges={[]}>
				<ScrollView style={styles.scrollFlex} contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
					{/* 상단 인셋·배너는 AppLayout 이 담당한다 — 여기서 인셋을 더하면 여백이 두 번 들어간다 */}
					<View style={[styles.resultHero, { backgroundColor: timed ? HEAT_GRADIENT[1] : accent, paddingTop: SpacingV.xxl }]}>
						{timed && <LinearGradient colors={HEAT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
						{pass && <LottieBox source={LOTTIE_CONFETTI} autoPlay loop={false} style={styles.resultConfetti} />}
						<DonutChart size={104} strokeWidth={8} percent={rate} color={Colors.textInverse} tone="dark">
							{resultIllustration ? (
								<Image source={resultIllustration} style={styles.resultIllustration} resizeMode="contain" />
							) : (
								<View style={styles.resultIconWrap}>
									<IconComponent type="materialIcons" name={pass ? 'emoji-events' : 'self-improvement'} size={scaledSize(40)} color={Colors.textInverse} />
								</View>
							)}
						</DonutChart>
						<Text style={styles.resultTitle} numberOfLines={1} ellipsizeMode="tail">{head}</Text>
						<Text style={styles.resultSub}>{modeLabel ?? `${displayTitle} 결과`}</Text>
						<View style={styles.resultScoreChip}>
							{mode === 'daily' || !trackProgress ? (
								<>
									<Text style={[styles.resultScoreNum, styles.resultScoreNumGreen]}>{correctCount}</Text>
									<Text style={styles.resultScoreUnit}>개</Text>
								</>
							) : (
								<>
									<Animated.Text style={[styles.resultScoreNum, !timed && styles.resultScoreNumGreen]}>{displayResultScore}</Animated.Text>
									<Text style={styles.resultScoreUnit}>점</Text>
								</>
							)}
						</View>
						<Text style={styles.resultScoreDetail}>
							{solved}문제 중 {correctCount}개 정답 · 정답률 {rate}%
						</Text>
						{isNewTimeRecord && (
							<FadeInUp delay={260}>
								<View style={styles.recordBadge}>
									<IconComponent type="materialIcons" name="military-tech" size={scaledSize(16)} color={Colors.heatDeep} />
									<Text style={styles.recordBadgeText}>신기록! 이전 최고 {prevTimeBest!.toLocaleString()}점보다 +{(timeScore - prevTimeBest!).toLocaleString()}점</Text>
								</View>
							</FadeInUp>
						)}
						<View style={styles.resultProfile}>
							<Text style={styles.resultProfileTitle} numberOfLines={1} ellipsizeMode="tail">{profile.title}</Text>
							<Text style={styles.resultProfileDesc} numberOfLines={2} ellipsizeMode="tail">{profile.desc}</Text>
						</View>
					</View>

					<FadeInUp delay={120}>
						<View style={styles.statsRow}>
							<TouchableOpacity style={[styles.statBox, resultTab === 'correct' && styles.statBoxActive]} activeOpacity={0.7} onPress={() => setResultTab('correct')}>
								<Text style={[styles.statNum, { color: Colors.success }]}>{correctCount}</Text>
								<Text style={styles.statLabel}>정답</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.statBox, resultTab === 'wrong' && styles.statBoxActive]} activeOpacity={0.7} onPress={() => setResultTab('wrong')}>
								<Text style={[styles.statNum, { color: Colors.error }]}>{timed ? timedWrongList.length : wrongList.length}</Text>
								<Text style={styles.statLabel}>오답</Text>
							</TouchableOpacity>
							<View style={styles.statBox}>
								<Text style={[styles.statNum, { color: Colors.primary }]}>{bestCombo}</Text>
								<Text style={styles.statLabel}>최고 콤보</Text>
							</View>
						</View>
					</FadeInUp>

					{!timed && (resultTab === 'wrong' ? wrongList.length > 0 : correctList.length > 0) && (
						<View style={styles.wrongSection}>
							<View style={styles.wrongSectionHead}>
								<Text style={styles.wrongSectionTitle} numberOfLines={1} ellipsizeMode="tail">{resultTab === 'wrong' ? (trackProgress ? '오답 노트' : '오답 확인') : '정답 확인'}</Text>
								<Text style={styles.wrongSectionCount}>{resultTab === 'wrong' ? `${wrongList.length}개${trackProgress ? ' · 보관함에 저장됨' : ''}` : `${correctList.length}개`}</Text>
							</View>
							<AdaptiveGrid>
							{(resultTab === 'wrong' ? wrongList : correctList).map((q, i) => (
								<FadeInUp key={`${q.uid}-${i}`} delay={Math.min(i, 6) * 40}>
									<LearnItemCard
										domain={q.domain}
										categoryLabel={q.categoryLabel}
										levelLabel={q.level}
										{...listFieldsOf(q)}
										indexBadge={{ num: i + 1, color: resultTab === 'wrong' ? Colors.errorDark : Colors.successDeep }}
										examples={q.examples}
										bookmarked={trackProgress ? bmUids.has(q.uid) : undefined}
										onToggleBookmark={trackProgress ? () => toggleResultBookmark(q) : undefined}
										onPress={() => setDetailQ(q)}>
										<View style={styles.wrongDetailHint}>
											<Text style={styles.wrongDetailHintText}>탭하여 자세히 보기</Text>
											<IconComponent type="materialIcons" name="arrow-forward" size={scaledSize(11)} color={Colors.textMuted} />
										</View>
									</LearnItemCard>
								</FadeInUp>
							))}
							</AdaptiveGrid>
						</View>
					)}

					{/* 타임챌린지 결과: 정답/오답 탭으로 필터해서 해설을 모아보기 */}
					{timed && answeredList.length > 0 && (() => {
						const list = resultTab === 'wrong' ? timedWrongList : correctList;
						return (
							<View style={styles.wrongSection}>
								<View style={styles.wrongSectionHead}>
									<Text style={styles.wrongSectionTitle} numberOfLines={1} ellipsizeMode="tail">{resultTab === 'wrong' ? '오답 해설' : '정답 해설'}</Text>
									<Text style={styles.wrongSectionCount}>{list.length}개</Text>
								</View>
								{list.length === 0 ? (
									<Text style={styles.wrongSectionCount}>{resultTab === 'wrong' ? '틀린 문제가 없어요!' : '맞힌 문제가 없어요.'}</Text>
								) : (
									list.map((q, i) => (
										<FadeInUp key={`ans-${q.uid}-${i}`} delay={Math.min(i, 6) * 40}>
											<LearnItemCard
												domain={q.domain}
												categoryLabel={q.categoryLabel}
												levelLabel={q.level}
												{...listFieldsOf(q)}
												indexBadge={{ num: i + 1, color: resultTab === 'wrong' ? Colors.errorDark : Colors.successDeep }}
												examples={q.examples}
												bookmarked={bmUids.has(q.uid)}
												onToggleBookmark={() => toggleResultBookmark(q)}
												onPress={() => setDetailQ(q)}
											/>
										</FadeInUp>
									))
								)}
							</View>
						);
					})()}

					{(suggestWrongReview && wrongList.length > 0) || suggestTimeChallenge ? (
						<View style={styles.nextWrap}>
							<Text style={styles.nextTitle}>다음 단계</Text>
							{suggestWrongReview && wrongList.length > 0 && (
								<TouchableOpacity style={styles.stepBtn} activeOpacity={0.85} onPress={() => router.replace('/quiz/wrong-review' as never)}>
									<View style={[styles.stepIcon, { backgroundColor: Colors.errorSoft }]}>
										<IconComponent type="materialIcons" name="history-edu" size={scaledSize(20)} color={Colors.error} />
									</View>
									<View style={styles.stepBody}>
										<Text style={styles.stepBtnTitle}>오답노트 복습</Text>
										<Text style={styles.stepBtnDesc}>틀린 문제만 모아 다시 풀어요</Text>
									</View>
									<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
								</TouchableOpacity>
							)}
							{suggestTimeChallenge && (
								<TouchableOpacity style={styles.stepBtn} activeOpacity={0.85} onPress={() => router.replace('/quiz/speed' as never)}>
									<View style={[styles.stepIcon, { backgroundColor: Colors.primarySoft }]}>
										<IconComponent type="materialIcons" name="bolt" size={scaledSize(20)} color={Colors.primary} />
									</View>
									<View style={styles.stepBody}>
										<Text style={styles.stepBtnTitle}>타임 챌린지</Text>
										<Text style={styles.stepBtnDesc}>180초 안에 최대한 많이 맞혀요</Text>
									</View>
									<IconComponent type="materialIcons" name="chevron-right" size={scaledSize(22)} color={Colors.textMuted} />
								</TouchableOpacity>
							)}
						</View>
					) : null}
				</ScrollView>
				{/* 결과 진입 전면 광고 — 게이트를 통과한 회차에만 마운트된다 */}
				<AppModal visible={restarting} transparent animationType="fade" onRequestClose={() => {}}>
					<View style={styles.loadingOverlay}>
						<View style={styles.loadingCard}>
							<ActivityIndicator size="large" color={accent} />
							<Text style={styles.loadingTitle}>문제를 불러오는 중입니다</Text>
							<View style={styles.loadingTrack}>
								<Animated.View
									style={[
										styles.loadingFill,
										{
											backgroundColor: accent,
											width: loadingProgress.interpolate({ inputRange: [0, 1], outputRange: ['12%', '92%'] }),
										},
									]}
								/>
							</View>
						</View>
					</View>
				</AppModal>
				{/* 타임챌린지는 챌린지(스코어) 화면으로 돌아가지만, 버튼 이름은 '홈으로'로 통일한다 */}
				<BottomButton
					label="홈으로"
					icon="home"
					{...(mode === 'daily' ? {} : { secondaryLabel: '다시 풀기', secondaryIcon: 'replay', onSecondary: restart })}
					onPress={() => router.replace(homeHref as never)}
				/>
				{/* 🎉 컨페티 — 콘텐츠 위(맨 앞)에서 뿌려지도록 마지막에 렌더 */}
				{pass && (
					<View style={styles.confettiFront} pointerEvents="none">
						<ConfettiCannon count={120} origin={{ x: contentWidth / 2, y: -10 }} fadeOut autoStart explosionSpeed={350} />
					</View>
				)}
			</SafeAreaView>
		);
	}

	// 시작 전 안내/로딩 화면 (문항 생성은 시작하기 이후에 수행)
	if (showStartModal) {
		return withSharedModals(
			<SafeAreaView style={styles.safe} edges={['bottom']}>
				<View style={[styles.header, { backgroundColor: accent, paddingTop: SpacingV.sm }]}>
					<View style={styles.headerRow}>
						<View style={styles.backBtn} />
						<Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
						<View style={styles.backBtn} />
					</View>
				</View>
				<View style={styles.introFill} />
				<AppModal visible transparent animationType="fade" onRequestClose={() => router.back()}>
					<View style={styles.startOverlay}>
						<View style={styles.startSheet}>
							{startIllustration ? (
								<ExpoImage source={startIllustration} style={styles.startIllustration} contentFit="contain" accessible={false} />
							) : (
								<View style={[styles.startIcon, { backgroundColor: withAlpha(accent, '14') }]}>
									<IconComponent type="materialIcons" name="quiz" size={scaledSize(30)} color={accent} />
								</View>
							)}
							<Text style={styles.startTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
							{preparing ? (
								<View style={styles.preparingWrap}>
									<LottieBox source={LOTTIE_LOADING} autoPlay loop style={styles.loadingLottie} />
									<QuizCardSkeleton />
									<Text style={styles.startDesc}>문제를 준비하고 있어요...</Text>
								</View>
							) : (
								<>
									<Text style={styles.startSub}>준비되면 시작하세요. 아래 방식으로 진행돼요.</Text>
									<View style={styles.guideList}>
										<View style={styles.guideRow}>
											<View style={[styles.guideIconWrap, { backgroundColor: withAlpha(accent, '14') }]}>
												<IconComponent type="materialIcons" name="timer" size={scaledSize(18)} color={accent} />
											</View>
											<Text style={styles.guideText}>{timed ? `총 ${timeSec}초 동안 최대한 많이 풀어요.` : '문제마다 30초가 주어져요.'}</Text>
										</View>
										<View style={styles.guideRow}>
											<View style={[styles.guideIconWrap, { backgroundColor: withAlpha(accent, '14') }]}>
												<IconComponent type="materialIcons" name="touch-app" size={scaledSize(18)} color={accent} />
											</View>
											<Text style={styles.guideText}>보기 중 알맞은 정답을 골라 풀어요.</Text>
										</View>
										<View style={styles.guideRow}>
											<View style={[styles.guideIconWrap, { backgroundColor: withAlpha(accent, '14') }]}>
												<IconComponent type="materialIcons" name="stars" size={scaledSize(18)} color={accent} />
											</View>
											<Text style={styles.guideText}>
												{!trackProgress
													? '결과는 점수·오답노트에 반영되지 않아요.'
													: mode === 'daily'
														? '틀린 문제는 오답노트에 저장돼요.'
														: `정답 1개당 ${POINT_PER_CORRECT}점, 틀리면 오답노트에 저장돼요.`}
											</Text>
										</View>
										<View style={styles.guideRow}>
											<View style={[styles.guideIconWrap, { backgroundColor: withAlpha(accent, '14') }]}>
												<IconComponent type="materialIcons" name="bookmark-added" size={scaledSize(18)} color={accent} />
											</View>
											<Text style={styles.guideText}>{trackProgress && mode !== 'daily' ? '중간에 종료해도 푼 만큼 점수가 반영돼요.' : '중간에 종료해도 푼 만큼 결과를 볼 수 있어요.'}</Text>
										</View>
									</View>
									{/* 효과음 on/off 선택 */}
									<TouchableOpacity style={styles.soundToggleRow} activeOpacity={0.8} onPress={toggleSound}>
										<View style={styles.soundToggleLeft}>
											<View style={[styles.guideIconWrap, { backgroundColor: withAlpha(accent, '14') }]}>
												<IconComponent type="materialIcons" name={soundOn ? 'volume-up' : 'volume-off'} size={scaledSize(18)} color={accent} />
											</View>
											<Text style={styles.soundToggleLabel}>효과음</Text>
										</View>
										<View style={[styles.soundPill, { backgroundColor: soundOn ? accent : Colors.surfaceAlt }]}>
											<Text style={[styles.soundPillText, { color: soundOn ? Colors.textInverse : Colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{soundOn ? 'ON' : 'OFF'}</Text>
										</View>
									</TouchableOpacity>
									<View style={styles.startBtns}>
										<TouchableOpacity style={styles.startCancelBtn} activeOpacity={0.85} onPress={() => router.back()}>
											<Text style={styles.startCancelText}>취소</Text>
										</TouchableOpacity>
										<TouchableOpacity style={[styles.startGoBtn, { backgroundColor: accent }]} activeOpacity={0.9} onPress={beginQuiz}>
											<Text style={styles.startGoText}>시작하기</Text>
										</TouchableOpacity>
									</View>
								</>
							)}
						</View>
					</View>
				</AppModal>
			</SafeAreaView>
		);
	}

	// 타임 챌린지 시작 카운트다운 — 3 · 2 · 1 · 시작! (게임 스타트 연출)
	if (countdown > 0) {
		const isGo = countdown === 1;
		// 남은 프레임을 스텝 도트로 표시 (3 · 2 · 1)
		const step = 4 - countdown;
		// 프레임마다 배경/강조색을 바꿔 카운트가 진행되는 긴장감을 준다
		const stageColors: [string, string, string] = isGo
			? HEAT_GRADIENT
			: countdown === 2
				? EMBER_GRADIENT
				: NIGHT_GRADIENT;
		const stageAccent = isGo ? Colors.textInverse : countdown === 2 ? Colors.gold : Colors.infoBright;
		return withSharedModals(
			<SafeAreaView style={styles.safe} edges={['bottom']}>
				<View style={styles.countWrap}>
					<LinearGradient colors={stageColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
					{/* 숫자가 꽂힐 때 화면 번쩍임 */}
					<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.countFlash, { opacity: countFlash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]} />
					{/* 좌우로 흐르는 스피드 라인 */}
					<Animated.View
						pointerEvents="none"
						style={[
							styles.countSpeedLines,
							{
								opacity: countRipple.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.55, 0.25, 0] }),
								transform: [{ scaleX: countRipple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] }) }],
							},
						]}>
						{[0, 1, 2, 3].map((i) => (
							<View key={i} style={[styles.countSpeedLine, { backgroundColor: stageAccent, width: scaleWidth(40 + i * 26) }]} />
						))}
					</Animated.View>
					{/* 퍼져나가는 파동 2겹 */}
					<Animated.View
						pointerEvents="none"
						style={[
							styles.countPulse,
							{
								opacity: countRipple.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
								transform: [{ scale: countRipple.interpolate({ inputRange: [0, 1], outputRange: [0.55, 2.3] }) }],
							},
						]}
					/>
					<Animated.View
						pointerEvents="none"
						style={[
							styles.countPulse,
							styles.countPulseThin,
							{
								opacity: countRipple.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.4, 0] }),
								transform: [{ scale: countRipple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.7] }) }],
							},
						]}
					/>

					{/* 상단 모드 뱃지 */}
					<View style={styles.countBadge}>
						<IconComponent type="materialIcons" name="bolt" size={scaledSize(14)} color={Colors.textInverse} />
						<Text style={styles.countBadgeText}>{title}</Text>
					</View>

					{/* 숫자 링 — 프레임마다 반 바퀴 회전하며 게이지가 도는 느낌 */}
					<Animated.View style={[styles.countCircle, isGo && styles.countCircleGo, { transform: [{ scale: countScale }] }]}>
						<Animated.View
							pointerEvents="none"
							style={[
								styles.countArc,
								{ borderTopColor: stageAccent, borderRightColor: stageAccent },
								{ transform: [{ rotate: countRipple.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '420deg'] }) }] },
							]}
						/>
						<Text style={[styles.countNum, isGo && styles.countGo]} numberOfLines={1} adjustsFontSizeToFit>
							{isGo ? '시작!' : countdown - 1}
						</Text>
					</Animated.View>

					{/* 진행 스텝 도트 */}
					<View style={styles.countDots}>
						{[0, 1, 2].map((i) => (
							<View key={i} style={[styles.countDot, i < step && styles.countDotOn, i < step && { backgroundColor: stageAccent }]} />
						))}
					</View>

					<Text style={styles.countHint}>{timeSec}초 안에 최대한 많이 맞혀보세요!</Text>
					<View style={styles.countTipRow}>
						<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(14)} color={Colors.heatSoft} />
						<Text style={styles.countTipText}>연속 정답으로 콤보를 이어가 보세요</Text>
					</View>
				</View>
			</SafeAreaView>
		);
	}

	if (!current) {
		return withSharedModals(
			<SafeAreaView style={styles.safe} edges={['bottom']}>
				<View style={[styles.header, { backgroundColor: accent }]}>
					<TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()} hitSlop={8}>
						<IconComponent type="materialIcons" name="close" size={scaledSize(22)} color={Colors.textInverse} />
					</TouchableOpacity>
				</View>
				<Text style={styles.emptyText}>출제할 문제가 없습니다.</Text>
			</SafeAreaView>
		);
	}

	// OX 문항은 kind로 판별 (보기 2개라도 2지선다는 일반 선택지로 렌더)
	const isOX = current.kind === 'ox';
	const lowTime = timed && timeLeft <= 10;
	const activeTime = timed ? timeLeft : qTimeLeft;
	const activeLimit = timed ? timeSec : qLimit;
	const timeBarColor = activeTime >= activeLimit / 2 ? Colors.textInverse : activeTime > Math.min(10, activeLimit / 4) ? Colors.goldSoft : Colors.errorPale;
	const timeProgress = activeLimit > 0 ? Math.max(0, Math.min(100, (activeTime / activeLimit) * 100)) : 0;
	const presentation = getQuestionPresentation(current);
	const currentDomainMeta = LearnHubService.getDomain(current.domain).meta;
	const comboMessage = combo >= 10 ? 'UNSTOPPABLE!' : combo >= 5 ? '불꽃 질주!' : '연속 정답!';
	// 콤보 단계별 열기(heat) 그라디언트 — 단계가 오를수록 진한 붉은색으로 (보라 계열 미사용)
	const comboColors: [string, string, ...string[]] = combo >= 10 ? [Colors.errorDark, Colors.error, Colors.heat] : combo >= 5 ? [Colors.error, Colors.heat, Colors.bookmark] : [Colors.amber, Colors.heat];
	// 오답 셰이크용 translateX (좌우 흔들림)
	const shakeX = optionShake.interpolate({ inputRange: [-1, 1], outputRange: [-scaleWidth(9), scaleWidth(9)] });

	// ── 퀴즈 ──────────────────────────────
	return withSharedModals(
		<SafeAreaView style={styles.safe} edges={[]}>
			<View style={[styles.header, { backgroundColor: accent, paddingTop: SpacingV.sm }]}>
				<View style={styles.headerRow}>
					<View style={styles.backBtn} />
					<Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">{displayTitle}</Text>
					<View style={styles.headerRight}>
						<Text style={styles.headerCount}>{timed ? `${answeredCount + 1}번째` : `${index + 1}/${total}`}</Text>
					</View>
				</View>
				{/* 문항 진행 — 칸 농도로 난이도(초급→특급)를 보여준다 */}
				{orderByLevel && total > 1 && total <= LEVEL_STRIP_MAX && (
					<View style={styles.levelStrip} accessible accessibilityLabel={`${total}문항 중 ${index + 1}번째, 난이도 ${current.level ?? '미표기'}`}>
						{questions.map((q, i) => (
							<View
								key={q.uid}
								style={[
									styles.levelSeg,
									{ backgroundColor: withAlpha(Colors.textInverse, LEVEL_ALPHA[q.level ?? ''] ?? '59') },
									i > index && styles.levelSegTodo,
									i === index && styles.levelSegCurrent,
								]}
							/>
						))}
					</View>
				)}
				{/* 상단 스코어 영역: 점수 / 정답 / 콤보 */}
				<View style={styles.scoreStrip}>
					<View style={styles.scoreItem}>
						<IconComponent type="materialIcons" name="stars" size={scaledSize(15)} color={Colors.textInverse} />
						<Animated.Text style={[styles.scoreValue, { transform: [{ scale: scorePop }] }]}>{correctCount * POINT_PER_CORRECT}</Animated.Text>
						<Text style={styles.scoreLabel}>점수</Text>
					</View>
					<View style={styles.scoreDivider} />
					<View style={styles.scoreItem}>
						<IconComponent type="materialIcons" name="check-circle" size={scaledSize(15)} color={Colors.textInverse} />
						<Text style={styles.scoreValue}>{correctCount}</Text>
						<Text style={styles.scoreLabel}>정답</Text>
					</View>
					<View style={styles.scoreDivider} />
					<View style={styles.scoreItem}>
						<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(15)} color={Colors.textInverse} />
						<Text style={styles.scoreValue}>{combo}</Text>
						<Text style={styles.scoreLabel}>콤보</Text>
					</View>
				</View>
				{/* 남은 시간 — 스코어 바로 아래 (헤더 내 반투명 바) */}
				{!hideTimer && (
				<Reanimated.View
					accessible
					accessibilityLabel={`${timed ? '남은 도전 시간' : '남은 시간'} ${activeTime}초`}
					style={[styles.headerTimerMotion, timed && challengeTimerMotionStyle]}>
					<Animated.View style={[styles.headerTimer, lowTime && styles.headerTimerDanger, { transform: [{ scale: timed || activeTime > 5 ? 1 : timerPulse }] }]}>
						<View style={styles.headerTimerHead}>
							<View style={styles.headerTimerLabelRow}>
								<Reanimated.View style={timed ? challengeBoltMotionStyle : undefined}>
									<IconComponent type="materialIcons" name={timed ? 'bolt' : 'timer'} size={scaledSize(14)} color={Colors.textInverse} />
								</Reanimated.View>
								<Text style={styles.headerTimerLabel} numberOfLines={1} ellipsizeMode="tail">{timed ? '남은 도전 시간' : '남은 시간'}</Text>
							</View>
							<Text style={[styles.headerTimerValue, { color: timeBarColor }]}>{activeTime}초</Text>
						</View>
						<View style={styles.headerTimerTrack}>
							<View style={[styles.headerTimerFill, { width: `${timeProgress}%`, backgroundColor: timeBarColor }]}>
								{timed && !reduceMotion && (
									<Reanimated.View style={[styles.headerTimerShimmer, challengeSweepStyle]}>
										<LinearGradient colors={['transparent', Colors.onBrandText, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
									</Reanimated.View>
								)}
							</View>
						</View>
					</Animated.View>
				</Reanimated.View>
				)}
			</View>

			{combo >= 2 && (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.comboBadge,
						{
							top: scaleHeight(86),
							opacity: comboScale,
							transform: [
								{ scale: comboScale },
								{ rotate: comboScale.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) },
							],
						},
					]}>
					<LinearGradient colors={comboColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.comboGradient}>
						<IconComponent type="materialIcons" name="local-fire-department" size={scaledSize(24)} color={Colors.textInverse} />
						<View>
							<Text style={styles.comboKicker}>{comboMessage}</Text>
							<Text style={styles.comboText}>{combo} COMBO</Text>
						</View>
						<View style={styles.comboMultiplier}><Text style={styles.comboMultiplierText}>×{combo}</Text></View>
					</LinearGradient>
				</Animated.View>
			)}

			<Animated.Text
					pointerEvents="none"
					style={[
						styles.scoreFloat,
						{
							top: scaleHeight(70),
							opacity: scoreFloat.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
							transform: [{ translateY: scoreFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -scaleHeight(38)] }) }],
						},
					]}>
					+{POINT_PER_CORRECT}점
				</Animated.Text>
				<ScrollView ref={questionScrollRef} style={styles.scrollFlex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
				<FadeInUp key={current.uid} distance={18}>
					<View
						style={[
							styles.questionCard,
							presentation.variant === 'chat' && styles.questionCardChat,
							presentation.variant === 'word' && styles.questionCardWord,
							presentation.variant === 'relation' && styles.questionCardRelation,
							presentation.variant === 'play' && styles.questionCardPlay,
						]}>
						{/* 1) 카테고리 · 난이도 (최상단) */}
							<View style={styles.chipRow}>
								<View style={[styles.metaChip, { backgroundColor: withAlpha(currentDomainMeta.color, '14') }]}>
									<DomainIcon mainIcon={currentDomainMeta.mainIcon} icon={currentDomainMeta.icon} iconType={currentDomainMeta.iconType} size={scaledSize(13)} color={currentDomainMeta.color} />
									<Text style={[styles.metaChipText, { color: currentDomainMeta.color }]} numberOfLines={1} ellipsizeMode="tail">{currentDomainMeta.title}</Text>
								</View>
									{!!current.categoryLabel && current.categoryLabel !== currentDomainMeta.title && (
									<View style={[styles.metaChip, { backgroundColor: withAlpha(accent, '14') }]}>
										<IconComponent type="materialIcons" name={categoryIcon(current.categoryLabel)} size={scaledSize(13)} color={accent} />
										<Text style={[styles.metaChipText, { color: accent }]} numberOfLines={1} ellipsizeMode="tail">{current.categoryLabel}</Text>
									</View>
								)}
								{!!current.level && (
									<View style={styles.metaChip}>
										<IconComponent type="materialIcons" name={difficultyIcon(current.level)} size={scaledSize(13)} color={Colors.textSecondary} />
										<Text style={styles.metaChipText} numberOfLines={1} ellipsizeMode="tail">{current.level}</Text>
									</View>
								)}
							</View>
						{/* 캐릭터는 점수 상세에서만 노출 */}
						{/* 2) 가이드 문구 (줄바꿈) */}
						<Text style={styles.guideLine}>{current.guide}</Text>
						{/* 3) 문제 — 그림 문항(국기·초상·사진 맞히기)은 발문이 이미 위에 있으므로 그림만 크게 */}
						<View style={[styles.promptFrame, presentation.variant === 'chat' && styles.promptFrameChat, presentation.variant === 'sentence' && styles.promptFrameSentence]}>
							{current.imageRef ? (
								<>
									<EntryImage imageRef={current.imageRef} width={Math.min(contentWidth - scaleWidth(96), isWideImageRef(current.imageRef) ? scaleWidth(210) : scaleWidth(176))} fetchWidth={420} />
									{!!current.subPrompt && <Text style={styles.subPromptText}>{current.subPrompt}</Text>}
								</>
							) : (
								<>
									<Text lineBreakStrategyIOS="hangul-word" style={styles.promptText}>{current.prompt}</Text>
									{!!current.subPrompt && <Text style={styles.subPromptText}>{current.subPrompt}</Text>}
								</>
							)}
						</View>
						</View>
				</FadeInUp>

				{isOX ? (
					<View style={styles.oxRow}>
						{current.options.map((opt, i) => {
							const isAnswer = i === current.answerIndex;
							const isSelected = i === selected;
							const showCorrect = checked && isAnswer;
							const showWrong = checked && isSelected && !isAnswer;
							return (
								<AnimatedTouchable
									key={i}
									style={[
										styles.oxBtn,
										!checked && isSelected && { borderColor: accent },
										showCorrect && styles.optionCorrect,
										showWrong && styles.optionWrong,
										showCorrect && { transform: [{ scale: optionPop }] },
										showWrong && { transform: [{ translateX: shakeX }] },
									]}
									activeOpacity={checked ? 1 : 0.8}
									onPress={() => onSelect(i)}>
									<Text style={[styles.oxMark, { color: i === 0 ? Colors.success : Colors.error }]}>{i === 0 ? 'O' : 'X'}</Text>
									<Text style={styles.oxLabel} numberOfLines={1} ellipsizeMode="tail">{opt}</Text>
								</AnimatedTouchable>
							);
						})}
					</View>
				) : (
					// 그림 문항은 그림이 세로 자리를 먹어 보기 넷이 화면 밖으로 밀린다 — 2×2 격자로 한눈에 보이게 한다
					<View style={current.imageRef ? styles.optionGrid : undefined}>
					{current.options.map((opt, i) => {
						const isAnswer = i === current.answerIndex;
						const isSelected = i === selected;
						const showCorrect = checked && isAnswer;
						const showWrong = checked && isSelected && !isAnswer;
						const badge = showCorrect
							? { name: 'check-circle', color: Colors.success }
							: showWrong
								? { name: 'cancel', color: Colors.error }
								: null;
						return (
							<AnimatedTouchable
								key={i}
								style={[
									styles.option,
									!!current.imageRef && styles.optionHalf,
									!checked && isSelected && { borderColor: accent },
									showCorrect && styles.optionCorrect,
									showWrong && styles.optionWrong,
									showCorrect && { transform: [{ scale: optionPop }] },
									showWrong && { transform: [{ translateX: shakeX }] },
								]}
								activeOpacity={checked ? 1 : 0.8}
								onPress={() => onSelect(i)}>
								<View style={[styles.optionIndex, showCorrect && { backgroundColor: Colors.successDeep }, showWrong && { backgroundColor: Colors.errorDark }]}>
									<Text style={[styles.optionIndexText, (showCorrect || showWrong) && { color: Colors.textInverse }]}>{i + 1}</Text>
								</View>
								{current.optionFlags && <CountryFlags name={opt} height={16} />}
								<Text style={[styles.optionText, (showCorrect || showWrong) && styles.optionTextStrong]}>{opt}</Text>
								{badge && <IconComponent type="materialIcons" name={badge.name} size={scaledSize(22)} color={badge.color} />}
							</AnimatedTouchable>
						);
					})}
					</View>
				)}

			</ScrollView>

			{/* 해설 팝업 (애니메이션) — 뒤로가기로 닫아도 다음 문제로 진행되게 처리 */}
				<View style={[styles.bottomBar, { paddingBottom: SpacingV.md + insets.bottom }]}>
						<TouchableOpacity style={styles.endBottomBtn} activeOpacity={0.85} onPress={() => setShowExitConfirm(true)}>
						<Text style={styles.endBottomText}>퀴즈 종료</Text>
					</TouchableOpacity>
				</View>
				<AppModal visible={showExplain} transparent animationType="fade" onRequestClose={onNext}>
				<View style={styles.explainOverlay}>
						{(() => {
							const correct = selected === current.answerIndex;
							const timedOut = selected === -1;
						return (
							<Animated.View
								style={[
									styles.explainSheet,
									{
										// 시트가 상태바 위로 넘치지 않도록 화면 높이 - 상단 인셋으로 상한을 고정한다
										maxHeight: screenHeight - insets.top - scaleHeight(16),
										paddingBottom: SpacingV.xxl + insets.bottom,
										opacity: explainAnim,
										transform: [{ translateY: explainAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(60), 0] }) }, { scale: explainAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
									},
								]}>
								<View style={styles.explainBadge}>
									{/* 해설 팝업 배지 — 확대 애니메이션은 이미지를 저해상도로 래스터화해 흐리게 만들므로 두지 않는다 */}
									<ExpoImage source={correct ? IMG_CORRECT : timedOut ? IMG_TIMEOUT : IMG_WRONG} style={styles.explainBadgeImg} contentFit="contain" cachePolicy="memory-disk" transition={0} priority="high" />
								</View>
								<Text style={[styles.explainResult, { color: correct ? Colors.success : Colors.errorDark }]}>{correct ? '정답이에요!' : timedOut ? '아쉬워요! 시간 초과예요' : '아쉬워요! 오답이에요'}</Text>

								{/* 정답 — 초록색 강조 */}
								{(!!current.domain || !!current.categoryLabel || !!current.level) && (
									<View style={styles.explainMetaRow}>
										<View style={[styles.explainMetaChip, { backgroundColor: withAlpha(currentDomainMeta.color, '14') }]}>
											<DomainIcon mainIcon={currentDomainMeta.mainIcon} icon={currentDomainMeta.icon} iconType={currentDomainMeta.iconType} size={scaledSize(13)} color={currentDomainMeta.color} />
											<Text style={[styles.explainMetaText, { color: currentDomainMeta.color }]}>{currentDomainMeta.title}</Text>
										</View>
										{!!current.categoryLabel && current.categoryLabel !== currentDomainMeta.title && (
										<View style={styles.explainMetaChip}>
											<IconComponent type="materialIcons" name={categoryIcon(current.categoryLabel)} size={scaledSize(13)} color={Colors.textSecondary} />
												<Text style={styles.explainMetaText}>{current.categoryLabel}</Text>
											</View>
										)}
									{!!current.level && (
										<View style={styles.explainMetaChip}>
											<IconComponent type="materialIcons" name={difficultyIcon(current.level)} size={scaledSize(13)} color={Colors.textSecondary} />
												<Text style={styles.explainMetaText}>{current.level}</Text>
											</View>
										)}
									</View>
								)}

								<View style={[styles.answerCard, { backgroundColor: withAlpha(Colors.success, '12'), borderColor: withAlpha(Colors.success, '40') }]}>
									<View style={styles.answerLabelRow}><IconComponent type="materialIcons" name="format-quote" size={scaledSize(16)} color={Colors.success} /><Text style={styles.answerCardLabel}>정답</Text></View>
									<View style={styles.answerCardValueRow}>
										{current.optionFlags && <CountryFlags name={current.options[current.answerIndex]} height={18} />}
										<Text style={[styles.answerCardText, { color: Colors.success }]}>{current.options[current.answerIndex]}</Text>
									</View>
								</View>

								<View style={styles.explainDivider} />
								<ScrollView style={styles.explainScroll} showsVerticalScrollIndicator={false}>
									{/* 문제 박스 */}
									<View style={styles.explainSection}>
										<View style={styles.explainBodyRow}><IconComponent type="materialIcons" name="article" size={scaledSize(16)} color={Colors.textSecondary} /><Text style={styles.explainBodyTitle}>문제</Text></View>
										{!!current.imageRef && <EntryImage imageRef={current.imageRef} width={scaleWidth(120)} style={styles.explainImage} />}
										<Text style={styles.explainQuestion}>{current.prompt}</Text>
										{!!current.subPrompt && <Text style={styles.explainQuestionSub}>{current.subPrompt}</Text>}
									</View>

									{/* 해설 박스 */}
									<View style={[styles.explainSection, { borderColor: withAlpha(Colors.primary, '55'), backgroundColor: withAlpha(Colors.primary, '0C') }]}>
										<View style={styles.explainBodyRow}>
											<IconComponent type="materialIcons" name="lightbulb" size={scaledSize(16)} color={Colors.primary} />
											<Text style={styles.explainBodyTitle}>해설</Text>
										</View>
										<Text style={styles.explainBody}>{current.explanation}</Text>
									</View>

									{/* 더 알아보기 박스 */}
									{!!current.examples && current.examples.length > 0 && (
										<View style={[styles.explainSection, { borderColor: withAlpha(accent, '55'), backgroundColor: withAlpha(accent, '0C') }]}>
											<View style={styles.explainBodyRow}>
												<IconComponent type="materialIcons" name="menu-book" size={scaledSize(16)} color={accent} />
												<Text style={styles.explainBodyTitle}>더 알아보기</Text>
											</View>
											{current.examples.slice(0, 3).map((ex, i) => (
												<Text key={i} style={styles.explainExample}>· {ex}</Text>
											))}
										</View>
									)}
								</ScrollView>

								<TouchableOpacity style={[styles.explainNextBtn, { backgroundColor: accent }]} activeOpacity={0.9} onPress={onNext}>
									<Text style={styles.explainNextText}>{isLast ? '결과 보기' : '다음 문제'}</Text>
									<IconComponent type="materialIcons" name={isLast ? 'flag' : 'arrow-forward'} size={scaledSize(20)} color={Colors.textInverse} />
								</TouchableOpacity>
							</Animated.View>
						);
					})()}
					</View>
					</AppModal>

				<ExitConfirmModal
					visible={showExitConfirm}
					title="종료하시겠습니까?"
					message="지금까지의 결과를 저장하고 리포트 화면으로 이동합니다."
					confirmText="종료하기"
					cancelText="취소"
					onCancel={() => setShowExitConfirm(false)}
					onConfirm={onEnd}
				/>

			{/* 업적 달성 인터셉터 (퀴즈 진행 중에도 즉시 노출) */}
		</SafeAreaView>
	);
};

export default LearnQuizPlayer;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },

	// 타임 챌린지 시작 카운트다운
	countWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
	countBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.onBrandSurface, borderWidth: 1, borderColor: Colors.onBrandBorderSoft, borderRadius: Radius.pill, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.xs, marginBottom: SpacingV.xxl },
	countBadgeText: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textInverse, letterSpacing: 1 },
	countFlash: { backgroundColor: Colors.textInverse },
	countSpeedLines: { position: 'absolute', alignItems: 'center', gap: SpacingV.sm },
	countSpeedLine: { height: scaleHeight(3), borderRadius: scaleHeight(2), opacity: 0.8 },
	countPulse: { position: 'absolute', width: scaleWidth(180), height: scaleWidth(180), borderRadius: Radius.pill, borderWidth: scaleWidth(2), borderColor: Colors.onBrandBorder },
	countPulseThin: { borderWidth: 1, borderColor: Colors.onBrandBorder },
	countCircle: { width: scaleWidth(168), height: scaleWidth(168), borderRadius: Radius.pill, backgroundColor: Colors.onBrandSurface, borderWidth: scaleWidth(3), borderColor: Colors.onBrandDivider, alignItems: 'center', justifyContent: 'center' },
	countCircleGo: { backgroundColor: Colors.onBrandDivider, borderColor: Colors.onBrandBorder },
	// 원 위에서 도는 게이지 호(위쪽만 채워진 링을 회전)
	countArc: { position: 'absolute', width: '100%', height: '100%', borderRadius: scaleWidth(84), borderWidth: scaleWidth(4), borderColor: 'transparent', borderTopColor: Colors.heatSoft, borderRightColor: Colors.heatLight },
	countNum: { fontSize: Typography.countdown, fontWeight: '900', color: Colors.textInverse, textShadowColor: Colors.shadowStrong, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 12 },
	countGo: { fontSize: Typography.mark, letterSpacing: Tracking.wider },
	countDots: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.xl },
	countDot: { width: scaleWidth(8), height: scaleWidth(8), borderRadius: Radius.pill, backgroundColor: Colors.onBrandSurfaceStrong },
	countDotOn: { backgroundColor: Colors.heatSoft, width: scaleWidth(20) },
	countHint: { fontSize: Typography.body, fontWeight: '800', color: Colors.onBrandText, marginTop: SpacingV.xl },
	countTipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: SpacingV.sm },
	countTipText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.onBrandTextSoft },
	header: {
		paddingHorizontal: Layout.screenH,
		paddingTop: SpacingV.sm,
		paddingBottom: SpacingV.lg,
		borderBottomLeftRadius: Radius.xl,
		borderBottomRightRadius: Radius.xl,
	},
	headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	scrollFlex: { flex: 1 },
	bottomBar: { paddingHorizontal: Layout.screenH, paddingTop: SpacingV.sm, paddingBottom: SpacingV.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
	endBottomBtn: { alignSelf: 'center', minWidth: scaleWidth(168), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xxl, paddingVertical: SpacingV.md, borderRadius: Radius.xl, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.borderStrong },
	endBottomText: { fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	backBtn: { width: scaleWidth(40), height: scaleWidth(40), justifyContent: 'center', alignItems: 'center' },
	headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.title, fontWeight: '800', color: Colors.textInverse },
	chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: SpacingV.md, flexWrap: 'wrap' },
	metaChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	metaChipText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	guideLine: { fontSize: Typography.body, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center', marginBottom: SpacingV.md },
	explainOverlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'flex-end', alignItems: 'center' },
	explainSheet: { width: '100%', maxWidth: Layout.sheetMaxWidth, backgroundColor: Colors.surface, borderTopLeftRadius: scaleWidth(28), borderTopRightRadius: scaleWidth(28), paddingHorizontal: Spacing.xxl, paddingTop: SpacingV.xxl, paddingBottom: SpacingV.xxl, alignItems: 'center' },
	explainBadge: { width: scaleWidth(84), height: scaleWidth(84), borderRadius: Radius.pill, backgroundColor: Colors.textInverse, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
	explainBadgeImg: { width: scaleWidth(84), height: scaleWidth(84), borderRadius: Radius.xl },
	loadingLottie: { width: scaleWidth(90), height: scaleWidth(90), alignSelf: 'center' },
	resultConfetti: { position: 'absolute', top: 0, left: 0, right: 0, height: scaleHeight(240) },
	explainResult: { fontSize: Typography.h3, fontWeight: '900', marginTop: SpacingV.md },
	answerCard: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: SpacingV.md, paddingHorizontal: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, marginTop: SpacingV.md },
	answerCardLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.success },
	answerLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
	answerCardValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
	answerCardText: { fontSize: Typography.callout, fontWeight: '900', textAlign: 'center', marginTop: SpacingV.xxs, lineHeight: scaleHeight(22) },
	introFill: { flex: 1 },
	preparingWrap: { alignItems: 'center', gap: SpacingV.md, marginTop: SpacingV.xl },
	startOverlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl },
	startSheet: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.xxl, paddingTop: SpacingV.xxl, paddingBottom: SpacingV.xl, alignItems: 'center' },
	startIcon: { width: scaleWidth(60), height: scaleWidth(60), borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: SpacingV.lg },
	startIllustration: { width: scaleWidth(112), height: scaleWidth(112), marginBottom: SpacingV.md },
	startTitle: { fontSize: Typography.h3, fontWeight: '900', color: Colors.textStrong, textAlign: 'center' },
	startDesc: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.sm, lineHeight: scaleHeight(20) },
	startSub: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.sm },
	guideList: { alignSelf: 'stretch', gap: SpacingV.sm, marginTop: SpacingV.lg },
	guideRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	guideIconWrap: { width: scaleWidth(30), height: scaleWidth(30), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
	guideText: { flex: 1, flexShrink: 1, fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '500', lineHeight: scaleHeight(18) },
	soundToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: SpacingV.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	soundToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	soundToggleLabel: { fontSize: Typography.body, fontWeight: '700', color: Colors.textStrong },
	soundPill: { minWidth: scaleWidth(48), alignItems: 'center', borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	soundPillText: { fontSize: Typography.footnote, fontWeight: '900' },
	startBtns: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch', marginTop: SpacingV.xxl },
	startCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.lg, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
	startCancelText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textSecondary },
	startGoBtn: { flex: 1.6, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.lg, borderRadius: Radius.md },
	startGoText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse },
	explainMetaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.md },
	explainMetaChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs, borderRadius: Radius.md },
	explainMetaText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	explainScroll: { alignSelf: 'stretch', flexShrink: 1 },
	explainSection: { alignSelf: 'stretch', backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: SpacingV.sm },
	explainExample: { fontSize: Typography.body, color: Colors.textSecondary, lineHeight: scaleHeight(21), marginTop: SpacingV.xs },
	explainDivider: { height: 1, alignSelf: 'stretch', backgroundColor: Colors.border, marginVertical: SpacingV.lg },
	explainBodyRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: Spacing.xs, marginBottom: SpacingV.sm },
	explainBodyTitle: { fontSize: Typography.body, fontWeight: '900', color: Colors.textStrong },
	explainBody: { fontSize: Typography.body, color: Colors.text, lineHeight: scaleHeight(22), alignSelf: 'stretch' },
	explainQuestion: { fontSize: Typography.callout, fontWeight: '800', color: Colors.primary, lineHeight: scaleHeight(23), alignSelf: 'stretch' },
	explainQuestionSub: { fontSize: Typography.body, color: Colors.textSecondary, marginTop: SpacingV.xs, alignSelf: 'stretch' },
	explainImage: { marginBottom: SpacingV.sm },
	// 광고 제거 구매자는 배너가 없으므로 헤더와 같은 색으로 상단 안전영역만 채운다
	explainNextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, alignSelf: 'stretch', paddingVertical: SpacingV.lg, borderRadius: Radius.lg, marginTop: SpacingV.xl },
	explainNextText: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
	headerCount: { fontSize: Typography.body, fontWeight: '800', color: Colors.onBrandText },
	scoreStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.onBrandSurface, borderRadius: Radius.lg, paddingVertical: SpacingV.sm, marginTop: SpacingV.md },
	scoreItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
	scoreValue: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '900' },
	scoreLabel: { color: Colors.onBrandText, fontSize: Typography.footnote, fontWeight: '700', marginLeft: Spacing.xs },
	scoreDivider: { width: 1, height: scaleHeight(18), backgroundColor: Colors.onBrandSurfaceStrong },
	emptyText: { textAlign: 'center', marginTop: SpacingV.xxxxl, color: Colors.textSecondary, fontSize: Typography.body },

	comboBadge: {
		position: 'absolute',
		alignSelf: 'center',
		zIndex: 30,
		borderRadius: Radius.lg,
		overflow: 'hidden',
		...Shadow.floating,
	},
	comboGradient: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.sm, borderWidth: Border.thin, borderColor: Colors.onBrandBorder, borderRadius: Radius.lg },
	comboKicker: { color: Colors.onBrandText, fontSize: Typography.micro, fontWeight: '900', letterSpacing: Tracking.wide },
	comboText: { color: Colors.textInverse, fontSize: Typography.title, fontWeight: '900', letterSpacing: Tracking.normal },
	comboMultiplier: { minWidth: scaleWidth(34), height: scaleWidth(34), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.onBrandSurfaceStrong, borderWidth: 1, borderColor: Colors.onBrandBorder },
	comboMultiplierText: { color: Colors.textInverse, fontSize: Typography.footnote, fontWeight: '900' },
	scoreFloat: { position: 'absolute', alignSelf: 'center', zIndex: 25, fontSize: Typography.h3, fontWeight: '900', color: Colors.goldSoft },

	body: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	questionCard: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		// 카드 상단은 태그(주제·카테고리·난이도) 줄 — 헤더와 붙어 보여 조금만 더 띄운다
		paddingTop: SpacingV.lg,
		paddingBottom: SpacingV.xxl,
		paddingHorizontal: Spacing.lg,
		alignItems: 'center',
		marginBottom: SpacingV.lg,
	},
	questionCardChat: { alignItems: 'center', backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0 },
	questionCardWord: { borderColor: Colors.primarySoft },
	questionCardRelation: { backgroundColor: Colors.secondaryBg },
	questionCardPlay: { borderStyle: 'dashed' },
	// 헤더 내 반투명 타이머 바 (스코어 바로 아래) — 시간 색상은 진행 바에 반영
	headerTimerMotion: { marginTop: SpacingV.lg },
	headerTimer: { backgroundColor: Colors.onBrandSurface, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.sm },
	headerTimerDanger: { backgroundColor: Colors.onBrandSurfaceStrong },
	headerTimerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.xs },
	headerTimerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	headerTimerLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textInverse },
	headerTimerValue: { fontSize: Typography.body, fontWeight: '900', color: Colors.textInverse, fontVariant: ['tabular-nums'] },
	headerTimerTrack: { height: scaleHeight(6), borderRadius: Radius.sm, backgroundColor: Colors.onBrandSurfaceStrong, overflow: 'hidden' },
	headerTimerFill: { height: '100%', borderRadius: Radius.sm, overflow: 'hidden' },
	headerTimerShimmer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: scaleWidth(54) },
	levelStrip: { flexDirection: 'row', gap: Spacing.xxs, marginTop: SpacingV.xs },
	levelSeg: { flex: 1, height: scaleHeight(4), borderRadius: Radius.sm },
	levelSegTodo: { opacity: 0.4 },
	levelSegCurrent: { height: scaleHeight(6), borderRadius: Radius.sm },
	promptFrame: { alignSelf: 'stretch', alignItems: 'center' },
	promptFrameChat: { alignItems: 'center', backgroundColor: 'transparent', paddingHorizontal: Spacing.xs },
	promptFrameSentence: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
	promptText: { fontSize: Typography.h2, fontWeight: '900', color: Colors.primary, textAlign: 'center', lineHeight: scaleHeight(33) },
	subPromptText: { fontSize: Typography.callout, color: Colors.textSecondary, marginTop: SpacingV.sm, textAlign: 'center', lineHeight: scaleHeight(22) },

	option: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.md,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: Border.thin,
		borderColor: Colors.border,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		marginBottom: SpacingV.sm,
	},
	optionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: SpacingV.sm },
	optionHalf: { width: '48.8%', marginBottom: 0, gap: Spacing.sm, paddingHorizontal: Spacing.md, minHeight: scaleHeight(64) },
	optionCorrect: { borderColor: Colors.success, backgroundColor: Colors.successSoft },
	optionWrong: { borderColor: Colors.error, backgroundColor: Colors.errorSoft },
	optionIndex: { width: scaleWidth(26), height: scaleWidth(26), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
	optionIndexText: { fontSize: Typography.body, fontWeight: '800', color: Colors.textSecondary },
	optionText: { flex: 1, fontSize: Typography.callout, color: Colors.text, lineHeight: scaleHeight(22) },
	optionTextStrong: { fontWeight: '700', color: Colors.textStrong },

	oxRow: { flexDirection: 'row', gap: Spacing.md },
	oxBtn: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: Border.thick,
		borderColor: Colors.border,
		paddingVertical: SpacingV.xxl,
	},
	oxMark: { fontSize: Typography.mark, fontWeight: '900' },
	oxLabel: { fontSize: Typography.body, fontWeight: '700', color: Colors.textSecondary, marginTop: SpacingV.xs },

	confettiFront: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
	resultScroll: { paddingBottom: Layout.screenBottom },
	resultHero: {
		alignItems: 'center',
		paddingTop: SpacingV.xxxl,
		paddingBottom: SpacingV.xxl,
		paddingHorizontal: Spacing.xxl,
		borderBottomLeftRadius: scaleWidth(28),
		borderBottomRightRadius: scaleWidth(28),
		overflow: 'hidden',
	},
	resultIconWrap: { width: scaleWidth(88), height: scaleWidth(88), borderRadius: Radius.pill, backgroundColor: Colors.onBrandSurfaceStrong, justifyContent: 'center', alignItems: 'center' },
	resultIllustration: { width: scaleArt(76), height: scaleArt(76) },
	resultTitle: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textInverse },
	resultSub: { fontSize: Typography.body, color: Colors.onBrandText, marginTop: SpacingV.sm },
	resultScoreChip: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.xxl, paddingVertical: SpacingV.sm, marginTop: SpacingV.lg },
	resultScoreNum: { fontSize: Typography.displayXl, fontWeight: '900', lineHeight: scaleHeight(56), color: Colors.textInverse },
	resultScoreNumGreen: { color: Colors.successBright },
	resultScoreUnit: { fontSize: Typography.h3, fontWeight: '900', color: Colors.onBrandText, marginLeft: Spacing.xs, marginBottom: SpacingV.sm },
	recordBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'center', backgroundColor: Colors.bookmarkSoft, borderWidth: 1, borderColor: Colors.goldDark, borderRadius: Radius.pill, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.xs, marginTop: SpacingV.md },
	recordBadgeText: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: '900', color: Colors.heatDeep },
	resultScoreDetail: { fontSize: Typography.body, color: Colors.onBrandText, marginTop: SpacingV.md },
	resultProfile: { alignSelf: 'stretch', backgroundColor: Colors.onBrandSurface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.md, marginTop: SpacingV.lg },
	resultProfileTitle: { color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '900', textAlign: 'center' },
	resultProfileDesc: { color: Colors.onBrandText, fontSize: Typography.footnote, fontWeight: '600', textAlign: 'center', lineHeight: scaleHeight(19), marginTop: SpacingV.xs },
	statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Layout.screenH, marginTop: scaleHeight(-18) },
	statBox: {
		flex: 1,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: Colors.border,
	},
	statBoxActive: { borderColor: Colors.primary, borderWidth: Border.thick },
	statNum: { fontSize: Typography.h2, fontWeight: '900' },
	statLabel: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '600', marginTop: SpacingV.xs },
	wrongSection: { paddingHorizontal: Layout.screenH, marginTop: Layout.sectionGap },
	wrongSectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SpacingV.md },
	wrongSectionTitle: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	wrongSectionCount: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.textMuted },
	wrongDetailHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xxs, marginTop: SpacingV.sm },
	wrongDetailHintText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.textMuted },
	nextWrap: { paddingHorizontal: Layout.screenH, marginTop: Layout.sectionGap },
	nextTitle: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong, marginBottom: SpacingV.sm },
	stepBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		padding: Spacing.lg,
		marginBottom: SpacingV.sm,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	stepIcon: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	stepBody: { flex: 1 },
	stepBtnTitle: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textStrong },
	stepBtnDesc: { fontSize: Typography.footnote, color: Colors.textSecondary, marginTop: SpacingV.xs },
	loadingOverlay: { flex: 1, backgroundColor: Colors.backdrop, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
	loadingCard: { width: '100%', maxWidth: Layout.dialogMaxWidth, alignItems: 'center', borderRadius: Radius.xl, backgroundColor: Colors.surface, paddingHorizontal: Spacing.xxl, paddingVertical: SpacingV.xxl },
	loadingTitle: { marginTop: SpacingV.md, fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong },
	loadingTrack: { alignSelf: 'stretch', height: scaleHeight(6), marginTop: SpacingV.lg, borderRadius: scaleWidth(3), backgroundColor: Colors.border, overflow: 'hidden' },
	loadingFill: { height: '100%', borderRadius: scaleWidth(3) },
}));
