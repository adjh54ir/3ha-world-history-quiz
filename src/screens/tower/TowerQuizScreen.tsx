// @/screens/TowerQuiz.tsx

/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Animated, Easing } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { contentWidth, scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { TOWER_LEVELS } from '@/src/const/ConstTowerData';
import { generateTowerQuiz, TOWER_LEVEL_MAP, TowerQuizQuestion } from '@/src/const/ConstTowerQuizData';
import TowerResultModal from './TowerResultModal';
import { showConfirm } from '@/src/screens/common/modal/ConfirmModal';
import { playCorrect, playWrong, playWhoosh, playFinish } from '@/src/utils/SoundUtils';
import { startBgm, stopBgm } from '@/src/utils/BgmUtils';
import { Typography, FontWeight, Spacing, SpacingV, Radius, Layout } from '@/src/const/ConstDesign';
import { Colors, readableOn, withAlpha } from '@/src/const/ConstColors';
import useAnimationCleanup from './useAnimationCleanup';
import { themed } from '@/src/utils/ThemedStyles';
import LearnProgressService from '@/src/services/LearnProgressService';
import LearnHubService from '@/src/services/LearnHubService';
import { useModalHandoff } from './useModalHandoff';
import { useDispatch } from 'react-redux';
import EntryImage from '@/src/screens/common/atomic/EntryImage';
import CountryFlags from '@/src/screens/common/atomic/CountryFlags';
import { recordTower } from '@/src/store/slice/TowerSlice';


const TowerQuizScreen = () => {
	const { t } = useTranslation();
	const params = useLocalSearchParams<{ level?: string }>();
	const level = Number(params.level) || 1;
	const quizLevel = TOWER_LEVEL_MAP[level] ?? '초급';

	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
	const [correctCount, setCorrectCount] = useState(0);
	const [isAnswered, setIsAnswered] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [quizData, setQuizData] = useState<TowerQuizQuestion[]>([]);
	const [showResultModal, setShowResultModal] = useState(false);
	/**
	 * 문제마다 고른 보기 번호 — 끝나고 한 번에 보여 줄 '종합 결과' 의 재료다.
	 * 문제를 풀 때마다 아래에 정답/해설을 펼치면 눈이 문제 카드와 해설 사이를 오가느라
	 * 흐름이 끊겼다. 풀 때는 보기 색으로만 맞고 틀림을 알리고, 해설은 마지막에 모아 읽는다.
	 */
	const [picked, setPicked] = useState<(number | null)[]>([]);
	const handoff = useModalHandoff();
	const dispatch = useDispatch();
	/** 오답 노트 쓰기 — 복습 화면으로 넘어가기 전에 끝나기를 기다린다 */
	const wrongWriteRef = useRef<Promise<unknown>>(Promise.resolve());

	const trackAnswer = (q: TowerQuizQuestion['source'], isCorrect: boolean) => {
		const domainTitle = LearnHubService.getDomainTitle(q.domain);
		LearnProgressService.recordAnswer({ domain: q.domain, domainTitle, correct: isCorrect });
		if (isCorrect) return;
		wrongWriteRef.current = LearnProgressService.addWrongNotes([
			{
				uid: q.uid,
				domain: q.domain,
				domainTitle,
				prompt: q.prompt,
				subTitle: q.subPrompt,
				answer: q.options[q.answerIndex],
				explanation: q.explanation,
				level: q.level,
				categoryLabel: q.categoryLabel,
				examples: q.examples,
				guide: q.guide,
				imageRef: q.imageRef,
			},
		]);
	};

	const bossShakeAnim = useRef(new Animated.Value(0)).current;
	const bossScaleAnim = useRef(new Animated.Value(1)).current;
	const bossOpacityAnim = useRef(new Animated.Value(1)).current;
	const effectTextAnim = useRef(new Animated.Value(0)).current;
	const effectTextTranslateY = useRef(new Animated.Value(0)).current;
	const effectTextScale = useRef(new Animated.Value(0.5)).current;
	/** 문제가 바뀔 때 카드가 아무 전환 없이 툭 바뀌어 등장 연출을 넣는다 */
	const questionAnim = useRef(new Animated.Value(1)).current;

	// 이펙트/보스 연출은 이벤트에서 시작되므로 화면을 벗어날 때 직접 멈춘다
	useAnimationCleanup(bossShakeAnim, bossScaleAnim, bossOpacityAnim, effectTextAnim, effectTextTranslateY, effectTextScale, questionAnim);
	const [effectText, setEffectText] = useState('');
	const [effectColor, setEffectColor] = useState<string>(Colors.primary);

	const towerLevel = TOWER_LEVELS.find((t) => t.level === level);
	const currentQuestion = quizData[currentQuestionIndex];
	const totalQuestions = quizData.length;

	// 다음 레벨 계산 (number 기반)
	const hasNextLevel = TOWER_LEVELS.some((t) => t.level === level + 1);

	useEffect(() => {
		const generatedQuiz = generateTowerQuiz(quizLevel, 5);
		setQuizData(generatedQuiz);
		setPicked(Array(generatedQuiz.length).fill(null));
		setIsLoading(false);
		playWhoosh(); // 🎬 도전 시작 사운드
	}, [level]);

	/*
	 * 🎵 퀴즈 BGM 은 이 화면이 보이는 동안에만 튼다.
	 * 마운트 때 한 번 틀면 포커스가 없는 상태(다른 화면이 위에 있는 채로 마운트)에서도 켜지고,
	 * 돌아왔을 때는 다시 켜지지 않았다. 포커스를 잃거나 언마운트되면 cleanup 이 끈다.
	 */
	useFocusEffect(
		useCallback(() => {
			startBgm('quiz');
			return () => stopBgm();
		}, []),
	);

	/** 지연 정산 타이머 — 화면을 벗어나면 언마운트 뒤 결과 저장이 돌지 않게 끊는다 */
	const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (completeTimerRef.current) {
				clearTimeout(completeTimerRef.current);
			}
		},
		[],
	);

	/*
	 * ⭐ 방금 딴 별 하나만 크게(1.6배) 튀었다가 제자리로 내려앉는다.
	 * 헤더 별은 18pt 라 색만 바뀌면 정답 순간에 별을 얻었다는 게 눈에 걸리지 않는다.
	 * 한 번에 별은 하나씩만 늘어나므로 값 하나를 "마지막으로 딴 별" 에만 걸어 쓴다.
	 */
	const starPopAnim = useRef(new Animated.Value(1)).current;
	/**
	 * 보스 위에 크게 떠오르는 별 (0 → 1).
	 * 헤더의 18pt 별만 튀어서는 문제를 보던 눈이 거기까지 가지 않았다 —
	 * 눈이 머무는 보스 자리에서 별이 크게 커졌다가 작아지며 헤더 쪽으로 빨려 올라간다.
	 */
	const bigStarAnim = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		if (correctCount === 0) {
			return;
		}
		starPopAnim.setValue(1);
		bigStarAnim.setValue(0);
		// 1.6배로는 18pt 별이 잠깐 부푼 정도라 눈에 덜 들어왔다 — 두 배 넘게 튀었다가 통통 내려앉는다
		const anim = Animated.parallel([
			Animated.timing(bigStarAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
			Animated.sequence([
				// 큰 별이 헤더에 닿을 즈음 헤더 별이 받아서 튄다
				Animated.delay(520),
				Animated.timing(starPopAnim, { toValue: 2.2, duration: 200, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
				Animated.spring(starPopAnim, { toValue: 1, friction: 3, tension: 110, useNativeDriver: true }),
			]),
		]);
		anim.start();
		// 다음 별이 연달아 들어오거나 화면을 벗어나면 도중이라도 멈춘다
		return () => anim.stop();
	}, [bigStarAnim, correctCount, starPopAnim]);

	/**
	 * 문제가 넘어갈 때마다 살짝 떠오르며 나타난다.
	 * 함께 스크롤도 맨 위로 되돌린다 — 해설을 읽으려 내려간 자리에 그대로 있으면
	 * 다음 문제가 보스도 문제 칸도 안 보이는 화면(보기 중간)에서 시작됐다.
	 */
	const scrollRef = useRef<ScrollView>(null);
	useEffect(() => {
		questionAnim.setValue(0);
		const anim = Animated.timing(questionAnim, { toValue: 1, duration: 250, useNativeDriver: true });
		anim.start();
		scrollRef.current?.scrollTo({ y: 0, animated: true });
		return () => anim.stop();
	}, [currentQuestionIndex, questionAnim]);

	/*
	 * 답을 고르면 해설 칸이 보기 아래에 새로 붙는다 — 화면 밖이라 아무도 읽지 않았다.
	 * 타격 연출(playEffectText, 약 1초)이 보스 위에서 끝나 갈 즈음 해설 자리로 내려 준다.
	 * 곧바로 내리면 방금 맞혔다는 연출을 덮고, 레이아웃이 잡히기 전에 불러도 제자리에 머문다.
	 */
	useEffect(() => {
		if (!isAnswered) {
			return;
		}
		const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 700);
		return () => clearTimeout(timer);
	}, [isAnswered]);

	useEffect(() => {
		if (isAnswered && currentQuestionIndex === totalQuestions - 1) {
			const timer = setTimeout(() => {
				handleQuizComplete();
			}, 500);
			return () => clearTimeout(timer);
		}
	}, [isAnswered, currentQuestionIndex, totalQuestions]);

	const CORRECT_TEXTS = ['PERFECT! ⚔️', 'CRITICAL HIT! 💥', 'EXCELLENT! 🌟', 'COMBO! ⚡', 'MIGHTY BLOW! 🔥'];
	const WRONG_TEXTS = ['MISS! 💨', 'BLOCKED! 🛡️', 'WEAK POINT! ❌', 'GUARD BREAK! 😵', 'FAILED! 💀'];

	const playEffectText = (isCorrect: boolean) => {
		const texts = isCorrect ? CORRECT_TEXTS : WRONG_TEXTS;
		const color = isCorrect ? Colors.success : Colors.error;
		const text = texts[Math.floor(Math.random() * texts.length)];

		setEffectText(text);
		setEffectColor(color);
		effectTextAnim.setValue(0);
		effectTextTranslateY.setValue(0);
		effectTextScale.setValue(0.5);

		Animated.parallel([
			Animated.sequence([
				Animated.timing(effectTextAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
				Animated.delay(600),
				Animated.timing(effectTextAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
			]),
			Animated.timing(effectTextTranslateY, { toValue: -80, duration: 1050, useNativeDriver: true }),
			Animated.sequence([
				Animated.spring(effectTextScale, { toValue: 1.2, useNativeDriver: true, speed: 20, bounciness: 12 }),
				Animated.timing(effectTextScale, { toValue: 1, duration: 200, useNativeDriver: true }),
			]),
		]).start();
	};

	const playBossHitAnimation = () => {
		bossShakeAnim.setValue(0);
		bossScaleAnim.setValue(1);
		bossOpacityAnim.setValue(1);

		Animated.sequence([
			Animated.parallel([
				Animated.sequence([
					Animated.timing(bossShakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
					Animated.timing(bossShakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
					Animated.timing(bossShakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
					Animated.timing(bossShakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
					Animated.timing(bossShakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
					Animated.timing(bossShakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
					Animated.timing(bossShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
				]),
				Animated.sequence([
					Animated.timing(bossOpacityAnim, { toValue: 0.3, duration: 80, useNativeDriver: true }),
					Animated.timing(bossOpacityAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
					Animated.timing(bossOpacityAnim, { toValue: 0.3, duration: 80, useNativeDriver: true }),
					Animated.timing(bossOpacityAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
				]),
			]),
		]).start();
	};

	const playBossAttackAnimation = () => {
		bossScaleAnim.setValue(1);
		bossShakeAnim.setValue(0);

		Animated.sequence([
			Animated.timing(bossScaleAnim, { toValue: 1.25, duration: 200, useNativeDriver: true }),
			Animated.timing(bossScaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
			Animated.timing(bossScaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
			Animated.timing(bossScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
		]).start();
	};

	const handleAutoPass = () => {
		if (!__DEV__) return;
		Alert.alert(t('tower.dev.title'), t('tower.dev.autoPass'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.confirm'),
				onPress: () => {
					setCorrectCount(totalQuestions);
					setCurrentQuestionIndex(totalQuestions - 1);
					setIsAnswered(true);
					setSelectedAnswer(currentQuestion.correctAnswer);
					setPicked(quizData.map((item) => item.correctAnswer));

					if (completeTimerRef.current) {
						clearTimeout(completeTimerRef.current);
					}
					completeTimerRef.current = setTimeout(() => {
						if (!towerLevel) {
							return;
						}
						dispatch(recordTower(level));
						setShowResultModal(true);
					}, 500);
				},
			},
		]);
	};

	const handleAnswerSelect = (answerIndex: number) => {
		if (isAnswered) {
			return;
		}
		setSelectedAnswer(answerIndex);
		setIsAnswered(true);
		setPicked((prev) => {
			const next = [...prev];
			next[currentQuestionIndex] = answerIndex;
			return next;
		});

		const isCorrect = answerIndex === currentQuestion.correctAnswer;
		trackAnswer(currentQuestion.source, isCorrect);
		if (isCorrect) {
			playCorrect(); // 🔊 정답
			setCorrectCount((prev) => prev + 1);
			playBossHitAnimation();
		} else {
			playWrong(); // 🔊 오답
			playBossAttackAnimation();
		}
		playEffectText(isCorrect);
	};

	const handleNext = () => {
		if (currentQuestionIndex < totalQuestions - 1) {
			setCurrentQuestionIndex((prev) => prev + 1);
			setSelectedAnswer(null);
			setIsAnswered(false);
		} else {
			setIsAnswered(true);
			// 마지막 문제 정산은 300ms 뒤에 돈다 — 그 사이 화면을 벗어나면 언마운트 뒤 저장이 일어나므로 붙잡아 둔다
			if (completeTimerRef.current) {
				clearTimeout(completeTimerRef.current);
			}
			completeTimerRef.current = setTimeout(() => {
				handleQuizComplete();
			}, 300);
		}
	};

	/** 정산이 두 번 돌지 않게 잡아 두는 문. 마지막 문제는 effect 와 '다음' 버튼 두 경로에서 완료로 들어온다. */
	const completedRef = useRef(false);

	const handleQuizComplete = () => {
		if (!towerLevel || completedRef.current) {
			return;
		}
		completedRef.current = true;

		playFinish(); // 🎉 층 종료 사운드

		const isPassed = correctCount === totalQuestions;

		// 도전 횟수는 TowerChallengeScreen 진입 시점에 이미 1회 차감됐다. 여기서 또 빼면 2회가 날아간다.
		if (isPassed) {
			dispatch(recordTower(level));
		}

		setShowResultModal(true);
	};

	const handleRetry = () => {
		completedRef.current = false;
		setShowResultModal(false);
		router.back();
	};

	/** 결과 팝업의 '홈' — 버튼 이름대로 홈 탭까지 간다 (예전엔 층 목록으로만 돌아가 한 번 더 HOME 을 눌러야 했다) */
	// 팝업이 다 닫힌 뒤 이동한다 — 닫히는 중에 가면 배너 띠 색만 먼저 바뀌어 번쩍인다 (BottomHomeButton 과 같은 이유)
	const handleGoHome = () => handoff(() => setShowResultModal(false), () => router.dismissTo('/(tabs)/home'));

	/**
	 * 결과 팝업의 '틀린 문제 복습하러 가기'.
	 * 이번 판의 오답은 판이 끝나는 순간 오답 노트 줄에 걸린다 — 쓰기가 끝나기 전에 넘어가면
	 * 복습 화면이 옛 노트를 읽어 방금 틀린 말이 빠진다. 쓰기를 기다린 뒤 옮긴다.
	 */
	const handleGoReview = () =>
		handoff(
			() => setShowResultModal(false),
			() => {
				void wrongWriteRef.current.finally(() => router.replace('/quiz/wrong-review'));
			},
		);

	const handleNextLevel = () => {
		setShowResultModal(false);
		router.back();
	};

	// 차감은 진입 시 이미 끝났다. 여기서 또 빼지 않는다.
	const handleExit = () =>
		showConfirm({
			title: t('tower.quiz.exitConfirm.title'),
			message: t('tower.quiz.exitConfirm.message'),
			confirmText: t('tower.quiz.exitConfirm.confirm'),
			destructive: true,
		}).then((ok) => ok && router.back());

	if (isLoading) {
		return (
			<View style={styles.container}>
				<LinearGradient colors={[Colors.inkSoft, Colors.ink, Colors.nightDeep]} style={StyleSheet.absoluteFillObject} />
				<SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]} edges={['left', 'right', 'bottom']}>
					<Text style={{ color: Colors.textInverse, fontSize: Typography.subtitle }}>{t('tower.quiz.loading')}</Text>
				</SafeAreaView>
			</View>
		);
	}

	if (!towerLevel) {
		return (
			<View style={styles.container}>
				<LinearGradient colors={[Colors.inkSoft, Colors.ink, Colors.nightDeep]} style={StyleSheet.absoluteFillObject} />
				<SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]} edges={['left', 'right', 'bottom']}>
					<Text style={{ color: Colors.textInverse, fontSize: Typography.subtitle }}>{t('tower.quiz.notFound')}</Text>
					{/* 어두운 패널 위 링크 — primary 는 라이트 테마에서 1.8:1 로 묻혀 패널 전용 글씨색을 쓴다 */}
					<TouchableOpacity onPress={() => router.back()} style={{ marginTop: SpacingV.xl }}>
						<Text style={{ color: Colors.onBrandText, fontSize: Typography.body, fontWeight: FontWeight.bold }}>{t('tower.quiz.back')}</Text>
					</TouchableOpacity>
				</SafeAreaView>
			</View>
		);
	}

	if (quizData.length === 0 || !currentQuestion) {
		return (
			<View style={styles.container}>
				<LinearGradient colors={[Colors.inkSoft, Colors.ink, Colors.nightDeep]} style={StyleSheet.absoluteFillObject} />
				<SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]} edges={['left', 'right', 'bottom']}>
					<Text style={{ color: Colors.textInverse, fontSize: Typography.subtitle }}>{t('tower.quiz.noQuestions', { level })}</Text>
					<TouchableOpacity onPress={() => router.back()} style={{ marginTop: SpacingV.xl }}>
						<Text style={{ color: Colors.onBrandText, fontSize: Typography.body, fontWeight: FontWeight.bold }}>{t('tower.quiz.back')}</Text>
					</TouchableOpacity>
				</SafeAreaView>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<LinearGradient colors={[Colors.inkSoft, Colors.ink, Colors.nightDeep]} style={StyleSheet.absoluteFillObject} />

			{/* 상단 안전영역은 전역 배너가 이미 확보한다 — top 을 쓰면 여백이 두 번 들어간다 */}
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.header}>
					<TouchableOpacity onPress={handleExit} style={styles.exitButton} accessibilityRole="button" accessibilityLabel={t('tower.quiz.exitA11y')}>
						<IconComponent type="materialIcons" name="close" size={scaledSize(28)} color={Colors.textInverse} />
					</TouchableOpacity>

					<View style={styles.headerCenter}>
						<Text style={styles.levelTitle} numberOfLines={1}>{towerLevel.name}</Text>
						<Text style={styles.questionCount}>
							{t('tower.quiz.questionCount', { current: currentQuestionIndex + 1, total: totalQuestions })}
						</Text>
					</View>

					<View style={styles.headerRight}>
						{__DEV__ && (
							<TouchableOpacity hitSlop={Layout.hitSlop} onPress={handleAutoPass} style={styles.devButton}>
								<IconComponent type="materialIcons" name="flash-on" size={scaledSize(20)} color={Colors.warning} />
							</TouchableOpacity>
						)}
						<View style={styles.scoreContainer}>
							{Array.from({ length: totalQuestions }).map((_, i) => (
								// 못 딴 별은 흐린 테두리로 가만히 두고, 방금 딴 별에만 튀는 연출을 건다
								<Animated.View key={i} style={i === correctCount - 1 && { transform: [{ scale: starPopAnim }] }}>
									<IconComponent
										type="materialIcons"
										name={i < correctCount ? 'star' : 'star-border'}
										size={scaledSize(18)}
										color={i < correctCount ? Colors.gold : Colors.onBrandBorder}
									/>
								</Animated.View>
							))}
						</View>
					</View>
				</View>

				<View style={styles.progressBarContainer}>
					<View style={styles.progressLabelRow}>
						<Text style={styles.progressLabelText}>{t('tower.quiz.progress')}</Text>
						<Text style={styles.progressLabelText}>
							{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%
						</Text>
					</View>
					<View style={styles.progressBarBackground}>
						<View
							style={[
								styles.progressBarFill,
								{
									width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
									backgroundColor: towerLevel.color,
								},
							]}
						/>
					</View>
				</View>

				<ScrollView ref={scrollRef} style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
					<View style={styles.bossSection}>
						<View style={[styles.bossGlow, { backgroundColor: withAlpha(towerLevel.color, '40') }]} />
						<Animated.View
							style={{
								transform: [{ translateX: bossShakeAnim }, { scale: bossScaleAnim }],
								opacity: bossOpacityAnim,
							}}>
							<Image source={towerLevel.bossImage} style={styles.bossImage} contentFit="contain" />
						</Animated.View>
						<Animated.Text
							style={[
								styles.effectText,
								{
									color: effectColor,
									opacity: effectTextAnim,
									transform: [{ translateY: effectTextTranslateY }, { scale: effectTextScale }],
								},
							]}>
							{effectText}
						</Animated.Text>
						{/* 별 획득 — 크게 커졌다가 작아지며 위(헤더의 별 줄)로 올라간다. 터치는 막지 않는다 */}
						<Animated.View
							pointerEvents="none"
							style={[
								styles.bigStar,
								{
									opacity: bigStarAnim.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 1, 0] }),
									transform: [
										{ translateY: bigStarAnim.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, -scaleHeight(6), -scaleHeight(150)] }) },
										{ scale: bigStarAnim.interpolate({ inputRange: [0, 0.22, 0.4, 1], outputRange: [0.2, 1.45, 1.05, 0.25] }) },
										{ rotate: bigStarAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: ['-25deg', '8deg', '0deg'] }) },
									],
								},
							]}>
							<View style={[styles.bigStarGlow, { backgroundColor: withAlpha(Colors.gold, '47') }]} />
							<IconComponent type="materialIcons" name="star" size={scaledSize(72)} color={Colors.gold} />
						</Animated.View>
					</View>

					{/*
					 * 문제 칸 — 보기 버튼(흰 반투명 판)과 같은 면이면 어디까지가 문제인지 경계가 흐려진다.
					 * 이 층의 색으로 칸을 물들이고 테를 둘러, 보기와 다른 자리라는 것이 색만으로 먼저 읽히게 한다.
					 */}
					<Animated.View
						style={[
							styles.questionCard,
							{
								borderColor: withAlpha(towerLevel.color, '8C'),
								opacity: questionAnim,
								transform: [
									{ translateY: questionAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(12), 0] }) },
									{ scale: questionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
								],
							},
						]}>
						<LinearGradient
							colors={[withAlpha(towerLevel.color, '42'), withAlpha(towerLevel.color, '14')]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							style={StyleSheet.absoluteFillObject}
						/>
						<View style={styles.questionCardGradient}>
							<View style={[styles.questionBadge, { backgroundColor: withAlpha(towerLevel.color, '33') }]}>
								<IconComponent type="materialCommunityIcons" name="help-circle-outline" size={scaledSize(14)} color={towerLevel.color} />
								<Text style={[styles.questionBadgeText, { color: towerLevel.color }]}>{t('tower.quiz.badge')}</Text>
							</View>
							{/*
							 * 묻는 대상과 묻는 말을 두 줄로 나눈다 — 윗줄은 대상(나라·인물 이름)을 크게, 아랫줄은 "이곳의 수도는?".
							 * 그림 문항은 윗줄 자리에 그림을 건다.
							 * 한 문장으로 이어 쓰면 대상이 문장 속에 묻혀 "무엇을 묻는지" 를 눈으로 먼저 잡을 수 없어,
							 * 보기 넷을 읽고 나서야 문제로 되돌아와 다시 읽게 된다.
							 * 한 줄로 두고 폭이 모자라면(큰 글씨 모드) 줄바꿈 대신 글자를 줄여 두 줄 구성을 지킨다.
							 */}
							<View style={styles.questionTextWrap}>
								{/* minimumFontScale 이 없으면 안드로이드가 lineHeight 상자까지 폭으로 계산해 글자를 터무니없이 줄인다 */}
								{currentQuestion.imageRef ? (
									<EntryImage imageRef={currentQuestion.imageRef} width={scaleWidth(150)} fetchWidth={360} />
								) : (
									<Text style={styles.questionTarget} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.75}>
										{currentQuestion.proverb}
									</Text>
								)}
								<Text style={styles.questionText}>{currentQuestion.question}</Text>
							</View>
						</View>
					</Animated.View>

					<View style={styles.answersContainer}>
						{currentQuestion.options.map((option, index) => {
							const isSelected = selectedAnswer === index;
							const isCorrect = index === currentQuestion.correctAnswer;
							const showCorrect = isAnswered && isCorrect;
							const showWrong = isAnswered && isSelected && !isCorrect;

							/*
							 * 정답·오답 면은 흰 글씨가 읽히는 값으로 고른다.
							 * 예전 primary·error 는 다크 테마에서 밝게 뒤집혀 흰 글씨가 3.2:1·2.8:1 로 흐렸다(error 는 라이트도 3.8:1).
							 * 칠해진 칸의 글씨·번호·아이콘은 면 밝기에 맞춰 onSurface 로 고른다.
							 */
							let backgroundColor: string = Colors.onBrandWatermark;
							if (showCorrect) {
								backgroundColor = Colors.primaryDark;
							} else if (showWrong) {
								backgroundColor = Colors.errorDark;
							} else if (isSelected) {
								backgroundColor = towerLevel.color;
							}
							const ink = backgroundColor === Colors.onBrandWatermark ? Colors.textInverse : readableOn(backgroundColor);

							return (
								<TouchableOpacity
									key={index}
									onPress={() => handleAnswerSelect(index)}
									disabled={isAnswered}
									style={styles.answerButton}>
									<View style={[styles.answerGradient, { backgroundColor }]}>
										<View style={styles.answerContent}>
											<View style={styles.answerNumber}>
												<Text style={[styles.answerNumberText, { color: ink }]}>{index + 1}</Text>
											</View>
											{currentQuestion.optionFlags && <CountryFlags name={option} height={16} />}
											<Text style={[styles.answerText, { color: ink }]}>{option}</Text>
											{showCorrect && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(24)} color={ink} />}
											{showWrong && <IconComponent type="materialIcons" name="cancel" size={scaledSize(24)} color={ink} />}
										</View>
									</View>
								</TouchableOpacity>
							);
						})}
					</View>

				</ScrollView>

				{isAnswered && (
					<View style={styles.nextButtonContainer}>
						<TouchableOpacity onPress={handleNext} style={styles.nextButton}>
							{/* 층 색(민트·앰버 등 밝은 색 포함) 면이라 흰 글씨가 1.7~3.2:1 로 흐렸다 — 타워 화면 도전 버튼처럼 면 밝기에 맞춘다 */}
							<View style={[styles.nextButtonGradient, { backgroundColor: towerLevel.color }]}>
								<Text style={[styles.nextButtonText, { color: readableOn(towerLevel.color) }]}>
									{currentQuestionIndex < totalQuestions - 1 ? t('tower.quiz.next') : t('tower.quiz.showResult')}
								</Text>
								<IconComponent
									type="materialIcons"
									name={currentQuestionIndex < totalQuestions - 1 ? 'arrow-forward' : 'check'}
									size={scaledSize(24)}
									color={readableOn(towerLevel.color)}
								/>
							</View>
						</TouchableOpacity>
					</View>
				)}
			</SafeAreaView>

			<TowerResultModal
				visible={showResultModal}
				isVictory={correctCount === totalQuestions}
				correctCount={correctCount}
				totalQuestions={totalQuestions}
				towerLevel={towerLevel}
				reviews={quizData.map((item, index) => ({
					proverb: item.proverb,
					question: item.question,
					picked: picked[index] !== null && picked[index] !== undefined ? item.options[picked[index] as number] : '',
					answer: item.options[item.correctAnswer],
					explanation: item.explanation,
					isCorrect: picked[index] === item.correctAnswer,
				}))}
				onRetry={handleRetry}
				onHome={handleGoHome}
				onReview={handleGoReview}
				onNext={hasNextLevel ? handleNextLevel : undefined}
			/>

		</View>
	);
};

