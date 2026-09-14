/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import IconComponent from '../common/atomic/IconComponent';
import { MainDataType } from '@/src/four/types/MainDataType';
import { BADGE_RARITY_META } from '@/src/four/const/ConstBadges';
import { MODAL_MAX_WIDTH, MODAL_STAGE_WIDTH, scaledSize, scaleWidth } from '@/src/four/utils';
import Colors, { withAlpha } from '@/src/four/const/ConstColors';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';
import { getBadgeProgress, BadgeProgress } from '@/src/four/utils/BadgeProgressUtils';



interface Props {
	visible: boolean;
	badge: MainDataType.UserBadge | null;
	isEarned: boolean;
	onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = { study: '학습 뱃지', quiz: '퀴즈 뱃지', attendance: '출석 뱃지' };

const BadgeDetailPopup = ({ visible, badge, isEarned, onClose }: Props) => {
	const backdrop = useRef(new Animated.Value(0)).current;
	const scale = useRef(new Animated.Value(0.6)).current;
	const translateY = useRef(new Animated.Value(40)).current;
	const spin = useRef(new Animated.Value(0)).current;
	const glow = useRef(new Animated.Value(0)).current;
	const confettiRef = useRef<any>(null);
	const [progress, setProgress] = useState<BadgeProgress | null>(null);

	// 아직 못 얻은 뱃지만 진행도를 읽는다 — 이미 얻은 뱃지는 막대가 항상 100%라 알려 주는 게 없다
	useEffect(() => {
		if (!visible || !badge || isEarned) {
			setProgress(null);
			return;
		}
		let alive = true;
		getBadgeProgress(badge.id).then((p) => {
			if (alive) {
				setProgress(p);
			}
		});
		return () => {
			alive = false;
		};
	}, [visible, badge, isEarned]);

	useEffect(() => {
		if (!visible) {
			return;
		}

		backdrop.setValue(0);
		scale.setValue(0.6);
		translateY.setValue(40);
		const enter = Animated.parallel([
			Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
			Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
			Animated.spring(translateY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
		]);
		enter.start();

		spin.setValue(0);
		const spinLoop = Animated.loop(
			Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }),
		);
		spinLoop.start();

		const glowLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
				Animated.timing(glow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
			]),
		);
		glowLoop.start();

		const confettiTimer = isEarned ? setTimeout(() => confettiRef.current?.start?.(), 250) : null;

