import React, { useEffect, useRef, useState } from 'react';
import AppModal from '@/src/four/screens/common/atomic/AppModal';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable, Animated, Easing } from 'react-native';
import FastImage from '@/src/four/components/FastImage';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/four/utils';
import { TOWER_LEVELS } from '@/src/four/const/ConstTowerData';
import { Typography, FontWeight, Spacing, SpacingV, Radius } from '@/src/four/const/ConstDesign';
import { Colors, withAlpha } from '@/src/four/const/ConstColors';
import { registerThemedStyles } from '@/src/four/const/ThemeRegistry';

interface Props {
	unlockedRewards: number[];
}

const getRewardTypeLabel = (type?: string) => {
	if (type === 'costume') {return '👕 코스튬';}
	if (type === 'item') {return '✨ 특별 아이템';}
	return '🌟 캐릭터';
};

// ✅ 컴포넌트 외부로 분리 (useRef/useEffect 정상 동작)
const ClearBadge = ({ color, name }: { color: string; name: string }) => {
	const scale = useRef(new Animated.Value(0)).current;
	const opacity = useRef(new Animated.Value(0)).current;
	const shimmer = useRef(new Animated.Value(0)).current;
	const star1Rotate = useRef(new Animated.Value(0)).current;
	const star2Rotate = useRef(new Animated.Value(0)).current;
	const glowScale = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		// 시퀀스 핸들을 잡아두고 cleanup에서 stop() — 내부 loop까지 함께 멈춘다
		const animation = Animated.sequence([
			Animated.parallel([
				Animated.spring(scale, {
					toValue: 1,
					friction: 3,
					tension: 60,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
			]),
			Animated.delay(200),
			Animated.parallel([
				Animated.loop(
					Animated.sequence([
						Animated.timing(shimmer, {
							toValue: 1,
							duration: 1200,
							easing: Easing.inOut(Easing.sin),
							useNativeDriver: true,
						}),
						Animated.timing(shimmer, {
							toValue: 0,
							duration: 1200,
							easing: Easing.inOut(Easing.sin),
							useNativeDriver: true,
						}),
					]),
				),
				Animated.loop(
					Animated.timing(star1Rotate, {
						toValue: 1,
						duration: 2400,
						easing: Easing.linear,
						useNativeDriver: true,
					}),
				),
				// ✅ 수정
				Animated.loop(
					Animated.timing(star2Rotate, {
						toValue: 1, // 양수로 변경
						duration: 3000,
						easing: Easing.linear,
						useNativeDriver: true,
					}),
				),
				Animated.loop(
					Animated.sequence([
						Animated.timing(glowScale, {
							toValue: 1.06,
							duration: 1400,
							easing: Easing.inOut(Easing.ease),
							useNativeDriver: true,
						}),
						Animated.timing(glowScale, {
							toValue: 1,
							duration: 1400,
							easing: Easing.inOut(Easing.ease),
							useNativeDriver: true,
						}),
					]),
				),
			]),
		]);
		animation.start();
		// ✅ 언마운트 시 루프 애니메이션 정리 (메모리 누수 방지)
		return () => {
			animation.stop();
			scale.stopAnimation();
			opacity.stopAnimation();
			shimmer.stopAnimation();
			star1Rotate.stopAnimation();
			star2Rotate.stopAnimation();
			glowScale.stopAnimation();
		};
	}, []);

	const textOpacity = shimmer.interpolate({
		inputRange: [0, 1],
		outputRange: [0.8, 1],
	});
	const textScale = shimmer.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 1.05],
	});
	const star1Deg = star1Rotate.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg'],
	});
	const star2Deg = star2Rotate.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '-360deg'], // outputRange에서 방향 반전
	});

	return (
		<Animated.View
			style={[styles.clearBadge, { backgroundColor: color }, { opacity, transform: [{ scale }, { scale: glowScale }] }]}>
			<View style={styles.clearBadgeCircleLeft} />
			<View style={styles.clearBadgeCircleRight} />

			<Animated.Text style={[styles.clearStar, styles.clearStarLeft, { transform: [{ rotate: star1Deg }] }]}>
				✦
			</Animated.Text>
			<Animated.Text style={[styles.clearStar, styles.clearStarRight, { transform: [{ rotate: star2Deg }] }]}>
				✦
			</Animated.Text>

			<View style={styles.clearBadgeInner}>
				<Text style={styles.clearBadgeTrophy}>🏆</Text>
				<Animated.Text style={[styles.clearBadgeText, { opacity: textOpacity, transform: [{ scale: textScale }] }]}>
					{name} 클리어!
				</Animated.Text>
				<Text style={styles.clearBadgeSubText}>★ ★ ★</Text>
			</View>
		</Animated.View>
	);
};

