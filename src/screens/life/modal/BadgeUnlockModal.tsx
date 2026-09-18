import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AppModal from '@/src/screens/common/atomic/AppModal';
import PressableScale from '@/src/screens/common/atomic/PressableScale';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import Confetti from '@/src/four/components/Confetti';
import { Palette } from '@/src/const/ConstColors';
import { useColors, useThemedStyles } from '@/src/hooks/useTheme';
import { FontWeight, Radius, Shadow, Spacing, SpacingV, Typography } from '@/src/const/ConstDesign';
import { BADGES, badgeRarity } from '@/src/const/data/life/ConstLifeRewards';
import type { LifeType } from '@/src/types/data/LifeType';
import { MODAL_MAX_WIDTH, scaleHeight, scaleWidth } from '@/src/utils';

const BADGE_MASCOT = require('@/src/assets/illustrations/lion-result-great.webp');

/** 무대 뒤에서 도는 빛줄기 개수 — 홀수라야 회전이 대칭으로 겹쳐 보이지 않는다 */
const RAY_COUNT = 9;

interface Props {
	/** 이번에 딴 뱃지 (첫 번째가 무대에 오른다) */
	badges: LifeType.Badge[];
	/** 지금까지 모은 뱃지 수 — "N / M" 진열장 느낌을 낸다 */
	owned: number;
	onClose: () => void;
}

/**
 * 새 뱃지 획득 — 게임의 보상 연출을 그대로 가져온다.
 * -------------------------------------------------
 * 토스트로 스쳐 지나가면 "뭘 땄는지" 가 남지 않는다. 무대를 하나 세우고
 * 메달을 크게 띄운 뒤(빛줄기 · 후광 · 하이라이트 스윕 · 컨페티) 눌러서 받게 한다.
 * 같은 순간에 여러 개를 따면 나머지는 아래 목록으로 이어 붙인다.
 */
