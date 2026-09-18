import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import WorldQuestionCard from './common/WorldQuestionCard';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { TOWER_FLOOR_SIZE, TOWER_LIVES } from '@/src/services/life/LifeRules';
import { challengeQuestions, towerLevelOf } from '@/src/services/world/WorldChallenge';
import { selectTopic } from '@/src/const/data/world/ConstWorldTopics';
import { bridgeWorldTower, collectWorldAnswer, resetWorldBuffer } from '@/src/services/world/WorldBridge';
import type { WorldType } from '@/src/types/data/WorldType';
import { playCorrect, playFinish, playPop, playWrong } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

/** 답을 고른 뒤 다음으로 넘어가기까지 */
const NEXT_DELAY = 900;
const ENCOURAGE_MASCOT = require('@/src/assets/illustrations/lion-encourage.webp');

/**
 * 타워 챌린지 — 한 층씩 오른다.
 *
 * 층마다 문제 세 개, 목숨은 층을 넘어가도 이어진다. 틀리면 목숨이 하나 줄고
 * 다 쓰면 그 층까지가 기록이다. 층이 오를수록 문제 난이도가 올라간다(세 층마다 한 단계).
 *
 * 층을 넘길 때마다 기록을 넘긴다 — 도중에 앱을 닫아도 오른 만큼은 남는다.
 */