export default TowerQuizScreen;

const makeStyles = () => StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	// 태블릿: 제목·나가기 버튼이 화면 끝으로 흩어지지 않도록 본문과 같은 기둥에 맞춘다
	header: {
		width: '100%',
		maxWidth: contentWidth,
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: Layout.screenH,
		paddingVertical: SpacingV.md,
	},
	exitButton: {
		width: scaleWidth(40),
		height: scaleWidth(40),
		justifyContent: 'center',
		alignItems: 'center',
	},
	headerCenter: { flex: 1, alignItems: 'center' },
	// 타워 챌린지 헤더(h3 heavy + 작은 보조줄)와 같은 위계로 맞춘다
	levelTitle: { fontSize: Typography.h3, fontWeight: FontWeight.heavy, color: Colors.textInverse },
	questionCount: { fontSize: Typography.footnote, color: Colors.onBrandTextSoft, marginTop: SpacingV.xxs },
	scoreText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textInverse },
	progressBarContainer: { width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingHorizontal: Layout.screenH, paddingBottom: SpacingV.lg },
	progressLabelRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: SpacingV.sm,
	},
	progressLabelText: { fontSize: Typography.footnote, fontWeight: FontWeight.bold, color: Colors.onBrandText },
	progressBarBackground: {
		height: scaleHeight(10),
		backgroundColor: Colors.onBrandSurface,
		borderRadius: Radius.pill,
		overflow: 'hidden',
	},
	progressBarFill: { height: '100%', borderRadius: Radius.pill },
	content: { flex: 1 },
	// 마지막 보기가 화면 아래 끝(홈 인디케이터)에 붙지 않게 — 답을 고르기 전에는 아래 '다음 문제' 띠도 없다
	// 태블릿: 본문을 가운데 한 기둥으로 묶는다 (헤더와 같은 폭).
	// 좌우 여백은 기둥 안쪽에 준다 — 스크롤 쪽에 주면 태블릿에서 카드가 헤더·진행 막대보다 16 씩 밖으로 삐져나왔다
	contentInner: { width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingHorizontal: Layout.screenH, paddingBottom: SpacingV.xl },
	bossSection: { alignItems: 'center', marginVertical: SpacingV.xl },
	bossGlow: {
		position: 'absolute',
		width: scaleWidth(120),
		height: scaleWidth(120),
		borderRadius: scaleWidth(60),
	},
	bossImage: { width: scaleWidth(120), height: scaleWidth(120), borderRadius: scaleWidth(60) },
	// 면은 층 색 그라데이션이 채운다 — 밑에 darkCard 를 한 겹 깔아 색이 옅은 층에서도 둥근 모서리가 보이게 한다
	questionCard: { marginBottom: SpacingV.xxl, borderRadius: Radius.lg, borderWidth: 1.5, overflow: 'hidden', backgroundColor: Colors.onBrandWatermark },
	questionCardGradient: { alignItems: 'center', gap: SpacingV.sm, paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.lg },
	// '문제' 머리표 — 칸 맨 위 가운데. 층 색 글씨라 흰 문장보다 한 단 낮게 읽힌다
	questionBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		paddingHorizontal: Spacing.md,
		// 고정 height 는 큰 글씨(1.25x)에서 글자가 잘린다 — 최소 높이로
		minHeight: scaleHeight(26),
		borderRadius: Radius.pill,
	},
	questionBadgeText: { fontSize: Typography.footnote, fontWeight: FontWeight.bold },
	// 두 줄은 한 덩어리로 읽혀야 한다 — 머리표와의 간격(md)보다 좁게 붙인다
	questionTextWrap: { alignSelf: 'stretch', alignItems: 'center', gap: SpacingV.xxs },
	// 묻는 대상 — 문제 칸의 주인공. 금빛으로 가장 크게 둬 보기보다 먼저 읽힌다
	questionTarget: {
		fontSize: Typography.h2,
		fontWeight: FontWeight.heavy,
		color: Colors.gold,
		textAlign: 'center',
	},
	// 묻는 말 — 묻는 대상을 받쳐 주는 아랫줄. 흰 글씨보다 한 단 흐려 윗줄과 위계가 갈린다
	questionText: {
		fontSize: Typography.subtitle,
		fontWeight: FontWeight.semibold,
		color: Colors.onBrandText,
		lineHeight: scaledSize(22),
		textAlign: 'center',
	},
	answersContainer: { gap: SpacingV.md },
	answerButton: { borderRadius: Radius.md, overflow: 'hidden' },
	answerGradient: { padding: Spacing.lg },
	answerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	answerNumber: {
		width: scaleWidth(32),
		height: scaleWidth(32),
		borderRadius: Radius.lg,
		backgroundColor: Colors.onBrandSurface,
		justifyContent: 'center',
		alignItems: 'center',
	},
	answerNumberText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textInverse },
	answerText: { flex: 1, fontSize: Typography.subtitle, color: Colors.textInverse, lineHeight: scaledSize(22) },
	nextButtonContainer: { width: '100%', maxWidth: contentWidth, alignSelf: 'center', paddingHorizontal: Layout.screenH, paddingTop: SpacingV.lg, paddingBottom: SpacingV.xxl },
	nextButton: { borderRadius: Radius.md, overflow: 'hidden' },
	nextButtonGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		paddingVertical: SpacingV.lg,
	},
	nextButtonText: { flexShrink: 1, fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.textInverse },
	headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	devButton: {
		width: scaleWidth(36),
		height: scaleWidth(36),
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: withAlpha(Colors.warning, '33'),
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: withAlpha(Colors.warning, '80'),
	},
	scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
	// 보스 한가운데 겹쳐 뜨는 큰 별 — 보스 자리 높이를 차지하지 않게 absolute
	bigStar: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 11 },
	bigStarGlow: { position: 'absolute', width: scaleWidth(96), height: scaleWidth(96), borderRadius: scaleWidth(48) },
	effectText: {
		position: 'absolute',
		fontSize: Typography.h1,
		fontWeight: FontWeight.bold,
		textShadowColor: Colors.backdrop,
		textShadowOffset: { width: 1, height: 1 },
		textShadowRadius: 4,
		zIndex: 10,
	},
});
const styles = themed(makeStyles);
