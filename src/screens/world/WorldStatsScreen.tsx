import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { useWorldGuide } from './common/WorldGuide';
import WeeklyReportCard from '@/src/screens/life/common/WeeklyReportCard';
import AttendanceHeatmap from './common/AttendanceHeatmap';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { useScreenEnter } from '@/src/hooks/useAnimationRunner';
import { FontWeight, Layout, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { useCategoryProgress, useLife, useStreak } from '@/src/hooks/useLife';
import { scaledSize, scaleHeight } from '@/src/utils';

const STATS_HERO = require('@/src/assets/illustrations/lion-stats-progress.webp');

/**
 * 통계 — 지금까지 쌓인 것을 한 화면에.
 *
 * 값은 전부 redux 한 곳에서 읽는다. 예전 통계 화면은 이식 화면의 저장소를 따로 읽어
 * **같은 기록이 화면마다 다른 숫자로** 보였다.
 */
const WorldStatsScreen = () => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const enterStyle = useScreenEnter();
	const life = useLife();
	const progress = useCategoryProgress();
	const { streak } = useStreak();
	const { button, guide } = useWorldGuide('world-stats', [
		t('stats.guide.line1'),
		t('stats.guide.line2'),
		t('stats.guide.line3'),
	]);

	const summary = useMemo(() => {
		const total = progress.reduce((sum, item) => sum + item.total, 0);
		const learned = progress.reduce((sum, item) => sum + item.learned, 0);
		const records = life.records ?? [];
		const asked = records.reduce((sum, item) => sum + item.total, 0);
		const hit = records.reduce((sum, item) => sum + item.correct, 0);
		return {
			total,
			learned,
			percent: total ? Math.round((learned / total) * 100) : 0,
			plays: records.length,
			rate: asked ? Math.round((hit / asked) * 100) : 0,
			stars: progress.reduce((sum, item) => sum + item.stars, 0),
			starTotal: progress.length * 3,
		};
	}, [progress, life.records]);

	const tiles = [
		{ key: 'learned', icon: 'book-check-outline', label: t('stats.tile.learned'), value: `${summary.learned}`, sub: `/ ${summary.total}` },
		{ key: 'plays', icon: 'help-circle-outline', label: t('stats.tile.plays'), value: `${summary.plays}`, sub: t('stats.tile.playsUnit') },
		{ key: 'rate', icon: 'target', label: t('stats.tile.rate'), value: `${summary.rate}`, sub: '%' },
		{ key: 'wrong', icon: 'notebook-edit-outline', label: t('stats.tile.wrong'), value: `${life.wrong.length}`, sub: t('stats.tile.wrongUnit') },
		{ key: 'attendance', icon: 'calendar-check', label: t('stats.tile.attendance'), value: `${life.attendance.length}`, sub: t('stats.tile.attendanceSub', { streak }) },
		{ key: 'stars', icon: 'star-outline', label: t('stats.tile.stars'), value: `${summary.stars}`, sub: `/ ${summary.starTotal}` },
		{ key: 'bestTime', icon: 'timer-outline', label: t('stats.tile.bestTime'), value: `${life.bestTime ?? 0}`, sub: t('stats.tile.bestTimeUnit') },
		{ key: 'bestTower', icon: 'stairs-up', label: t('stats.tile.bestTower'), value: `${life.bestTower ?? 0}`, sub: t('stats.tile.bestTowerUnit') },
	];

	const progressHero = useMemo(() => {
		if (summary.percent >= 100) {
			return { title: t('stats.note.doneTitle'), body: t('stats.note.doneBody') };
		}
		if (streak >= 3) {
			return { title: t('stats.note.streakTitle', { days: streak }), body: t('stats.note.streakBody') };
		}
		if (summary.learned === 0 && summary.plays === 0) {
			return { title: t('stats.note.emptyTitle'), body: t('stats.note.emptyBody') };
		}
		const milestone = [75, 50, 25].find((value) => summary.percent >= value && summary.percent < value + 5);
		return milestone
			? { title: t('stats.note.milestoneTitle', { percent: milestone }), body: t('stats.note.milestoneBody') }
			: null;
	}, [streak, summary.learned, summary.percent, summary.plays, t]);

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<Animated.View style={[styles.stack, enterStyle]}>
					<View style={styles.header}>
						<View style={styles.headerText}>
							<Text style={styles.title}>{t('stats.title')}</Text>
							<Text style={styles.subtitle}>{t('stats.subtitle', { percent: summary.percent })}</Text>
						</View>
						{button}
					</View>

					<View style={styles.track}>
						<View style={[styles.fill, { width: `${summary.percent}%` }]} />
					</View>

					{progressHero ? (
						<View style={styles.progressHero}>
							<View style={styles.progressHeroCopy}>
								<Text style={styles.progressHeroTitle}>{progressHero.title}</Text>
								<Text style={styles.progressHeroBody}>{progressHero.body}</Text>
							</View>
							<Image source={STATS_HERO} style={styles.progressHeroImage} contentFit="contain" accessible={false} />
						</View>
					) : null}

					<View style={styles.tiles}>
						{tiles.map((tile) => (
							<View key={tile.key} style={styles.tile}>
								<IconComponent type="materialcommunityicons" name={tile.icon} size={19} color={Colors.primary} />
								<View style={styles.tileValueRow}>
									<Text style={styles.tileValue}>{tile.value}</Text>
									<Text style={styles.tileSub}>{tile.sub}</Text>
								</View>
								<Text style={styles.tileLabel}>{tile.label}</Text>
							</View>
						))}
					</View>

					{/* 이번 주 vs 지난주 — 누적 숫자만 보면 "요즘 하고 있나" 는 안 보인다 */}
					<WeeklyReportCard />

					{/* 출석은 "모두 몇 일" 보다 "띄엄띄엄인지 꾸준한지" 가 더 읽힌다 */}
					<AttendanceHeatmap attendance={life.attendance} />

					<View style={styles.card}>
						<Text style={styles.cardTitle}>{t('stats.byTopic')}</Text>
						{progress.map((item) => (
							<View key={item.category.key} style={styles.row}>
								<View style={[styles.rowIcon, { backgroundColor: Colors[item.category.tint] }]}>
									<IconComponent type="materialcommunityicons" name={item.category.icon} size={16} color={Colors[item.category.color]} />
								</View>
								<View style={styles.rowBody}>
									<View style={styles.rowHead}>
										<Text style={styles.rowLabel} numberOfLines={1}>
											{t(`topic.${item.category.key}.label`)}
										</Text>
										<Text style={styles.rowCount}>{`${item.learned} / ${item.total}`}</Text>
									</View>
									<View style={styles.rowTrack}>
										<View style={[styles.rowFill, { width: `${Math.round(item.ratio * 100)}%`, backgroundColor: Colors[item.category.color] }]} />
									</View>
								</View>
								<View style={styles.stars}>
									{[0, 1, 2].map((no) => (
										<IconComponent
											key={no}
											type="materialcommunityicons"
											name={no < item.stars ? 'star' : 'star-outline'}
											size={13}
											color={no < item.stars ? Colors.warning : Colors.borderStrong}
										/>
									))}
								</View>
							</View>
						))}
					</View>
				</Animated.View>
			</ScrollView>
			{guide}
		</SafeAreaView>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		safe: { flex: 1, backgroundColor: Colors.background },
		content: { ...Layout.column, paddingHorizontal: Spacing.lg, paddingTop: SpacingV.md, paddingBottom: SpacingV.xxl },
		stack: { gap: SpacingV.lg },

		header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
		headerText: { flex: 1, gap: SpacingV.xs },
		title: { fontSize: Typography.h2, fontWeight: FontWeight.bold, color: Colors.textStrong },
		subtitle: { fontSize: Typography.bodySm, color: Colors.textSecondary },
		track: { height: scaleHeight(8), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
		fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Colors.primary },
		progressHero: {
			minHeight: scaleHeight(104),
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			paddingLeft: Spacing.lg,
			paddingVertical: SpacingV.sm,
			paddingRight: Spacing.sm,
			borderTopWidth: scaledSize(2),
			borderTopColor: Colors.warning,
			borderRadius: Radius.xl,
			backgroundColor: Colors.primaryBg,
			overflow: 'hidden',
		},
		progressHeroCopy: { flex: 1, gap: SpacingV.xs },
		progressHeroTitle: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		progressHeroBody: { fontSize: Typography.footnote, lineHeight: scaledSize(17), color: Colors.textSecondary },
		progressHeroImage: { width: scaledSize(96), height: scaledSize(96), flexShrink: 0 },

		tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
		tile: {
			flexBasis: '47%',
			flexGrow: 1,
			gap: scaleHeight(4),
			padding: Spacing.md,
			borderRadius: Radius.lg,
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
		},
		tileValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: scaledSize(3) },
		tileValue: { fontSize: Typography.title, fontWeight: FontWeight.bold, color: Colors.textStrong },
		tileSub: { fontSize: Typography.caption, color: Colors.textSecondary },
		tileLabel: { fontSize: Typography.footnote, color: Colors.textSecondary },

		card: {
			borderRadius: Radius.xl,
			backgroundColor: Colors.surface,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: Colors.border,
			padding: Spacing.lg,
			gap: SpacingV.md,
			...Shadow.card,
		},
		cardTitle: { fontSize: Typography.callout, fontWeight: FontWeight.bold, color: Colors.textStrong },
		row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
		rowIcon: { width: scaledSize(32), height: scaledSize(32), borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
		rowBody: { flex: 1, gap: scaleHeight(4) },
		rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
		rowLabel: { flexShrink: 1, fontSize: Typography.bodySm, fontWeight: FontWeight.medium, color: Colors.text },
		rowCount: { fontSize: Typography.caption, color: Colors.textSecondary },
		rowTrack: { height: scaleHeight(5), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
		rowFill: { height: '100%', borderRadius: Radius.pill },
		stars: { flexDirection: 'row', gap: scaledSize(1) },
	});

export default WorldStatsScreen;