const BadgeUnlockModal = ({ badges, owned, onClose }: Props) => {
	const { t } = useTranslation();
	const Colors = useColors();
	const styles = useThemedStyles(createStyles);
	const [hero, ...rest] = badges;
	/** 무대 색·별 개수는 희귀도가 정한다 — 전설 뱃지와 일반 뱃지가 같은 금색이면 등급이 안 읽힌다 */
	const tier = badgeRarity(hero?.rarity);

	const pop = useRef(new Animated.Value(0)).current;
	const spin = useRef(new Animated.Value(0)).current;
	const glow = useRef(new Animated.Value(0)).current;
	const shine = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (!hero) {
			return;
		}
		pop.setValue(0);
		spin.setValue(0);
		glow.setValue(0);
		shine.setValue(0);
		const enter = Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true });
		const rays = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
		const breathe = Animated.loop(
			Animated.sequence([
				Animated.timing(glow, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
				Animated.timing(glow, { toValue: 0, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
			]),
		);
		// 메달 위로 하이라이트가 한 번씩 지나간다 — 금속처럼 보이게 하는 최소한의 장치
		const sweep = Animated.loop(
			Animated.sequence([
				Animated.timing(shine, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
				Animated.delay(1500),
			]),
		);
		enter.start();
		rays.start();
		breathe.start();
		sweep.start();
		return () => {
			enter.stop();
			rays.stop();
			breathe.stop();
			sweep.stop();
		};
	}, [glow, hero, pop, shine, spin]);

	const handleClose = useCallback(() => onClose(), [onClose]);

	if (!hero) {
		return null;
	}

	return (
		<AppModal visible onClose={handleClose}>
			<Confetti
				count={100}
				origin={{ x: Dimensions.get('window').width / 2, y: 0 }}
				fadeOut
				explosionSpeed={400}
				fallSpeed={2600}
				colors={[Colors.accentAmber, Colors.primary, Colors.secondary, Colors.success]}
			/>

			<Animated.View
				style={[styles.card, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }] }]}>
				{/* ── 무대 : 금빛 판 위에 메달 하나 ── */}
				<LinearGradient colors={tier.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stage}>
					<Animated.View
						pointerEvents="none"
						style={[styles.rays, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
						{Array.from({ length: RAY_COUNT }).map((_, at) => (
							<View key={at} style={[styles.ray, { transform: [{ rotate: `${(180 / RAY_COUNT) * at}deg` }] }]} />
						))}
					</Animated.View>

					<View style={styles.eyebrow}>
						<IconComponent type="materialCommunityIcons" name="shimmer" size={13} color="#FFFFFF" />
						<Text style={styles.eyebrowText}>NEW BADGE</Text>
					</View>
					<Text style={styles.stageTitle}>{t('badge.unlockTitle')}</Text>

					<View style={styles.medalStage}>
						<Animated.View
							pointerEvents="none"
							style={[
								styles.medalGlow,
								{
									opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.08] }),
									transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.24] }) }],
								},
							]}
						/>
						<View style={styles.medalRing}>
							<View style={styles.medalInner}>
								<IconComponent type="materialCommunityIcons" name={hero.icon} size={44} color={tier.color} />
							</View>
							<Animated.View
								pointerEvents="none"
								style={[
									styles.medalShine,
									{
										opacity: shine.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.5, 0.5, 0] }),
										transform: [
											{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [scaleWidth(-100), scaleWidth(100)] }) },
											{ rotate: '18deg' },
										],
									},
								]}
							/>
						</View>
						{/* 축하하는 사자 — 메달 옆에 붙어 "누가 준 상인지"를 만든다 */}
						<Image source={BADGE_MASCOT} style={styles.mascot} contentFit="contain" accessible={false} />
					</View>

					{/* 희귀도 — 등급 이름과 별 개수를 한 줄로. 이름보다 먼저 읽혀 "얼마나 귀한 것인지" 가 잡힌다 */}
					<View style={styles.rarityChip}>
						<Text style={styles.rarityText}>{t(`badge.rarity.${hero.rarity}`)}</Text>
						<View style={styles.rarityStars}>
							{Array.from({ length: 4 }).map((_, at) => (
								<IconComponent
									key={at}
									type="materialCommunityIcons"
									name={at < tier.stars ? 'star' : 'star-outline'}
									size={11}
									color={at < tier.stars ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
								/>
							))}
						</View>
					</View>

					<Text style={styles.heroName} numberOfLines={2}>
						{t(`badge.${hero.id}.label`)}
					</Text>
					<Text style={styles.heroDesc} numberOfLines={2}>
						{t(`badge.${hero.id}.description`)}
					</Text>

					{/* 획득 조건 — 설명과 나눠 둔다. 무슨 뱃지인지와 무엇을 해서 받았는지는 다른 이야기다 */}
					<View style={styles.conditionRow}>
						<IconComponent type="materialCommunityIcons" name="flag-checkered" size={12} color="#FFFFFF" />
						<Text style={styles.conditionText} numberOfLines={2}>
							{t(`badge.${hero.id}.requirement`)}
						</Text>
					</View>

					<View style={styles.progressChip}>
						<IconComponent type="materialCommunityIcons" name="trophy-variant" size={12} color="#FFFFFF" />
						<Text style={styles.progressText}>{t('badge.owned', { owned, total: BADGES.length })}</Text>
					</View>
				</LinearGradient>

				{/* ── 같이 딴 나머지 ── */}
				{rest.length > 0 && (
					<View style={styles.restBox}>
						<Text style={styles.restTitle}>{t('badge.alsoEarned', { n: rest.length })}</Text>
						<ScrollView style={styles.restScroll} contentContainerStyle={styles.restBody} showsVerticalScrollIndicator={false}>
							{rest.map((badge) => {
								const restTier = badgeRarity(badge.rarity);
								return (
									<View key={badge.id} style={styles.restRow}>
										<View style={[styles.restIcon, { backgroundColor: restTier.soft }]}>
											<IconComponent type="materialCommunityIcons" name={badge.icon} size={18} color={restTier.color} />
										</View>
										<View style={styles.restText}>
											<Text style={styles.restName} numberOfLines={1}>
												{t(`badge.${badge.id}.label`)}
											</Text>
											<Text style={styles.restDesc} numberOfLines={1}>
												{t(`badge.${badge.id}.requirement`)}
											</Text>
										</View>
										<Text style={[styles.restRarity, { color: restTier.color }]}>{t(`badge.rarity.${badge.rarity}`)}</Text>
									</View>
								);
							})}
						</ScrollView>
					</View>
				)}

				<PressableScale style={styles.button} onPress={handleClose} scaleTo={0.96} accessibilityRole="button">
					<Text style={styles.buttonText}>{t('badge.unlockConfirm')}</Text>
					<IconComponent type="materialCommunityIcons" name="chevron-right" size={18} color={Colors.textInverse} />
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
			backgroundColor: Colors.surface,
			overflow: 'hidden',
			...Shadow.floating,
		},

		stage: { alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xl, overflow: 'hidden' },
		rays: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
		ray: { position: 'absolute', width: scaleWidth(520), height: scaleHeight(12), backgroundColor: 'rgba(255,255,255,0.12)' },

		eyebrow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
		eyebrowText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: '#FFFFFF', letterSpacing: scaleWidth(1.6) },
		stageTitle: { marginTop: SpacingV.xs, fontSize: Typography.title, fontWeight: FontWeight.heavy, color: '#FFFFFF', textAlign: 'center' },

		medalStage: { width: scaleWidth(150), height: scaleWidth(130), marginTop: SpacingV.md, alignItems: 'center', justifyContent: 'center' },
		medalGlow: { position: 'absolute', width: scaleWidth(128), height: scaleWidth(128), borderRadius: scaleWidth(64), backgroundColor: '#FFFFFF' },
		medalRing: {
			width: scaleWidth(106),
			height: scaleWidth(106),
			borderRadius: scaleWidth(53),
			backgroundColor: 'rgba(255,255,255,0.30)',
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
		},
		medalInner: {
			width: scaleWidth(86),
			height: scaleWidth(86),
			borderRadius: scaleWidth(43),
			backgroundColor: Colors.surface,
			alignItems: 'center',
			justifyContent: 'center',
		},
		medalShine: { position: 'absolute', top: scaleWidth(-28), width: scaleWidth(24), height: scaleWidth(164), backgroundColor: '#FFFFFF' },
		// 메달 오른쪽 아래에 살짝 걸치게 둔다 — 무대 폭을 넓히지 않으면서 캐릭터가 보인다
		mascot: { position: 'absolute', right: 0, bottom: -scaleHeight(6), width: scaleWidth(58), height: scaleWidth(58) },

		rarityChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.sm,
			marginTop: SpacingV.md,
			paddingHorizontal: Spacing.md,
			height: scaleHeight(24),
			borderRadius: Radius.pill,
			backgroundColor: 'rgba(0,0,0,0.22)',
		},
		rarityText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: '#FFFFFF', letterSpacing: scaleWidth(0.5), flexShrink: 1, textAlign: 'center', },
		rarityStars: { flexDirection: 'row', gap: scaleWidth(1) },
		conditionRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			marginTop: SpacingV.sm,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.xs,
			borderRadius: Radius.md,
			backgroundColor: 'rgba(0,0,0,0.16)',
		},
		conditionText: { flexShrink: 1, fontSize: Typography.caption, fontWeight: FontWeight.bold, color: '#FFFFFF' },
		heroName: { marginTop: SpacingV.sm, fontSize: Typography.h2, fontWeight: FontWeight.heavy, color: '#FFFFFF', textAlign: 'center' },
		heroDesc: { marginTop: SpacingV.xs, fontSize: Typography.bodySm, color: 'rgba(255,255,255,0.92)', textAlign: 'center' },
		progressChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			marginTop: SpacingV.md,
			paddingHorizontal: Spacing.md,
			height: scaleHeight(26),
			borderRadius: Radius.pill,
			backgroundColor: 'rgba(0,0,0,0.18)',
		},
		progressText: { fontSize: Typography.caption, fontWeight: FontWeight.bold, color: '#FFFFFF' },

		restBox: { paddingHorizontal: Spacing.xl, paddingTop: SpacingV.lg, gap: SpacingV.sm },
		restTitle: { fontSize: Typography.footnote, fontWeight: FontWeight.heavy, color: Colors.textSecondary },
		restScroll: { maxHeight: scaleHeight(150) },
		restBody: { gap: SpacingV.sm },
		restRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
		restIcon: {
			width: scaleWidth(36),
			height: scaleWidth(36),
			borderRadius: scaleWidth(18),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: Colors.accentAmberSoft,
		},
		restText: { flex: 1, gap: scaleHeight(2) },
		restName: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		restDesc: { fontSize: Typography.caption, color: Colors.textSecondary },
		restRarity: { fontSize: Typography.caption, fontWeight: FontWeight.heavy },

		button: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xs,
			marginHorizontal: Spacing.xl,
			marginTop: SpacingV.lg,
			marginBottom: SpacingV.xl,
			minHeight: scaleHeight(50),
			borderRadius: Radius.pill,
			backgroundColor: Colors.primary, paddingVertical: SpacingV.sm, },
		buttonText: { fontSize: Typography.subtitle, fontWeight: FontWeight.heavy, color: Colors.textInverse, flexShrink: 1, textAlign: 'center', },
	});

export default BadgeUnlockModal;