		// 팝업이 닫히거나 언마운트되면 반복 애니메이션·타이머를 모두 정리한다
		return () => {
			enter.stop();
			spinLoop.stop();
			glowLoop.stop();
			if (confettiTimer) {
				clearTimeout(confettiTimer);
			}
		};
	}, [visible, isEarned, backdrop, scale, translateY, spin, glow]);

	if (!badge) {return null;}

	const meta = BADGE_RARITY_META[badge.rarity] ?? BADGE_RARITY_META.common;
	const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
	const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.18] });
	const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

	return (
		<AppModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
			<Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
				<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

				<Animated.View style={[styles.card, { transform: [{ scale }, { translateY }] }]}>
					{/* 헤더 - 단색 + 우하단 어두운 오버레이로 그라데이션 대체 */}
					<View style={[styles.headerGrad, { backgroundColor: meta.color }]}>
						<View style={[StyleSheet.absoluteFill, styles.headerOverlay]} />
						<View style={styles.headerContent}>
							<View style={styles.rarityPill}>
								{Array.from({ length: meta.stars }).map((_, i) => (
									<IconComponent key={i} type="materialIcons" name="star" size={scaledSize(11)} color={Colors.textInverse} />
								))}
								<Text style={styles.rarityPillText}>{meta.label}</Text>
							</View>

							<View style={styles.iconStage}>
								{isEarned && (
									<Animated.View
										style={[
											styles.glowCircle,
											{ backgroundColor: Colors.textInverse, opacity: glowOpacity, transform: [{ scale: glowScale }] },
										]}
									/>
								)}
								{isEarned && (
									<Animated.View style={[styles.spinRing, { transform: [{ rotate }] }]}>
										{Array.from({ length: 8 }).map((_, i) => (
											<View
												key={i}
												style={[styles.ray, { transform: [{ rotate: `${i * 45}deg` }, { translateY: -scaleWidth(46) }] }]}
											/>
										))}
									</Animated.View>
								)}
								<View style={[styles.iconCircle, !isEarned && styles.iconCircleLocked]}>
									<IconComponent
										type={badge.iconType}
										name={isEarned ? badge.icon : 'lock'}
										size={scaledSize(40)}
										color={isEarned ? meta.color : Colors.textMuted}
									/>
								</View>
							</View>

							<Text style={styles.badgeName}>{badge.name}</Text>
							<View style={styles.typeChip}>
								<Text style={styles.typeChipText}>{TYPE_LABEL[badge.type] ?? '뱃지'}</Text>
							</View>
						</View>
					</View>

					{/* 본문 */}
					<View style={styles.body}>
						<InfoRow icon="format-quote" label="뱃지 설명" value={badge.description} tint={meta.color} />
						<InfoRow icon="flag" label="획득 조건" value={badge.condition} tint={meta.color} />

						<View style={styles.infoRow}>
							<View style={[styles.infoIcon, { backgroundColor: meta.soft }]}>
								<IconComponent type="materialIcons" name="auto-awesome" size={scaledSize(15)} color={meta.color} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.infoLabel}>희귀도</Text>
								<View style={styles.rarityValueRow}>
									<View style={[styles.rarityTag, { backgroundColor: meta.soft }]}>
										<Text style={[styles.rarityTagText, { color: meta.color }]}>{meta.label}</Text>
									</View>
									<View style={{ flexDirection: 'row', gap: Spacing.xxs }}>
										{Array.from({ length: 4 }).map((_, i) => (
											<IconComponent
												key={i}
												type="materialIcons"
												name="star"
												size={scaledSize(14)}
												color={i < meta.stars ? meta.color : Colors.textMuted}
											/>
										))}
									</View>
								</View>
							</View>
						</View>

						{!!progress && progress.goal > 0 && (
							<View style={styles.progressBlock}>
								<View style={styles.progressHead}>
									<Text style={styles.infoLabel}>획득 진행도</Text>
									<Text style={[styles.progressValue, { color: meta.color }]}>
										{Math.min(progress.current, progress.goal).toLocaleString()} / {progress.goal.toLocaleString()}
									</Text>
								</View>
								<View style={styles.progressTrack}>
									<View
										style={[
											styles.progressFill,
											{
												backgroundColor: meta.color,
												width: `${Math.min(100, Math.round((progress.current / progress.goal) * 100))}%`,
											},
										]}
									/>
								</View>
								<Text style={styles.progressLeft}>
									{progress.current >= progress.goal
										? '조건을 채웠습니다! 곧 지급됩니다.'
										: `${(progress.goal - progress.current).toLocaleString()}${progress.unit} 더 하면 획득!`}
								</Text>
							</View>
						)}

						<View style={[styles.statusBanner, isEarned ? { backgroundColor: meta.soft } : styles.statusBannerLocked]}>
							<IconComponent
								type="materialIcons"
								name={isEarned ? 'verified' : 'lock'}
								size={scaledSize(16)}
								color={isEarned ? meta.color : Colors.textMuted}
							/>
							<Text style={[styles.statusText, { color: isEarned ? meta.color : Colors.textMuted }]}>
								{isEarned ? '획득 완료한 뱃지입니다!' : '아직 획득하지 못했습니다'}
							</Text>
						</View>

						<TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
							<Text style={styles.closeBtnText}>닫기</Text>
						</TouchableOpacity>
					</View>
				</Animated.View>

				{isEarned && (
					<ConfettiCannon
						ref={confettiRef}
						count={80}
						origin={{ x: MODAL_STAGE_WIDTH / 2, y: 0 }}
						autoStart={false}
						fadeOut
						fallSpeed={2600}
						explosionSpeed={350}
					/>
				)}
			</Animated.View>
		</AppModal>
	);
};

const InfoRow = ({ icon, label, value, tint }: { icon: string; label: string; value: string; tint: string }) => (
	<View style={styles.infoRow}>
		<View style={[styles.infoIcon, { backgroundColor: withAlpha(tint, 0.1) }]}>
			<IconComponent type="materialIcons" name={icon} size={scaledSize(15)} color={tint} />
		</View>
		<View style={{ flex: 1 }}>
			<Text style={styles.infoLabel}>{label}</Text>
			<Text style={styles.infoValue}>{value}</Text>
		</View>
	</View>
);

export default BadgeDetailPopup;

