import React, { useMemo } from 'react';
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
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const enterStyle = useScreenEnter();
	const life = useLife();
	const progress = useCategoryProgress();
	const { streak } = useStreak();
	const { button, guide } = useWorldGuide('world-stats', [
		'지금까지 쌓인 학습·퀴즈·출석 기록을 한 화면에서 봐요.',
		'이번 주 카드는 지난주와 견줘 얼마나 늘었는지 보여 줘요.',
		'주제별 별은 진도와 정답률을 함께 봐서 최대 세 개까지 붙어요.',
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
		{ icon: 'book-check-outline', label: '배운 항목', value: `${summary.learned}`, sub: `/ ${summary.total}` },
		{ icon: 'help-circle-outline', label: '푼 퀴즈', value: `${summary.plays}`, sub: '판' },
		{ icon: 'target', label: '정답률', value: `${summary.rate}`, sub: '%' },
		{ icon: 'notebook-edit-outline', label: '오답 노트', value: `${life.wrong.length}`, sub: '개' },
		{ icon: 'calendar-check', label: '출석', value: `${life.attendance.length}`, sub: `일 · 연속 ${streak}일` },
		{ icon: 'star-outline', label: '주제 별', value: `${summary.stars}`, sub: `/ ${summary.starTotal}` },
		{ icon: 'timer-outline', label: '타임 최고', value: `${life.bestTime ?? 0}`, sub: '점' },
		{ icon: 'stairs-up', label: '타워 최고', value: `${life.bestTower ?? 0}`, sub: '층' },
	];

	const progressHero = useMemo(() => {
		if (summary.percent >= 100) {
			return { title: '세계 지도를 완성했어요!', body: '모든 주제를 익힌 멋진 탐험 기록이에요.' };
		}
		if (streak >= 3) {
			return { title: `${streak}일째 이어가는 중`, body: '꾸준한 탐험이 세계 지식으로 쌓이고 있어요.' };
		}
		if (summary.learned === 0 && summary.plays === 0) {
			return { title: '첫 기록을 만들어 볼까요?', body: '학습이나 퀴즈를 시작하면 성장 기록이 여기에 쌓여요.' };
		}
		const milestone = [75, 50, 25].find((value) => summary.percent >= value && summary.percent < value + 5);
		return milestone ? { title: `전체 진도 ${milestone}% 돌파`, body: '탐험 일지가 차근차근 채워지고 있어요.' } : null;
	}, [streak, summary.learned, summary.percent, summary.plays]);

	return (
		<SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<Animated.View style={[styles.stack, enterStyle]}>
					<View style={styles.header}>
						<View style={styles.headerText}>
							<Text style={styles.title}>통계</Text>
							<Text style={styles.subtitle}>{`전체 진도 ${summary.percent}%`}</Text>
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
							<View key={tile.label} style={styles.tile}>
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
						<Text style={styles.cardTitle}>주제별 진도</Text>
						{progress.map((item) => (
							<View key={item.category.key} style={styles.row}>
								<View style={[styles.rowIcon, { backgroundColor: Colors[item.category.tint] }]}>
									<IconComponent type="materialcommunityicons" name={item.category.icon} size={16} color={Colors[item.category.color]} />
								</View>
								<View style={styles.rowBody}>
									<View style={styles.rowHead}>
										<Text style={styles.rowLabel} numberOfLines={1}>
											{item.category.label}
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
