import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import BottomHomeButton from '@/src/four/screens/common/BottomHomeButton';
import WorldQuestionCard from './common/WorldQuestionCard';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';
import { selectTopic } from '@/src/const/data/world/ConstWorldTopics';
import { buildMixedQuestions, buildQuestions } from '@/src/services/world/WorldQuizFactory';
import { pickEntries } from '@/src/services/world/WorldRules';
import { collectWorldAnswer, flushWorldQuiz, resetWorldBuffer } from '@/src/services/world/WorldBridge';
import { selectEntry } from '@/src/const/data/world/ConstWorldEntries';
import { useLife } from '@/src/hooks/useLife';
import type { LifeType } from '@/src/types/data/LifeType';
import type { WorldType } from '@/src/types/data/WorldType';
import { Paths } from '@/src/navigation/conf/Paths';
import { playCorrect, playFinish, playPop, playWrong } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

/** 한 판 문항 수 */
const QUIZ_COUNT = 10;
/** 머리글에 무엇을 보여 줄지 — 주제 퀴즈는 주제 이름을 그대로 쓴다 */
const SOURCE_LABEL: Partial<Record<LifeType.QuizSource, string>> = { daily: '오늘의 퀴즈', wrong: '오답 복습' };
/** 답을 고른 뒤 다음 문제로 넘어가기까지 — 정답 표시를 읽을 시간은 준다 */
const NEXT_DELAY = 900;

/**
 * 세계 상식 4지선다.
 *
 * 문항은 주제의 모든 유형을 돌려 가며 낸다 — 같은 주제라도 수도·국기·대륙이 섞여 나온다.
 * 그림 유형(`askAs`)이면 문제 자리에 글자 대신 그림을 건다.
 */
interface Props {
	/** 라우트가 못 박는 출제 방식 — 탭처럼 주소로 파라미터를 못 넘기는 자리에서 쓴다 */
	source?: LifeType.QuizSource;
}

