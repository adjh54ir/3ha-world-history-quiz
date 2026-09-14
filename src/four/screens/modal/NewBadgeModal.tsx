import React, { useEffect, useMemo, useRef } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, ScrollView, TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import useAnimationCleanup from '@/src/four/hooks/useAnimationCleanup';
import FastImage from '@/src/four/components/FastImage';
import Confetti from '@/src/four/components/Confetti';
import type { MainDataType } from '@/src/four/types/MainDataType';
import { BADGE_RARITY_META } from '@/src/four/const/ConstBadges';
import { MODAL_MAX_WIDTH, MODAL_STAGE_WIDTH, scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils/DementionUtils';
import IconComponent from '../common/atomic/IconComponent';
import { playComplete } from '@/src/four/utils/SoundUtils';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

interface Props {
	visible: boolean;
	badges: MainDataType.UserBadge[];
	onConfirm: () => void;
}

/** 희귀도 순서 — 큰 값일수록 위. 대표 뱃지(무대에 세울 하나)를 고를 때 쓴다 */
const RARITY_ORDER: Record<MainDataType.BadgeRarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** 무대 뒤에서 도는 빛줄기 개수 — 홀수로 두면 회전이 대칭으로 겹쳐 보이지 않는다 */
const RAY_COUNT = 9;

/**
 * 신규 뱃지 획득 공통 모달 (게임식 보상 연출)
 * -------------------------------------------------
 * - 대표 뱃지 하나를 무대에 크게 세우고 빛줄기·후광·컨페티로 "땄다"는 느낌을 준다.
 * - 같이 딴 나머지 뱃지는 아래에 작은 카드로 이어 붙인다.
 * - 여러 화면(퀴즈/오늘의 퀴즈 등)에서 동일한 스타일로 재사용한다.
 */
const NewBadgeModal = ({ visible, badges, onConfirm }: Props) => {
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const pulseAnim = useRef(new Animated.Value(0)).current;
	const spinAnim = useRef(new Animated.Value(0)).current;
	const shineAnim = useRef(new Animated.Value(0)).current;
	const confettiKey = useRef(0);
	const insets = useSafeAreaInsets();
	// 닫기 애니메이션의 완료 콜백(onConfirm)이 언마운트 후에 불리지 않도록 정리한다
	useAnimationCleanup(scaleAnim, pulseAnim, spinAnim, shineAnim);

	/** 무대에 세울 대표 뱃지 = 가장 희귀한 것. 나머지는 아래 목록으로 내려간다 */
	const [hero, rest] = useMemo(() => {
		const sorted = [...badges].sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0));
		return [sorted[0], sorted.slice(1)] as const;
	}, [badges]);

	const heroRarity = BADGE_RARITY_META[hero?.rarity] ?? BADGE_RARITY_META.common;

	useEffect(() => {
		if (!visible) {
			return;
		}
		confettiKey.current += 1;
		playComplete(); // 🏅 뱃지 획득 사운드
		scaleAnim.setValue(0);
		Animated.spring(scaleAnim, {
			toValue: 1,
			friction: 6,
			tension: 60,
			useNativeDriver: true,
		}).start();

		// 주목 유도 ① 메달 후광이 숨 쉬듯 커졌다 작아진다
		pulseAnim.setValue(0);
		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
				Animated.timing(pulseAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
			]),
		);
		pulse.start();

		// 주목 유도 ② 뒤쪽 빛줄기가 천천히 돈다 (게임 보상 연출의 기본형)
		spinAnim.setValue(0);
		const spin = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
		spin.start();

		// 주목 유도 ③ 메달 위로 하이라이트가 한 번씩 지나간다
		shineAnim.setValue(0);
		const shine = Animated.loop(
			Animated.sequence([
				Animated.timing(shineAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
				Animated.delay(1600),
			]),
		);
		shine.start();

		return () => {
			pulse.stop();
			spin.stop();
			shine.stop();
			pulseAnim.stopAnimation();
			spinAnim.stopAnimation();
			shineAnim.stopAnimation();
		};
	}, [visible, scaleAnim, pulseAnim, spinAnim, shineAnim]);

	const glowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] });
	const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.05] });
	const raySpin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
	const shineX = shineAnim.interpolate({ inputRange: [0, 1], outputRange: [scaleWidth(-110), scaleWidth(110)] });
	const shineOpacity = shineAnim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.55, 0.55, 0] });

	const handleConfirm = () => {
		Animated.timing(scaleAnim, {
			toValue: 0,
			duration: 200,
			useNativeDriver: true,
		}).start(({ finished }) => {
			// 정리(stopAnimation) 로 끊긴 경우엔 이미 닫히는 중이라 부모 콜백을 다시 부르지 않는다
			finished && onConfirm();
		});
	};

	if (!visible || !hero) {
		return null;
	}

	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={handleConfirm}>
			{/* AppModal 이 시스템 바 아래까지 덮으므로 카드가 상태바/제스처바에 가리지 않게 여백을 준다 */}
			<View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
				<Confetti key={confettiKey.current} count={100} origin={{ x: MODAL_STAGE_WIDTH / 2, y: 0 }} fadeOut autoStart explosionSpeed={350} />

				<Animated.View style={[styles.badgeModal, { transform: [{ scale: scaleAnim }] }]}>
					{/* ── 보상 무대 — 희귀도 색으로 물든 상단 판 ── */}
					<LinearGradient colors={heroRarity.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stage}>
						{/* 뒤에서 도는 빛줄기 */}
						<Animated.View style={[styles.rayStage, { transform: [{ rotate: raySpin }] }]} pointerEvents="none">
							{Array.from({ length: RAY_COUNT }).map((_, at) => (
								<View key={at} style={[styles.ray, { transform: [{ rotate: `${(180 / RAY_COUNT) * at}deg` }] }]} />
							))}
						</Animated.View>

						<View style={styles.eyebrowRow}>
							<IconComponent type="materialCommunityIcons" name="shimmer" size={scaledSize(13)} color={Colors.textInverse} />
							<Text style={styles.eyebrowText}>NEW BADGE</Text>
						</View>
						<Text style={styles.stageTitle}>새로운 뱃지 획득!</Text>

						{/* 메달 — 후광 + 하이라이트 스윕 */}
						<View style={styles.medalStage}>
							<Animated.View style={[styles.medalGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} pointerEvents="none" />
							<View style={styles.medalRing}>
								<View style={styles.medalInner}>
									{hero.mascotImage ? (
										<FastImage source={hero.mascotImage} style={styles.medalImage} resizeMode={FastImage.resizeMode.contain} />
									) : (
										<IconComponent type={hero.iconType} name={hero.icon} size={scaledSize(44)} color={heroRarity.color} />
									)}
								</View>
								<Animated.View style={[styles.medalShine, { opacity: shineOpacity, transform: [{ translateX: shineX }, { rotate: '18deg' }] }]} pointerEvents="none" />
							</View>
						</View>

						<Text style={styles.heroName} numberOfLines={2}>
							{hero.name}
						</Text>
						<View style={styles.heroMetaRow}>
							<View style={styles.heroRarityChip}>
								<Text style={styles.heroRarityText}>{heroRarity.label}</Text>
							</View>
							<View style={styles.starRow}>
								{Array.from({ length: 4 }).map((_, at) => (
									<IconComponent
										key={at}
										type="materialCommunityIcons"
										name={at < heroRarity.stars ? 'star' : 'star-outline'}
										size={scaledSize(14)}
										color={Colors.textInverse}
										style={at < heroRarity.stars ? undefined : styles.starDim}
									/>
								))}
							</View>
						</View>
						{!!hero.description && (
							<Text style={styles.heroDescription} numberOfLines={3}>
								{hero.description}
							</Text>
						)}
						{!!hero.condition && (
							<View style={styles.heroConditionRow}>
								<IconComponent type="materialCommunityIcons" name="flag-checkered" size={scaledSize(12)} color={Colors.textInverse} />
								<Text style={styles.heroConditionText} numberOfLines={2}>
									{hero.condition}
								</Text>
							</View>
						)}
					</LinearGradient>

					{/* ── 같이 딴 나머지 뱃지 ── */}
					{rest.length > 0 && (
						<View style={styles.restBox}>
							<View style={styles.restHeader}>
								<Text style={styles.restTitle}>함께 획득</Text>
								<View style={styles.restCountChip}>
									<Text style={styles.restCountText}>{`+${rest.length}`}</Text>
								</View>
							</View>
							<ScrollView style={styles.restScroll} contentContainerStyle={styles.restScrollBody} showsVerticalScrollIndicator={false}>
								{rest.map((badge, at) => {
									const rarity = BADGE_RARITY_META[badge.rarity] ?? BADGE_RARITY_META.common;
									return (
										<View key={`${badge.name}-${at}`} style={styles.restRow}>
											<View style={[styles.restThumb, { backgroundColor: rarity.soft }]}>
												{badge.mascotImage ? (
													<FastImage source={badge.mascotImage} style={styles.restThumbImage} resizeMode={FastImage.resizeMode.contain} />
												) : (
													<IconComponent type={badge.iconType} name={badge.icon} size={scaledSize(20)} color={rarity.color} />
												)}
											</View>
											<View style={styles.restTextBox}>
												<Text style={styles.restName} numberOfLines={1}>
													{badge.name}
												</Text>
												<Text style={styles.restDescription} numberOfLines={1}>
													{badge.description}
												</Text>
											</View>
											<View style={[styles.restRarityChip, { backgroundColor: rarity.soft }]}>
												<Text style={[styles.restRarityText, { color: rarity.color }]}>{rarity.label}</Text>
											</View>
										</View>
									);
								})}
							</ScrollView>
						</View>
					)}

					<TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.85}>
						<LinearGradient colors={heroRarity.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmFill}>
							<Text style={styles.confirmText}>받기</Text>
							<IconComponent type="materialCommunityIcons" name="chevron-right" size={scaledSize(18)} color={Colors.textInverse} />
						</LinearGradient>
					</TouchableOpacity>
				</Animated.View>
			</View>
		</AppModal>
	);
};

