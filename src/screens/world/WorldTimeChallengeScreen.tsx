import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import BottomHomeButton from '@/src/four/screens/common/BottomHomeButton';
import WorldQuestionCard from './common/WorldQuestionCard';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { TIME_CHALLENGE_SEC } from '@/src/services/life/LifeRules';
import { challengeQuestions } from '@/src/services/world/WorldChallenge';
import { selectTopic } from '@/src/const/data/world/ConstWorldTopics';
import { bridgeWorldTime, collectWorldAnswer, resetWorldBuffer } from '@/src/services/world/WorldBridge';
import { useLife } from '@/src/hooks/useLife';
import type { WorldType } from '@/src/types/data/WorldType';
import { playCorrect, playCountdown, playFinish, playPop, playWrong } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

/** 목숨 — 다 쓰면 시간이 남아도 끝난다 */
const LIVES = 5;
/** 한 번에 만들어 두는 문항 수 — 3분이면 이보다 더 풀기 어렵다 */
const BATCH = 60;
/** 정답 기본 점수 */
const HIT_SCORE = 10;
/** 답을 고른 뒤 다음 문제까지 — 타임은 짧게 (읽을 만큼만) */
const NEXT_DELAY = 550;
/** 남은 시간이 이 아래로 떨어지면 색이 바뀐다 */
const WARN_SEC = 30;
const DANGER_SEC = 10;

/** 연속 정답 보너스 — 세 개부터 붙고 다섯 개부터 두 배 */
const comboBonus = (combo: number): number => (combo >= 5 ? 10 : combo >= 3 ? 5 : 0);

/**
 * 타임 챌린지 — 3분 안에 최대한 많이.
 *
 * 남은 시간은 tick 을 세지 않고 **마감 시각**으로 잰다. 화면이 잠깐 멈추거나 tick 이 몰려도
 * 총 시간이 늘거나 줄지 않는다.
 *
 * 시작 화면·플레이·결과를 한 화면에서 상태로 갈아 낀다 — 세 화면으로 나누면
 * 시작하자마자 뒤로 가기가 시작 화면으로 돌아와 다시 시작 버튼을 누르게 된다.
 */
