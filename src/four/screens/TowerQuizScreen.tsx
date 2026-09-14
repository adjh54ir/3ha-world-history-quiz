// @/screens/TowerQuiz.tsx

/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateUtils from '@/src/four/utils/DateUtils';
import { useIsFocused, useNavigation, useRoute, RouteProp } from '@/src/four/navigation/compat';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from '@/src/four/components/FastImage';
import IconComponent from './common/atomic/IconComponent';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import { TOWER_LEVELS, TowerProgress } from '@/src/four/const/ConstTowerData';
import { Paths } from '@/src/four/navigation/conf/Paths';
import { generateTowerQuiz, TowerQuizQuestion } from '@/src/four/const/ConstTowerQuizData';
import { MainDataType } from '@/src/four/types/MainDataType';
import { MainStorageKeyType } from '@/src/four/types/MainStorageKeyType';
import TowerResultModal from './common/modal/TowerResultModal';
import CmmDelConfirmModal from './modal/CmmDelConfirmModal';
import { playCorrect, playWrong, playWhoosh, playFinish } from '@/src/four/utils/SoundUtils';
import { startBgm, stopBgm } from '@/src/four/utils/BgmUtils';
import { Typography, FontWeight, Spacing, SpacingV, Radius, HitSlop } from '@/src/four/const/ConstDesign';
import { Colors, withAlpha } from '@/src/four/const/ConstColors';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import { bumpActivity } from '@/src/four/utils/DailyActivityUtils';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { bridgeAnswer, bridgeTower, flushQuiz, resetQuizBuffer } from '@/src/four/services/LifeBridge';

const TOWER_STORAGE_KEY = MainStorageKeyType.TOWER_CHALLENGE_PROGRESS;

// 타워 레벨(number) ↔ 한자어 난이도(string) 매핑
const TOWER_LEVEL_MAP: Record<number, MainDataType.ProverbType['level']> = {
	1: '초급',
	2: '중급',
	3: '고급',
	4: '특급',
};

type RouteParams = {
	TowerQuiz: {
		level: number; // TOWER_LEVELS.level과 동일하게 number 유지
	};
};

