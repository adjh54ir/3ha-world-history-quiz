import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import BottomHomeButton from '@/src/four/screens/common/BottomHomeButton';
import { useWorldGuide } from './common/WorldGuide';
import WorldTopicPicker from './common/WorldTopicPicker';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { TOWER_FLOOR_SIZE, TOWER_LIVES } from '@/src/services/life/LifeRules';
import { useLife } from '@/src/hooks/useLife';
import type { WorldType } from '@/src/types/data/WorldType';
import { Paths } from '@/src/navigation/conf/Paths';
import { playPop } from '@/src/utils/SoundUtils';
import { scaledSize, scaleHeight } from '@/src/utils';

const TOWER_MASCOT = require('@/src/assets/illustrations/lion-tower-challenge-hero.webp');

/** 난이도가 바뀌는 구간 — 세 층마다 한 단계 올라간다 */
const BANDS = [
	{ level: 1, from: 1, to: 3, icon: 'sprout' },
	{ level: 2, from: 4, to: 6, icon: 'tree' },
	{ level: 3, from: 7, to: 9, icon: 'castle' },
	{ level: 4, from: 10, to: 0, icon: 'crown' },
];

/**
 * 타워 챌린지 — 오르기 전 안내.
 *
 * 층은 끝이 없다. 세 층마다 문제가 어려워지고, 목숨이 다하면 그 자리가 최고 기록이 된다.
 * 층마다 목록을 만들지 않는 이유도 그것이다 — 끝이 없으니 목록이 아니라 "어디까지 갔나" 를 보여 준다.
 */
const WorldTowerScreen = () => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const enterStyle = useScreenEnter();
	const life = useLife();
	const best = life.bestTower ?? 0;
	/** 어느 주제로 오를지 — 고르지 않으면 예전처럼 전체에서 섞어 낸다 */
	const [topic, setTopic] = useState<WorldType.TopicKey | undefined>(undefined);
	const { button, guide } = useWorldGuide('world-tower', [
		t('tower.guide.line1'),
		t('tower.guide.line2'),
		t('tower.guide.line3'),
	]);

	const start = () => {
		playPop();
		router.push({ pathname: `/${Paths.TOWER_QUIZ}`, params: topic ? { topic } : {} } as never);
	};

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<Animated.View style={[styles.stack, enterStyle]}>
					<View style={styles.hero}>
						<View style={styles.heroTop}>{button}</View>
						<Image source={TOWER_MASCOT} style={styles.heroMascot} contentFit="contain" accessible={false} />
						<Text style={styles.heroTitle}>{t('tower.title')}</Text>
						<Text style={styles.heroSub}>{best > 0 ? t('tower.best', { floor: best }) : t('tower.intro')}</Text>
					</View>

					<WorldTopicPicker value={topic} onChange={setTopic} label={t('tower.pickTopic')} />

					<View style={styles.ruleRow}>
						<View style={styles.rule}>
							<Text style={styles.ruleValue}>{TOWER_FLOOR_SIZE}</Text>
							<Text style={styles.ruleLabel}>{t('tower.perFloor')}</Text>
						</View>
						<View style={styles.rule}>
							<Text style={styles.ruleValue}>{TOWER_LIVES}</Text>
							<Text style={styles.ruleLabel}>{t('tower.livesLabel')}</Text>
						</View>
						<View style={styles.rule}>
							<Text style={styles.ruleValue}>{best}</Text>
							<Text style={styles.ruleLabel}>{t('tower.bestLabel')}</Text>
						</View>
					</View>

					<View style={styles.card}>
						<Text style={styles.cardTitle}>{t('tower.harder')}</Text>
						{BANDS.map((band) => {
							const reached = best >= band.from;
							return (
								<View key={band.level} style={styles.bandRow}>
									<View style={[styles.bandIcon, reached && { backgroundColor: Colors.primarySoft }]}>
										<IconComponent
											type="materialcommunityicons"
											name={band.icon}
											size={18}
											color={reached ? Colors.primaryDeep : Colors.textMuted}
										/>
									</View>
									<Text style={styles.bandFloor}>{band.to ? t('tower.bandRange', { from: band.from, to: band.to }) : t('tower.bandFrom', { from: band.from })}</Text>
									<Text style={[styles.bandLevel, reached && { color: Colors.primaryDeep, fontWeight: FontWeight.bold }]}>
										{t(`level.${band.level}.label`)}
									</Text>
								</View>
							);
						})}
						<Text style={styles.note}>{t('tower.livesNote')}</Text>
					</View>
				</Animated.View>
			</ScrollView>

			<View style={styles.footer}>
				<PressableScale style={styles.primary} onPress={start} accessibilityRole="button">
					<Text numberOfLines={2} style={styles.primaryText}>{t(best > 0 ? 'tower.again' : 'tower.start')}</Text>
				</PressableScale>
			</View>
			<BottomHomeButton />
			{guide}
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.md, paddingBottom: SpacingV.xxl },
		stack: { gap: SpacingV.lg },

		hero: { alignItems: 'center', gap: SpacingV.xs, paddingVertical: SpacingV.lg },
		// 안내 버튼은 히어로 오른쪽 위 — 가운데 정렬된 배지·제목의 흐름을 건드리지 않는다
		heroTop: { alignSelf: 'flex-end' },
		heroMascot: { width: scaledSize(164), height: scaledSize(164) },
		heroTitle: { fontSize: Typography.h1, fontWeight: FontWeight.bold, color: Colors.textStrong },
		heroSub: { fontSize: Typography.bodySm, color: Colors.textSecondary, textAlign: 'center' },

		ruleRow: { flexDirection: 'row', gap: Spacing.sm },
		rule: {
			flex: 1,
			alignItems: 'center',
			gap: scaleHeight(2),
			paddingVertical: SpacingV.md,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surfaceAlt,
		},
		ruleValue: { fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.textStrong },
		ruleLabel: { fontSize: Typography.caption, color: Colors.textSecondary },

		card: {
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			padding: Spacing.lg,
			gap: SpacingV.sm,
			...Shadow.card,
		},
		cardTitle: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong, marginBottom: SpacingV.xs },
		bandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
		bandIcon: {
			width: scaledSize(34),
			height: scaledSize(34),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.surfaceAlt,
		},
		bandFloor: { flex: 1, fontSize: Typography.bodySm, color: Colors.text },
		bandLevel: { fontSize: Typography.bodySm, color: Colors.textSecondary },
		note: { fontSize: Typography.footnote, color: Colors.textSecondary, lineHeight: scaledSize(18), marginTop: SpacingV.xs },

		footer: { paddingHorizontal: Spacing.lg, paddingBottom: SpacingV.sm },
		primary: {
			minHeight: scaledSize(50),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.primary, paddingVertical: SpacingV.sm, },
		primaryText: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textInverse, flexShrink: 1, textAlign: 'center', },
	});

export default WorldTowerScreen;
