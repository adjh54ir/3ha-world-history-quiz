import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import BottomHomeButton from '@/src/four/screens/common/BottomHomeButton';
import { useWorldGuide } from './common/WorldGuide';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { WORLD_ENTRIES } from '@/src/const/data/world/ConstWorldEntries';
import { selectTopic } from '@/src/const/data/world/ConstWorldTopics';
import { selectEntryImage, selectEntryImageFallback } from '@/src/const/data/world/ConstWorldImages';
import { pickEntries } from '@/src/services/world/WorldRules';
import { bridgeWorldStudied } from '@/src/services/world/WorldBridge';
import { useLife } from '@/src/hooks/useLife';
import type { WorldType } from '@/src/types/data/WorldType';
import { Paths } from '@/src/navigation/conf/Paths';
import { playFlip, playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

const STUDY_MASCOT = require('@/src/assets/illustrations/lion-study.webp');

/**
 * 카드 학습 — 한 화면에 항목 하나.
 *
 * 순서는 난이도 순이다. 그냥 늘어놓으면 첫 장부터 이름도 못 들어 본 섬이 나온다.
 */
const WorldStudyScreen = () => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const params = useLocalSearchParams<{ topic?: string }>();
	const topic = selectTopic((params.topic ?? 'capital') as WorldType.TopicKey);

	const life = useLife();
	const { button, guide } = useWorldGuide('world-study', [
		t('study.guide.line1'),
		t('study.guide.line2'),
		t('study.guide.line3'),
	]);
	/**
	 * 난이도 순으로 줄 세운 학습 순서 — 화면이 살아 있는 동안 고정한다.
	 * 이미 배운 수를 넘겨 여는 등급을 맞춘다 (처음 켠 사람은 쉬운 것부터 본다).
	 * 배운 수가 늘 때마다 순서가 뒤바뀌면 보던 자리를 잃으므로 첫 렌더의 값만 쓴다.
	 */
	const cards = useMemo(() => {
		const pool = WORLD_ENTRIES[topic.key];
		return pickEntries(pool, life.learned.length, pool.length);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [topic.key]);

	const [at, setAt] = useState(0);
	const [brokenAt, setBrokenAt] = useState<string | null>(null);
	const entry = cards[at];
	const image = entry ? selectEntryImage(topic.key, entry) : undefined;
	const fallback = selectEntryImageFallback(topic.key);
	const shownImage = brokenAt === entry?.id ? fallback : image;

	// 카드가 바뀔 때 살짝 떠오르게 — 같은 자리에서 글자만 갈리면 넘어간 줄 모른다
	const enter = useRef(new Animated.Value(1)).current;
	useEffect(() => {
		enter.setValue(0);
		const anim = Animated.timing(enter, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true });
		anim.start();
		return () => anim.stop();
	}, [at, enter]);

	// 카드를 펼친 항목은 배운 것으로 친다 — 진도·경험치·미션이 여기서 오른다
	useEffect(() => {
		if (entry) {
			bridgeWorldStudied(entry.id);
		}
	}, [entry]);

	const move = (step: number) => {
		const next = at + step;
		if (next < 0 || next >= cards.length) {
			return;
		}
		playFlip();
		setAt(next);
	};

	const goQuiz = () => {
		playPop();
		router.replace({ pathname: `/${Paths.WORLD_QUIZ}`, params: { topic: topic.key } } as never);
	};

	const percent = cards.length ? Math.round(((at + 1) / cards.length) * 100) : 0;
	const cardStyle = {
		opacity: enter,
		transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [scaleHeight(14), 0] }) }],
	};

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
			<View style={styles.head}>
				<View style={styles.headText}>
					<Text style={styles.topicLabel} numberOfLines={1}>
						{t(`topic.${topic.key}.label`)}
					</Text>
					<View style={styles.headRight}>
						<Text style={styles.counter}>{`${at + 1} / ${cards.length}`}</Text>
						{button}
					</View>
				</View>
				<View style={styles.track}>
					<View style={[styles.fill, { width: `${percent}%`, backgroundColor: Colors[topic.color] }]} />
				</View>
			</View>

			<ScrollView
				// 빈 화면일 때만 남은 높이를 다 차지하게 해, 안내가 가운데에 선다
				contentContainerStyle={[styles.content, cards.length === 0 && styles.contentEmpty]}
				showsVerticalScrollIndicator={false}>
				{entry ? (
					<Animated.View style={[styles.card, cardStyle]}>
						{shownImage ? (
							<View style={[styles.art, { backgroundColor: Colors[topic.tint] }]}>
								<Image
									source={shownImage}
									style={styles.image}
									contentFit="contain"
									transition={180}
									onError={shownImage === image && entry ? () => setBrokenAt(entry.id) : undefined}
								/>
							</View>
						) : (
							<View style={[styles.art, styles.artEmpty, { backgroundColor: Colors[topic.tint] }]}>
								<IconComponent type="materialcommunityicons" name={topic.icon} size={44} color={Colors[topic.color]} />
							</View>
						)}
						<View style={styles.body}>
							<View style={[styles.levelChip, { backgroundColor: Colors[topic.tint] }]}>
								<Text style={[styles.levelText, { color: Colors[topic.color] }]}>{t(`level.${entry.level}.label`)}</Text>
							</View>
							<Text style={styles.name}>{entry.name}</Text>
							<Text style={styles.summary}>{entry.summary}</Text>
							<View style={styles.factList}>
								{entry.facts.map((fact) => (
									<View key={fact} style={styles.factRow}>
										<View style={[styles.dot, { backgroundColor: Colors[topic.color] }]} />
										<Text style={styles.factText}>{fact}</Text>
									</View>
								))}
							</View>
						</View>
					</Animated.View>
				) : (
					<View style={styles.empty}>
						<Image source={STUDY_MASCOT} style={styles.emptyImage} contentFit="contain" accessible={false} />
						<Text style={styles.summary}>{t('study.empty')}</Text>
					</View>
				)}
			</ScrollView>

			<View style={styles.footer}>
				<PressableScale style={[styles.navButton, at === 0 && styles.navDisabled]} onPress={() => move(-1)} disabled={at === 0} accessibilityRole="button" accessibilityLabel={t('study.prev')}>
					<IconComponent type="materialcommunityicons" name="chevron-left" size={22} color={at === 0 ? Colors.textMuted : Colors.text} />
				</PressableScale>
				{at + 1 >= cards.length ? (
					<PressableScale style={[styles.primary, { backgroundColor: Colors[topic.color] }]} onPress={goQuiz} accessibilityRole="button">
						<Text numberOfLines={2} style={styles.primaryText}>{t('study.toQuiz')}</Text>
					</PressableScale>
				) : (
					<PressableScale style={[styles.primary, { backgroundColor: Colors[topic.color] }]} onPress={() => move(1)} accessibilityRole="button">
						<Text style={styles.primaryText}>{t('study.nextShort')}</Text>
					</PressableScale>
				)}
				<PressableScale
					style={[styles.navButton, at + 1 >= cards.length && styles.navDisabled]}
					onPress={() => move(1)}
					disabled={at + 1 >= cards.length}
					accessibilityRole="button"
					accessibilityLabel={t('study.next')}>
					<IconComponent type="materialcommunityicons" name="chevron-right" size={22} color={at + 1 >= cards.length ? Colors.textMuted : Colors.text} />
				</PressableScale>
			</View>
			<BottomHomeButton />
			{guide}
		</SafeAreaView>
	);
};

