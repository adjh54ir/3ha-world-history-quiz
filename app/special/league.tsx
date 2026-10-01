/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import CommonHeader from '@/src/screens/common/CommonHeader';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import ListSkeleton from '@/src/screens/common/atomic/ListSkeleton';
import Colors, { readableOn, withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, CardSurface, Layout, Border } from '@/src/const/ConstDesign';
import { scaleArt, scaledSize, scaleWidth } from '@/src/utils';
import LeagueService, { LeagueBoard } from '@/src/services/LeagueService';
import { FadeInUp } from '@/src/screens/common/anim/Motion';
import { Image as ExpoImage } from 'expo-image';
import { FEATURE_ILLUSTRATIONS } from '@/src/const/ConstFeatureIllustrationAssets';
import { themed } from '@/src/utils/ThemedStyles';
import ScrollTopButton, { useScrollTop } from '@/src/screens/common/atomic/ScrollTopButton';

/**
 * 주간 XP 리그 — 듀오링고식 승급/강등 리더보드
 */
const League = () => {
	const scrollTop = useScrollTop();
	const { t } = useTranslation();
	const [board, setBoard] = useState<LeagueBoard | null>(null);

	useFocusEffect(
		useCallback(() => {
			let alive = true;
			LeagueService.getBoard().then((b) => alive && setBoard(b));
			return () => {
				alive = false;
			};
		}, []),
	);

	// 리그 보드를 읽는 동안에도 헤더는 띄운다 (빈 화면이면 뒤로 갈 방법이 없다)
	if (!board) {
		return (
			<SafeAreaView style={styles.safe} edges={[]}>
				<CommonHeader title={t('special.league.title')} onBack={() => router.back()} />
				<ListSkeleton />
			</SafeAreaView>
		);
	}

	const total = board.entries.length;

	return (
		<SafeAreaView style={styles.safe} edges={[]}>
			<CommonHeader title={t('special.league.title')} onBack={() => router.back()} />

			<ScrollView ref={scrollTop.ref} onScroll={scrollTop.onScroll} scrollEventThrottle={16} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
			<FadeInUp>
				{/* 리그 배지 */}
				<View style={styles.badge}>
					<ExpoImage source={FEATURE_ILLUSTRATIONS.league} style={styles.badgeIllustration} contentFit="contain" accessible={false} />
					<Text style={styles.badgeName} numberOfLines={1} ellipsizeMode="tail">{t('special.league.leagueName', { name: board.league.name })}</Text>
					<Text style={styles.badgeSub}>{t('special.league.badgeSub', { days: board.daysLeft, rank: board.myRank })}</Text>
					<View style={[styles.myXpPill, { backgroundColor: withAlpha(board.league.color, '14') }]}>
						<IconComponent type="materialIcons" name="bolt" size={scaledSize(15)} color={board.league.color} />
						<Text style={[styles.myXpText, { color: Colors.textStrong }]}>{board.myXp} XP</Text>
					</View>
				</View>

				<View style={styles.legendRow}>
					{board.promoteCount > 0 && (
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
							<Text style={styles.legendText}>{t('special.league.promote', { count: board.promoteCount })}</Text>
						</View>
					)}
					{board.demoteCount > 0 && (
						<View style={styles.legendItem}>
							<View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
							<Text style={styles.legendText}>{t('special.league.demote', { count: board.demoteCount })}</Text>
						</View>
					)}
				</View>

				{/* 리더보드 */}
				<View style={styles.board}>
					{board.entries.map((e, i) => {
						const promote = e.rank <= board.promoteCount;
						const demote = e.rank > total - board.demoteCount;
						return (
							<View key={`${e.name}-${i}`}>
								<View style={[styles.row, e.isMe && styles.rowMe]}>
									<Text style={[styles.rank, promote && { color: Colors.success }, demote && { color: Colors.error }]}>{e.rank}</Text>
									<View style={[styles.avatar, { backgroundColor: e.isMe ? board.league.color : Colors.surfaceAlt }]}>
										<Text style={[styles.avatarText, { color: e.isMe ? readableOn(board.league.color) : Colors.textSecondary }]}>{e.name.charAt(0)}</Text>
									</View>
									<Text style={[styles.name, e.isMe && { fontWeight: '900', color: Colors.textStrong }]} numberOfLines={1} ellipsizeMode="tail">{e.isMe ? t('special.league.me') : e.name}</Text>
									<Text style={styles.xp}>{e.xp} XP</Text>
								</View>
								{board.promoteCount > 0 && e.rank === board.promoteCount && <View style={[styles.zoneLine, { borderColor: Colors.success }]}><Text style={[styles.zoneText, { color: Colors.success }]}>{t('special.league.promoteLine')}</Text></View>}
								{board.demoteCount > 0 && e.rank === total - board.demoteCount && <View style={[styles.zoneLine, { borderColor: Colors.error }]}><Text style={[styles.zoneText, { color: Colors.error }]}>{t('special.league.demoteLine')}</Text></View>}
							</View>
						);
					})}
				</View>

				<TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={() => router.push('/challenge' as never)}>
					<IconComponent type="materialIcons" name="bolt" size={scaledSize(20)} color={Colors.textInverse} />
					<Text style={styles.ctaText}>{t('special.league.cta')}</Text>
				</TouchableOpacity>
				<Text style={styles.note}>{t('special.league.note')}</Text>
			</FadeInUp>
			</ScrollView>
			{/* 긴 목록 — 우하단 맨 위로 버튼 */}
			<ScrollTopButton visible={scrollTop.visible} toTop={scrollTop.toTop} progress={scrollTop.progress} />
		</SafeAreaView>
	);
};

