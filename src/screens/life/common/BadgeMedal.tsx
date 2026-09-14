import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { Palette } from '@/src/const/ConstColors';
import { useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Typography } from '@/src/const/ConstDesign';
import { badgeRarity } from '@/src/const/data/life/ConstLifeRewards';
import type { LifeType } from '@/src/types/data/LifeType';
import { scaleWidth } from '@/src/utils';

interface Props {
	badge: LifeType.Badge;
	/** 한 변(px) */
	size: number;
	/** 아직 못 딴 뱃지는 회색 실루엣으로 잠가 둔다 */
	earned?: boolean;
	/** 희귀도 별을 아래에 붙일지 */
	showStars?: boolean;
	/** 후광이 숨 쉬듯 돈다 — 획득 연출·상세처럼 크게 보여 주는 자리에서만 켠다 */
	glow?: boolean;
}

/**
 * 뱃지 한 개의 생김새 — 홈·나의 활동·상세가 모두 이 한 벌을 쓴다.
 * -------------------------------------------------
 * 아이콘만 덩그러니 두면 스무 개가 전부 같은 무게로 보인다. 희귀도 색으로 채운 판 위에
 * 흰 원을 얹어 메달 모양을 만들고, 등급은 색과 별 개수 두 가지로 동시에 읽히게 한다.
 * 못 딴 뱃지는 같은 자리·같은 크기로 회색만 남겨 "몇 개가 남았는지" 가 빈칸으로 보인다.
 */
const BadgeMedal = ({ badge, size, earned = true, showStars = false, glow = false }: Props) => {
	const styles = useThemedStyles(createStyles);
	const tier = badgeRarity(badge.rarity);
	const breathe = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!glow || !earned) {
			return;
		}
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(breathe, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
				Animated.timing(breathe, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [breathe, earned, glow]);

	const inner = size * 0.72;

	return (
		<View style={[styles.wrap, { width: size }]}>
			<View style={{ width: size, height: size }}>
				{glow && earned && (
					<Animated.View
						pointerEvents="none"
						style={[
							styles.glow,
							{
								width: size * 1.35,
								height: size * 1.35,
								borderRadius: size,
								left: -size * 0.175,
								top: -size * 0.175,
								backgroundColor: tier.color,
								opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.06] }),
								transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) }],
							},
						]}
					/>
				)}
				{earned ? (
					<LinearGradient colors={tier.gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.plate, { width: size, height: size, borderRadius: size * 0.34 }]}>
						<View style={[styles.core, { width: inner, height: inner, borderRadius: inner / 2 }]}>
							<IconComponent type="materialCommunityIcons" name={badge.icon} size={Math.round(inner * 0.56)} color={tier.color} />
						</View>
					</LinearGradient>
				) : (
					<View style={[styles.plate, styles.plateLocked, { width: size, height: size, borderRadius: size * 0.34 }]}>
						<View style={[styles.core, styles.coreLocked, { width: inner, height: inner, borderRadius: inner / 2 }]}>
							<IconComponent type="materialCommunityIcons" name={badge.icon} size={Math.round(inner * 0.56)} color={styles.lockedInk.color} />
						</View>
					</View>
				)}
			</View>

			{showStars && (
				<View style={styles.starRow}>
					{Array.from({ length: tier.stars }).map((_, at) => (
						<IconComponent key={at} type="materialCommunityIcons" name="star" size={Math.max(8, Math.round(size * 0.16))} color={earned ? tier.color : styles.lockedInk.color} />
					))}
				</View>
			)}
		</View>
	);
};

/** 희귀도 이름 칩 — 목록·상세에서 등급을 글자로도 읽히게 한다 */
export const BadgeRarityChip = ({ rarity, muted = false }: { rarity?: LifeType.BadgeRarity; muted?: boolean }) => {
	const styles = useThemedStyles(createStyles);
	const tier = badgeRarity(rarity);
	return (
		<View style={[styles.rarityChip, { backgroundColor: muted ? undefined : tier.soft }, muted && styles.rarityChipMuted]}>
			<Text style={[styles.rarityText, { color: muted ? styles.lockedInk.color : tier.color }]}>{tier.label}</Text>
		</View>
	);
};

const createStyles = (Colors: Palette) =>
	StyleSheet.create({
		wrap: { alignItems: 'center', gap: scaleWidth(3) },
		glow: { position: 'absolute' },
		plate: { alignItems: 'center', justifyContent: 'center' },
		plateLocked: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
		core: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
		coreLocked: { backgroundColor: Colors.background },
		starRow: { flexDirection: 'row', gap: scaleWidth(1) },
		rarityChip: { paddingHorizontal: scaleWidth(8), paddingVertical: scaleWidth(2), borderRadius: Radius.pill },
		rarityChipMuted: { backgroundColor: Colors.surfaceAlt },
		rarityText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy },
		// 잠긴 뱃지의 잉크 — StyleSheet 에 담아 두면 컴포넌트에서 팔레트를 따로 안 받아도 된다
		lockedInk: { color: Colors.textMuted },
	});

export default BadgeMedal;