const TowerRewardSection = ({ unlockedRewards }: Props) => {
	const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

	const towerRewards = TOWER_LEVELS.filter((t) => unlockedRewards.includes(t.level));
	const selectedTower = TOWER_LEVELS.find((t) => t.level === selectedLevel);

	if (towerRewards.length === 0) {return null;}

	return (
		<>
			<View style={styles.towerRewardView}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: Spacing.md }}>
					{towerRewards.map((tower) => (
						<TouchableOpacity
							key={tower.level}
							style={styles.towerRewardItem}
							onPress={() => setSelectedLevel(tower.level)}
							activeOpacity={0.8}>
							<View style={[styles.towerRewardImageWrap, { borderColor: tower.color }]}>
								<FastImage source={tower.reward.image} style={styles.towerRewardImage} resizeMode="contain" />
								<View style={[styles.towerRewardBadge, { backgroundColor: tower.color }]}>
									<Text style={styles.towerRewardBadgeText}>LV.{tower.level}</Text>
								</View>
							</View>
							<Text style={styles.towerRewardName} numberOfLines={2}>
								{tower.reward.name}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			</View>

			<AppModal
				visible={selectedLevel !== null}
				transparent
				animationType="fade"
				onRequestClose={() => setSelectedLevel(null)}>
				<Pressable style={styles.overlay} onPress={() => setSelectedLevel(null)}>
					{/* 팝업 내부 탭이 배경으로 전달돼 닫히지 않도록 흡수한다 */}
					<Pressable style={styles.popup} onPress={() => {}}>
						{selectedTower && (
							<>
								<View style={[styles.popupHeader, { backgroundColor: withAlpha(selectedTower.color, 0.12) }]}>
									<FastImage source={selectedTower.bossImage} style={styles.bossImage} resizeMode="contain" />
									<View style={styles.popupHeaderInfo}>
										<Text style={styles.bossTitle}>{selectedTower.bossTitle}</Text>
										<Text style={styles.bossName}>{selectedTower.bossName}</Text>
										<Text style={styles.bossDesc}>{selectedTower.bossDescription}</Text>
									</View>
								</View>

								<ClearBadge color={selectedTower.color} name={selectedTower.name} />

								<View style={styles.popupBody}>
									<Text style={styles.sectionTitle}>🏆 클리어 조건</Text>
									<Text style={styles.infoText}>
										<Text style={styles.highlight}>{selectedTower.clearCondition}</Text>
									</Text>

									<View style={styles.divider} />

									<Text style={styles.sectionTitle}>🎁 획득 보상</Text>
									<View style={styles.rewardRow}>
										<View style={[styles.rewardThumbWrap, { borderColor: selectedTower.color }]}>
											<FastImage source={selectedTower.reward.image} style={styles.rewardThumb} resizeMode="contain" />
										</View>
										<View style={styles.rewardInfo}>
											<Text style={styles.rewardType}>{getRewardTypeLabel(selectedTower.reward.type)}</Text>
											<Text style={styles.rewardName}>{selectedTower.reward.name}</Text>
										</View>
									</View>
								</View>

								<TouchableOpacity
									style={[styles.closeBtn, { backgroundColor: selectedTower.color }]}
									onPress={() => setSelectedLevel(null)}>
									<Text style={styles.closeBtnText}>확인</Text>
								</TouchableOpacity>
							</>
						)}
					</Pressable>
				</Pressable>
			</AppModal>
		</>
	);
};

export default TowerRewardSection;

const makeStyles = () => StyleSheet.create({
	towerRewardView: {
		width: '100%',
		marginTop: SpacingV.sm,
		marginBottom: SpacingV.xs,
	},
	towerRewardItem: {
		alignItems: 'center',
		marginRight: Spacing.md,
		width: scaleWidth(72),
	},
	towerRewardImageWrap: {
		position: 'relative',
		width: scaleWidth(64),
		height: scaleWidth(64),
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.surfaceAlt,
		borderRadius: Radius.sm,
		borderWidth: 1,
		marginBottom: SpacingV.sm,
	},
	towerRewardImage: {
		width: scaleWidth(54),
		height: scaleWidth(54),
	},
	towerRewardBadge: {
		position: 'absolute',
		bottom: -scaleHeight(4),
		right: -scaleWidth(4),
		borderRadius: Radius.sm,
		paddingHorizontal: Spacing.xs,
		paddingVertical: SpacingV.xxs,
	},
	towerRewardBadgeText: {
		fontSize: Typography.micro,
		color: Colors.textInverse,
		fontWeight: FontWeight.bold,
	},
	towerRewardName: {
		fontSize: Typography.caption,
		color: Colors.text,
		textAlign: 'center',
		fontWeight: FontWeight.medium,
		lineHeight: scaledSize(14),
	},

	// 팝업
	overlay: {
		flex: 1,
		backgroundColor: Colors.scrim,
		justifyContent: 'center',
		alignItems: 'center',
	},
	popup: {
		width: scaleWidth(300),
		backgroundColor: Colors.surface,
		borderRadius: Radius.lg,
		overflow: 'hidden',
	},
	popupHeader: {
		flexDirection: 'row',
		padding: Spacing.lg,
		alignItems: 'center',
		gap: Spacing.md,
	},
	bossImage: {
		width: scaleWidth(72),
		height: scaleWidth(72),
		borderRadius: Radius.sm,
	},
	popupHeaderInfo: {
		flex: 1,
	},
	bossTitle: {
		fontSize: Typography.caption,
		color: Colors.textSecondary,
		marginBottom: SpacingV.xxs,
	},
	bossName: {
		fontSize: Typography.body,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.xs,
	},
	bossDesc: {
		fontSize: Typography.caption,
		color: Colors.textSecondary,
		// 여러 줄로 흐르는 설명이라 타워 챌린지 화면의 보스 설명과 같은 줄 높이를 쓴다(14 는 글자가 붙어 읽기 어렵다)
		lineHeight: scaledSize(17),
	},

	// ✅ 중복 제거 후 단일 정의
	clearBadge: {
		paddingVertical: SpacingV.lg,
		paddingHorizontal: Spacing.xl,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		position: 'relative',
	},
	clearBadgeCircleLeft: {
		position: 'absolute',
		width: scaleWidth(80),
		height: scaleWidth(80),
		borderRadius: scaleWidth(40),
		backgroundColor: Colors.darkCard,
		left: -scaleWidth(20),
		top: -scaleWidth(20),
	},
	clearBadgeCircleRight: {
		position: 'absolute',
		width: scaleWidth(60),
		height: scaleWidth(60),
		borderRadius: scaleWidth(30),
		backgroundColor: Colors.darkCard,
		right: -scaleWidth(10),
		bottom: -scaleWidth(10),
	},
	clearStar: {
		position: 'absolute',
		fontSize: Typography.subtitle,
		color: Colors.darkOnPanelSub,
	},
	clearStarLeft: {
		left: scaleWidth(20),
		top: scaleHeight(10),
	},
	clearStarRight: {
		right: scaleWidth(20),
		bottom: scaleHeight(10),
	},
	clearBadgeInner: {
		alignItems: 'center',
		gap: SpacingV.xs,
	},
	clearBadgeTrophy: {
		fontSize: Typography.h1,
		color: Colors.textInverse,
	},
	clearBadgeText: {
		color: Colors.textInverse,
		fontSize: Typography.title,
		fontWeight: FontWeight.bold,
		letterSpacing: 1.5,
		textShadowColor: Colors.scrim,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 4,
	},
	clearBadgeSubText: {
		color: Colors.darkOnPanel,
		fontSize: Typography.caption,
		letterSpacing: 4,
	},

	popupBody: {
		padding: Spacing.lg,
	},
	sectionTitle: {
		fontSize: Typography.footnote,
		fontWeight: FontWeight.bold,
		color: Colors.text,
		marginBottom: SpacingV.sm,
	},
	infoText: {
		fontSize: Typography.footnote,
		color: Colors.textSecondary,
	},
	highlight: {
		fontWeight: FontWeight.bold,
		color: Colors.accentOrange,
	},
	divider: {
		height: 1,
		backgroundColor: Colors.surfaceAlt,
		marginVertical: SpacingV.md,
	},
	rewardRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.md,
	},
	rewardThumbWrap: {
		width: scaleWidth(64),
		height: scaleWidth(64),
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: Radius.sm,
		borderWidth: 1,
		backgroundColor: Colors.surfaceAlt,
	},
	rewardThumb: {
		width: scaleWidth(56),
		height: scaleWidth(56),
	},
	rewardInfo: {
		flex: 1,
	},
	rewardType: {
		fontSize: Typography.caption,
		color: Colors.textMuted,
		marginBottom: SpacingV.xxs,
	},
	rewardName: {
		fontSize: Typography.bodySm,
		fontWeight: FontWeight.bold,
		color: Colors.text,
	},
	closeBtn: {
		margin: Spacing.lg,
		marginTop: 0,
		paddingVertical: SpacingV.md,
		borderRadius: Radius.sm,
		alignItems: 'center',
	},
	closeBtnText: {
		flexShrink: 1,
		color: Colors.textInverse,
		fontWeight: FontWeight.bold,
		fontSize: Typography.bodySm,
	},
});
let styles = makeStyles();
registerThemedStyles(() => {
	styles = makeStyles();
});
