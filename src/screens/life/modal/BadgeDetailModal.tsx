import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppModal from '@/src/screens/common/atomic/AppModal';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import BadgeMedal from '@/src/screens/life/common/BadgeMedal';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { badgeRarity } from '@/src/const/data/life/ConstLifeRewards';
import type { LifeType } from '@/src/types/data/LifeType';
import { MODAL_MAX_WIDTH, scaleHeight, scaleWidth } from '@/src/utils';

/** 상세에 띄울 뱃지 한 개 — 획득 일시가 있으면 딴 뱃지다 */
export interface BadgeDetail {
	badge: LifeType.Badge;
	/** 획득 일시(ISO) — 없으면 아직 못 딴 뱃지 */
	at?: string;
}

/** 2026-03-04T... → 언어에 맞춘 날짜 (common.dateLong) */
const toDateLabel = (iso: string, t: TFunction) => {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return '';
	}
	return t('common.dateLong', { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
};

/**
 * 뱃지 상세 — 이름 · 설명 · 획득 조건 · 희귀도 네 가지를 칸을 나눠 보여 준다.
 * 목록에서는 메달 하나만 보이므로, 눌렀을 때 이 네 가지가 각자 자기 자리에서 읽히게 한다.
 */
const BadgeDetailModal = ({ detail, onClose }: { detail: BadgeDetail | null; onClose: () => void }) => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const pop = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!detail) {
			return;
		}
		pop.setValue(0);
		const enter = Animated.spring(pop, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true });
		enter.start();
		return () => enter.stop();
	}, [detail, pop]);

	if (!detail) {
		return null;
	}

	const { badge, at } = detail;
	const tier = badgeRarity(badge.rarity);
	const earned = !!at;

	return (
		<AppModal visible onClose={onClose}>
			<Animated.View style={[styles.card, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
				{/* 무대 — 희귀도 색으로 채운 머리판 위에 메달을 세운다 */}
				<LinearGradient colors={earned ? tier.gradient : [Colors.surfaceAlt, Colors.border]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stage}>
					<View style={styles.stageTopRow}>
						<View style={[styles.rarityPill, !earned && styles.rarityPillLocked]}>
							<Text style={[styles.rarityPillText, !earned && styles.lockedText]}>{t(`badge.rarity.${badge.rarity}`)}</Text>
							<View style={styles.pillStars}>
								{Array.from({ length: 4 }).map((_, index) => (
									<IconComponent
										key={index}
										type="materialCommunityIcons"
										name={index < tier.stars ? 'star' : 'star-outline'}
										size={10}
										color={earned ? '#FFFFFF' : Colors.textMuted}
									/>
								))}
							</View>
						</View>
						<PressableScale style={styles.close} onPress={onClose} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.close')}>
							<IconComponent type="materialCommunityIcons" name="close" size={16} color={earned ? '#FFFFFF' : Colors.textSecondary} />
						</PressableScale>
					</View>

					<BadgeMedal badge={badge} size={scaleWidth(96)} earned={earned} glow />

					<Text style={[styles.name, !earned && styles.lockedText]} numberOfLines={2}>
						{t(`badge.${badge.id}.label`)}
					</Text>
					<Text style={[styles.desc, !earned && styles.lockedText]} numberOfLines={2}>
						{t(`badge.${badge.id}.description`)}
					</Text>
				</LinearGradient>

				<View style={styles.body}>
					<View style={styles.factRow}>
						<View style={[styles.factIcon, { backgroundColor: tier.soft }]}>
							<IconComponent type="materialCommunityIcons" name="flag-checkered" size={16} color={tier.color} />
						</View>
						<View style={styles.factText}>
							<Text style={styles.factLabel}>{t('badge.requirementLabel')}</Text>
							<Text style={styles.factValue}>{t(`badge.${badge.id}.requirement`)}</Text>
						</View>
					</View>

					<View style={styles.factRow}>
						<View style={[styles.factIcon, { backgroundColor: earned ? Colors.successSoft : Colors.surfaceAlt }]}>
							<IconComponent
								type="materialCommunityIcons"
								name={earned ? 'check-decagram' : 'lock-outline'}
								size={16}
								color={earned ? Colors.success : Colors.textMuted}
							/>
						</View>
						<View style={styles.factText}>
							<Text style={styles.factLabel}>{t(earned ? 'badge.earnedOn' : 'badge.notYet')}</Text>
							<Text style={styles.factValue}>{earned ? toDateLabel(at as string, t) : t('badge.autoGrant')}</Text>
						</View>
					</View>
				</View>

				<PressableScale style={styles.button} onPress={onClose} scaleTo={0.96} accessibilityRole="button">
					<Text style={styles.buttonText}>{t('common.close')}</Text>
				</PressableScale>
			</Animated.View>
		</AppModal>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		card: {
			width: '100%',
			maxWidth: MODAL_MAX_WIDTH,
			alignSelf: 'center',
			borderRadius: Radius.xl,
			overflow: 'hidden',
			backgroundColor: Colors.surface,
			...Shadow.floating,
		},
		stage: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: SpacingV.xl, paddingTop: SpacingV.md },
		stageTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: SpacingV.sm },
		rarityPill: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			paddingHorizontal: Spacing.md,
			height: scaleHeight(24),
			borderRadius: Radius.pill,
			backgroundColor: 'rgba(0,0,0,0.22)',
		},
		rarityPillLocked: { backgroundColor: Colors.surface },
		rarityPillText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: '#FFFFFF', flexShrink: 1, textAlign: 'center', },
		pillStars: { flexDirection: 'row', gap: scaleWidth(1) },
		close: {
			width: scaleWidth(30),
			height: scaleWidth(30),
			borderRadius: Radius.pill,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: 'rgba(0,0,0,0.18)',
		},
		name: { marginTop: SpacingV.md, fontSize: Typography.h2, fontWeight: FontWeight.heavy, color: '#FFFFFF', textAlign: 'center' },
		desc: { marginTop: SpacingV.xs, fontSize: Typography.bodySm, color: 'rgba(255,255,255,0.92)', textAlign: 'center' },
		lockedText: { color: Colors.textSecondary },

		body: { paddingHorizontal: Spacing.xl, paddingTop: SpacingV.lg, gap: SpacingV.md },
		factRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
		factIcon: { width: scaleWidth(36), height: scaleWidth(36), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
		factText: { flex: 1, gap: scaleHeight(2) },
		factLabel: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textMuted },
		factValue: { fontSize: Typography.bodySm, fontWeight: FontWeight.semibold, color: Colors.textStrong },

		button: {
			alignItems: 'center',
			justifyContent: 'center',
			marginHorizontal: Spacing.xl,
			marginTop: SpacingV.lg,
			marginBottom: SpacingV.xl,
			minHeight: scaleHeight(48),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primary, paddingVertical: SpacingV.sm, },
		buttonText: { fontSize: Typography.callout, fontWeight: FontWeight.heavy, color: Colors.textInverse, flexShrink: 1, textAlign: 'center', },
	});

export default BadgeDetailModal;
