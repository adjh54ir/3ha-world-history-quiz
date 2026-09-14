import FourImages from '@/src/four/assets/FourImages';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import MascotImage from '@/src/screens/common/atomic/MascotImage';
import ComboBurst from '@/src/four/screens/common/ComboBurst';
import {
	ActivityIndicator,
	Alert,
	Text,
	TouchableOpacity,
	View,
	StyleSheet,
	Platform,
	ScrollView,
	Animated,
	NativeSyntheticEvent,
	NativeScrollEvent,
	Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ProverbServices from '@/src/four/services/ProverbServices';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { getProverbExamples } from '@/src/four/utils/ProverbExampleUtils';
import { refineCharacters } from '@/src/four/utils/HanjaDictUtils';
import IconComponent from './common/atomic/IconComponent';
import ScrollTopButton from '@/src/four/screens/common/atomic/ScrollTopButton';
import AdmobFrontAd from './common/ads/AdmobFrontAd';
import { CONTENT_MAX_WIDTH, MODAL_MAX_WIDTH, moderateScale, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import { useIsFocused, useNavigation } from '@/src/four/navigation/compat';
import { Paths } from '@/src/four/navigation/conf/Paths';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimeChallengeInterceptor } from '@/src/four/services/interceptor/TimeChanllengeInterceptor';
import AnimatedNumbers from 'react-native-animated-numbers';
import Confetti from '@/src/four/components/Confetti';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import ProverbDetailModal from './modal/ProverbDetailModal';
import DateUtils from '@/src/four/utils/DateUtils';
import { playCorrect, playWrong, playCombo, playTick, playWhoosh, playFinish } from '@/src/four/utils/SoundUtils';
import { startBgm, stopBgm } from '@/src/four/utils/BgmUtils';
import { useScreenActive } from '@/src/four/hooks/useScreenActive';
import { Typography, Spacing, SpacingV, Radius, FontWeight } from '@/src/four/const/ConstDesign';
import { Colors, withAlpha, onSurface } from '@/src/four/const/ConstColors';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import { useModalHandoff } from '@/src/four/hooks/useModalHandoff';
import { bumpActivity } from '@/src/four/utils/DailyActivityUtils';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getHanjaTextStyle } from '@/src/four/const/ConstHanjaFont';
import { bridgeAnswer, bridgeTimeChallenge, resetQuizBuffer } from '@/src/four/services/LifeBridge';

const MAX_LIVES = 5;
/** 한 판에 주어지는 시간 */
const TOTAL_TIME_MS = 180_000;
const CHOICE_COUNT = 4;

/**
 * 점수대별 격려 문구.
 * 글에는 이모지를 넣지 않는다 — 기기마다 그림이 달라 보이고 줄 높이도 흔들린다.
 * 대신 점수대에 맞는 아이콘 하나를 화면에서 문구 앞에 붙인다(icon).
 */
const SCORE_ENCOURAGEMENTS: { min: number; icon: string; messages: string[] }[] = [
	{
		min: 1000,
		icon: 'trophy',
		messages: ['정말 대단합니다! 이건 거의 신급입니다!', '환상적인 성과! 축하드립니다!', '당신은 진정한 한자어 마스터!'],
	},
	{
		min: 500,
		icon: 'fire',
		messages: ['훌륭했습니다! 많이 맞췄네요!', '집중력이 남다릅니다!', '눈부신 실력입니다!'],
	},
	{
		min: 200,
		icon: 'thumb-up',
		messages: ['잘했습니다! 점점 실력이 늘고 있습니다!', '안정적인 실력이네요!', '다음엔 더 높은 점수를 노려봐요!'],
	},
	{
		min: 0,
		icon: 'sprout',
		messages: ['시작이 반입니다! 포기하지 마세요!', '계속 도전하면 분명 좋아질 것입니다!', '한 걸음 한 걸음 앞으로!'],
	},
];
const getShuffledChoices = (correct: string, allMeanings: string[]) => {
	const wrongs = Array.from(new Set(allMeanings.filter((m) => !!m && m !== correct)));
	const shuffled = [...wrongs.sort(() => 0.5 - Math.random()).slice(0, CHOICE_COUNT - 1), correct];
	return shuffled.sort(() => 0.5 - Math.random());
};

/**
 * '한글(한자)' 한 줄의 글자 수에 맞춘 크기.
 * adjustsFontSizeToFit 은 안드로이드에서 과하게 줄어들어 글자 수로 직접 정한다.
 */
const idiomFontSize = (length: number): number =>
	length <= 8 ? Typography.h2 : length <= 12 ? Typography.title : Typography.subtitle;

