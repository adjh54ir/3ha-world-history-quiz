/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import Colors, { readableOn, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Border, Tracking } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import { RankRow } from '@/src/services/RankingService';
import { themed } from '@/src/utils/ThemedStyles';

/** 1·2·3위 테마 (금·은·동) */
export const RANK_TIERS = themed(() => ([
	{ icon: 'emoji-events', main: Colors.goldDark, soft: Colors.bookmarkSoft, bar: [Colors.gold, Colors.amber] as [string, string], h: 104 },
	{ icon: 'military-tech', main: Colors.secondary, soft: Colors.secondarySoft, bar: [Colors.secondaryLight, Colors.silver] as [string, string], h: 78 },
	{ icon: 'workspace-premium', main: Colors.goldDeep, soft: Colors.goldBg, bar: [Colors.goldDark, Colors.goldDeep] as [string, string], h: 62 },
]));

/**
 * TOP 3 시상대 — 랭킹 화면과 챌린지(타임챌린지) 탭에서 공용으로 사용
 * - rows 는 1위부터 정렬된 배열(3개 미만이면 빈 자리로 표시)
 */
export const RankPodium: React.FC<{ rows: RankRow[]; unit?: string; compact?: boolean }> = ({ rows, unit: unitProp, compact = false }) => {
	const { t } = useTranslation();
	const unit = unitProp ?? t('rankBoard.unit');
	const pulse = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
				Animated.timing(pulse, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [pulse]);

	return (
		<View style={styles.podiumCard}>
			<View style={styles.podiumHead}>
				<IconComponent type="materialIcons" name="military-tech" size={scaledSize(16)} color={Colors.primary} />
				<Text style={styles.podiumHeadText}>TOP 3</Text>
			</View>
			<View style={styles.podiumWrap}>
				<PodiumCol row={rows[1]} place={2} compact={compact} pulse={pulse} unit={unit} />
				<PodiumCol row={rows[0]} place={1} compact={compact} pulse={pulse} unit={unit} />
				<PodiumCol row={rows[2]} place={3} compact={compact} pulse={pulse} unit={unit} />
			</View>
		</View>
	);
};

/** RankPodium 렌더마다 새로 정의하면 매번 리마운트되어 크라운 애니메이션이 끊긴다 — 컴포넌트 밖으로 분리 */
const PodiumCol: React.FC<{ row?: RankRow; place: 1 | 2 | 3; compact: boolean; pulse: Animated.Value; unit: string }> = ({ row, place, compact, pulse, unit }) => {
	const { t } = useTranslation();
	const tier = RANK_TIERS[place - 1];
	const barHeight = compact ? tier.h * 0.72 : tier.h;
	return (
		<View style={styles.podiumCol}>
			{place === 1 && (
				<Animated.View style={[styles.crown, { transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -scaleHeight(5)] }) }] }]}>
					<IconComponent type="fontAwesome6" name="crown" size={scaledSize(18)} color={Colors.amber} />
				</Animated.View>
			)}
			<View style={[styles.avatarRing, { borderColor: tier.main, backgroundColor: tier.soft }]}>
				<IconComponent type="materialIcons" name={tier.icon} size={scaledSize(26)} color={tier.main} />
			</View>
			<Text style={[styles.podiumNick, row?.isMe && { color: Colors.primary, fontWeight: '900' }]} numberOfLines={1}>
				{row ? `${row.nickname}${row.isMe ? t('rankBoard.meSuffix') : ''}` : t('rankBoard.empty')}
			</Text>
			<Text style={[styles.podiumScore, { color: tier.main }]}>{row ? `${row.score.toLocaleString()}${unit}` : '-'}</Text>
			<LinearGradient colors={tier.bar} style={[styles.podiumBar, { height: scaleHeight(barHeight) }]}>
				<Text style={[styles.podiumPlace, { color: readableOn(tier.bar[0]) }]}>{place}</Text>
				{!!row && <Text style={[styles.podiumPlaceSub, { color: readableOn(tier.bar[0]) }]} numberOfLines={2} ellipsizeMode="tail">{place === 1 ? 'CHAMPION' : place === 2 ? 'RUNNER-UP' : 'THIRD'}</Text>}
			</LinearGradient>
		</View>
	);
};