const makeStyles = () => StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: Colors.scrim,
		alignItems: 'center',
		justifyContent: 'center',
		padding: Spacing.xxl,
	},
	card: {
		width: '100%',
		maxWidth: Math.min(scaleWidth(360), MODAL_MAX_WIDTH),
		borderRadius: Radius.xl,
		backgroundColor: Colors.surface,
		overflow: 'hidden',
	},
	headerGrad: {
		width: '100%',
		paddingTop: SpacingV.xl,
		paddingBottom: SpacingV.xxl,
		paddingHorizontal: Spacing.xl,
	},
	// 우하단 방향 어두운 오버레이 → 그라데이션 대체
	// 알파 없이 shadow(검정)를 깔면 희귀도 색 헤더가 통째로 검게 덮인다
	headerOverlay: {
		backgroundColor: withAlpha(Colors.shadow, 0.12),
	},
	headerContent: {
		alignItems: 'center',
	},
	rarityPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.xs,
		backgroundColor: Colors.darkCardBorder,
		borderRadius: Radius.xl,
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
	},
	rarityPillText: { color: Colors.textInverse, fontSize: Typography.footnote, fontWeight: FontWeight.heavy, marginLeft: Spacing.xs },
	iconStage: {
		width: scaleWidth(120),
		height: scaleWidth(120),
		alignItems: 'center',
		justifyContent: 'center',
		marginVertical: SpacingV.md,
	},
	glowCircle: {
		position: 'absolute',
		top: scaleWidth(5),
		left: scaleWidth(5),
		width: scaleWidth(110),
		height: scaleWidth(110),
		borderRadius: scaleWidth(55),
	},
	spinRing: {
		position: 'absolute',
		top: scaleWidth(5),
		left: scaleWidth(5),
		width: scaleWidth(110),
		height: scaleWidth(110),
		alignItems: 'center',
		justifyContent: 'center',
	},
	ray: {
		position: 'absolute',
		top: scaleWidth(55) - scaleWidth(7),
		left: scaleWidth(55) - scaleWidth(2),
		width: scaleWidth(4),
		height: scaleWidth(14),
		borderRadius: Radius.xs,
		// 컬러 헤더 위에 얹히는 빛살 — surface 는 다크에서 어두워져 사라진다
		backgroundColor: Colors.textInverse,
	},
	iconCircle: {
		width: scaleWidth(82),
		height: scaleWidth(82),
		borderRadius: scaleWidth(41),
		backgroundColor: Colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconCircleLocked: { backgroundColor: Colors.surfaceAlt },
	badgeName: {
		color: Colors.textInverse,
		fontSize: Typography.h3,
		fontWeight: FontWeight.heavy, // 디자인 토큰 최대 굵기(heavy)로 통일
		marginTop: SpacingV.xs,
		textAlign: 'center',
	},
	typeChip: {
		marginTop: SpacingV.sm,
		backgroundColor: Colors.darkCardBorder,
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: SpacingV.xs,
	},
	typeChipText: { flexShrink: 1, color: Colors.textInverse, fontSize: Typography.caption, fontWeight: FontWeight.bold },

	body: { padding: Spacing.xl, gap: SpacingV.md },
	infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
	infoIcon: {
		width: scaleWidth(30),
		height: scaleWidth(30),
		borderRadius: Radius.sm,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: SpacingV.xxs,
	},
	infoLabel: {
		fontSize: Typography.footnote,
		fontWeight: FontWeight.bold,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xs,
	},
	infoValue: { fontSize: Typography.body, color: Colors.text, lineHeight: scaledSize(19) },
	rarityValueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	rarityTag: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xs },
	rarityTagText: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy },
	progressBlock: { gap: SpacingV.xs },
	progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	progressValue: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy },
	progressTrack: {
		height: scaleWidth(8),
		borderRadius: Radius.xs,
		backgroundColor: Colors.surfaceAlt,
		overflow: 'hidden',
	},
	progressFill: { height: '100%', borderRadius: Radius.xs },
	progressLeft: { fontSize: Typography.caption, color: Colors.textSecondary },
	statusBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		borderRadius: Radius.md,
		paddingVertical: SpacingV.md,
		marginTop: SpacingV.xxs,
	},
	statusBannerLocked: { backgroundColor: Colors.surfaceAlt },
	statusText: { fontSize: Typography.bodySm, fontWeight: FontWeight.heavy },
	closeBtn: {
		backgroundColor: Colors.inverseSurface,
		borderRadius: Radius.lg,
		paddingVertical: SpacingV.lg,
		alignItems: 'center',
		marginTop: SpacingV.xxs,
	},
	closeBtnText: { flexShrink: 1, color: Colors.textInverse, fontSize: Typography.callout, fontWeight: FontWeight.heavy },
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