const WorldTimeChallengeScreen = () => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const life = useLife();

	const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready');
	const [questions, setQuestions] = useState<WorldType.Question[]>([]);
	const [at, setAt] = useState(0);
	const [picked, setPicked] = useState<string | null>(null);
	const [lives, setLives] = useState(LIVES);
	const [score, setScore] = useState(0);
	const [correct, setCorrect] = useState(0);
	const [combo, setCombo] = useState(0);
	const [leftMs, setLeftMs] = useState(TIME_CHALLENGE_SEC * 1000);
	const deadline = useRef(0);

	const question = questions[at];
	const mode = question ? selectTopic(question.topic).modes.find((item) => item.key === question.mode) : undefined;
	const topic = question ? selectTopic(question.topic) : undefined;
	const leftSec = Math.max(0, leftMs / 1000);

	/**
	 * 점수·정답 수의 최신값을 담아 두는 거울.
	 * 끝내는 일은 타이머 콜백에서도 일어나는데, 그때 state 를 읽으면 타이머가 걸릴 때의 낡은 값이 잡힌다.
	 */
	const tally = useRef({ score: 0, correct: 0 });

	const finish = useCallback(() => {
		setPhase('over');
		playFinish();
		bridgeWorldTime(tally.current.score, tally.current.correct);
	}, []);

	const start = () => {
		playPop();
		resetWorldBuffer();
		setQuestions(challengeQuestions(undefined, BATCH));
		setAt(0);
		setPicked(null);
		setLives(LIVES);
		setScore(0);
		setCorrect(0);
		setCombo(0);
		tally.current = { score: 0, correct: 0 };
		setLeftMs(TIME_CHALLENGE_SEC * 1000);
		deadline.current = Date.now() + TIME_CHALLENGE_SEC * 1000;
		setPhase('play');
	};

	/**
	 * 남은 시간 — 마감 시각과의 차이를 100ms 마다 다시 잰다.
	 * 다 되면 이 안에서 바로 끝낸다. 따로 effect 를 두어 "0이 되면 끝내기" 로 만들면
	 * 렌더가 한 번 더 돌며 연쇄로 상태가 바뀐다.
	 */
	useEffect(() => {
		if (phase !== 'play') {
			return;
		}
		const timer = setInterval(() => {
			const rest = deadline.current - Date.now();
			if (rest <= 0) {
				clearInterval(timer);
				setLeftMs(0);
				finish();
				return;
			}
			setLeftMs(rest);
		}, 100);
		return () => clearInterval(timer);
	}, [phase, finish]);

	// 마지막 5초는 한 번씩 알린다
	const lastBeep = useRef(0);
	useEffect(() => {
		const sec = Math.ceil(leftSec);
		if (phase === 'play' && sec <= 5 && sec > 0 && lastBeep.current !== sec) {
			lastBeep.current = sec;
			playCountdown();
		}
	}, [phase, leftSec]);

	// 답을 고르면 잠깐 보여 주고 다음 문제로
	useEffect(() => {
		if (picked === null || phase !== 'play') {
			return;
		}
		const timer = setTimeout(() => {
			setPicked(null);
			if (lives <= 0) {
				finish();
				return;
			}
			// 준비한 문항을 다 쓰면 새로 만든다 (3분을 다 채우고도 남는 사람이 있다)
			if (at + 1 >= questions.length) {
				setQuestions(challengeQuestions(undefined, BATCH));
				setAt(0);
				return;
			}
			setAt((prev) => prev + 1);
		}, NEXT_DELAY);
		return () => clearTimeout(timer);
	}, [picked, phase, lives, at, questions.length, finish]);

	const choose = (option: string) => {
		if (picked !== null || !question) {
			return;
		}
		const hit = option === question.answer;
		setPicked(option);
		// 3초 안에 고른 것만 번개로 친다 — 타임 챌린지는 속도가 곧 점수다
		collectWorldAnswer(question.entry.id, hit, true);
		if (hit) {
			const nextCombo = combo + 1;
			tally.current = { score: tally.current.score + HIT_SCORE + comboBonus(nextCombo), correct: tally.current.correct + 1 };
			setCombo(nextCombo);
			setCorrect(tally.current.correct);
			setScore(tally.current.score);
			playCorrect();
		} else {
			setCombo(0);
			setLives((prev) => prev - 1);
			playWrong();
		}
	};

	const timeColor = leftSec <= DANGER_SEC ? Colors.error : leftSec <= WARN_SEC ? Colors.accentAmber : Colors.textStrong;
	const ratio = Math.max(0, Math.min(1, leftMs / (TIME_CHALLENGE_SEC * 1000)));

	const pulse = useRef(new Animated.Value(1)).current;
	useEffect(() => {
		pulse.setValue(0);
		const anim = Animated.timing(pulse, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [at, pulse]);

	if (phase === 'ready' || phase === 'over') {
		const done = phase === 'over';
		return (
			<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
				<ScrollView contentContainerStyle={styles.centerContent} showsVerticalScrollIndicator={false}>
					<View style={styles.hero}>
						<View style={[styles.heroBadge, done && { backgroundColor: Colors.accentAmberSoft }]}>
							<IconComponent
								type="materialcommunityicons"
								name={done ? 'trophy-outline' : 'timer-outline'}
								size={34}
								color={done ? Colors.accentAmberDark : Colors.textInverse}
							/>
						</View>
						<Text style={styles.heroTitle}>{done ? `${score}점` : '타임 챌린지'}</Text>
						<Text style={styles.heroSub}>
							{done
								? `${correct}문제를 맞혔어요${life.bestTime > score ? ` · 최고 ${life.bestTime}점` : ' · 새 기록!'}`
								: `${TIME_CHALLENGE_SEC}초 안에 최대한 많이 맞혀요`}
						</Text>
					</View>

					<View style={styles.ruleRow}>
						<View style={styles.rule}>
							<Text style={styles.ruleValue}>{TIME_CHALLENGE_SEC}</Text>
							<Text style={styles.ruleLabel}>제한 시간(초)</Text>
						</View>
						<View style={styles.rule}>
							<Text style={styles.ruleValue}>{LIVES}</Text>
							<Text style={styles.ruleLabel}>목숨</Text>
						</View>
						<View style={styles.rule}>
							<Text style={styles.ruleValue}>{life.bestTime ?? 0}</Text>
							<Text style={styles.ruleLabel}>최고 점수</Text>
						</View>
					</View>

					{done ? null : <Text style={styles.note}>연속으로 맞히면 보너스가 붙어요. 세 개부터 +5, 다섯 개부터 +10.</Text>}

					<View style={styles.actions}>
						{done ? (
							<PressableScale style={styles.ghost} onPress={() => router.back()} accessibilityRole="button">
								<Text style={styles.ghostText}>나가기</Text>
							</PressableScale>
						) : null}
						<PressableScale style={styles.primary} onPress={start} accessibilityRole="button">
							<Text style={styles.primaryText}>{done ? '다시 도전' : '시작하기'}</Text>
						</PressableScale>
					</View>
				</ScrollView>
				<BottomHomeButton />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
			<View style={styles.head}>
				<View style={styles.headRow}>
					<Text style={[styles.time, { color: timeColor }]}>{`${leftSec.toFixed(1)}초`}</Text>
					<View style={styles.lives}>
						{Array.from({ length: LIVES }, (_, no) => (
							<IconComponent
								key={no}
								type="materialcommunityicons"
								name={no < lives ? 'heart' : 'heart-outline'}
								size={16}
								color={no < lives ? Colors.error : Colors.borderStrong}
							/>
						))}
					</View>
				</View>
				<View style={styles.track}>
					<View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: timeColor }]} />
				</View>
				<View style={styles.headRow}>
					<Text style={styles.score}>{`${score}점`}</Text>
					{combo >= 3 ? <Text style={styles.combo}>{`🔥 ${combo}연속`}</Text> : null}
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				{question && topic ? (
					<Animated.View
						style={{
							opacity: pulse,
							transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(10), 0] }) }],
						}}>
						<WorldQuestionCard question={question} askAs={mode?.askAs} picked={picked} onPick={choose} tint={Colors[topic.tint]} />
					</Animated.View>
				) : (
					<Text style={styles.note}>낼 수 있는 문항이 없다.</Text>
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		centerContent: { ...Layout.column, flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.xl, gap: SpacingV.lg },

		hero: { alignItems: 'center', gap: SpacingV.xs },
		heroBadge: {
			width: scaledSize(76),
			height: scaledSize(76),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primary,
			marginBottom: SpacingV.xs,
		},
		heroTitle: { fontSize: Typography.h1, fontWeight: FontWeight.bold, color: Colors.textStrong },
		heroSub: { fontSize: Typography.bodySm, color: Colors.textSecondary, textAlign: 'center' },

		ruleRow: { flexDirection: 'row', gap: Spacing.sm },
		rule: { flex: 1, alignItems: 'center', gap: scaleHeight(2), paddingVertical: SpacingV.md, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
		ruleValue: { fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.textStrong },
		ruleLabel: { fontSize: Typography.caption, color: Colors.textSecondary },
		note: { fontSize: Typography.footnote, color: Colors.textSecondary, textAlign: 'center', lineHeight: scaledSize(18) },

		actions: { flexDirection: 'row', gap: Spacing.sm },
		ghost: { flex: 1, height: scaledSize(50), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt },
		ghostText: { fontSize: Typography.callout, fontWeight: FontWeight.semibold, color: Colors.text },
		primary: { flex: 1, height: scaledSize(50), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
		primaryText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse },

		head: { paddingHorizontal: Spacing.lg, paddingTop: SpacingV.sm, paddingBottom: SpacingV.sm, gap: SpacingV.xs, ...Shadow.card, backgroundColor: Colors.background },
		headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
		time: { fontSize: Typography.h2, fontWeight: FontWeight.bold, fontVariant: ['tabular-nums'] },
		lives: { flexDirection: 'row', gap: scaledSize(2) },
		track: { height: scaleHeight(5), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
		fill: { height: '100%', borderRadius: Radius.pill },
		score: { fontSize: Typography.callout, fontWeight: FontWeight.semibold, color: Colors.textStrong },
		combo: { fontSize: Typography.footnote, fontWeight: FontWeight.semibold, color: Colors.accentAmberDark },

		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.md, paddingBottom: SpacingV.xxl },
	});

export default WorldTimeChallengeScreen;