const WorldQuizScreen = ({ source: fixedSource }: Props = {}) => {
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const params = useLocalSearchParams<{ topic?: string; source?: string }>();
	const topic = selectTopic((params.topic ?? 'capital') as WorldType.TopicKey);
	/** 어디서 온 판인가 — 주제 퀴즈 · 오늘의 퀴즈 · 오답 복습 */
	const source: LifeType.QuizSource =
		fixedSource ?? (params.source === 'daily' || params.source === 'wrong' ? params.source : 'category');
	const life = useLife();

	const [round, setRound] = useState(0);
	const questions = useMemo(() => {
		// 오늘의 퀴즈·오답 노트는 주제가 섞여 있다 — 항목마다 제 주제로 내야 한다
		if (source !== 'category') {
			const ids = source === 'daily' ? (life.daily?.wordIds ?? []) : life.wrong.map((note) => note.wordId);
			const entries = ids.map(selectEntry).filter((item): item is WorldType.Entry => !!item);
			return buildMixedQuestions(entries.slice(0, QUIZ_COUNT), (entry) => {
				const key = entry.id.split('-')[0] as WorldType.TopicKey;
				const pool = WORLD_ENTRIES[key];
				return pool ? { topic: selectTopic(key), pool } : undefined;
			});
		}
		const pool = WORLD_ENTRIES[topic.key];
		// 난이도 가중으로 먼저 고르고, 오답 보기는 주제 전체에서 뽑는다
		// 이미 배운 수를 넘겨 처음 켠 사람에게 어려운 항목이 쏟아지지 않게 한다
		return buildQuestions(pickEntries(pool, life.learned.length, QUIZ_COUNT), topic, pool);
		// round 가 바뀌면 새로 뽑는다 (다시 풀기). life 는 판을 시작할 때 값만 쓰고 도중에 따라가지 않는다
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [topic.key, round, source]);

	const [at, setAt] = useState(0);
	const [picked, setPicked] = useState<string | null>(null);
	const [correct, setCorrect] = useState(0);
	const question = questions[at];
	const done = at >= questions.length;

	const mode = topic.modes.find((item) => item.key === question?.mode);

	const enter = useRef(new Animated.Value(1)).current;
	useEffect(() => {
		enter.setValue(0);
		const anim = Animated.timing(enter, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [at, enter]);

	// 답을 고르면 잠깐 보여 주고 다음으로 — 화면을 벗어나면 타이머를 걷는다
	useEffect(() => {
		if (picked === null) {
			return;
		}
		const timer = setTimeout(() => {
			setPicked(null);
			setAt((prev) => prev + 1);
		}, NEXT_DELAY);
		return () => clearTimeout(timer);
	}, [picked]);

	useEffect(() => {
		if (done && questions.length > 0) {
			playFinish();
			flushWorldQuiz(source, source === 'category' ? topic.key : undefined);
		}
	}, [done, questions.length, source, topic.key]);

	// 도중에 나가도 푼 만큼은 남아야 한다 — 화면을 뜰 때 모아 둔 것을 넘긴다
	useEffect(
		() => () => {
			flushWorldQuiz(source, source === 'category' ? topic.key : undefined);
		},
		[source, topic.key],
	);

	const choose = (option: string) => {
		if (picked !== null || !question) {
			return;
		}
		const hit = option === question.answer;
		setPicked(option);
		// 진도·오답 노트·코인은 판이 끝날 때 한 번에 넘긴다 (WorldBridge)
		collectWorldAnswer(question.entry.id, hit);
		if (hit) {
			setCorrect((prev) => prev + 1);
			playCorrect();
		} else {
			playWrong();
		}
	};

	const retry = () => {
		playPop();
		resetWorldBuffer();
		setAt(0);
		setPicked(null);
		setCorrect(0);
		setRound((prev) => prev + 1);
	};

	const percent = questions.length ? Math.round((Math.min(at, questions.length) / questions.length) * 100) : 0;
	const cardStyle = {
		opacity: enter,
		transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(12), 0] }) }],
	};

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
			<View style={styles.head}>
				<View style={styles.headText}>
					<Text style={styles.topicLabel}>{SOURCE_LABEL[source] ?? topic.label}</Text>
					<Text style={styles.counter}>{done ? '완료' : `${at + 1} / ${questions.length}`}</Text>
				</View>
				<View style={styles.track}>
					<View style={[styles.fill, { width: `${percent}%`, backgroundColor: Colors[topic.color] }]} />
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				{done ? (
					<Animated.View style={[styles.card, styles.resultCard, cardStyle]}>
						<View style={[styles.resultBadge, { backgroundColor: Colors[topic.tint] }]}>
							<IconComponent type="materialcommunityicons" name="trophy-outline" size={34} color={Colors[topic.color]} />
						</View>
						<Text style={styles.resultScore}>{`${correct} / ${questions.length}`}</Text>
						<Text style={styles.resultText}>
							{correct === questions.length ? '다 맞혔다.' : correct * 2 >= questions.length ? '절반은 넘겼다.' : '한 번 더 보고 오면 는다.'}
						</Text>
						<View style={styles.resultActions}>
							<PressableScale style={[styles.ghost]} onPress={() => router.replace({ pathname: `/${Paths.WORLD_STUDY}`, params: { topic: topic.key } } as never)} accessibilityRole="button">
								<Text style={styles.ghostText}>카드로 복습</Text>
							</PressableScale>
							<PressableScale style={[styles.primary, { backgroundColor: Colors[topic.color] }]} onPress={retry} accessibilityRole="button">
								<Text style={styles.primaryText}>다시 풀기</Text>
							</PressableScale>
						</View>
					</Animated.View>
				) : question ? (
					<Animated.View style={cardStyle}>
						<WorldQuestionCard question={question} askAs={mode?.askAs} picked={picked} onPick={choose} tint={Colors[topic.tint]} />
					</Animated.View>
				) : (
					<Text style={styles.hint}>낼 수 있는 문항이 없다.</Text>
				)}
			</ScrollView>
			<BottomHomeButton />
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },

		head: { paddingHorizontal: Spacing.lg, paddingTop: SpacingV.sm, paddingBottom: SpacingV.sm, gap: SpacingV.xs },
		headText: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
		topicLabel: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		counter: { fontSize: Typography.footnote, color: Colors.textSecondary },
		track: { height: scaleHeight(5), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
		fill: { height: '100%', borderRadius: Radius.pill },

		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.md, paddingBottom: SpacingV.xl },
		stack: { gap: SpacingV.lg },

		card: {
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			padding: Spacing.lg,
			gap: SpacingV.md,
			...Shadow.card,
		},
		hint: { fontSize: Typography.bodySm, color: Colors.textSecondary, lineHeight: scaledSize(20), textAlign: 'center' },

		resultCard: { alignItems: 'center', gap: SpacingV.sm, paddingVertical: SpacingV.xl },
		resultBadge: { width: scaledSize(74), height: scaledSize(74), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
		resultScore: { fontSize: Typography.display, fontWeight: FontWeight.bold, color: Colors.textStrong },
		resultText: { fontSize: Typography.body, color: Colors.textSecondary },
		resultActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.md, alignSelf: 'stretch' },
		ghost: {
			flex: 1,
			height: scaledSize(46),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surfaceAlt,
		},
		ghostText: { fontSize: Typography.callout, fontWeight: FontWeight.semibold, color: Colors.text },
		primary: { flex: 1, height: scaledSize(46), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
		primaryText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse },
	});

export default WorldQuizScreen;