const TowerQuizScreen = () => {
	const navigation = useNavigation();
	const route = useRoute<RouteProp<RouteParams, 'TowerQuiz'>>();
	const level = route.params?.level || 1; // number (TOWER_LEVELS 기준)
	const proverbLevel = TOWER_LEVEL_MAP[level] ?? '초급'; // generateTowerQuiz용 문자열 레벨

	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
	const [correctCount, setCorrectCount] = useState(0);
	const [isAnswered, setIsAnswered] = useState(false);
	const [progress, setProgress] = useState<TowerProgress | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [quizData, setQuizData] = useState<TowerQuizQuestion[]>([]);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [showResultModal, setShowResultModal] = useState(false);

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
		const generatedQuiz = generateTowerQuiz(proverbLevel, 5); // 문자열 레벨 전달
		setQuizData(generatedQuiz);
		loadProgress();
		resetQuizBuffer(); // 지난 판에 남은 정오답을 버리고 시작한다
		playWhoosh(); // 🎬 도전 시작 사운드
		startBgm('quiz'); // 🎵 퀴즈 BGM
	}, [level]);

	// 🎵 화면 이탈 시 BGM 정리(메모리 누수 방지) + 중간에 나가도 푼 만큼은 앱 상태에 남긴다
	useEffect(
		() => () => {
			stopBgm();
			flushQuiz('tower');
		},
		[],
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

	// 다른 화면으로 이동하면 BGM도 끈다 — 언마운트만으로는 남는 경우가 있다
	const isFocused = useIsFocused();
	useEffect(() => {
		if (!isFocused) {
			stopBgm();
		}
	}, [isFocused]);

	/**
	 * 문제 문장을 "묻는 한자" 를 기준으로 셋으로 나눈다.
	 * 문장 안에 그 한자가 없으면(다른 유형의 문제) target 을 비워 예전처럼 한 덩어리로 그린다.
	 */
	const questionParts = useMemo(() => {
		const question = currentQuestion?.question ?? '';
		const target = currentQuestion?.proverb ?? '';
		const at = target ? question.indexOf(target) : -1;
		if (at < 0) {
			return { head: question, target: '', tail: '' };
		}
		return { head: question.slice(0, at), target, tail: question.slice(at + target.length) };
	}, [currentQuestion]);

	// 문제가 넘어갈 때마다 살짝 떠오르며 나타난다
	useEffect(() => {
		questionAnim.setValue(0);
		const anim = Animated.timing(questionAnim, { toValue: 1, duration: 250, useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [currentQuestionIndex, questionAnim]);

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

	const loadProgress = async () => {
		try {
			const saved = await AsyncStorage.getItem(TOWER_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
		const today = DateUtils.getLocalDateString();
				if (parsed.lastAttemptDate !== today) {
					parsed.attempts = 1;
					parsed.adRewardUsed = 0;
					parsed.lastAttemptDate = today;
				}
				setProgress(parsed);
			}
		} catch (error) {
			console.error('탑 도전 데이터 로드 실패:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const saveProgress = async (newProgress: TowerProgress) => {
		try {
			await AsyncStorage.setItem(TOWER_STORAGE_KEY, JSON.stringify(newProgress));
			setProgress(newProgress);
		} catch (error) {
			console.error('진행 상황 저장 실패:', error);
		}
	};

	const handleAutoPass = () => {
		if (!__DEV__) return;
		Alert.alert('개발자 모드', '모든 문제를 정답 처리하시겠습니까?', [
			{ text: '취소', style: 'cancel' },
			{
				text: '확인',
				onPress: () => {
					setCorrectCount(totalQuestions);
					setCurrentQuestionIndex(totalQuestions - 1);
					setIsAnswered(true);
					setSelectedAnswer(currentQuestion.correctAnswer);

					completeTimerRef.current = setTimeout(() => {
						if (!progress || !towerLevel) {
							return;
						}
						const newProgress: TowerProgress = {
							...progress,
							level: Math.max(progress.level, level + 1),
							completedLevels: [...new Set([...progress.completedLevels, level])],
							unlockedRewards: [...new Set([...progress.unlockedRewards, level])],
						};
						saveProgress(newProgress);
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

		const isCorrect = answerIndex === currentQuestion.correctAnswer;
		// 이 앱의 홈·나의 활동·펫은 redux 를 본다 — 채점 결과를 모아 둔다
		bridgeAnswer(currentQuestion.proverbId, 'meaning', isCorrect);
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
		if (!progress || !towerLevel || completedRef.current) {
			return;
		}
		completedRef.current = true;

		playFinish(); // 🎉 층 종료 사운드

		const isPassed = correctCount === totalQuestions;

		// 도전 횟수는 TowerChallengeScreen 진입 시점에 이미 1회 차감됐다. 여기서 또 빼면 2회가 날아간다.
		if (isPassed) {
			bumpActivity('tower'); // 요일 미션(일요일) 진행도
			const newProgress: TowerProgress = {
				...progress,
				level: Math.max(progress.level, level + 1),
				completedLevels: [...new Set([...progress.completedLevels, level])],
				unlockedRewards: [...new Set([...progress.unlockedRewards, level])],
			};
			saveProgress(newProgress);
			bridgeTower(level); // 최고 층·코인·경험치
		} else {
			flushQuiz('tower'); // 못 깼어도 푼 만큼은 기록에 남는다
		}

		setShowResultModal(true);
	};

	const handleRetry = () => {
		completedRef.current = false;
		setShowResultModal(false);
		navigation.goBack();
	};

	const handleGoHome = () => {
		setShowResultModal(false);
		navigation.goBack();
	};

	const handleNextLevel = () => {
		setShowResultModal(false);
		//@ts-ignore
		navigation.replace(Paths.TOWER_CHANLLENGE, { level: level + 1 });
	};

	// OS 기본 확인창 대신 앱 팝업을 쓴다 — 다른 화면의 종료 확인과 모양을 맞춘다
	const handleExit = () => setShowExitConfirm(true);

	const confirmExit = () => {
		setShowExitConfirm(false);
		// 차감은 진입 시 이미 끝났다. 여기서 또 빼지 않는다.
		navigation.goBack();
	};

	if (isLoading) {
		return (
			<View style={styles.container}>
				<LinearGradient colors={[Colors.darkPanel, Colors.darkPanelDeep, Colors.darkPanelDeepest]} style={StyleSheet.absoluteFillObject} />
				<SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
					<Text style={{ color: Colors.textInverse, fontSize: Typography.subtitle }}>퀴즈 생성 중...</Text>
				</SafeAreaView>
			</View>
		);
	}

	if (!towerLevel) {
		return (
			<View style={styles.container}>
				<LinearGradient colors={[Colors.darkPanel, Colors.darkPanelDeep, Colors.darkPanelDeepest]} style={StyleSheet.absoluteFillObject} />
				<SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
					<Text style={{ color: Colors.textInverse, fontSize: Typography.subtitle }}>타워 정보를 찾을 수 없습니다.</Text>
					<TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: SpacingV.xl }}>
						<Text style={{ color: Colors.primary, fontSize: Typography.body }}>뒤로 가기</Text>
					</TouchableOpacity>
				</SafeAreaView>
			</View>
		);
	}

	if (quizData.length === 0 || !currentQuestion) {
		return (
			<View style={styles.container}>
				<LinearGradient colors={[Colors.darkPanel, Colors.darkPanelDeep, Colors.darkPanelDeepest]} style={StyleSheet.absoluteFillObject} />
				<SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
					<Text style={{ color: Colors.textInverse, fontSize: Typography.subtitle }}>레벨 {level}에 해당하는 단어가 없습니다.</Text>
					<TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: SpacingV.xl }}>
						<Text style={{ color: Colors.primary, fontSize: Typography.body }}>뒤로 가기</Text>
					</TouchableOpacity>
				</SafeAreaView>
			</View>
		);
	}

	const isCorrectAnswer = selectedAnswer === currentQuestion.correctAnswer;

	return (
		<View style={styles.container}>
			<LinearGradient colors={[Colors.darkPanel, Colors.darkPanelDeep, Colors.darkPanelDeepest]} style={StyleSheet.absoluteFillObject} />

			{/* 상단 안전영역은 전역 배너가 이미 확보한다 — top 을 쓰면 여백이 두 번 들어간다 */}
			<SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
				<View style={styles.header}>
					<TouchableOpacity onPress={handleExit} style={styles.exitButton} accessibilityRole="button" accessibilityLabel="타워 나가기">
						<IconComponent type="materialIcons" name="close" size={scaledSize(28)} color={Colors.textInverse} />
					</TouchableOpacity>

					<View style={styles.headerCenter}>
						<Text style={styles.levelTitle} numberOfLines={1}>{towerLevel.name}</Text>
						<Text style={styles.questionCount}>
							{currentQuestionIndex + 1} / {totalQuestions} 문제
						</Text>
					</View>

					<View style={styles.headerRight}>
						{__DEV__ && (
							<TouchableOpacity hitSlop={HitSlop} onPress={handleAutoPass} style={styles.devButton}>
								<IconComponent type="materialIcons" name="flash-on" size={scaledSize(20)} color={Colors.warning} />
							</TouchableOpacity>
						)}
						<View style={styles.scoreContainer}>
							{Array.from({ length: totalQuestions }).map((_, i) => (
								<IconComponent
									key={i}
									type="materialIcons"
									name={i < correctCount ? 'star' : 'star-border'}
									size={scaledSize(18)}
									color={i < correctCount ? Colors.warningBright : Colors.darkOnPanelMuted}
								/>
							))}
						</View>
					</View>
				</View>

				<View style={styles.progressBarContainer}>
					<View style={styles.progressLabelRow}>
						<Text style={styles.progressLabelText}>진행도</Text>
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

				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					<View style={styles.bossSection}>
						<View style={[styles.bossGlow, { backgroundColor: withAlpha(towerLevel.color, 0.25) }]} />
						<Animated.View
							style={{
								transform: [{ translateX: bossShakeAnim }, { scale: bossScaleAnim }],
								opacity: bossOpacityAnim,
							}}>
							<FastImage source={towerLevel.bossImage} style={styles.bossImage} resizeMode="contain" />
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
					</View>

					<Animated.View
						style={[
							styles.questionCard,
							{
								opacity: questionAnim,
								transform: [{ translateY: questionAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(12), 0] }) }],
							},
						]}>
						<View style={styles.questionCardGradient}>
							{/*
							 * 묻는 한자만 다른 색으로 떼어 놓는다.
							 * 한 문장이 전부 같은 흰 글씨면 "무엇을 묻는지" 를 눈으로 먼저 잡을 수 없어,
							 * 보기 넷을 읽고 나서야 문제로 되돌아와 다시 읽게 된다.
							 */}
							<Text style={styles.questionText}>
								{questionParts.head}
								{!!questionParts.target && <Text style={styles.questionTarget}>{questionParts.target}</Text>}
								{questionParts.tail}
							</Text>
						</View>
					</Animated.View>

					<View style={styles.answersContainer}>
						{currentQuestion.options.map((option, index) => {
							const isSelected = selectedAnswer === index;
							const isCorrect = index === currentQuestion.correctAnswer;
							const showCorrect = isAnswered && isCorrect;
							const showWrong = isAnswered && isSelected && !isCorrect;

							let backgroundColor: string = Colors.darkDivider;
							if (showCorrect) {
								backgroundColor = Colors.primary;
							} else if (showWrong) {
								backgroundColor = Colors.error;
							} else if (isSelected) {
								backgroundColor = towerLevel.color;
							}

							return (
								<TouchableOpacity
									key={index}
									onPress={() => handleAnswerSelect(index)}
									disabled={isAnswered}
									style={styles.answerButton}>
									<View style={[styles.answerGradient, { backgroundColor }]}>
										<View style={styles.answerContent}>
											<View style={styles.answerNumber}>
												<Text style={styles.answerNumberText}>{index + 1}</Text>
											</View>
											<Text style={styles.answerText}>{option}</Text>
											{showCorrect && <IconComponent type="materialIcons" name="check-circle" size={scaledSize(24)} color={Colors.textInverse} />}
											{showWrong && <IconComponent type="materialIcons" name="cancel" size={scaledSize(24)} color={Colors.textInverse} />}
										</View>
									</View>
								</TouchableOpacity>
							);
						})}
					</View>

					{isAnswered && (
						<View style={styles.explanationCard}>
							<View
								style={[
									styles.explanationGradient,
									{ backgroundColor: isCorrectAnswer ? withAlpha(Colors.primary, 0.2) : withAlpha(Colors.error, 0.2) },
								]}>
								<View style={styles.explanationHeader}>
									<IconComponent
										type="materialIcons"
										name={isCorrectAnswer ? 'check-circle' : 'info'}
										size={scaledSize(24)}
										color={isCorrectAnswer ? Colors.primary : Colors.error}
									/>
									<Text style={[styles.explanationTitle, { color: isCorrectAnswer ? Colors.primary : Colors.error }]}>
										{isCorrectAnswer ? '정답입니다!' : '틀렸습니다'}
									</Text>
								</View>
								<Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
							</View>
						</View>
					)}
				</ScrollView>

				{isAnswered && (
					<View style={styles.nextButtonContainer}>
						<TouchableOpacity onPress={handleNext} style={styles.nextButton}>
							<View style={[styles.nextButtonGradient, { backgroundColor: towerLevel.color }]}>
								<Text style={styles.nextButtonText}>
									{currentQuestionIndex < totalQuestions - 1 ? '다음 문제' : '결과 확인'}
								</Text>
								<IconComponent
									type="materialIcons"
									name={currentQuestionIndex < totalQuestions - 1 ? 'arrow-forward' : 'check'}
									size={scaledSize(24)}
									color={Colors.textInverse}
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
				onRetry={handleRetry}
				onHome={handleGoHome}
				onNext={hasNextLevel ? handleNextLevel : undefined}
			/>

			<CmmDelConfirmModal
				visible={showExitConfirm}
				title="타워 챌린지 종료"
				summary={'타워 챌린지를 종료할까요?\n도전 횟수는 차감됩니다.'}
				confirmText="종료"
				onCancel={() => setShowExitConfirm(false)}
				onConfirm={confirmExit}
			/>
		</View>
	);
};

export default TowerQuizScreen;

const makeStyles = () => StyleSheet.create({
	container: { flex: 1 },
	safeArea: { flex: 1 },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: Spacing.lg,
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
	questionCount: { fontSize: Typography.footnote, color: Colors.darkOnPanelSub, marginTop: SpacingV.xxs },
	scoreText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textInverse },
	progressBarContainer: { paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.lg },
	progressLabelRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: SpacingV.sm,
	},
	progressLabelText: { fontSize: Typography.footnote, fontWeight: FontWeight.bold, color: Colors.darkOnPanel },
	progressBarBackground: {
		height: scaleHeight(10),
		backgroundColor: Colors.darkCardBorder,
		borderRadius: Radius.pill,
		overflow: 'hidden',
	},
	progressBarFill: { height: '100%', borderRadius: Radius.pill },
	content: { flex: 1, paddingHorizontal: Spacing.lg },
	bossSection: { alignItems: 'center', marginVertical: SpacingV.xl },
	bossGlow: {
		position: 'absolute',
		width: scaleWidth(120),
		height: scaleWidth(120),
		borderRadius: scaleWidth(60),
	},
	bossImage: { width: scaleWidth(120), height: scaleWidth(120), borderRadius: scaleWidth(60) },
	// 배경이 없어 둥근 모서리가 보이지 않았다 — 다른 패널과 같은 darkCard 를 깐다
	questionCard: { marginBottom: SpacingV.xxl, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.darkCard },
	questionCardGradient: { padding: Spacing.xl },
	questionText: {
		fontSize: Typography.title,
		fontWeight: FontWeight.semibold,
		color: Colors.textInverse,
		lineHeight: scaledSize(26),
		textAlign: 'center',
	},
	// 묻는 한자 — 금빛으로 한 단계 올려 문장 안에서 먼저 눈에 걸린다
	questionTarget: { fontWeight: FontWeight.heavy, color: Colors.warningBright },
	answersContainer: { gap: SpacingV.md },
	answerButton: { borderRadius: Radius.md, overflow: 'hidden' },
	answerGradient: { padding: Spacing.lg },
	answerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	answerNumber: {
		width: scaleWidth(32),
		height: scaleWidth(32),
		borderRadius: Radius.lg,
		backgroundColor: Colors.darkCardBorder,
		justifyContent: 'center',
		alignItems: 'center',
	},
	answerNumberText: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold, color: Colors.textInverse },
	answerText: { flex: 1, fontSize: Typography.subtitle, color: Colors.textInverse, lineHeight: scaledSize(22) },
	explanationCard: {
		marginTop: SpacingV.xl,
		marginBottom: SpacingV.xl,
		borderRadius: Radius.md,
		overflow: 'hidden',
	},
	explanationGradient: { padding: Spacing.lg },
	explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: SpacingV.sm },
	explanationTitle: { fontSize: Typography.subtitle, fontWeight: FontWeight.bold },
	explanationText: { fontSize: Typography.body, color: Colors.darkOnPanel, lineHeight: scaledSize(20) },
	nextButtonContainer: { padding: Spacing.lg, paddingBottom: SpacingV.xxl },
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
		backgroundColor: withAlpha(Colors.warning, 0.2),
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: withAlpha(Colors.warning, 0.5),
	},
	scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
	effectText: {
		position: 'absolute',
		fontSize: Typography.h1,
		fontWeight: FontWeight.bold,
		textShadowColor: Colors.scrim,
		textShadowOffset: { width: 1, height: 1 },
		textShadowRadius: 4,
		zIndex: 10,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
