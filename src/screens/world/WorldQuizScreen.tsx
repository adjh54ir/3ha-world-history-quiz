import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import BottomHomeButton from '@/src/four/screens/common/BottomHomeButton';
import WorldQuestionCard from './common/WorldQuestionCard';
import { useWorldGuide } from './common/WorldGuide';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';
import { selectTopic } from '@/src/const/data/world/ConstWorldTopics';
import { buildMixedQuestions, buildQuestions } from '@/src/services/world/WorldQuizFactory';
import { pickEntries } from '@/src/services/world/WorldRules';
import { collectWorldAnswer, flushWorldQuiz, resetWorldBuffer } from '@/src/services/world/WorldBridge';
import { selectEntry } from '@/src/const/data/world/ConstWorldEntries';
import { useLife, useStreak } from '@/src/hooks/useLife';
import Confetti from '@/src/four/components/Confetti';
import DateUtils from '@/src/utils/DateUtils';
import { dailyShareText } from '@/src/services/life/LifeRules';
import type { LifeType } from '@/src/types/data/LifeType';
import type { WorldType } from '@/src/types/data/WorldType';
import { Paths } from '@/src/navigation/conf/Paths';
import { playCorrect, playFinish, playPop, playWrong } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

/** 한 판 문항 수 */
const QUIZ_COUNT = 10;
/** 머리글에 무엇을 보여 줄지 (번역 키) — 주제 퀴즈는 주제 이름을 그대로 쓴다 */
const SOURCE_KEY: Partial<Record<LifeType.QuizSource, string>> = { daily: 'quiz.source.daily', wrong: 'quiz.source.wrong' };
/** 답을 고른 뒤 다음 문제로 넘어가기까지 — 해설을 읽을 시간은 준다 */
const NEXT_DELAY = 1600;
/** 이 비율 위로 맞히면 폭죽을 터뜨린다 */
const CONFETTI_RATIO = 0.8;
const RESULT_GREAT = require('@/src/assets/illustrations/lion-correct.webp');
const RESULT_ENCOURAGE = require('@/src/assets/illustrations/lion-encourage.webp');

/**
 * 풀던 판 — 화면을 벗어나도 앱이 살아 있는 동안은 들고 있는다.
 * -------------------------------------------------
 * 열 문제 중 여섯을 풀고 홈으로 나갔다 돌아오면 판이 처음부터 다시 시작됐다.
 * 진도·오답·경험치는 나갈 때 넘기니 남지만(WorldBridge), 풀던 자리는 사라져 네 문제를 또 만난다.
 *
 * 저장소가 아니라 모듈 변수다 — 앱을 껐다 켜면 새 판으로 시작한다.
 * 문항까지 통째로 저장하면 그 사이 바뀐 진도와 어긋난 문제가 되살아난다.
 */
let session: {
	key: string;
	questions: WorldType.Question[];
	at: number;
	correct: number;
	misses: { question: WorldType.Question; picked: string }[];
	marks: boolean[];
} | null = null;

/** 이어 풀 판인지 가리는 열쇠 — 출제 방식과 주제가 같아야 같은 판이다 */
const sessionKey = (source: LifeType.QuizSource, topicKey: string) => `${source}:${source === 'category' ? topicKey : ''}`;