export default League;

const styles = themed(() => StyleSheet.create({
	safe: { flex: 1, backgroundColor: Colors.background },
	container: { paddingHorizontal: Layout.screenH, paddingTop: Layout.screenTop, paddingBottom: Layout.screenBottom },
	badge: { ...CardSurface, alignItems: 'center', borderRadius: Radius.xl, paddingVertical: SpacingV.xxl, paddingHorizontal: Spacing.xl, marginBottom: Layout.sectionGap },
	badgeIllustration: { width: scaleArt(152), height: scaleArt(132), marginBottom: SpacingV.sm },
	badgeName: { color: Colors.textStrong, fontSize: Typography.h2, fontWeight: '900' },
	badgeSub: { color: Colors.textSecondary, fontSize: Typography.body, marginTop: SpacingV.sm },
	myXpPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.sm, marginTop: SpacingV.lg },
	myXpText: { fontSize: Typography.callout, fontWeight: '900' },
	legendRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: SpacingV.md, paddingHorizontal: Spacing.xs },
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
	legendDot: { width: scaleWidth(9), height: scaleWidth(9), borderRadius: scaleWidth(5) },
	legendText: { fontSize: Typography.footnote, color: Colors.textSecondary, fontWeight: '700' },
	board: { ...CardSurface, borderRadius: Radius.lg, paddingVertical: SpacingV.xs },
	row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SpacingV.md, paddingHorizontal: Spacing.lg },
	rowMe: { backgroundColor: Colors.primaryBg },
	rank: { width: scaleWidth(28), fontSize: Typography.callout, fontWeight: '900', color: Colors.textSecondary },
	avatar: { width: scaleWidth(36), height: scaleWidth(36), borderRadius: Radius.pill, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
	avatarText: { fontSize: Typography.callout, fontWeight: '800' },
	name: { flex: 1, fontSize: Typography.callout, fontWeight: '600', color: Colors.text },
	xp: { fontSize: Typography.body, fontWeight: '800', color: Colors.textStrong },
	zoneLine: { borderTopWidth: Border.thin, borderStyle: 'dashed', marginHorizontal: Spacing.lg, marginVertical: SpacingV.xs, alignItems: 'flex-end' },
	zoneText: { fontSize: Typography.micro, fontWeight: '800', marginTop: SpacingV.xs },
	cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: SpacingV.lg, marginTop: Layout.sectionGap },
	ctaText: { flexShrink: 1, textAlign: 'center', color: Colors.textInverse, fontSize: Typography.callout, fontWeight: '800' },
	note: { fontSize: Typography.footnote, color: Colors.textMuted, textAlign: 'center', marginTop: SpacingV.md },
}));