/** 난이도 — 숫자만 보여 주면 무엇이 쉬운 쪽인지 알 수 없다 */

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
		card: {
			borderRadius: Radius.xl,
			overflow: 'hidden',
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			...Shadow.card,
		},
		art: { height: scaleHeight(190), alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
		artEmpty: { height: scaleHeight(120) },
		image: { width: '100%', height: '100%' },
		contentEmpty: { flexGrow: 1 },
		// 빈 화면 안내 — 빈 영역 정중앙에 선다
		empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SpacingV.sm, paddingVertical: SpacingV.xxl },
		emptyImage: { width: scaledSize(156), height: scaledSize(156) },

		body: { padding: Spacing.lg, gap: SpacingV.sm },
		levelChip: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: scaleHeight(3), borderRadius: Radius.pill },
		levelText: { fontSize: Typography.caption, fontWeight: FontWeight.semibold },
		name: { fontSize: Typography.h2, fontWeight: FontWeight.bold, color: Colors.textStrong },
		summary: { fontSize: Typography.body, color: Colors.text, lineHeight: scaledSize(23) },

		factList: { gap: SpacingV.xs, marginTop: SpacingV.xs },
		factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
		dot: { width: scaledSize(5), height: scaledSize(5), borderRadius: scaledSize(3), marginTop: scaledSize(8) },
		factText: { flex: 1, fontSize: Typography.bodySm, color: Colors.textSecondary, lineHeight: scaledSize(20) },

		footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.sm },
		navButton: {
			width: scaledSize(44),
			height: scaledSize(44),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surfaceAlt, },
		navDisabled: { opacity: 0.45 },
		primary: { flex: 1, minHeight: scaledSize(44), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.sm, },
		primaryText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse, flexShrink: 1, textAlign: 'center', },
	});

export default WorldStudyScreen;