const InfinityQuizScreen = () => {
	const TIME_CHALLENGE_KEY = MainStorageKeyType.TIME_CHALLENGE_HISTORY;

	const navigation = useNavigation();
	// 모달이 상태바·내비게이션바 아래까지 덮으므로(AppModal) 딤 안쪽 여백을 인셋만큼 준다
	const insets = useSafeAreaInsets();
	const handoff = useModalHandoff();

	const scrollViewRef = useRef<ScrollView>(null);
	const scoreAnim = useRef(new Animated.Value(1)).current;
	const comboAnim = useRef(new Animated.Value(1)).current;
	const comboShake = useRef(new Animated.Value(0)).current;

	// 게임 중 이벤트로 시작되는 연출들 — 화면을 벗어나면 모두 정지
	useAnimationCleanup(scoreAnim, comboAnim, comboShake);
	/** 이번 콤보로 얹힌 보너스 점수 — 연출에 함께 띄운다 */
	const [comboBonus, setComboBonus] = useState(0);

	// 상세 모달 관련 state
	const [detailModalVisible, setDetailModalVisible] = useState(false);
	const [selectedProverb, setSelectedProverb] = useState<MainDataType.ProverbType | null>(null);

	const [lives, setLives] = useState(MAX_LIVES);
	const [score, setScore] = useState(0);

	const [isToastClosable, setIsToastClosable] = useState(false);

	const [questionList, setQuestionList] = useState<MainDataType.ProverbType[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [choices, setChoices] = useState<string[]>([]);
	const [isGameOver, setIsGameOver] = useState(false);
	const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
	const [selectedChoice, setSelectedChoice] = useState<string | null>(null); // 사용자가 고른 보기
	const [showExitModal, setShowExitModal] = useState(false);
	const [combo, setCombo] = useState(0);
	const [maxCombo, setMaxCombo] = useState(0);
	const [hasUsedSkip, setHasUsedSkip] = useState(false);
	const [timeLeftMs, setTimeLeftMs] = useState(TOTAL_TIME_MS);
	// 남은 시간은 실제 시계(마감 시각) 기준으로 계산한다 — tick 간격이 밀리거나 몰려도 총 180초가 유지된다
	const deadlineRef = useRef(Date.now() + TOTAL_TIME_MS);
	const timeLeftRef = useRef(timeLeftMs);
	timeLeftRef.current = timeLeftMs;
	const [hasUsedChance, setHasUsedChance] = useState(false);
	const [chanceModalVisible, setChanceModalVisible] = useState(false);
	const [showChanceAd, setShowChanceAd] = useState(false); // 찬스 광고 게이트
	const [chanceData, setChanceData] = useState<{
		characters: { char: string; meaning: string; hun?: string; eum?: string; strokes?: number; radical?: string }[];
		example: string[];
		hangul?: string;
		category?: string;
		level?: string;
		relatedWords?: string[];
	} | null>(null);

	const formattedTime = `${(timeLeftMs / 1000).toFixed(2)}초`;
	/** 남은 시간 비율 — 게이지와 색이 같은 값을 본다 */
	const timeRatio = Math.max(0, Math.min(1, timeLeftMs / TOTAL_TIME_MS));
	/** 30초 아래는 앰버, 10초 아래는 빨강 — 남은 시간이 색으로 먼저 읽힌다 */
	const timeTint = timeLeftMs <= 10_000 ? Colors.error : timeLeftMs <= 30_000 ? Colors.accentOrangeDark : Colors.secondaryDark;
	const [isPaused, setIsPaused] = useState(false);
	// useState 초기값은 렌더마다 평가되므로 Animated.Value 가 매 렌더 새로 만들어졌다 — setter 도 쓰지 않아 ref 로 바꾼다
	const heartAnimations = useRef(Array.from({ length: MAX_LIVES }, () => new Animated.Value(1))).current;

	const [isCountingDown, setIsCountingDown] = useState(false);
	const [count, setCount] = useState(3);
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const [showConfetti, setShowConfetti] = useState(false);
	useAnimationCleanup(scaleAnim);

	const [resultMap, setResultMap] = useState<{ [id: number]: 'correct' | 'wrong' }>({});
	const [gameResult, setGameResult] = useState<MainDataType.TimeChallengeResult | null>(null);
	const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

	const [showScrollTop, setShowScrollTop] = useState(false);
	const labelColors = [Colors.secondaryDark, Colors.primary, Colors.accentOrange, Colors.pink]; // A, B, C, D 색상 (각각 다르게)
	const solvedProverbs = questionList.slice(0, currentIndex + 1).filter((q) => resultMap[q.id]);

	const [bonusHistory, setBonusHistory] = useState<number[]>([]);
	const [toastMessage, setToastMessage] = useState('');
	const toastOpacity = useRef(new Animated.Value(0)).current;
	useAnimationCleanup(toastOpacity);

	/**
	 * 정답/오답 연출용 지연 호출 모음.
	 * 화면을 벗어난 뒤에도 살아 있으면 사라진 화면에 setState 가 들어간다 — 언마운트에서 한 번에 걷어낸다.
	 */
	const pendingTimersRef = useRef<NodeJS.Timeout[]>([]);
	const runLater = (fn: () => void, ms: number) => {
		pendingTimersRef.current.push(setTimeout(fn, ms));
	};
	useEffect(
		() => () => {
			pendingTimersRef.current.forEach(clearTimeout);
			pendingTimersRef.current = [];
		},
		[],
	);

	const [encouragements, setEncouragements] = useState<string[]>([]);
	/** 격려 문구 앞에 붙는 아이콘 — 점수대에 맞춰 바뀐다 */
	const [encourageIcon, setEncourageIcon] = useState('sprout');
	const [animatedScore, setAnimatedScore] = useState(0);
	// 포커스 + 앱 포그라운드
	const isActive = useScreenActive();
	const isFocused = useIsFocused();

	useEffect(() => {
		const allProverbs = ProverbServices.selectProverbList();
		const shuffled = allProverbs.sort(() => 0.5 - Math.random());
		setQuestionList(shuffled);
		playWhoosh(); // 🎬 챌린지 시작 사운드
		startBgm('time'); // 🎵 타임챌린지 BGM
		return () => stopBgm(); // 🎵 화면 이탈 시 BGM 정리(메모리 누수 방지)
	}, []);

	// 다른 화면으로 이동하면 BGM도 끈다 — 언마운트만으로는 남는 경우가 있다
	useEffect(() => {
		if (!isFocused) {
			stopBgm();
		}
	}, [isFocused]);

	useEffect(() => {
		if (!gameResult) {
			return;
		}
		// 애니메이션을 위해 100ms 딜레이 후 점수 적용
		const timer = setTimeout(() => {
			setAnimatedScore(gameResult.finalScore);
		}, 100);
		return () => clearTimeout(timer); // 언마운트된 뒤 setState 되지 않게 정리
	}, [gameResult]);

	useEffect(() => {
		if (questionList.length > 0 && currentIndex < questionList.length) {
			const current = questionList[currentIndex];
			const allMeanings = questionList.map((q) => q.meaning);
			const newChoices = getShuffledChoices(current.meaning, allMeanings);
			setChoices(newChoices);
		}
	}, [questionList, currentIndex]);

	useEffect(() => {
		if (isGameOver) {
			playFinish(); // 🎉 종료 사운드
		}
	}, [isGameOver]);

	// ⏱️ 남은 시간 마지막 5초는 1초에 한 번씩 카운트다운 효과음
	const lastTickSecRef = useRef<number | null>(null);
	useEffect(() => {
		const sec = Math.ceil(timeLeftMs / 1000);
		if (isGameOver || isPaused || sec > 5 || sec <= 0) {
			lastTickSecRef.current = null;
			return;
		}
		if (lastTickSecRef.current !== sec) {
			lastTickSecRef.current = sec;
			playTick();
		}
	}, [timeLeftMs, isGameOver, isPaused]);

	useEffect(() => {
		if (isGameOver && gameResult) {
			setShowConfetti(true);
			const score = gameResult.finalScore;

			// 점수에 맞는 메시지 세트 찾기
			const match = SCORE_ENCOURAGEMENTS.find(({ min }) => score >= min);
			const shuffled = [...(match?.messages ?? [])].sort(() => 0.5 - Math.random());
			setEncouragements(shuffled.slice(0, 3)); // 최대 3개만 표시
			setEncourageIcon(match?.icon ?? 'sprout');
		}
	}, [isGameOver, gameResult]);

	useEffect(() => {
		// 화면을 벗어나거나 앱이 백그라운드로 가면 시간이 깎이면 안 된다
		if (isGameOver || isPaused || !isActive || isCountingDown) {
			return;
		}

		// 멈췄던 동안 흐른 시간은 깎지 않는다 — 재개 시점 기준으로 마감 시각을 다시 잡는다
		deadlineRef.current = Date.now() + timeLeftRef.current;

		// 업데이터는 숫자만 줄인다 — 안에서 종료 처리까지 하면 두 번 실행될 때 정산이 두 번 돈다
		const interval = setInterval(() => {
			setTimeLeftMs(Math.max(deadlineRef.current - Date.now(), 0));
		}, 100);

		return () => clearInterval(interval);
	}, [isGameOver, isPaused, isActive, isCountingDown]);

	// 시간이 다 되면 종료는 여기서 한 번만 처리한다 (정산은 아래 isGameOver 감지 effect 가 맡는다)
	useEffect(() => {
		if (timeLeftMs <= 0 && !isGameOver) {
			setIsGameOver(true);
		}
	}, [timeLeftMs, isGameOver]);

	// lives 감소 시 애니메이션
	useEffect(() => {
		if (lives >= MAX_LIVES) {
			return;
		}
		const indexToAnimate = lives; // ex: 4 -> 3일 때 index 3 애니메이션
		const anim = Animated.sequence([
			Animated.timing(heartAnimations[indexToAnimate], {
				toValue: 0.8,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.timing(heartAnimations[indexToAnimate], {
				toValue: 1,
				duration: 150,
				useNativeDriver: true,
			}),
		]);
		anim.start();
		return () => anim.stop(); // 게임 종료·이탈 시 진행 중 애니메이션 정리
	}, [lives]);

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
				setShowScrollTop(offsetY > moderateScale(100));
			},
			/**
			 * 스크롤 최상단으로 이동
			 * @return {void}
			 */
			toTop: (): void => {
				scrollViewRef.current?.scrollTo({ y: 0, animated: true });
			},

			/**
			 * 스크롤 뷰 최하단으로 이동
			 * @return {void}
			 */
			toBottom: (): void => {
				setTimeout(() => {
					scrollViewRef.current?.scrollToEnd({ animated: true });
				}, 100);
			},
		};
	})();

	const saveChallengeResultToStorage = async (result: MainDataType.TimeChallengeResult) => {
		try {
			const existingData = await AsyncStorage.getItem(TIME_CHALLENGE_KEY);
			const history: MainDataType.TimeChallengeHistory = existingData ? JSON.parse(existingData) : [];
			const updated = [result, ...history]; // 최근 기록을 맨 앞에
			await AsyncStorage.setItem(TIME_CHALLENGE_KEY, JSON.stringify(updated));
		} catch (e) {
			console.error('⚠️ Failed to save TimeChallenge result', e);
		}
	};

	const animateScale = () => {
		scaleAnim.setValue(1.5);
		Animated.spring(scaleAnim, {
			toValue: 1,
			useNativeDriver: true,
			friction: 4,
		}).start();
	};

	// 카운트다운 중 화면을 벗어나면 타이머가 남아 언마운트 뒤에 resetGame 이 돈다.
	const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const countdownDoneRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (countdownTimerRef.current) {
				clearInterval(countdownTimerRef.current);
			}
			if (countdownDoneRef.current) {
				clearTimeout(countdownDoneRef.current);
			}
		},
		[],
	);

	const startCountdownAndReset = () => {
		setIsCountingDown(true);
		setIsFeedbackOpen(false); // ✅ 보기가 열려있다면 닫는다

		let countdown = 3;
		setCount(countdown); // 시작 시 3 한 번만 세팅
		animateScale(); // 첫 애니메이션도 같이 실행

		const timer = setInterval(() => {
			countdown--;

			if (countdown < 0) {
				clearInterval(timer);

				countdownDoneRef.current = setTimeout(() => {
					setIsCountingDown(false);
					playWhoosh(); // 🎬 재도전 시작 사운드
					startBgm('time'); // 🎵 타임챌린지 BGM 재시작
					resetGame(); // 기존 resetGame 호출
				}, 800);
				return;
			}

			setCount(countdown);
			animateScale();
			playTick(); // ⏱️ 3·2·1 카운트다운
		}, 1000);
		countdownTimerRef.current = timer;
	};

	const handleGameOver = () => {
		const quizDate = DateUtils.now().toISOString();

		const totalQuestions = currentIndex + 1;
		const correctQuizIdList = questionList
			.slice(0, currentIndex + 1)
			.filter((q) => resultMap[q.id] === 'correct')
			.map((q) => q.id);
		const wrongQuizIdList = questionList
			.slice(0, currentIndex + 1)
			.filter((q) => resultMap[q.id] === 'wrong')
			.map((q) => q.id);

		const solvedCount = correctQuizIdList.length + wrongQuizIdList.length;

		const result: MainDataType.TimeChallengeResult = {
			quizDate,
			finalScore: score,
			totalQuestions: solvedCount, // 👈 여기 수정
			solvedQuestions: correctQuizIdList.length + wrongQuizIdList.length,
			correctCount: correctQuizIdList.length,
			wrongCount: wrongQuizIdList.length,
			maxCombo,
			timeUsedMs: TOTAL_TIME_MS - timeLeftMs,
			hasUsedChance,
			hasUsedSkip,
			quizIdList: questionList.slice(0, currentIndex + 1).map((q) => q.id),
			correctQuizIdList,
			wrongQuizIdList,
		};

		setAnimatedScore(score);

		saveChallengeResultToStorage(result);
		bridgeTimeChallenge(score, correctQuizIdList.length); // 최고 점수·코인을 앱 상태에 반영
		bumpActivity('timeChallenge'); // 요일 미션(금요일) 진행도
		setGameResult(result); // ✅ 상태 저장
	};

	// 하트가 아니라 '시간 초과'로 끝난 경우엔 setIsGameOver(true) 만 호출돼 기록이 저장되지 않았다.
	// 타이머 콜백은 오래된 score/currentIndex 를 물고 있으므로, 종료를 감지해 최신 값으로 정산한다.
	useEffect(() => {
		if (isGameOver && !gameResult) {
			handleGameOver();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isGameOver, gameResult]);

	const handleAnswer = useCallback(
		(choice: string) => {
			const correct = questionList[currentIndex].meaning;
			const isCorrect = choice === correct;
			setSelectedChoice(choice); // 사용자가 고른 보기 기록
			// 앱 상태(오답 노트·코인)로 넘길 기록 — 챌린지가 끝날 때 한 번에 반영된다
			bridgeAnswer(questionList[currentIndex].id, 'meaning', isCorrect);

			// 선택 즉시 UI 반응 방지 → 약간 딜레이 후 처리
			runLater(() => {
				if (isCorrect) {
					playCorrect(); // 🔊 정답
					setResultMap((prev) => ({ ...prev, [questionList[currentIndex].id]: 'correct' }));
					setFeedback('correct');

					// 👇 콤보에 따른 보너스 점수 계산
					const baseScore = 10;
					const newCombo = combo + 1;
					let bonusScore = 0;
					if (newCombo === 3) {
						bonusScore = 5;
					} else if (newCombo === 4) {
						bonusScore = 10;
					} else if (newCombo === 5) {
						bonusScore = 20;
					} else if (newCombo >= 6) {
						bonusScore = 30;
					}
					const totalScore = score + baseScore + bonusScore;
					setScore(totalScore);

					// 🎯 점수 기반 보너스는 업데이터 밖에서 판정한다.
					// setState 업데이터 안에서 다른 setState 를 부르면 업데이터가 두 번 실행될 때
					// 시간·하트 보너스가 두 번 붙는다.
					const bonus = TimeChallengeInterceptor(totalScore, bonusHistory);
					if (bonus.addedTime > 0) {
						deadlineRef.current += bonus.addedTime;
						setTimeLeftMs((prevTime) => prevTime + bonus.addedTime);
					}
					if (bonus.addedHeart) {
						setLives((prevLives) => (prevLives < MAX_LIVES ? prevLives + 1 : prevLives));
					}
					if (bonus.message) {
						showToast(bonus.message);
					}
					if (bonus.updatedHistory) {
						setBonusHistory(bonus.updatedHistory);
					}
					triggerScoreAnim(); // 점수 애니메이션
					// 🔥 콤보 사운드는 2·5·8… 3콤보 간격으로만 (매 정답마다 울리면 금방 피로해진다)
					// 콤보 수를 넘겨 단계가 오를수록 음이 높아지게 한다
					if (combo + 1 >= 2 && (combo + 1 - 2) % 3 === 0) {
						playCombo(combo + 1);
					}

					// ✅ 콤보도 업데이터 밖에서 계산해 연출을 곧바로 실행한다
					setCombo(newCombo);
					if (newCombo > maxCombo) {
						setMaxCombo(newCombo);
					}
					if (newCombo >= 2) {
						triggerComboAnim();
						triggerComboShake();
						triggerComboEffect(newCombo);
					}
				} else {
					playWrong(); // 🔊 오답
					setResultMap((prev) => ({ ...prev, [questionList[currentIndex].id]: 'wrong' }));
					setFeedback('wrong');
					setLives((prev) => prev - 1);
					setCombo(0);
				}

				runLater(() => {
					setFeedback(null);
					setSelectedChoice(null);
					// 수정 코드
					const newLives = isCorrect ? lives : lives - 1;

					if (newLives <= 0) {
						// 정산은 아래 isGameOver 감지 effect 에 맡긴다.
						// 여기서 바로 부르면 이 콜백이 물고 있는 옛 resultMap 이 쓰여
						// 마지막에 틀린 문제가 기록에서 빠진다.
						setIsGameOver(true);
					} else {
						setCurrentIndex((prev) => prev + 1);
					}
				}, 500);
			}, 150); // ✅ 150ms 딜레이 후 반응
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[questionList, currentIndex, lives, score, combo, maxCombo, bonusHistory],
	);

	const triggerScoreAnim = () => {
		scoreAnim.setValue(1.4);
		Animated.spring(scoreAnim, {
			toValue: 1,
			friction: 4,
			useNativeDriver: true,
		}).start();
	};

	const triggerComboAnim = () => {
		comboAnim.setValue(1.4);
		Animated.spring(comboAnim, {
			toValue: 1,
			friction: 4,
			useNativeDriver: true,
		}).start();
	};
	// 긴 토스트는 delay 5초를 물고 있어 화면을 벗어나도 한동안 살아 있다 — 언마운트에서 끊는다
	useEffect(
		() => () => {
			toastOpacity.stopAnimation();
			comboAnim.stopAnimation();
			comboShake.stopAnimation();
			scoreAnim.stopAnimation();
		},
		[toastOpacity, comboAnim, comboShake, scoreAnim],
	);

	const triggerComboShake = () => {
		comboShake.setValue(0);
		Animated.sequence([
			Animated.timing(comboShake, {
				toValue: 1,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(comboShake, {
				toValue: -1,
				duration: 50,
				useNativeDriver: true,
			}),
			Animated.timing(comboShake, {
				toValue: 0,
				duration: 50,
				useNativeDriver: true,
			}),
		]).start();
	};
	/**
	 * 이번 콤보에 얹히는 보너스 점수를 정해 둔다.
	 * 연출(숫자가 튀어 오르는 것)은 ComboBurst 가 combo 값을 보고 스스로 돈다 —
	 * 여기서는 화면에 함께 띄울 점수만 넘겨 준다.
	 */
	const triggerComboEffect = (comboValue: number) => {
		const bonus = comboValue >= 6 ? 30 : comboValue === 5 ? 20 : comboValue === 4 ? 10 : comboValue === 3 ? 5 : 0;
		setComboBonus(bonus);
	};

	const showToast = (message: string) => {
		setIsToastClosable(false); // 닫기 버튼 숨기기
		setToastMessage(message);
		toastOpacity.setValue(0);
		Animated.sequence([
			Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
			Animated.delay(1200),
			Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
		]).start();
	};

	const resetGame = () => {
		resetQuizBuffer(); // 새 판 — 앱 상태로 못 넘긴 기록은 버린다
		const shuffled = ProverbServices.selectProverbList().sort(() => 0.5 - Math.random());
		setQuestionList(shuffled);
		setScore(0);
		setLives(MAX_LIVES);
		setCurrentIndex(0);
		setFeedback(null);
		setCombo(0);
		setMaxCombo(0);
		setHasUsedSkip(false);
		deadlineRef.current = Date.now() + TOTAL_TIME_MS;
		setTimeLeftMs(TOTAL_TIME_MS);
		setIsGameOver(false);
		setIsFeedbackOpen(false);
		setHasUsedChance(false);
		// 이전 판의 정오답 기록/결과가 남으면 재도전 정산이 오염된다.
		setGameResult(null);
		setResultMap({});
		setBonusHistory([]);
		setAnimatedScore(0);
		setSelectedChoice(null);
		// ✅ 하트 애니메이션 초기화
		heartAnimations.forEach((anim) => anim.setValue(1));
	};

	if (questionList.length === 0) {
		// 문제를 뽑는 동안 — 흰 화면에 맨 글씨만 뜨던 자리라 화면 색·간격을 다른 화면과 맞춘다
		return (
			<SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
				<View style={styles.bootWrap}>
					<ActivityIndicator size="large" color={Colors.primary} />
					<Text style={styles.bootText}>문제를 불러오는 중...</Text>
				</View>
			</SafeAreaView>
		);
	}

	const current = questionList[currentIndex];

	return (
		/* 상단 안전영역은 전역 배너(GlobalBannerAd)가 이미 확보한다 — top 을 쓰면 여백이 두 번 들어간다 */
		<SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
			<ScrollView
				ref={scrollViewRef}
				style={{ flex: 1 }}
				contentContainerStyle={isGameOver ? styles.resultScrollContent : styles.gameScrollContent}
				onScroll={scrollHandler.onScroll}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
			>
				{/* 게임 HUD — 점수·문제·콤보 / 남은 시간 / 목숨과 도움 버튼을 한 판에 쌓는다
				    (예전에는 판이 세 개 따로 떠 있어 화면 위쪽이 계단처럼 끊겼다) */}
				{!isGameOver && (
					<View style={styles.hud}>
					<View style={styles.statusBoxRow}>
						{/* 점수 */}
						<View style={styles.statusBox}>
							<View style={styles.iconWithLabel}>
								<View style={[styles.statusIconChip, { backgroundColor: Colors.primarySoft }]}>
									<IconComponent type="materialCommunityIcons" name="target" size={scaledSize(12)} color={Colors.primaryDark} />
								</View>
								<Text style={styles.statusLabel}>점수</Text>
							</View>
							<Animated.Text
								style={[
									styles.statusValue,
									{
										transform: [{ scale: scoreAnim }],
									},
								]}
							>
								{score}
								<Text style={styles.statusUnit}> 점</Text>
							</Animated.Text>
						</View>

						{/* 문제 — 남은 개수가 아니라 지금 몇 번째를 풀고 있는지 보여 준다 */}
						<View style={styles.statusBox}>
							<View style={styles.iconWithLabel}>
								<View style={[styles.statusIconChip, { backgroundColor: Colors.secondarySoft }]}>
									<IconComponent type="materialCommunityIcons" name="numeric" size={scaledSize(12)} color={Colors.secondaryDark} />
								</View>
								<Text style={styles.statusLabel}>문제</Text>
							</View>
							<Text style={styles.statusValue}>
								{currentIndex + 1}
								<Text style={styles.statusUnit}>번째</Text>
							</Text>
						</View>

						{/* 콤보 */}
						<View style={styles.statusBox}>
							<View style={styles.iconWithLabel}>
								<View style={[styles.statusIconChip, { backgroundColor: Colors.warningSoft }]}>
									<IconComponent type="materialCommunityIcons" name="fire" size={scaledSize(12)} color={Colors.accentOrangeDark} />
								</View>
								<Text style={styles.statusLabel}>콤보</Text>
							</View>
							<Animated.Text
								style={[
									styles.statusValue,
									{
										transform: [
											{ scale: comboAnim },
											{
												translateX: comboShake.interpolate({
													inputRange: [-1, 1],
													outputRange: [-5, 5],
												}),
											},
										],
									},
									combo >= 2 && { color: Colors.error },
								]}
							>
								{combo}
							<Text style={styles.statusUnit}> Combo</Text>
							</Animated.Text>
						</View>
					</View>
					<View style={styles.timeBoxWrapper}>
						<View style={[styles.timeBox, { borderColor: timeTint }]}>
							<IconComponent name="timer-outline" type="materialCommunityIcons" color={timeTint} size={scaledSize(18)} />
							<Text style={[styles.timeText, { color: timeTint }]}>{formattedTime}</Text>
						</View>
						{/* 남은 시간 게이지 — 숫자보다 줄어드는 막대가 먼저 읽힌다 */}
						<View style={styles.timeTrack}>
							<View style={[styles.timeFill, { width: `${timeRatio * 100}%`, backgroundColor: timeTint }]} />
						</View>
					</View>
					<View style={styles.lifeBarWrapper}>
						<View style={styles.lifeBarSide}>
							{!hasUsedChance && (
								<TouchableOpacity
									onPress={() => {
										const current = questionList[currentIndex];
										setChanceData({
											// 새김·획수·부수는 급수 자료 기준으로 보정된 값을 쓴다
											characters: refineCharacters(current),
											example: getProverbExamples(current.example),
											hangul: current.hangul,
											category: current.category,
											level: current.level,
											relatedWords: current.relatedWords,
										});
										setHasUsedChance(true); // ✅ 사용 처리
										setIsPaused(true); // 광고/힌트 동안 타이머 일시정지
										setShowChanceAd(true); // 광고 → 닫히면 찬스 힌트 모달
									}}
									style={styles.chanceContent}
								>
									<IconComponent name="magic" type="FontAwesome" color={Colors.primaryDark} size={scaledSize(16)} />
									<Text style={styles.chanceText}>찬스</Text>
								</TouchableOpacity>
							)}
						</View>

						{/* 가운데: 하트 */}
						<View style={styles.heartCentered}>
							{Array.from({ length: MAX_LIVES }).map((_, i) => (
								<Animated.View
									key={i}
									style={{
										transform: [{ scale: heartAnimations[i] }],
										marginHorizontal: Spacing.xxs,
									}}
								>
									<IconComponent
										name="heart"
										type="FontAwesome"
										size={scaledSize(15)}
										color={i < lives ? Colors.error : Colors.textMuted}
									/>
								</Animated.View>
							))}
						</View>

						{/* 오른쪽: 스킵 버튼 */}
						<View style={[styles.lifeBarSide, styles.lifeBarSideRight]}>
							{!hasUsedSkip && (
								<TouchableOpacity
									onPress={() => {
										setHasUsedSkip(true);
										setCurrentIndex((prev) => prev + 1);
										setFeedback(null);
										setCombo(0);
										showToast('이번 문제는 건너뜁니다! 스킵은 게임당 한 번만 사용할 수 있습니다');
									}}
									style={styles.skipContent}
								>
									<IconComponent name="forward" type="FontAwesome" color={Colors.secondaryDark} size={scaledSize(15)} />
									<Text style={styles.skipText}>스킵</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
					</View>
				)}

				{/* 👇 스킵 버튼을 문제 텍스트 위에 둠 */}
				{isGameOver ? (
					<>
						{showConfetti && (
							<View style={styles.globalConfettiWrapper}>
								<Confetti
									count={200}
									origin={{ x: scaleWidth(180), y: 0 }}
									fadeOut
									explosionSpeed={500}
									fallSpeed={2500}
								/>
							</View>
						)}
						<View style={styles.resultWrapper}>
							<View style={styles.gameOverBox}>
								<View style={styles.resultHeader}>
									<Text style={styles.resultHeaderTitle}>타임 챌린지 결과</Text>
									<Text style={styles.resultHeaderSub}>수고했습니다! 결과를 확인해 보세요</Text>
								</View>
								<MascotImage source={FourImages.screen_fox_time_challenge_complete} size={scaleWidth(120)} motion="cheer" popIn style={styles.resultMascot} />
								{gameResult && (
									<View style={styles.scoreHero}>
										<Text style={styles.scoreHeroLabel}>최종 점수</Text>
										<View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
											<AnimatedNumbers
												animateToNumber={animatedScore}
												animationDuration={3000}
												fontStyle={styles.scoreHeroNumber}
												includeComma
											/>
											<Text style={styles.scoreHeroUnit}>점</Text>
										</View>
										<View style={styles.scoreHeroMsgRow}>
										<IconComponent type="materialCommunityIcons" name={encourageIcon} size={scaledSize(16)} color={Colors.primaryDark} />
										<Text style={styles.scoreHeroMsg}>{encouragements[0]}</Text>
									</View>
									</View>
								)}

								{gameResult && (
									<>
										{/* ✅ 정답 / 오답 강조 카드 */}
										<View style={styles.resultScoreCardRow}>
											<View style={[styles.resultScoreCard, { backgroundColor: Colors.primaryBg, borderColor: Colors.primaryTint }]}>
												<View style={[styles.resultScoreIcon, { backgroundColor: Colors.primary }]}>
													<IconComponent name="check" type="materialIcons" color={Colors.textInverse} size={scaledSize(16)} />
												</View>
												<Text style={[styles.resultScoreValue, { color: Colors.primaryDark }]}>{gameResult.correctCount}</Text>
												<Text style={styles.resultScoreLabel}>정답</Text>
											</View>
											<View style={[styles.resultScoreCard, { backgroundColor: Colors.errorBg, borderColor: Colors.errorBorder }]}>
												<View style={[styles.resultScoreIcon, { backgroundColor: Colors.error }]}>
													<IconComponent name="close" type="materialIcons" color={onSurface(Colors.error)} size={scaledSize(16)} />
												</View>
												<Text style={[styles.resultScoreValue, { color: Colors.errorDark }]}>{gameResult.wrongCount}</Text>
												<Text style={styles.resultScoreLabel}>오답</Text>
											</View>
										</View>

										<View style={styles.statList}>
											<View style={styles.statLine}>
												<Text style={styles.statLineLabel}>푼 문제</Text>
												<Text style={styles.statLineValue}>{gameResult.totalQuestions}문제</Text>
											</View>
											<View style={styles.statLineDivider} />
											<View style={styles.statLine}>
												<Text style={styles.statLineLabel}>최대 콤보</Text>
												<Text style={[styles.statLineValue, { color: Colors.accentOrange }]}>{gameResult.maxCombo} Combo</Text>
											</View>
											<View style={styles.statLineDivider} />
											<View style={styles.statLine}>
												<Text style={styles.statLineLabel}>소요 시간</Text>
												<Text style={styles.statLineValue}>{(gameResult.timeUsedMs / 1000).toFixed(1)}초</Text>
											</View>
										</View>

										{(gameResult.hasUsedSkip || gameResult.hasUsedChance) && (
											<View style={styles.usedTagRow}>
												{gameResult.hasUsedSkip && (
													<View style={styles.usedTag}>
														<IconComponent type="materialCommunityIcons" name="skip-next" size={scaledSize(12)} color={Colors.textSecondary} />
														<Text style={styles.usedTagText}>스킵 사용</Text>
													</View>
												)}
												{gameResult.hasUsedChance && (
													<View style={styles.usedTag}>
														<IconComponent type="materialCommunityIcons" name="star-four-points" size={scaledSize(12)} color={Colors.textSecondary} />
														<Text style={styles.usedTagText}>찬스 사용</Text>
													</View>
												)}
											</View>
										)}
									</>
								)}

								<View style={styles.resultButtons}>
									{/* 나의 랭킹 보러가기 (보조) */}
									<TouchableOpacity
										style={[styles.resultBtn, styles.resultBtnSecondary]}
										activeOpacity={0.85}
										onPress={() => {
											//@ts-ignore
											navigation.navigate(Paths.INIT_TIME_CHANLLENGE); // 실제 경로로 변경
										}}
									>
										<IconComponent
											name="bar-chart"
											type="FontAwesome"
											size={scaledSize(16)}
											color={Colors.secondaryDark}
											style={{ marginRight: Spacing.sm }}
										/>
										<Text style={styles.resultBtnSecondaryText}>랭킹</Text>
									</TouchableOpacity>

									{/* 다시 도전하기 (주요) */}
									<TouchableOpacity
										style={[styles.resultBtn, styles.resultBtnPrimary]}
										activeOpacity={0.85}
										onPress={startCountdownAndReset}
									>
										<IconComponent
											name="refresh"
											type="FontAwesome"
											color={Colors.textInverse}
											size={scaledSize(16)}
											style={{ marginRight: Spacing.sm }}
										/>
										<Text style={styles.resultBtnPrimaryText}>다시 도전</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>

						<TouchableOpacity
							onPress={() => setIsFeedbackOpen(!isFeedbackOpen)}
							style={{
								backgroundColor: Colors.surfaceAlt,
								borderRadius: Radius.md,
								paddingVertical: SpacingV.md,
								paddingHorizontal: Spacing.lg,
								marginTop: SpacingV.md,
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
							}}
						>
							<Text
								style={{
									fontSize: Typography.callout,
									fontWeight: FontWeight.semibold,
									color: Colors.text,
									marginRight: Spacing.xs,
								}}
							>
								정답과 해설 보기
							</Text>
							<IconComponent
								name={isFeedbackOpen ? 'angle-up' : 'angle-down'}
								type="FontAwesome"
								color={Colors.text}
								size={scaledSize(18)}
							/>
						</TouchableOpacity>

						{/* 문제 피드백 리스트 */}
						{/* 문제 피드백 리스트 */}
						{isFeedbackOpen && (
							<View style={styles.feedbackList}>
								{solvedProverbs.map((q, i) => {
									const isCorrect = resultMap[q.id] === 'correct';
									return (
										<TouchableOpacity
											key={q.id}
											activeOpacity={0.7}
											onPress={() => {
												setSelectedProverb(q);
												setDetailModalVisible(true);
											}}
											style={[styles.feedbackItem, { backgroundColor: isCorrect ? Colors.successBg : Colors.errorBg }]}
										>
											<View style={styles.feedbackContent}>
												<View style={{ flex: 1 }}>
													<View style={styles.feedbackTitleRow}>
														<Text style={[styles.feedbackTitle, { color: Colors.textStrong, flex: 1 }]} numberOfLines={1}>
															{i + 1}. {q.hangul} ({q.hanja})
														</Text>
														<View style={[styles.feedbackResultBadge, { backgroundColor: isCorrect ? Colors.successSoft : Colors.errorSoft }]}>
															<IconComponent
																type="materialIcons"
																name={isCorrect ? 'check-circle' : 'cancel'}
																size={scaledSize(12)}
																color={isCorrect ? Colors.successDark : Colors.errorDark}
															/>
															<Text style={[styles.feedbackResultBadgeText, { color: isCorrect ? Colors.successDark : Colors.errorDark }]}>
																{isCorrect ? '정답' : '오답'}
															</Text>
														</View>
													</View>
													<Text style={styles.feedbackMeaning}>
														의미: <Text style={{ fontWeight: FontWeight.bold }}>{q.meaning}</Text>
													</Text>
												</View>
												<IconComponent
													name="chevron-right"
													type="FontAwesome"
													size={scaledSize(16)}
													color={Colors.textMuted}
													style={styles.feedbackArrow}
												/>
											</View>
										</TouchableOpacity>
									);
								})}
							</View>
						)}
					</>
				) : (
					<View
						style={[
							styles.questionBox,
							feedback === 'correct' && styles.questionBoxCorrect,
							feedback === 'wrong' && styles.questionBoxWrong,
						]}
					>
						<View style={{ marginBottom: SpacingV.md }}>
							{/* 성어 길이가 2~9자로 들쭉날쭉해 긴 성어는 폭에 맞춰 줄인다 */}
							<Text style={[styles.questionText, styles.questionIdiom, { fontSize: idiomFontSize(current.hangul.length + current.hanja.length) }]} numberOfLines={1}>
								{current.hangul}({current.hanja})
							</Text>
							<Text style={styles.questionSuffix}>의미는?</Text>
							{feedback && (
								<View
									style={[styles.feedbackTag, feedback === 'correct' ? styles.feedbackTagCorrect : styles.feedbackTagWrong]}
								>
									<IconComponent
										type="materialIcons"
										name={feedback === 'correct' ? 'check-circle' : 'cancel'}
										size={scaledSize(14)}
										color={feedback === 'correct' ? Colors.successDark : Colors.errorDark}
									/>
									<Text style={[styles.feedbackTagText, { color: feedback === 'correct' ? Colors.successDark : Colors.errorDark }]}>
										{feedback === 'correct' ? '정답입니다' : '오답입니다'}
									</Text>
								</View>
							)}
						</View>

						{choices.map((choice, index) => {
							const isCorrectAnswer = choice === current.meaning;
							const isUserSelected = selectedChoice === choice;
							const wasUserWrong = feedback === 'wrong' && isUserSelected && !isCorrectAnswer;
							// 채점 후 정답 카드 / 사용자가 고른 오답 카드 강조
							const showCorrect = feedback !== null && isCorrectAnswer;
							const showWrong = wasUserWrong;
							const isDimmed = feedback !== null && !showCorrect && !showWrong;

							return (
								<TouchableOpacity
									key={choice}
									style={[
										styles.choiceBtn,
										showCorrect && styles.choiceBtnCorrect,
										showWrong && styles.choiceBtnWrong,
										isDimmed && styles.choiceBtnDimmed,
									]}
									onPress={() => handleAnswer(choice)}
									disabled={feedback !== null}
									activeOpacity={0.85}
								>
									<View
										style={[
											styles.choiceLabelBadge,
											{ backgroundColor: withAlpha(labelColors[index], 0.1), borderColor: withAlpha(labelColors[index], 0.33) },
										]}
									>
										<Text style={[styles.choiceLabelText, { color: labelColors[index] }]}>{String.fromCharCode(65 + index)}</Text>
									</View>
									<Text
										style={[styles.choiceBtnText, showCorrect && styles.choiceTextCorrect, showWrong && styles.choiceTextWrong]}
									>
										{choice}
									</Text>
									{showCorrect && (
										<IconComponent name="check-circle" type="materialIcons" size={scaledSize(20)} color={Colors.primaryDark} />
									)}
									{showWrong && <IconComponent name="cancel" type="materialIcons" size={scaledSize(20)} color={Colors.errorDark} />}
								</TouchableOpacity>
							);
						})}
					</View>
				)}
			</ScrollView>

			<View style={styles.bottomExitWrapper}>
				<TouchableOpacity
					style={styles.exitButton}
					onPress={() => {
						setIsPaused(true); // 타이머 일시정지
						setShowExitModal(true);
					}}
				>
					<Text style={styles.exitButtonText}>종료하기</Text>
				</TouchableOpacity>
			</View>
			<ProverbDetailModal
				visible={detailModalVisible}
				proverb={selectedProverb}
				onClose={() => setDetailModalVisible(false)}
			/>

			{/* 찬스 광고 (닫히면 힌트 모달 노출) */}
			{showChanceAd && (
				<AdmobFrontAd
					onAdClosed={() => {
						// 광고가 닫히는 도중 힌트 모달을 열면 이전 화면이 번쩍인다. 닫힘이 끝난 뒤에 연다.
						handoff(
							() => setShowChanceAd(false),
							() => setChanceModalVisible(true),
						);
					}}
				/>
			)}

			{/* ✅ 찬스 힌트 모달 */}
			<AppModal
				visible={chanceModalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => {
					setChanceModalVisible(false);
					setIsPaused(false); // ✅ 닫힐 때 타이머 재개
				}}
			>
				<View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
					<View style={styles.chanceModalCard}>
						<View style={styles.chanceModalHeaderIcon}>
							<IconComponent name="magic" type="FontAwesome" color={Colors.textInverse} size={scaledSize(22)} />
						</View>
						<Text style={styles.chanceModalTitle}>찬스 힌트</Text>
						<Text style={styles.chanceModalSubtitle}>아래 단서를 모두 활용해 정답을 찾아보세요</Text>

						{/* 메타 정보 칩 (카테고리 · 난이도 · 글자수) */}
						<View style={styles.chanceMetaRow}>
							{!!chanceData?.category && (
								<View style={styles.chanceMetaChip}>
									<Text style={styles.chanceMetaChipText}>{chanceData.category}</Text>
								</View>
							)}
							{!!chanceData?.level && (
								<View style={styles.chanceMetaChip}>
									<Text style={styles.chanceMetaChipText}>{chanceData.level}</Text>
								</View>
							)}
							{!!chanceData?.characters?.length && (
								<View style={styles.chanceMetaChip}>
									<Text style={styles.chanceMetaChipText}>{chanceData.characters.length}글자</Text>
								</View>
							)}
						</View>

						<View style={styles.chanceCharBox}>
							{chanceData?.characters.map((c, i) => (
								<View key={i} style={styles.chanceCharRow}>
									<Text style={styles.chanceCharChar}>{c.char}</Text>
									{!!chanceData?.hangul?.[i] && <Text style={styles.chanceCharReading}>{chanceData.hangul[i]}</Text>}
									{/* 낱글자 뜻이 4칸 폭보다 길다 — 두 줄로 묶어 칸 높이가 제각각 되는 것을 막는다 */}
									<Text style={styles.chanceCharMeaning} numberOfLines={2} ellipsizeMode="tail">
										{c.hun ? (
											<>
												{c.hun}
												{!!c.eum && <Text style={styles.chanceCharEum}> {c.eum}</Text>}
											</>
										) : (
											c.meaning
										)}
									</Text>
									{/* 획수·부수는 급수 자료에 있는 글자만 채워진다 — 없으면 줄을 감춘다 */}
									{!!c.strokes && c.strokes > 0 && (
										<Text style={styles.chanceCharSub}>
											{c.strokes}획{c.radical ? ` · ${c.radical}` : ''}
										</Text>
									)}
								</View>
							))}
						</View>

						{!!chanceData?.relatedWords?.length && (
							<View style={styles.chanceKeywordBox}>
								<View style={styles.chanceLabelRow}>
									<IconComponent type="materialCommunityIcons" name="key-variant" size={scaledSize(13)} color={Colors.primaryDark} />
									<Text style={styles.chanceExampleLabel}>연관 키워드</Text>
								</View>
								<View style={styles.chanceKeywordWrap}>
									{chanceData.relatedWords.map((w, i) => (
										<View key={i} style={styles.chanceKeywordChip}>
											<Text style={styles.chanceKeywordText}>{w}</Text>
										</View>
									))}
								</View>
							</View>
						)}

						<View style={styles.chanceExampleBox}>
							<View style={styles.chanceLabelRow}>
								<IconComponent type="materialCommunityIcons" name="book-open-variant" size={scaledSize(13)} color={Colors.primaryDark} />
								<Text style={styles.chanceExampleLabel}>예문</Text>
							</View>
							{chanceData?.example.length ? (
								chanceData.example.map((example, index) => (
									<Text key={`${index}-${example}`} style={styles.chanceExampleText}>
										- {example}
									</Text>
								))
							) : (
								<Text style={styles.chanceExampleText}>예문 없음</Text>
							)}
						</View>

						<TouchableOpacity
							style={styles.chanceModalButton}
							onPress={() => {
								setChanceModalVisible(false);
								setIsPaused(false); // ✅ 확인 시 타이머 재개
							}}
							activeOpacity={0.85}
						>
							<Text style={styles.chanceModalButtonText}>확인</Text>
						</TouchableOpacity>
					</View>
				</View>
			</AppModal>

			{showExitModal && (
				<AppModal visible transparent animationType="fade" onRequestClose={() => { setShowExitModal(false); setIsPaused(false); }}>
					<View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
						<View style={styles.exitModal}>
							<Text style={styles.exitModalTitle}>타임 챌린지를 종료하시겠어요?</Text>
							<Text style={styles.exitModalMessage}>진행 중인 퀴즈는 저장되지 않습니다.</Text>
							<View style={styles.modalButtonRow}>
								<TouchableOpacity
									style={styles.modalBackButton}
									onPress={() => {
										setShowExitModal(false);
										setIsPaused(false); // 타이머 재개
									}}
								>
									<Text style={styles.modalCancelText}>취소</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.exitModalConfirmButton}
									onPress={() => {
										setShowExitModal(false);
										setIsPaused(false); // 상태 초기화
										//@ts-ignore
										navigation.replace(Paths.MAIN_TAB, { screen: Paths.HOME });
									}}
								>
									{/* 종료 버튼 면은 error — 다크에서 밝은 살몬이 되어 흰 글씨가 뭉개진다 */}
									<Text style={[styles.modalButtonText, { color: onSurface(Colors.error) }]}>종료하기</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</AppModal>
			)}

			{isCountingDown && (
				<View style={StyleSheet.absoluteFillObject}>
					<View style={styles.countdownOverlay}>
						<Animated.View style={[styles.countdownCircle, { transform: [{ scale: scaleAnim }] }]}>
							<Text style={styles.countdownText}>{count === 0 ? '시작!' : String(count)}</Text>
						</Animated.View>
						<View style={styles.countdownMessageWrapper}>
							<Text style={styles.countdownMessage}>
								{count === 3 ? '심호흡 하세요' : count === 2 ? '준비하세요!' : count === 1 ? '곧 시작됩니다!' : '화이팅!'}
							</Text>
						</View>
					</View>
				</View>
			)}

			{/* 최하단에 위치할것!! */}
			{/* 하단 종료 버튼과 겹치지 않게 위치를 올린다 */}
			<ScrollTopButton visible={showScrollTop} onPress={scrollHandler.toTop} bottom={scaleHeight(80)} />

			{/* 연속 정답 — 퀴즈 화면과 같은 연출을 쓴다 (두 화면에 따로 두면 한쪽만 고쳐진다) */}
			<ComboBurst combo={combo} bonus={comboBonus} />

			{toastMessage !== '' && (
				<Animated.View
					style={{
						position: 'absolute',
						bottom: isToastClosable ? '30%' : scaleHeight(100),
						left: 0,
						right: 0,
						alignItems: 'center',
						opacity: toastOpacity,
						zIndex: 1000,
					}}
				>
					<View
						style={{
							backgroundColor: Colors.inverseSurface,
							paddingVertical: isToastClosable ? scaleHeight(20) : scaleHeight(12),
							paddingHorizontal: isToastClosable ? scaleWidth(24) : scaleWidth(18),
							borderRadius: Radius.xxl,
							minHeight: isToastClosable ? scaleHeight(100) : undefined,
							minWidth: isToastClosable ? scaleWidth(200) : undefined,
							maxWidth: '88%',
							justifyContent: 'center',
							alignItems: 'center',
							flexDirection: isToastClosable ? 'column' : 'row',
							gap: Spacing.sm,
						}}
					>
						<Text
							style={{
								color: Colors.textInverse,
								fontSize: isToastClosable ? Typography.title : Typography.body,
								fontWeight: FontWeight.bold,
								textAlign: 'center',
								lineHeight: isToastClosable ? scaleHeight(28) : scaleHeight(20),
								marginBottom: isToastClosable ? scaleHeight(12) : 0,
							}}
						>
							{toastMessage}
						</Text>

						{/* ✅ 하단 닫기 버튼: long toast에만 표시 */}
						{isToastClosable && (
							<TouchableOpacity
								onPress={() => {
									setToastMessage('');
									toastOpacity.setValue(0);
								}}
								style={{
									marginTop: SpacingV.xs,
									backgroundColor: Colors.darkCardStrong,
									paddingVertical: SpacingV.sm,
									paddingHorizontal: Spacing.lg,
									borderRadius: Radius.md,
								}}
							>
								<Text
									style={{
										color: Colors.textInverse,
										fontSize: Typography.body,
										fontWeight: FontWeight.semibold,
									}}
								>
									닫기
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</Animated.View>
			)}
		</SafeAreaView>
	);
};

export default InfinityQuizScreen;

const makeStyles = () => StyleSheet.create({
	// 화면 좌우 기준선은 앱 공통 16(Spacing.lg) — 여기만 20이라 다른 화면과 어긋났다
	container: { flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.xl, backgroundColor: Colors.background },
	header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	score: { fontSize: Typography.h3, fontWeight: FontWeight.bold },
	lives: { fontSize: Typography.h3, color: Colors.error },
	statusText: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
	},
	scoreValue: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginTop: SpacingV.xs,
	},

	correct: { backgroundColor: Colors.secondarySoft },
	wrong: { backgroundColor: Colors.errorBorder },
	gameOverBox: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingTop: SpacingV.sm,
	},
	gameOverText: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.bold,
	},
	finalScore: {
		fontSize: Typography.h3,
		marginBottom: SpacingV.xxxl,
	},
	restartBtn: {
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.xxxl,
		backgroundColor: Colors.secondarySurface,
		borderRadius: Radius.md,
		marginBottom: SpacingV.xxl,
	},
	restartText: {
		color: Colors.textInverse,
		fontWeight: FontWeight.bold,
		fontSize: Typography.title,
	},
	bottomExitWrapper: {
		width: '100%',
		// 높이를 30 으로 묶으면 40 짜리 버튼이 띠 밖으로 삐져나온다 — 패딩만으로 높이를 정한다
		alignItems: 'center',
		backgroundColor: Colors.surface,
		borderTopWidth: 1,
		borderTopColor: Colors.surfaceAlt,
		paddingTop: SpacingV.sm,
		paddingBottom: Platform.OS === 'android' ? scaleHeight(10) : scaleHeight(14),
	},
	exitButton: {
		// 글씨색이 textInverse 라 다크에서 밝아지는 textSecondary 를 배경으로 쓰면 글자가 묻힌다.
		// inverseSurface 는 두 테마 모두 어두워 흰 글씨가 항상 읽힌다.
		backgroundColor: Colors.inverseSurface,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.xxxl,
		borderRadius: Radius.xl,
		// 고정 height 는 padding + 글자 높이보다 작아져 글씨를 눌러버린다 — minHeight 로 바닥만 보장
		minHeight: scaleHeight(40),
		justifyContent: 'center', // 수직 정렬 보장
		alignItems: 'center',
	},
	exitButtonText: {
		color: Colors.textInverse,
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.semibold,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
		// 위아래 여백은 시스템 바 인셋으로 준다 — 고정 40 은 카드를 아래로 밀어 가운데를 벗어나게 했다
	},
	exitModal: {
		width: '85%',
		maxWidth: MODAL_MAX_WIDTH,
		maxHeight: '80%',
		backgroundColor: Colors.surface,
		// backgroundColor: Colors.error,
		borderRadius: Radius.lg,
		padding: Spacing.xl,
	},
	exitModalTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.md,
		textAlign: 'center',
	},
	exitModalMessage: {
		fontSize: Typography.callout,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xl,
		textAlign: 'center',
		lineHeight: scaledSize(22),
	},
	exitModalConfirmButton: {
		flex: 1,
		backgroundColor: Colors.error,
		padding: SpacingV.md,
		borderRadius: Radius.sm,
		marginLeft: Spacing.sm,
		alignItems: 'center',
	},
	modalButtonRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
	},
	// 취소 버튼은 앱 공통(BottomHomeButton)과 같은 조합 — 흰 글씨를 옅은 회색 위에 얹으면 읽히지 않는다
	modalBackButton: {
		flex: 1,
		backgroundColor: Colors.surfaceAlt,
		padding: SpacingV.md,
		borderRadius: Radius.sm,
		marginRight: Spacing.sm,
		alignItems: 'center',
	},
	modalCancelText: {
		flexShrink: 1,
		color: Colors.textSecondary,
		fontWeight: FontWeight.semibold,
		fontSize: Typography.callout,
	},
	modalStartButton: {
		flex: 1,
		backgroundColor: Colors.secondarySurface,
		padding: SpacingV.md,
		borderRadius: Radius.sm,
		marginLeft: Spacing.sm,
		alignItems: 'center',
	},
	modalButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontWeight: FontWeight.semibold,
		fontSize: Typography.callout,
	},
	fixedHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		backgroundColor: Colors.surface,
		paddingHorizontal: Spacing.sm,
		paddingTop: SpacingV.md,
		paddingBottom: SpacingV.sm,
		borderBottomWidth: 1,
		borderBottomColor: Colors.surfaceAlt,
		zIndex: 10,
	},

	/**
	 * 게임 HUD 한 판 — 점수 줄 · 시간 줄 · 목숨 줄을 한 덩어리로 감싼다.
	 * 아래쪽 테두리만 두껍게 둬서 판이 살짝 떠 보이게 한다 (elevation 은 쓰지 않는다).
	 */
	hud: {
		gap: SpacingV.sm,
		padding: Spacing.md,
		marginBottom: SpacingV.md,
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderBottomWidth: scaleHeight(4),
		borderColor: Colors.border,
	},
	statusBox: {
		flex: 1,
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.sm,
		alignItems: 'center',
	},
	// 상태 칸 아이콘 — 이모지 대신 같은 크기의 동그란 칩으로 세 칸의 높이를 맞춘다
	// 문제를 뽑는 동안 보여 주는 화면 — 가운데 한 덩어리
	bootWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SpacingV.md },
	bootText: { fontSize: Typography.callout, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
	statusIconChip: {
		width: scaleWidth(18),
		height: scaleWidth(18),
		borderRadius: scaleWidth(9),
		alignItems: 'center',
		justifyContent: 'center',
	},

	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
	},

	// 타워 챌린지의 상태 칩과 같은 위계(작은 라벨 + 굵은 값)로 맞춘다
	statusLabel: {
		fontSize: Typography.caption,
		fontWeight: FontWeight.medium,
		color: Colors.textSecondary,
	},

	statusValue: {
		fontSize: Typography.title,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
	},
	// 단위는 숫자보다 작게 — 숫자가 먼저 읽힌다
	statusUnit: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textSecondary },
	heartRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: Spacing.xxs,
	},
	iconWithLabel: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.xs,
		marginBottom: SpacingV.sm,
	},
	statusWrapper: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.md,
		backgroundColor: Colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: Colors.surfaceAlt,
		gap: Spacing.sm,
	},
	// 점수·문제·콤보 세 칸 — 게임 HUD 한 줄. 아래 두꺼운 선으로 판이 떠 보이게 한다
	// HUD 첫 줄 — 판 껍데기는 hud 가 맡고 여기서는 세 칸을 나란히만 놓는다
	statusBoxRow: {
		flexDirection: 'row',
		gap: Spacing.sm,
	},

	questionBox: {
		marginTop: SpacingV.md,
		padding: Spacing.lg,
		borderRadius: Radius.lg,
		backgroundColor: Colors.background,
		borderWidth: 1,
		borderColor: Colors.secondarySoft,
	},
	questionText: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.bold,
		textAlign: 'center',
		color: Colors.text,
		lineHeight: scaledSize(30),
	},
	/** 한자어 본문 — 화면에서 가장 먼저 읽혀야 하는 줄(선택지가 밀리지 않게 h2까지만) */
	questionIdiom: {
		...getHanjaTextStyle(),
		fontSize: Typography.h2,
		lineHeight: scaledSize(32),
		textAlign: 'center',
		color: Colors.secondaryDark,
		fontWeight: FontWeight.heavy,
	},
	/** "의미는?" — 한자어를 받쳐 주는 보조 줄 */
	questionSuffix: {
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
		textAlign: 'center',
		color: Colors.textSecondary,
		marginTop: SpacingV.xxs,
	},
	feedbackTag: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'center',
		gap: Spacing.xs,
		marginTop: SpacingV.md,
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
		borderRadius: Radius.pill,
	},
	feedbackTagCorrect: { backgroundColor: Colors.successSoft },
	feedbackTagWrong: { backgroundColor: Colors.errorSoft },
	feedbackTagText: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy },
	choicesWrapper: {
		gap: SpacingV.md,
	},
	choiceBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.lg,
		marginVertical: SpacingV.sm,
		marginHorizontal: 0,
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		borderWidth: 2,
		borderColor: Colors.borderStrong,
	},
	choiceBtnText: {
		flex: 1,
		fontSize: Typography.subtitle,
		textAlign: 'left',
		color: Colors.text,
		fontWeight: FontWeight.medium,
	},
	choiceLabelBadge: {
		width: scaleWidth(26),
		height: scaleWidth(26),
		borderRadius: Radius.sm,
		backgroundColor: Colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	choiceLabelText: {
		fontSize: Typography.body,
		fontWeight: FontWeight.heavy,
	},
	choiceBtnCorrect: {
		backgroundColor: Colors.successSoft,
		borderColor: Colors.successDark,
	},
	choiceBtnWrong: {
		backgroundColor: Colors.errorSoft,
		borderColor: Colors.errorDark,
	},
	choiceBtnDimmed: {
		opacity: 0.5,
	},
	choiceTextCorrect: {
		color: Colors.successDeep,
		fontWeight: FontWeight.heavy,
	},
	choiceTextWrong: {
		color: Colors.errorDeep,
		fontWeight: FontWeight.bold,
	},
	skipTopRightButton: {
		position: 'absolute',
		top: scaleHeight(12),
		right: scaleWidth(12),
		zIndex: 1,
	},
	skipTopRightText: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		opacity: 0.6,
		fontWeight: FontWeight.medium,
	},
	timeBoxWrapper: {
		alignItems: 'center',
		gap: SpacingV.xs,
	},

	timeBox: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		backgroundColor: Colors.surfaceAlt,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.lg,
		borderRadius: Radius.pill,
		borderWidth: 1,
	},

	timeText: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.heavy,
	},
	// 남은 시간 게이지 — 화면 폭을 채우고 색은 남은 시간에 따라 바뀐다
	timeTrack: {
		width: '100%',
		height: scaleHeight(6),
		borderRadius: Radius.pill,
		backgroundColor: Colors.surfaceAlt,
		overflow: 'hidden',
	},
	timeFill: { height: '100%', borderRadius: Radius.pill },
	skipInlineButton: {
		backgroundColor: Colors.surfaceAlt,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.sm,
		marginLeft: Spacing.sm,
	},
	skipInlineText: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
		fontWeight: FontWeight.medium,
	},
	questionBoxCorrect: {
		backgroundColor: Colors.successSoft, // 연한 초록색 배경
	},
	questionBoxWrong: {
		backgroundColor: Colors.errorSoft, // 연한 빨간색 배경
	},
	resultSummaryBox: {
		width: '100%', // ✅ 전체 너비 사용
		marginTop: SpacingV.xl,
		marginBottom: SpacingV.xxl,
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.xl,
		borderRadius: Radius.lg,
		backgroundColor: Colors.background,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	resultRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.xs,
		borderBottomWidth: 1,
		borderBottomColor: Colors.surfaceAlt,
	},
	resultText: {
		fontSize: Typography.callout,
		marginLeft: Spacing.md,
		color: Colors.text,
		fontWeight: FontWeight.medium,
	},
	bold: {
		fontWeight: FontWeight.bold,
	},

	feedbackList: {
		width: '100%',
		marginTop: SpacingV.xl,
		padding: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.md,
		backgroundColor: Colors.background,
	},
	feedbackItem: {
		padding: Spacing.md,
		borderRadius: Radius.md,
		marginBottom: SpacingV.md,
		borderWidth: 1,
		borderColor: Colors.borderStrong,
	},
	feedbackTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
		marginBottom: SpacingV.md,
	},
	feedbackResultBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.xxs,
	},
	feedbackResultBadgeText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy },
	feedbackTitle: {
		...getHanjaTextStyle(),
		flex: 1,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
	},
	feedbackMeaning: {
		fontSize: Typography.body,
		marginBottom: SpacingV.xxs,
		color: Colors.text,
	},
	feedbackResult: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
	},
	countdownOverlay: {
		flex: 1,
		backgroundColor: Colors.scrimStrong,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 999,
	},
	countdownText: {
		fontSize: Typography.heroXl,
		fontWeight: FontWeight.bold,
		color: Colors.textInverse,
		textAlign: 'center',
		includeFontPadding: false,
		textAlignVertical: 'center',
		lineHeight: scaledSize(80),
	},
	countdownCircle: {
		width: scaleWidth(160),
		height: scaleWidth(160),
		borderRadius: scaleWidth(80),
		backgroundColor: withAlpha(Colors.teal, 0.2),
		borderWidth: 4,
		borderColor: Colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	countdownMessage: {
		fontSize: Typography.subtitle,
		color: Colors.textInverse,
		fontWeight: FontWeight.bold,
		textAlign: 'center',
		letterSpacing: 0.3,
	},
	countdownMessageWrapper: {
		marginTop: SpacingV.xxxl,
		paddingHorizontal: Spacing.xxl,
		paddingVertical: SpacingV.md,
		backgroundColor: Colors.darkDivider,
		borderRadius: Radius.xl,
		minWidth: scaleWidth(180),
		alignItems: 'center',
	},
	feedbackStatus: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.bold,
		marginLeft: Spacing.sm,
	},
	skipButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.secondaryBg,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.md,
	},

	// 찬스/스킵은 같은 크기의 알약 버튼 — 바깥 테두리를 없애 '테두리 안의 테두리'를 피한다
	skipContent: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.secondaryBg,
		borderRadius: Radius.pill,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.md,
		gap: Spacing.xs,
	},

	skipText: {
		fontSize: Typography.footnote,
		color: Colors.secondaryDark,
		fontWeight: FontWeight.heavy,
		lineHeight: scaledSize(16),
	},
	// HUD 마지막 줄 — 위에 얇은 선 하나로 시간 줄과 갈라 둔다
	lifeBarWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		minHeight: scaleHeight(40),
		paddingTop: SpacingV.sm,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
	},
	// 좌·우 슬롯 폭이 같아야 버튼이 하나만 남아도 하트가 정중앙에 머문다
	lifeBarSide: {
		width: scaleWidth(72),
		alignItems: 'flex-start',
		justifyContent: 'center',
	},
	lifeBarSideRight: {
		alignItems: 'flex-end',
	},

	heartCentered: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},

	skipFixedRight: {
		marginLeft: 'auto',
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.secondaryBg,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.md,
		zIndex: 2,
	},
	chanceText: {
		fontSize: Typography.footnote,
		lineHeight: scaledSize(16),
		color: Colors.primaryDark,
		fontWeight: FontWeight.heavy,
	},
	chanceContent: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.primaryBg, // 💚 연한 초록색 배경
		borderRadius: Radius.pill,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.md,
		gap: Spacing.xs, // 아이콘과 텍스트 간격
	},
	chanceModalCard: {
		width: '85%',
		maxWidth: Math.min(scaleWidth(360), MODAL_MAX_WIDTH),
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		paddingTop: SpacingV.xxl,
		paddingBottom: SpacingV.xl,
		paddingHorizontal: Spacing.xl,
		alignItems: 'center',
	},
	chanceModalHeaderIcon: {
		width: scaleWidth(52),
		height: scaleWidth(52),
		borderRadius: scaleWidth(26),
		backgroundColor: Colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: SpacingV.md,
	},
	chanceModalTitle: {
		fontSize: Typography.title,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		marginBottom: SpacingV.xxs,
	},
	chanceModalSubtitle: {
		fontSize: Typography.bodySm,
		color: Colors.textMuted,
		marginBottom: SpacingV.lg,
		fontWeight: FontWeight.semibold,
	},
	chanceCharBox: {
		width: '100%',
		flexDirection: 'row',
		gap: Spacing.sm,
		marginBottom: SpacingV.lg,
	},
	chanceCharRow: {
		flex: 1,
		alignItems: 'center',
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.sm,
		paddingHorizontal: Spacing.sm,
	},
	chanceCharChar: {
		fontSize: Typography.title,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
		marginBottom: SpacingV.xs,
	},
	chanceCharReading: {
		fontSize: Typography.caption,
		color: Colors.secondaryDark,
		fontWeight: FontWeight.heavy,
		textAlign: 'center',
		marginTop: SpacingV.xxs,
	},
	chanceCharMeaning: {
		fontSize: Typography.caption,
		color: Colors.textSecondary,
		fontWeight: FontWeight.semibold,
		textAlign: 'center',
	},
	/** 훈은 뜻, 음은 읽는 소리 — 음만 굵게 해 눈에 먼저 들어오게 한다 (다른 화면과 같은 규칙) */
	chanceCharEum: { fontWeight: FontWeight.heavy, color: Colors.text },
	chanceCharSub: {
		fontSize: Typography.micro,
		color: Colors.textMuted,
		fontWeight: FontWeight.semibold,
		textAlign: 'center',
		marginTop: SpacingV.xxs,
	},
	chanceMetaRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: Spacing.sm,
		marginBottom: SpacingV.md,
	},
	chanceMetaChip: {
		backgroundColor: Colors.secondaryBg,
		borderRadius: Radius.pill,
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
	},
	chanceMetaChipText: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: FontWeight.bold, color: Colors.secondaryDark },
	chanceKeywordBox: { width: '100%', marginBottom: SpacingV.md },
	chanceKeywordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: SpacingV.sm },
	chanceKeywordChip: {
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.sm,
		paddingVertical: SpacingV.xs,
	},
	chanceKeywordText: { fontSize: Typography.footnote, fontWeight: FontWeight.semibold, color: Colors.textDeep },

	chanceExampleBox: {
		width: '100%',
		backgroundColor: Colors.primaryBg,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		paddingHorizontal: Spacing.md,
		marginBottom: SpacingV.xl,
	},
	// 라벨 아이콘 + 글씨 한 줄 — 아래 본문과의 간격은 줄 자체가 갖는다
	chanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: SpacingV.xs },
	chanceExampleLabel: {
		fontSize: Typography.footnote,
		fontWeight: FontWeight.heavy,
		color: Colors.primaryDeep,
	},
	chanceExampleText: {
		fontSize: Typography.body,
		color: Colors.text,
		fontWeight: FontWeight.semibold,
		lineHeight: scaledSize(20),
	},
	chanceModalButton: {
		width: '100%',
		backgroundColor: Colors.primary,
		paddingVertical: SpacingV.md,
		borderRadius: Radius.lg,
		alignItems: 'center',
	},
	chanceModalButtonText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontSize: Typography.callout,
		fontWeight: FontWeight.bold,
	},
	resultTitleCard: {
		alignItems: 'center',
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.md,
		backgroundColor: Colors.warningBg,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.warningLight,
	},
	animatedScore: {
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		color: Colors.accentOrange,
	},
	// 인게임 본문 — 결과 화면과 같은 기둥 폭 (태블릿에서 좌우 선이 맞는다)
	gameScrollContent: {
		width: '100%',
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
	},
	resultScrollContent: {
		// 태블릿: 본문을 가운데 한 기둥으로 묶는다 (CharacterGuide 와 같은 폭)
		width: '100%',
		maxWidth: CONTENT_MAX_WIDTH,
		alignSelf: 'center',
		flexGrow: 1,
		justifyContent: 'center',
		paddingBottom: SpacingV.xl,
	},
	resultWrapper: {
		marginTop: SpacingV.sm,
		width: '100%',
		borderWidth: 1,
		borderColor: Colors.borderStrong,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surface,
		padding: Spacing.lg,
	},
	resultButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		gap: Spacing.md,
		marginTop: SpacingV.xs,
		marginBottom: SpacingV.sm,
	},
	resultHeader: {
		width: '100%',
		alignItems: 'center',
		marginBottom: SpacingV.xs,
	},
	resultHeaderTitle: {
		fontSize: Typography.h3,
		fontWeight: FontWeight.heavy,
		color: Colors.textStrong,
	},
	resultHeaderSub: {
		fontSize: Typography.bodySm,
		color: Colors.textMuted,
		fontWeight: FontWeight.semibold,
		marginTop: SpacingV.xs,
	},
	resultMascot: {
		width: scaleWidth(120),
		height: scaleWidth(120),
		alignSelf: 'center',
		marginTop: SpacingV.xs,
	},
	scoreHero: {
		width: '100%',
		alignItems: 'center',
		paddingVertical: SpacingV.md,
		marginTop: SpacingV.sm,
	},
	scoreHeroLabel: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.bold,
		color: Colors.textMuted,
		marginBottom: SpacingV.xxs,
	},
	resultScoreCardRow: {
		flexDirection: 'row',
		width: '100%',
		gap: Spacing.md,
		marginTop: SpacingV.sm,
		marginBottom: SpacingV.md,
	},
	resultScoreCard: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: SpacingV.lg,
		borderRadius: Radius.lg,
		borderWidth: 1,
	},
	resultScoreIcon: {
		width: scaleWidth(28),
		height: scaleWidth(28),
		borderRadius: Radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: SpacingV.sm,
	},
	resultScoreValue: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.heavy,
	},
	resultScoreLabel: {
		fontSize: Typography.bodySm,
		color: Colors.textSecondary,
		fontWeight: FontWeight.bold,
		marginTop: SpacingV.xxs,
	},
	statList: {
		width: '100%',
		backgroundColor: Colors.background,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.surfaceMutedAlt,
		paddingHorizontal: Spacing.lg,
		paddingVertical: SpacingV.xs,
		marginTop: SpacingV.sm,
		marginBottom: SpacingV.md,
	},
	statLine: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: SpacingV.md,
	},
	statLineLabel: {
		fontSize: Typography.body,
		color: Colors.textSecondary,
		fontWeight: FontWeight.semibold,
	},
	statLineValue: {
		fontSize: Typography.callout,
		color: Colors.textStrong,
		fontWeight: FontWeight.heavy,
	},
	statLineDivider: {
		height: 1,
		backgroundColor: Colors.surfaceMutedAlt,
	},
	scoreHeroNumber: {
		fontSize: Typography.heroLg,
		fontWeight: FontWeight.bold,
		color: Colors.error,
	},
	scoreHeroUnit: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.bold,
		color: Colors.error,
		marginLeft: Spacing.xs,
		marginBottom: SpacingV.md,
	},
	// 아이콘 + 문구를 한 줄로 — 길면 줄바꿈되므로 아이콘은 첫 줄에 맞춰 위로 붙인다
	scoreHeroMsgRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'center',
		gap: Spacing.xs,
		marginTop: SpacingV.sm,
	},
	scoreHeroMsg: {
		flexShrink: 1,
		fontSize: Typography.bodySm,
		color: Colors.textDeep,
		textAlign: 'center',
		fontWeight: FontWeight.semibold,
		lineHeight: scaledSize(20),
	},
	statGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		width: '100%',
		gap: Spacing.sm,
		marginTop: SpacingV.lg,
		marginBottom: SpacingV.md,
	},
	statChip: {
		flexGrow: 1,
		flexBasis: '30%',
		alignItems: 'center',
		backgroundColor: Colors.background,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.surfaceMutedAlt,
		paddingVertical: SpacingV.md,
	},
	statChipValue: {
		fontSize: Typography.title,
		fontWeight: FontWeight.heavy,
		color: Colors.text,
		marginBottom: SpacingV.xxs,
	},
	statChipLabel: {
		flexShrink: 1,
		fontSize: Typography.caption,
		color: Colors.textMuted,
		fontWeight: FontWeight.semibold,
	},
	usedTagRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: Spacing.sm,
		marginBottom: SpacingV.lg,
	},
	usedTag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		backgroundColor: Colors.primaryBg,
		borderRadius: Radius.xl,
		paddingVertical: SpacingV.xs,
		paddingHorizontal: Spacing.md,
	},
	usedTagText: {
		fontSize: Typography.footnote,
		color: Colors.primaryDeep,
		fontWeight: FontWeight.bold,
	},
	resultBtn: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
	},
	resultBtnPrimary: {
		backgroundColor: Colors.secondarySurface,
	},
	resultBtnPrimaryText: {
		fontSize: Typography.body,
		fontWeight: FontWeight.heavy,
		color: Colors.textInverse,
	},
	resultBtnSecondary: {
		backgroundColor: Colors.secondaryBg,
		borderWidth: 1,
		borderColor: Colors.secondaryPale,
	},
	resultBtnSecondaryText: {
		fontSize: Typography.body,
		fontWeight: FontWeight.heavy,
		color: Colors.secondaryDark,
	},
	globalConfettiWrapper: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 999,
		pointerEvents: 'none',
	},
	feedbackContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	feedbackArrow: {
		marginLeft: Spacing.md,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