/** 다른 화면(다시 풀기·결과)에서 판을 버릴 때 */
const dropSession = () => {
	session = null;
};

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
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const params = useLocalSearchParams<{ topic?: string; source?: string }>();
	const topic = selectTopic((params.topic ?? 'capital') as WorldType.TopicKey);
	/** 어디서 온 판인가 — 주제 퀴즈 · 오늘의 퀴즈 · 오답 복습 */
	const source: LifeType.QuizSource =
		fixedSource ?? (params.source === 'daily' || params.source === 'wrong' ? params.source : 'category');
	const life = useLife();
	const { streak } = useStreak();
	const { button, guide } = useWorldGuide('world-quiz', [
		t('quiz.guide.line1'),
		t('quiz.guide.line2'),
		t('quiz.guide.line3'),
	]);

	const key = sessionKey(source, topic.key);
	/** 돌아왔을 때 이어 풀 판 — 첫 렌더에서만 본다 (풀다 보면 session 이 계속 바뀐다) */
	const resumed = useRef(session?.key === key ? session : null).current;

	const [round, setRound] = useState(0);
	const questions = useMemo(() => {
		// 풀던 판이 있으면 문항을 새로 뽑지 않는다 — 다시 뽑으면 이어 풀 자리가 다른 문제를 가리킨다
		if (round === 0 && resumed) {
			return resumed.questions;
		}
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

	const [at, setAt] = useState(resumed?.at ?? 0);
	const [picked, setPicked] = useState<string | null>(null);
	const [correct, setCorrect] = useState(resumed?.correct ?? 0);
	/** 이번 판에서 틀린 문항 — 결과에서 "무엇을 어떻게 틀렸는지" 를 그대로 보여 준다 */
	const [misses, setMisses] = useState<{ question: WorldType.Question; picked: string }[]>(resumed?.misses ?? []);
	/** 문항별 정오답 — 오늘의 퀴즈 공유 글의 🟩🟥 줄이 된다 */
	const [marks, setMarks] = useState<boolean[]>(resumed?.marks ?? []);
	const question = questions[at];
	const done = at >= questions.length;

	const mode = topic.modes.find((item) => item.key === question?.mode);

	/**
	 * 판을 시작할 때의 경험치 — 끝난 뒤 지금 값과의 차이가 이번 판에서 번 경험치다.
	 * 보상 계산을 화면에서 다시 하면 규칙(LifeRules)과 두 벌이 되어 언젠가 어긋난다.
	 */
	const startExp = useRef(life.exp);
	useEffect(() => {
		startExp.current = life.exp;
		// 새 판을 시작할 때만 다시 잡는다 — life.exp 를 따라가면 판 도중에 기준이 밀린다
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [round]);
	const gainedExp = Math.max(0, life.exp - startExp.current);

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

	// 풀던 자리를 들고 있는다 — 끝난 판은 버려야 돌아왔을 때 결과 화면이 아니라 새 판이 열린다
	useEffect(() => {
		if (questions.length === 0 || done) {
			dropSession();
			return;
		}
		session = { key, questions, at, correct, misses, marks };
	}, [key, questions, at, correct, misses, marks, done]);

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
		setMarks((prev) => [...prev, hit]);
		// 진도·오답 노트·경험치는 판이 끝날 때 한 번에 넘긴다 (WorldBridge)
		collectWorldAnswer(question.entry.id, hit);
		if (hit) {
			setCorrect((prev) => prev + 1);
			playCorrect();
		} else {
			setMisses((prev) => [...prev, { question, picked: option }]);
			playWrong();
		}
	};

	const retry = () => {
		playPop();
		dropSession();
		resetWorldBuffer();
		setAt(0);
		setPicked(null);
		setCorrect(0);
		setMisses([]);
		setMarks([]);
		setRound((prev) => prev + 1);
	};

	/** 오늘의 퀴즈 결과를 워들처럼 이모지 줄로 공유한다 */
	const share = async () => {
		playPop();
		try {
			await Share.share({ message: dailyShareText(marks, DateUtils.getLocalDateString(), streak) });
		} catch (e) {
			console.warn('결과 공유 실패:', e);
		}
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
					<Text style={styles.topicLabel} numberOfLines={1}>
						{SOURCE_KEY[source] ? t(SOURCE_KEY[source]) : t(`topic.${topic.key}.label`)}
					</Text>
					<View style={styles.headRight}>
						<Text style={styles.counter}>{done ? t('quiz.done') : `${at + 1} / ${questions.length}`}</Text>
						{button}
					</View>
				</View>
				<View style={styles.track}>
					<View style={[styles.fill, { width: `${percent}%`, backgroundColor: Colors[topic.color] }]} />
				</View>
			</View>

			<ScrollView
				// 낼 문항이 없을 때만 남은 높이를 다 차지하게 해, 안내가 가운데에 선다
				contentContainerStyle={[styles.content, !question && styles.contentEmpty]}
				showsVerticalScrollIndicator={false}>
				{done ? (
					<Animated.View style={[styles.stack, cardStyle]}>
						<View style={[styles.card, styles.resultCard]}>
							<Image
								source={correct >= questions.length * CONFETTI_RATIO ? RESULT_GREAT : RESULT_ENCOURAGE}
								style={styles.resultMascot}
								contentFit="contain"
								accessible={false}
							/>
							<Text style={styles.resultScore}>{`${correct} / ${questions.length}`}</Text>
							<Text style={styles.resultText}>
								{t(correct === questions.length ? 'quiz.result.perfect' : correct * 2 >= questions.length ? 'quiz.result.half' : 'quiz.result.low')}
							</Text>
							{gainedExp > 0 ? (
								<View style={[styles.expChip, { backgroundColor: Colors[topic.tint] }]}>
									<IconComponent type="materialcommunityicons" name="lightning-bolt" size={14} color={Colors[topic.color]} />
									<Text style={[styles.expText, { color: Colors[topic.color] }]}>{`+${gainedExp.toLocaleString()}EXP`}</Text>
								</View>
							) : null}
						</View>

						{/* 무엇을 틀렸는지 — 고른 답과 정답을 나란히 둬야 다시 볼 거리가 남는다 */}
						{misses.length > 0 ? (
							<View style={styles.card}>
								<Text style={styles.missTitle}>{t('quiz.missCount', { n: misses.length })}</Text>
								{misses.map((miss) => (
									<View key={miss.question.id} style={styles.missRow}>
										<Text style={styles.missPrompt} numberOfLines={1}>
											{miss.question.entry.name}
										</Text>
										<View style={styles.missAnswers}>
											<Text style={styles.missPicked} numberOfLines={1}>
												{miss.picked}
											</Text>
											<IconComponent type="materialicons" name="arrow-forward" size={13} color={Colors.textMuted} />
											<Text style={styles.missAnswer} numberOfLines={1}>
												{miss.question.answer}
											</Text>
										</View>
									</View>
								))}
							</View>
						) : null}

						<View style={styles.resultActions}>
							<PressableScale
								style={styles.ghost}
								onPress={() => router.replace({ pathname: `/${Paths.WORLD_STUDY}`, params: { topic: topic.key } } as never)}
								accessibilityRole="button">
								<Text numberOfLines={2} style={styles.ghostText}>{t('quiz.reviewCards')}</Text>
							</PressableScale>
							<PressableScale style={[styles.primary, { backgroundColor: Colors[topic.color] }]} onPress={retry} accessibilityRole="button">
								<Text numberOfLines={2} style={styles.primaryText}>{t('quiz.retry')}</Text>
							</PressableScale>
						</View>

						{/* 오늘의 퀴즈만 공유한다 — 날짜가 붙어야 워들처럼 읽힌다 */}
						{source === 'daily' && marks.length > 0 ? (
							<PressableScale style={styles.shareButton} onPress={share} accessibilityRole="button" accessibilityLabel={t('quiz.shareTitle')}>
								<IconComponent type="materialcommunityicons" name="share-variant" size={16} color={Colors.textSecondary} />
								<Text style={styles.shareText}>{t('quiz.shareResult')}</Text>
							</PressableScale>
						) : null}
					</Animated.View>
				) : question ? (
					<Animated.View style={cardStyle}>
						<WorldQuestionCard question={question} askAs={mode?.askAs} picked={picked} onPick={choose} tint={Colors[topic.tint]} />
					</Animated.View>
				) : (
					<View style={styles.emptyBox}>
						<Text style={styles.hint}>{t('quiz.noQuestions')}</Text>
					</View>
				)}
			</ScrollView>
			{/* 잘 맞힌 판에만 터뜨린다 — 매번 터지면 축하가 아니라 배경이 된다 */}
			{done && questions.length > 0 && correct >= questions.length * CONFETTI_RATIO ? (
				<Confetti count={90} origin={{ x: -10, y: 0 }} fadeOut fallSpeed={2600} />
			) : null}
			<BottomHomeButton />
			{guide}
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },

		head: { paddingHorizontal: Spacing.lg, paddingTop: SpacingV.sm, paddingBottom: SpacingV.sm, gap: SpacingV.xs },
		headText: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
		headRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		topicLabel: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		counter: { fontSize: Typography.footnote, color: Colors.textSecondary },
		track: { height: scaleHeight(5), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
		fill: { height: '100%', borderRadius: Radius.pill },

		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.md, paddingBottom: SpacingV.xxl },
		contentEmpty: { flexGrow: 1 },
		// 빈 화면 안내 — 위에 붙지 않고 빈 영역 정중앙에 선다
		emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
		resultMascot: { width: scaledSize(132), height: scaledSize(132) },
		expChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: scaledSize(4),
			marginTop: SpacingV.xs,
			paddingHorizontal: Spacing.md,
			paddingVertical: scaleHeight(5),
			borderRadius: Radius.pill,
		},
		expText: { fontSize: Typography.footnote, fontWeight: FontWeight.bold },

		missTitle: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		missRow: { gap: scaleHeight(3) },
		missPrompt: { fontSize: Typography.bodySm, fontWeight: FontWeight.medium, color: Colors.text },
		missAnswers: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
		missPicked: { flexShrink: 1, fontSize: Typography.footnote, color: Colors.error, textDecorationLine: 'line-through' },
		missAnswer: { flexShrink: 1, fontSize: Typography.footnote, fontWeight: FontWeight.semibold, color: Colors.success },

		shareButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xs,
			minHeight: scaledSize(44),
			borderRadius: Radius.pill,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border, paddingVertical: SpacingV.sm, },
		shareText: { fontSize: Typography.bodySm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
		resultBadge: { width: scaledSize(74), height: scaledSize(74), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
		resultScore: { fontSize: Typography.display, fontWeight: FontWeight.bold, color: Colors.textStrong },
		resultText: { fontSize: Typography.body, color: Colors.textSecondary },
		resultActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.md, alignSelf: 'stretch' },
		ghost: {
			flex: 1,
			minHeight: scaledSize(46),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surfaceAlt, paddingVertical: SpacingV.sm, },
		ghostText: { fontSize: Typography.callout, fontWeight: FontWeight.semibold, color: Colors.text, flexShrink: 1, textAlign: 'center', },
		primary: { flex: 1, minHeight: scaledSize(46), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.sm, },
		primaryText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse, flexShrink: 1, textAlign: 'center', },
	});

export default WorldQuizScreen;