const WorldTowerQuizScreen = () => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const params = useLocalSearchParams<{ topic?: string }>();
	/** 오르기 전 화면에서 고른 주제 — 없으면 전체에서 섞어 낸다 */
	const pickedTopic = params.topic as WorldType.TopicKey | undefined;

	const [floor, setFloor] = useState(1);
	const [lives, setLives] = useState(TOWER_LIVES);
	const [questions, setQuestions] = useState<WorldType.Question[]>(() =>
		challengeQuestions(towerLevelOf(1), TOWER_FLOOR_SIZE, Math.random, pickedTopic),
	);
	const [at, setAt] = useState(0);
	const [picked, setPicked] = useState<string | null>(null);
	const [over, setOver] = useState(false);

	const question = questions[at];
	const mode = question ? selectTopic(question.topic).modes.find((item) => item.key === question.mode) : undefined;
	const topic = question ? selectTopic(question.topic) : undefined;

	const enter = useRef(new Animated.Value(1)).current;
	useEffect(() => {
		enter.setValue(0);
		const anim = Animated.timing(enter, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [at, floor, enter]);

	/** 층을 다 풀었다 — 기록을 넘기고 다음 층을 연다 */
	const climb = useCallback(() => {
		bridgeWorldTower(floor);
		playFinish();
		const next = floor + 1;
		setFloor(next);
		setQuestions(challengeQuestions(towerLevelOf(next), TOWER_FLOOR_SIZE, Math.random, pickedTopic));
		setAt(0);
	}, [floor, pickedTopic]);

	// 답을 고르면 잠깐 보여 주고 다음 문제로 — 화면을 벗어나면 타이머를 걷는다
	useEffect(() => {
		if (picked === null) {
			return;
		}
		const timer = setTimeout(() => {
			setPicked(null);
			if (lives <= 0) {
				setOver(true);
				bridgeWorldTower(Math.max(0, floor - 1));
				return;
			}
			if (at + 1 >= questions.length) {
				climb();
				return;
			}
			setAt((prev) => prev + 1);
		}, NEXT_DELAY);
		return () => clearTimeout(timer);
	}, [picked, lives, at, questions.length, climb, floor]);

	const choose = (option: string) => {
		if (picked !== null || !question) {
			return;
		}
		const hit = option === question.answer;
		setPicked(option);
		collectWorldAnswer(question.entry.id, hit);
		if (hit) {
			playCorrect();
		} else {
			playWrong();
			setLives((prev) => prev - 1);
		}
	};

	const retry = () => {
		playPop();
		resetWorldBuffer();
		setFloor(1);
		setLives(TOWER_LIVES);
		setQuestions(challengeQuestions(towerLevelOf(1), TOWER_FLOOR_SIZE, Math.random, pickedTopic));
		setAt(0);
		setPicked(null);
		setOver(false);
	};

	const level = towerLevelOf(floor);

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
			<View style={styles.head}>
				<View style={styles.headRow}>
					<View style={styles.floorBox}>
						<Text style={styles.floorText}>{t('tower.floor', { floor })}</Text>
						<Text style={styles.levelText}>{t(`level.${level}.label`)}</Text>
					</View>
					<View style={styles.lives}>
						{Array.from({ length: TOWER_LIVES }, (_, no) => (
							<IconComponent
								key={no}
								type="materialcommunityicons"
								name={no < lives ? 'heart' : 'heart-outline'}
								size={20}
								color={no < lives ? Colors.error : Colors.borderStrong}
							/>
						))}
					</View>
				</View>
				<Text style={styles.counter}>{over ? '' : t('tower.progress', { at: Math.min(at + 1, questions.length), total: questions.length })}</Text>
			</View>

			<ScrollView
				// 낼 문항이 없을 때만 남은 높이를 다 차지하게 해, 안내가 가운데에 선다
				contentContainerStyle={[styles.content, !question && styles.contentEmpty]}
				showsVerticalScrollIndicator={false}>
				{over ? (
					<Animated.View style={[styles.resultCard, { opacity: enter }]}>
						<Image source={ENCOURAGE_MASCOT} style={styles.resultMascot} contentFit="contain" accessible={false} />
						<Text style={styles.resultScore}>{t('tower.floor', { floor: Math.max(0, floor - 1) })}</Text>
						<Text style={styles.resultText}>{t('tower.outOfLives')}</Text>
						<View style={styles.resultActions}>
							<PressableScale style={styles.ghost} onPress={() => router.back()} accessibilityRole="button">
								<Text style={styles.ghostText}>{t('tower.exit')}</Text>
							</PressableScale>
							<PressableScale style={styles.primary} onPress={retry} accessibilityRole="button">
								<Text style={styles.primaryText}>{t('tower.again')}</Text>
							</PressableScale>
						</View>
					</Animated.View>
				) : question && topic ? (
					<Animated.View
						style={{
							opacity: enter,
							transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(12), 0] }) }],
						}}>
						<WorldQuestionCard question={question} askAs={mode?.askAs} picked={picked} onPick={choose} tint={Colors[topic.tint]} />
					</Animated.View>
				) : (
					<View style={styles.emptyBox}>
						<Text style={styles.resultText}>{t('quiz.noQuestions')}</Text>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		head: { paddingHorizontal: Spacing.lg, paddingTop: SpacingV.sm, paddingBottom: SpacingV.sm, gap: SpacingV.xs },
		headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
		floorBox: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
		floorText: { fontSize: Typography.h2, fontWeight: FontWeight.bold, color: Colors.textStrong },
		levelText: { fontSize: Typography.footnote, color: Colors.textSecondary },
		lives: { flexDirection: 'row', gap: scaledSize(2) },
		counter: { fontSize: Typography.footnote, color: Colors.textSecondary },

		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.md, paddingBottom: SpacingV.xxl },
		contentEmpty: { flexGrow: 1 },
		// 빈 화면 안내 — 위에 붙지 않고 빈 영역 정중앙에 선다
		emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

		resultCard: {
			alignItems: 'center',
			gap: SpacingV.sm,
			paddingVertical: SpacingV.xxl,
			paddingHorizontal: Spacing.lg,
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			...Shadow.card,
		},
		resultMascot: { width: scaledSize(132), height: scaledSize(132) },
		resultBadge: {
			width: scaledSize(74),
			height: scaledSize(74),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primarySoft,
		},
		resultScore: { fontSize: Typography.display, fontWeight: FontWeight.bold, color: Colors.textStrong },
		resultText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center' },
		resultActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.md, alignSelf: 'stretch' },
		ghost: { flex: 1, minHeight: scaledSize(46), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt, paddingVertical: SpacingV.sm, },
		ghostText: { fontSize: Typography.callout, fontWeight: FontWeight.semibold, color: Colors.text, flexShrink: 1, textAlign: 'center', },
		primary: { flex: 1, minHeight: scaledSize(46), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, paddingVertical: SpacingV.sm, },
		primaryText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse, flexShrink: 1, textAlign: 'center', },
	});

export default WorldTowerQuizScreen;