/** 순위 행 (전체 목록 — 1위부터) */
export const RankRowItem: React.FC<{ item: RankRow; index: number; unit?: string }> = ({ item, index, unit: unitProp }) => {
	const { t } = useTranslation();
	const unit = unitProp ?? t('rankBoard.unit');
	const tier = item.rank <= 3 ? RANK_TIERS[item.rank - 1] : null;
	return (
		<FadeInUp delay={Math.min(index, 10) * 35}>
			<View style={[styles.row, !!tier && { borderColor: withAlpha(tier.main, '66') }, item.isMe && styles.rowMe]}>
				{!!tier && <LinearGradient colors={[withAlpha(tier.main, '14'), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
				<View style={[styles.rankBadge, tier ? { backgroundColor: tier.main } : item.isMe ? { backgroundColor: Colors.primary } : null]}>
					{tier ? <IconComponent type="materialIcons" name={tier.icon} size={scaledSize(18)} color={readableOn(tier.main)} /> : <Text style={[styles.rankText, item.isMe && { color: Colors.textInverse }]}>{item.rank}</Text>}
				</View>
				<View style={styles.rowBody}>
					<Text style={[styles.nick, item.isMe && { fontWeight: '900', color: Colors.primary }]} numberOfLines={1}>
						{item.nickname}{item.isMe ? t('rankBoard.meSuffix') : ''}
					</Text>
					{!!tier && <Text style={[styles.rowTierLabel, { color: tier.main }]} numberOfLines={1} ellipsizeMode="tail">{t('rankBoard.tierLabel', { rank: item.rank })}</Text>}
				</View>
				<Text style={[styles.score, !!tier && { color: tier.main }]}>{item.score.toLocaleString()}{unit}</Text>
			</View>
		</FadeInUp>
	);
};

const styles = themed(() => StyleSheet.create({
	// 시상대
	podiumCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, paddingTop: SpacingV.md, paddingBottom: 0, paddingHorizontal: Spacing.md, marginBottom: SpacingV.xl, overflow: 'hidden' },
	podiumHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginBottom: SpacingV.md },
	podiumHeadText: { fontSize: Typography.footnote, fontWeight: '900', color: Colors.textStrong, letterSpacing: 1 },
	podiumWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: Spacing.sm },
	podiumCol: { flex: 1, alignItems: 'center' },
	crown: { marginBottom: SpacingV.xxs },
	avatarRing: { width: scaleWidth(50), height: scaleWidth(50), borderRadius: Radius.pill, borderWidth: Border.heavy, alignItems: 'center', justifyContent: 'center' },
	podiumNick: { marginTop: SpacingV.xs, fontSize: Typography.footnote, fontWeight: '800', color: Colors.textStrong, textAlign: 'center' },
	podiumScore: { fontSize: Typography.footnote, fontWeight: '900', marginBottom: SpacingV.sm },
	podiumBar: { alignSelf: 'stretch', borderTopLeftRadius: Radius.md, borderTopRightRadius: Radius.md, alignItems: 'center', paddingTop: SpacingV.sm },
	podiumPlace: { fontSize: Typography.h2, fontWeight: '900', color: Colors.textInverse },
	podiumPlaceSub: { fontSize: Typography.micro, fontWeight: '900', color: Colors.onBrandText, letterSpacing: Tracking.normal, marginTop: SpacingV.xxs },
	// 순위 행
	row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: SpacingV.md, paddingHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: SpacingV.sm, overflow: 'hidden' },
	rowMe: { borderWidth: Border.heavy, borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
	rankBadge: { width: scaleWidth(34), height: scaleWidth(34), borderRadius: Radius.pill, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
	rankText: { fontSize: Typography.body, fontWeight: '900', color: Colors.textSecondary },
	rowBody: { flex: 1 },
	rowTierLabel: { fontSize: Typography.micro, fontWeight: '900', marginTop: SpacingV.xxs, letterSpacing: Tracking.tight },
	nick: { fontSize: Typography.body, fontWeight: '700', color: Colors.textStrong },
	score: { fontSize: Typography.callout, fontWeight: '900', color: Colors.success },
}));

export default { RankPodium, RankRowItem, RANK_TIERS };