export default NewBadgeModal;

const makeStyles = () =>
	StyleSheet.create({
		modalOverlay: {
			flex: 1,
			backgroundColor: Colors.scrim,
			justifyContent: 'center',
			alignItems: 'center',
			paddingHorizontal: Spacing.lg,
		},
		badgeModal: {
			backgroundColor: Colors.surface,
			borderRadius: Radius.xl,
			width: '100%',
			maxWidth: MODAL_MAX_WIDTH,
			maxHeight: '86%',
			overflow: 'hidden',
		},

		// ── 상단 무대 ──
		stage: {
			alignItems: 'center',
			paddingHorizontal: Spacing.xl,
			paddingTop: SpacingV.xl,
			paddingBottom: SpacingV.xl,
			overflow: 'hidden',
		},
		rayStage: {
			...StyleSheet.absoluteFillObject,
			alignItems: 'center',
			justifyContent: 'center',
		},
		// 화면 밖까지 넘치는 긴 막대 하나를 각도만 바꿔 여러 개 겹친다 (회전은 부모가 한 번에 한다)
		ray: {
			position: 'absolute',
			width: scaleWidth(520),
			height: scaleHeight(12),
			backgroundColor: 'rgba(255,255,255,0.10)',
		},
		eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
		eyebrowText: {
			fontSize: Typography.caption,
			fontWeight: FontWeight.heavy,
			color: Colors.textInverse,
			letterSpacing: scaledSize(1.6),
		},
		stageTitle: {
			marginTop: SpacingV.xs,
			fontSize: Typography.h3,
			fontWeight: FontWeight.heavy,
			color: Colors.textInverse,
			textAlign: 'center',
		},

		// ── 메달 ──
		medalStage: {
			width: scaleWidth(132),
			height: scaleWidth(132),
			marginTop: SpacingV.md,
			alignItems: 'center',
			justifyContent: 'center',
		},
		medalGlow: {
			position: 'absolute',
			width: scaleWidth(132),
			height: scaleWidth(132),
			borderRadius: scaleWidth(66),
			backgroundColor: Colors.surface,
		},
		medalRing: {
			width: scaleWidth(108),
			height: scaleWidth(108),
			borderRadius: scaleWidth(54),
			backgroundColor: 'rgba(255,255,255,0.28)',
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
		},
		medalInner: {
			width: scaleWidth(88),
			height: scaleWidth(88),
			borderRadius: scaleWidth(44),
			backgroundColor: Colors.surface,
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
		},
		medalImage: { width: scaleWidth(72), height: scaleWidth(72) },
		medalShine: {
			position: 'absolute',
			top: scaleWidth(-30),
			width: scaleWidth(26),
			height: scaleWidth(170),
			backgroundColor: Colors.textInverse,
		},

		heroName: {
			marginTop: SpacingV.md,
			fontSize: Typography.title,
			fontWeight: FontWeight.heavy,
			color: Colors.textInverse,
			textAlign: 'center',
		},
		heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: SpacingV.sm },
		heroRarityChip: {
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.xxs,
			borderRadius: Radius.pill,
			backgroundColor: 'rgba(255,255,255,0.22)',
		},
		heroRarityText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.textInverse },
		starRow: { flexDirection: 'row', gap: Spacing.xxs },
		starDim: { opacity: 0.4 },
		heroDescription: {
			marginTop: SpacingV.sm,
			fontSize: Typography.bodySm,
			color: Colors.textInverse,
			opacity: 0.92,
			textAlign: 'center',
			lineHeight: scaledSize(19),
		},
		heroConditionRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.xs,
			marginTop: SpacingV.md,
			paddingHorizontal: Spacing.md,
			paddingVertical: SpacingV.sm,
			borderRadius: Radius.md,
			backgroundColor: 'rgba(0,0,0,0.16)',
		},
		heroConditionText: { flexShrink: 1, fontSize: Typography.caption, fontWeight: FontWeight.bold, color: Colors.textInverse },

		// ── 같이 딴 뱃지 ──
		restBox: { paddingHorizontal: Spacing.xl, paddingTop: SpacingV.lg },
		restHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
		restTitle: { fontSize: Typography.footnote, fontWeight: FontWeight.heavy, color: Colors.textSecondary },
		restCountChip: {
			paddingHorizontal: Spacing.sm,
			paddingVertical: SpacingV.xxs,
			borderRadius: Radius.pill,
			backgroundColor: Colors.surfaceAlt,
		},
		restCountText: { fontSize: Typography.caption, fontWeight: FontWeight.heavy, color: Colors.textSecondary },
		restScroll: { maxHeight: scaleHeight(168), marginTop: SpacingV.sm },
		restScrollBody: { gap: SpacingV.sm, paddingBottom: SpacingV.xs },
		restRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: Spacing.md,
			padding: Spacing.md,
			borderRadius: Radius.md,
			backgroundColor: Colors.surfaceAlt,
		},
		restThumb: {
			width: scaleWidth(38),
			height: scaleWidth(38),
			borderRadius: scaleWidth(19),
			alignItems: 'center',
			justifyContent: 'center',
			overflow: 'hidden',
		},
		restThumbImage: { width: scaleWidth(30), height: scaleWidth(30) },
		restTextBox: { flex: 1, minWidth: 0, gap: scaleHeight(2) },
		restName: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy, color: Colors.textStrong },
		restDescription: { fontSize: Typography.caption, color: Colors.textSecondary },
		restRarityChip: { paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.xs },
		restRarityText: { fontSize: Typography.micro, fontWeight: FontWeight.heavy },

		// ── 확인 버튼 ──
		confirmButton: {
			marginHorizontal: Spacing.xl,
			marginTop: SpacingV.lg,
			marginBottom: SpacingV.xl,
			borderRadius: Radius.pill,
			overflow: 'hidden',
		},
		confirmFill: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: Spacing.xs,
			paddingVertical: SpacingV.md,
		},
		confirmText: { fontSize: Typography.subtitle, fontWeight: FontWeight.heavy, color: Colors.textInverse },
	});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
